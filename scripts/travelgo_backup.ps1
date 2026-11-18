# ==============================================================================
# TravelGo - Script Backup Toàn Bộ Dự Án (TASK21.43)
# Chạy trên máy HIỆN TẠI trước khi chuyển sang laptop mới
# KHÔNG xóa, KHÔNG thay đổi dữ liệu gốc
# ==============================================================================

param(
    [string]$BackupRoot = "C:\Users\Danh\Downloads\travelgo_migration",
    [string]$ProjectDir = "C:\Users\Danh\Downloads\HCH\DACN\travelgo",
    [string]$DBContainer = "travelgo_postgres",
    [string]$DBName = "travelgo_dev",
    [string]$DBUser = "postgres"
)

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $BackupRoot $timestamp

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  TravelGo Migration Backup - TASK21.43" -ForegroundColor Cyan
Write-Host "  Timestamp: $timestamp" -ForegroundColor Cyan
Write-Host "  Backup dir: $backupDir" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# --- Tạo thư mục backup ---
New-Item -ItemType Directory -Path "$backupDir\env" -Force | Out-Null
New-Item -ItemType Directory -Path "$backupDir\database" -Force | Out-Null
Write-Host "[1/5] Thư mục backup đã tạo: $backupDir" -ForegroundColor Green

# --- Kiểm tra container PostgreSQL đang chạy ---
Write-Host ""
Write-Host "[2/5] Kiểm tra PostgreSQL container..." -ForegroundColor Cyan
$pgRunning = docker ps --filter "name=$DBContainer" --filter "status=running" --format "{{.Names}}" 2>$null
if (-not $pgRunning) {
    Write-Host "  ❌ LỖOI: Container '$DBContainer' không chạy!" -ForegroundColor Red
    Write-Host "  Hãy chạy: docker-compose up -d postgres" -ForegroundColor Yellow
    exit 1
}
Write-Host "  ✅ PostgreSQL đang chạy: $pgRunning" -ForegroundColor Green

# --- Dump PostgreSQL (giữ nguyên SUPER_ADMIN, password hash, AI data) ---
Write-Host ""
Write-Host "[3/5] Đang dump database '$DBName'..." -ForegroundColor Cyan
$dumpFile = "travelgo_full_$timestamp.dump"
$dumpPath = Join-Path "$backupDir\database" $dumpFile

# Chạy pg_dump trong container
docker exec $DBContainer pg_dump `
    -U $DBUser `
    -d $DBName `
    --format=custom `
    --no-password `
    --verbose `
    -f "/tmp/$dumpFile" 2>&1 | Tail-Output

if ($LASTEXITCODE -ne 0) {
    # Try without tail for compatibility
    docker exec $DBContainer pg_dump -U $DBUser -d $DBName --format=custom -f "/tmp/$dumpFile"
}

if ($LASTEXITCODE -eq 0) {
    # Copy dump ra ngoài container
    docker cp "${DBContainer}:/tmp/$dumpFile" $dumpPath
    if (Test-Path $dumpPath) {
        $sizeMB = [math]::Round((Get-Item $dumpPath).Length / 1MB, 2)
        Write-Host "  ✅ Dump hoàn tất: $dumpFile ($sizeMB MB)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Không copy được dump ra ngoài container!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  ❌ pg_dump thất bại!" -ForegroundColor Red
    exit 1
}

# --- Xác minh SUPER_ADMIN trong dump ---
Write-Host ""
Write-Host "[4/5] Xác minh SUPER_ADMIN trong database..." -ForegroundColor Cyan
$adminCheck = docker exec $DBContainer psql -U $DBUser -d $DBName -tAc "SELECT email, role FROM users WHERE email = 'conghuy62324@gmail.com';" 2>$null
if ($adminCheck -match "SUPER_ADMIN") {
    Write-Host "  ✅ SUPER_ADMIN tồn tại: $adminCheck" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  CANH BAO: Không tìm thấy SUPER_ADMIN hoặc query lỗi." -ForegroundColor Yellow
    Write-Host "  Kết quả query: '$adminCheck'" -ForegroundColor Gray
}

# Kiểm tra AI data tables
Write-Host "  Kiểm tra AI knowledge tables..." -ForegroundColor Gray
$aiCheck = docker exec $DBContainer psql -U $DBUser -d $DBName -tAc "
SELECT 
  'adaptive_language' as t, COUNT(*) FROM adaptive_language
UNION ALL SELECT 'customer_memory', COUNT(*) FROM customer_memory  
UNION ALL SELECT 'verified_travel_knowledge', COUNT(*) FROM verified_travel_knowledge
UNION ALL SELECT 'web_travel_intelligence', COUNT(*) FROM web_travel_intelligence;" 2>$null
Write-Host "  AI Tables:" -ForegroundColor Gray
$aiCheck | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }

