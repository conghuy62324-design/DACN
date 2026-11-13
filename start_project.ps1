# ==============================================================================
# TravelGo - Script Khởi Chạy Tự Động Toàn Bộ Dự Án (1-Click Run)
# Yêu cầu: Docker Desktop đang chạy, Ollama (cho AI Chatbot), PowerShell.
# ==============================================================================

$root = $PSScriptRoot
$travelgo = Join-Path $root "travelgo"
$backend = Join-Path $travelgo "backend"
$frontend = Join-Path $travelgo "frontend"

Write-Host "`n[1/5] Dang kiem tra va khoi dong Database (PostgreSQL + PostGIS)..." -ForegroundColor Cyan
Set-Location $travelgo
docker-compose up -d

Write-Host "Cho Database san sang trong 5 giay..." -ForegroundColor Gray
Start-Sleep -Seconds 5

Write-Host "`n[2/5] Dang kiem tra Ollama Local LLM (Cho Tro Ly AI Chatbot)..." -ForegroundColor Cyan
if (Get-Command ollama -ErrorAction SilentlyContinue) {
    $ollamaPort = Get-NetTCPConnection -LocalPort 11434 -State Listen -ErrorAction SilentlyContinue
    if (-not $ollamaPort) {
        Write-Host "Khoi dong Ollama serve tai http://127.0.0.1:11434..." -ForegroundColor Yellow
        Start-Process ollama -ArgumentList "serve" -WindowStyle Minimized
        Start-Sleep -Seconds 3
    } else {
        Write-Host "Ollama dang chay tren cong 11434." -ForegroundColor Green
    }
} else {
    Write-Host "CANH BAO: May tinh chua cai dat Ollama." -ForegroundColor Yellow
    Write-Host "Neu ban muon test Chatbot AI Assistant, hay cai dat tai: https://ollama.com" -ForegroundColor Yellow
}

Write-Host "`n[3/5] Cau hinh va kiem tra Backend..." -ForegroundColor Cyan
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

Write-Host "`n[4/5] Cau hinh va kiem tra Frontend..." -ForegroundColor Cyan
Set-Location $frontend
Write-Host "Cai dat thu vien Frontend (npm install)..." -ForegroundColor Gray
npm install --silent

Write-Host "Khoi dong Frontend Server tai cong 3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontend'; npm run dev"

Write-Host "`n========================================================" -ForegroundColor Magenta
Write-Host " HOAN TAT! DU AN DANG CHAY TAI:" -ForegroundColor Green
Write-Host " - Giao dien Web: http://localhost:3000" -ForegroundColor Yellow
Write-Host " - Tro ly HuGo AI: http://localhost:3000/assistant" -ForegroundColor Yellow
Write-Host " - Tai khoan:     customer.a@hugotravel.vn / travelgo2026seed" -ForegroundColor Yellow
Write-Host "========================================================`n" -ForegroundColor Magenta
