@echo off
echo ========================================================
echo   CLAVIS - Cross-Channel Link Analysis & Verification
echo ========================================================
echo.
cd /d "%~dp0backend"
if exist ".venv\Scripts\python.exe" (
    echo Starting CLAVIS Backend Engine on http://localhost:8000...
    start http://localhost:8000
    .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
) else (
    echo Error: Virtual environment not found in backend\.venv
    echo Run python -m venv .venv and install requirements.txt first.
    pause
)
