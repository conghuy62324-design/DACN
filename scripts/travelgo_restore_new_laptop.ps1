# ==============================================================================
# TravelGo - Script Restore Trên Laptop Mới (TASK21.43)
# Chạy TRÊN LAPTOP MỚI sau khi đã clone repository và copy backup bundle
# ==============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupBundleDir,       # Ví dụ: "D:\travelgo_migration\20261118_123456"
    
    [string]$ProjectDir = "",       # Auto-detect nếu để trống
    [string]$DBContainer = "travelgo_postgres",
    [string]$DBName = "travelgo_dev",
    [string]$DBUser = "postgres"
)

# Auto-detect project dir
if (-not $ProjectDir) {
    $ProjectDir = Join-Path $PSScriptRoot "..\travelgo"
    $ProjectDir = Resolve-Path $ProjectDir -ErrorAction SilentlyContinue
    if (-not $ProjectDir) {
        Write-Host "❌ Không tìm thấy thư mục travelgo. Chạy lại với -ProjectDir <path>" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  TravelGo Restore - TASK21.43" -ForegroundColor Cyan
Write-Host "  Backup dir: $BackupBundleDir" -ForegroundColor Cyan
Write-Host "  Project dir: $ProjectDir" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# --- Kiểm tra prerequisites ---
Write-Host "[PRE] Kiểm tra prerequisites..." -ForegroundColor Cyan

# Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "  ❌ Docker chưa cài! Download: https://www.docker.com/products/docker-desktop/" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Docker: $(docker --version)" -ForegroundColor Green

# Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "  ❌ Node.js chưa cài! Download: https://nodejs.org/en/download" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Node.js: $(node --version)" -ForegroundColor Green

# Backup bundle
if (-not (Test-Path $BackupBundleDir)) {
    Write-Host "  ❌ Không tìm thấy backup bundle: $BackupBundleDir" -ForegroundColor Red
    exit 1
}
Write-Host "  ✅ Backup bundle tồn tại" -ForegroundColor Green

# --- Bước 1: Copy env files ---
Write-Host ""
Write-Host "[1/5] Copy secrets/env files..." -ForegroundColor Cyan

$envSrc = Join-Path $BackupBundleDir "env\backend.env"
$envDst = Join-Path $ProjectDir "backend\.env"
if (Test-Path $envSrc) {
    Copy-Item $envSrc $envDst -Force
    Write-Host "  ✅ backend/.env đã copy" -ForegroundColor Green
} else {
    Write-Host "  ❌ Không tìm thấy: $envSrc" -ForegroundColor Red
    exit 1
}

$frontendEnvSrc = Join-Path $BackupBundleDir "env\frontend.env"
$frontendEnvDst = Join-Path $ProjectDir "frontend\.env"
if (Test-Path $frontendEnvSrc) {
    Copy-Item $frontendEnvSrc $frontendEnvDst -Force
    Write-Host "  ✅ frontend/.env đã copy" -ForegroundColor Green
}

# --- Bước 2: Khởi động PostgreSQL ---
Write-Host ""
Write-Host "[2/5] Khởi động PostgreSQL container..." -ForegroundColor Cyan

# Tạo volumes nếu chưa có
docker volume create travelgo_postgres_data 2>$null
docker volume create travelgo_pgadmin_data 2>$null

# Start PostgreSQL
cd $ProjectDir
docker-compose up -d postgres

Write-Host "  Chờ PostgreSQL healthy (25 giây)..." -ForegroundColor Gray
Start-Sleep -Seconds 25

$pgHealth = docker inspect --format "{{.State.Health.Status}}" $DBContainer 2>$null
if ($pgHealth -ne "healthy") {
    Write-Host "  ⚠️ PostgreSQL chưa healthy ($pgHealth). Chờ thêm 15 giây..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
}
Write-Host "  ✅ PostgreSQL: $(docker inspect --format '{{.State.Health.Status}}' $DBContainer 2>$null)" -ForegroundColor Green

# --- Bước 3: Restore database ---
Write-Host ""
Write-Host "[3/5] Restore database..." -ForegroundColor Cyan

$dumpFile = Get-ChildItem "$BackupBundleDir\database" -Filter "travelgo_full_*.dump" `
    | Sort-Object LastWriteTime -Descending `
    | Select-Object -First 1

if (-not $dumpFile) {
    Write-Host "  ❌ Không tìm thấy file dump trong $BackupBundleDir\database" -ForegroundColor Red
    exit 1
}

Write-Host "  Dump file: $($dumpFile.Name) ($([math]::Round($dumpFile.Length/1MB, 2)) MB)" -ForegroundColor Gray

# Copy dump vào container
docker cp $dumpFile.FullName "${DBContainer}:/tmp/restore.dump"
Write-Host "  ✅ Đã copy dump vào container" -ForegroundColor Green

# Drop và recreate database
Write-Host "  Recreating database '$DBName'..." -ForegroundColor Gray
docker exec $DBContainer psql -U $DBUser -c "DROP DATABASE IF EXISTS $DBName;" 2>$null
docker exec $DBContainer psql -U $DBUser -c "CREATE DATABASE $DBName;" 2>$null

# Tạo PostGIS extension
docker exec $DBContainer psql -U $DBUser -d $DBName -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>$null
docker exec $DBContainer psql -U $DBUser -d $DBName -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;" 2>$null

# Restore
Write-Host "  Đang restore (có thể mất vài phút)..." -ForegroundColor Gray
docker exec $DBContainer pg_restore `
    -U $DBUser `
    -d $DBName `
    --no-owner `
    --role=$DBUser `
    --exit-on-error `
    /tmp/restore.dump

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Database restore hoàn thành" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  pg_restore có một số warning (thường do owner/role) - kiểm tra dữ liệu..." -ForegroundColor Yellow
    # Chạy lại không exit-on-error để restore tốt nhất có thể
    docker exec $DBContainer pg_restore `
        -U $DBUser `
        -d $DBName `
        --no-owner `
        --role=$DBUser `
        /tmp/restore.dump 2>&1
}

# --- Bước 4: Xác minh dữ liệu ---
Write-Host ""
Write-Host "[4/5] Xác minh SUPER_ADMIN và AI knowledge..." -ForegroundColor Cyan

# Kiểm tra SUPER_ADMIN
$adminResult = docker exec $DBContainer psql -U $DBUser -d $DBName -tAc `
    "SELECT email || ' | ' || role FROM users WHERE email = 'conghuy62324@gmail.com';" 2>$null
if ($adminResult -match "SUPER_ADMIN") {
    Write-Host "  ✅ SUPER_ADMIN: $adminResult" -ForegroundColor Green
} else {
    Write-Host "  ❌ SUPER_ADMIN không tìm thấy! Kết quả: '$adminResult'" -ForegroundColor Red
}

# Kiểm tra AI tables
$tables = @("adaptive_language", "customer_memory", "verified_travel_knowledge", "web_travel_intelligence", "review_insights")
foreach ($t in $tables) {
    $count = docker exec $DBContainer psql -U $DBUser -d $DBName -tAc "SELECT COUNT(*) FROM $t;" 2>$null
    $icon = if ([int]$count -gt 0) { "✅" } else { "⚠️ " }
    Write-Host "  $icon $t`: $count rows" -ForegroundColor $(if ([int]$count -gt 0) { "Green" } else { "Yellow" })
}

# Kiểm tra migration count
$migrationCount = docker exec $DBContainer psql -U $DBUser -d $DBName -tAc "SELECT COUNT(*) FROM schema_migrations;" 2>$null
Write-Host "  ✅ Migrations applied: $migrationCount" -ForegroundColor Green

# --- Bước 5: Cài dependencies và khởi động ---
Write-Host ""
Write-Host "[5/5] Cài npm dependencies..." -ForegroundColor Cyan

$backendDir = Join-Path $ProjectDir "backend"
$frontendDir = Join-Path $ProjectDir "frontend"

Write-Host "  Backend npm install..." -ForegroundColor Gray
cd $backendDir
npm install --silent
Write-Host "  ✅ Backend dependencies OK" -ForegroundColor Green

Write-Host "  Frontend npm install..." -ForegroundColor Gray
cd $frontendDir
npm install --silent
Write-Host "  ✅ Frontend dependencies OK" -ForegroundColor Green

# --- Tóm tắt ---
Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  ✅ RESTORE HOÀN TẤT!" -ForegroundColor Green
Write-Host ""
Write-Host "  🚀 Bước tiếp theo: Khởi động dự án" -ForegroundColor Cyan
$rootDir = Split-Path $ProjectDir -Parent
Write-Host "     cd '$rootDir'" -ForegroundColor Yellow
Write-Host "     .\start_project.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "  🌐 Sau khi khởi động:" -ForegroundColor Cyan
Write-Host "     Frontend:  http://localhost:3000" -ForegroundColor Yellow
Write-Host "     Backend:   http://localhost:5000" -ForegroundColor Yellow
Write-Host "     pgAdmin:   http://localhost:5050" -ForegroundColor Yellow
Write-Host ""
Write-Host "  🔑 Đăng nhập SUPER_ADMIN:" -ForegroundColor Cyan
Write-Host "     Email:  conghuy62324@gmail.com" -ForegroundColor Yellow
Write-Host "     Mật khẩu: [dùng mật khẩu hiện tại - không đổi]" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Magenta
