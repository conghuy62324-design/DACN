# ============================================================
# TravelGo – Docker Setup & Integration Test Script
# Chạy: .\docker\start.ps1
# Yêu cầu: Docker Desktop đang chạy trên Windows
# ============================================================

param(
    [switch]$Reset,      # Xóa volume cũ và khởi động lại từ đầu
    [switch]$Seed,       # Chạy seed dữ liệu sau khi migrate
    [switch]$Test,       # Chạy integration test
    [switch]$Down        # Dừng và xóa container
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $PSScriptRoot   # thư mục travelgo/

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Err($msg)  { Write-Host "[ERR] $msg" -ForegroundColor Red }

# ── 0. Kiểm tra Docker đang chạy ─────────────────────────────────────────────
Write-Step "Kiểm tra Docker Desktop"
try {
    docker info | Out-Null
    Write-Ok "Docker Desktop đang chạy."
} catch {
    Write-Err "Docker Desktop chưa khởi động. Hãy mở Docker Desktop trước."
    exit 1
}

Set-Location $rootDir

# ── 1. Dừng & xóa nếu dùng -Down ────────────────────────────────────────────
if ($Down) {
    Write-Step "Dừng toàn bộ container TravelGo"
    docker compose down --remove-orphans
    Write-Ok "Đã dừng container."
    exit 0
}

# ── 2. Xóa volume nếu dùng -Reset ───────────────────────────────────────────
if ($Reset) {
    Write-Step "Reset: Xóa volume cũ (postgres_data)"
    docker compose down -v --remove-orphans
    Write-Ok "Đã xóa volume cũ."
}

# ── 3. Khởi động PostgreSQL + pgAdmin ────────────────────────────────────────
Write-Step "Khởi động PostgreSQL 15/PostGIS + pgAdmin"
docker compose up -d postgres pgadmin

# ── 4. Chờ PostgreSQL sẵn sàng (healthcheck) ─────────────────────────────────
Write-Step "Chờ PostgreSQL healthy..."
$maxWait = 60
$waited  = 0
do {
    Start-Sleep -Seconds 3
    $waited += 3
    $health = docker inspect --format='{{.State.Health.Status}}' travelgo_postgres 2>$null
    Write-Host "  [$waited s] Status: $health"
} while ($health -ne "healthy" -and $waited -lt $maxWait)

if ($health -ne "healthy") {
    Write-Err "PostgreSQL không sẵn sàng sau ${maxWait}s. Kiểm tra log: docker logs travelgo_postgres"
    exit 1
}
Write-Ok "PostgreSQL đã sẵn sàng!"

# ── 5. Chạy migration ────────────────────────────────────────────────────────
Write-Step "Chạy migration"
Set-Location "$rootDir\backend"

# Nếu -Reset thì dùng --force (bỏ qua safety check, xóa schema cũ nếu còn sót)
$migrateScript = if ($Reset) { "db:migrate:force" } else { "db:migrate:apply" }
Write-Host "  => npm run $migrateScript" -ForegroundColor DarkGray
npm run $migrateScript
if ($LASTEXITCODE -ne 0) {
    Write-Err "Migration thất bại."
    exit 1
}
Write-Ok "Migration hoàn thành!"

# ── 6. Seed dữ liệu (tuỳ chọn) ───────────────────────────────────────────────
if ($Seed) {
    Write-Step "Seed dữ liệu mẫu"
    $env:SEED_PASSWORD = "travelgo2026seed"
    npm run seed
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Seed thất bại."
        exit 1
    }
    Write-Ok "Seed hoàn thành!"
}

# ── 7. Integration test (tuỳ chọn) ───────────────────────────────────────────
if ($Test) {
    Write-Step "Chạy Integration Test (Phase 3.5)"
    npm run test:integration
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Integration test thất bại."
        exit 1
    }
    Write-Ok "Tất cả integration test PASSED!"
}

# ── 8. Tóm tắt ───────────────────────────────────────────────────────────────
Set-Location $rootDir
Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  TravelGo - Moi truong san sang!" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  PostgreSQL : localhost:5432  (DB: travelgo_dev)" -ForegroundColor White
Write-Host "  pgAdmin    : http://localhost:5050" -ForegroundColor White
Write-Host "               Email   : admin@hugotravel.vn" -ForegroundColor White
Write-Host "               Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host '  Tip: cd travelgo\backend ; npm run dev' -ForegroundColor DarkGray
Write-Host "============================================" -ForegroundColor Yellow
