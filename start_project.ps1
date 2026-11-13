# ==============================================================================
# TravelGo - Script Khởi Chạy Tự Động Toàn Bộ Dự Án (1-Click Run)
# Yêu cầu: Docker Desktop đang chạy, PowerShell.
# ==============================================================================

$root = $PSScriptRoot
$travelgo = Join-Path $root "travelgo"
$backend = Join-Path $travelgo "backend"
$frontend = Join-Path $travelgo "frontend"

Write-Host "`n[1/4] Dang kiem tra va khoi dong Database (PostgreSQL + PostGIS)..." -ForegroundColor Cyan
Set-Location $travelgo
docker-compose up -d

Write-Host "Cho Database san sang trong 5 giay..." -ForegroundColor Gray
Start-Sleep -Seconds 5

Write-Host "`n[2/4] Cau hinh va kiem tra Backend..." -ForegroundColor Cyan
Set-Location $backend
if (-not (Test-Path ".env")) {
    Write-Host "Tao file .env tu .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

Write-Host "Cai dat thu vien Backend (npm install)..." -ForegroundColor Gray
npm install --silent

Write-Host "Chay Migration Database..." -ForegroundColor Gray
npm run db:migrate:apply

Write-Host "Khoi dong Backend Server tai cong 5000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backend'; npm run dev"

Write-Host "`n[3/4] Cau hinh va kiem tra Frontend..." -ForegroundColor Cyan
Set-Location $frontend
Write-Host "Cai dat thu vien Frontend (npm install)..." -ForegroundColor Gray
npm install --silent

Write-Host "Khoi dong Frontend Server tai cong 3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontend'; npm run dev"

Write-Host "`n========================================================" -ForegroundColor Magenta
Write-Host " HOAN TAT! DU AN DANG CHAY TAI:" -ForegroundColor Green
Write-Host " - Giao dien Web: http://localhost:3000" -ForegroundColor Yellow
Write-Host " - Tro ly AI:     http://localhost:3000/assistant" -ForegroundColor Yellow
Write-Host " - Tai khoan:     customer.a@hugotravel.vn / travelgo2026seed" -ForegroundColor Yellow
Write-Host "========================================================`n" -ForegroundColor Magenta
