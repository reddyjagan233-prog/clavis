Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  CLAVIS - Cross-Channel Link Analysis & Verification" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$ScriptDir\backend"

if (Test-Path ".venv\Scripts\python.exe") {
    Write-Host "Starting CLAVIS Server on http://localhost:8000..." -ForegroundColor Green
    Start-Process "http://localhost:8000"
    & ".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
} else {
    Write-Host "Error: Virtual environment not found in backend\.venv" -ForegroundColor Red
}