# --- Copy env files ---
Write-Host ""
Write-Host "[5/5] Copy secrets/env files..." -ForegroundColor Cyan

$envFiles = @(
    @{ Src = "$ProjectDir\backend\.env"; Dst = "$backupDir\env\backend.env"; Label = "backend .env" }
    @{ Src = "$ProjectDir\frontend\.env"; Dst = "$backupDir\env\frontend.env"; Label = "frontend .env" }
    @{ Src = "$ProjectDir\.env"; Dst = "$backupDir\env\travelgo.env"; Label = "travelgo root .env" }
)

foreach ($f in $envFiles) {
    if (Test-Path $f.Src) {
        Copy-Item $f.Src $f.Dst
        Write-Host "  ✅ $($f.Label): copied" -ForegroundColor Green
    } else {
        Write-Host "  ℹ️  $($f.Label): không tồn tại (bỏ qua)" -ForegroundColor Gray
    }
}

# --- Tạo README restore ---
$readmeContent = @"
# TravelGo - Hướng Dẫn Restore

Backup tạo ngày: $timestamp

## Nội dung thư mục này:
- env/backend.env         → Copy vào: travelgo/backend/.env
- env/frontend.env        → Copy vào: travelgo/frontend/.env (nếu tồn tại)
- database/$dumpFile  → Restore vào PostgreSQL

## Lệnh restore trên laptop mới:

### 1. Khởi động PostgreSQL
```powershell
docker volume create travelgo_postgres_data
docker volume create travelgo_pgadmin_data
cd <project_dir>\travelgo
docker-compose up -d postgres
Start-Sleep -Seconds 15
```

### 2. Restore database
```powershell
docker cp "database\$dumpFile" travelgo_postgres:/tmp/restore.dump
docker exec travelgo_postgres psql -U postgres -c "DROP DATABASE IF EXISTS travelgo_dev;"
docker exec travelgo_postgres psql -U postgres -c "CREATE DATABASE travelgo_dev;"
docker exec travelgo_postgres pg_restore -U postgres -d travelgo_dev --no-owner --role=postgres /tmp/restore.dump
```

### 3. Xác minh SUPER_ADMIN
```powershell
docker exec travelgo_postgres psql -U postgres -d travelgo_dev -c "SELECT email, role FROM users WHERE email = 'conghuy62324@gmail.com';"
```

## Tài khoản SUPER_ADMIN:
- Email: conghuy62324@gmail.com
- Mật khẩu: KHÔNG ĐỔI (dùng mật khẩu hiện tại)
- Role: SUPER_ADMIN
"@

$readmeContent | Set-Content "$backupDir\README_RESTORE.md" -Encoding UTF8

# --- Tóm tắt ---
Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  ✅ BACKUP HOÀN TẤT!" -ForegroundColor Green
Write-Host "  Thư mục: $backupDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "  📋 Nội dung:" -ForegroundColor Cyan
Get-ChildItem $backupDir -Recurse | ForEach-Object {
    $rel = $_.FullName.Replace($backupDir, "")
    Write-Host "    $rel" -ForegroundColor Gray
}
Write-Host ""
Write-Host "  ⚠️  QUAN TRỌNG: Copy thư mục này qua USB/Cloud cá nhân" -ForegroundColor Yellow
Write-Host "  ⚠️  KHÔNG đưa thư mục này lên GitHub!" -ForegroundColor Red
Write-Host "============================================================" -ForegroundColor Magenta
