@echo off
cd /d "%~dp0"
echo [1/3] Converting data...
python scripts/convert_excel.py
if errorlevel 1 (
    echo ERROR: Python script failed.
    pause
    exit /b 1
)
echo [2/3] Building...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed.
    pause
    exit /b 1
)
echo [3/3] Deploying to Netlify...
call netlify deploy --prod --dir=dist
if errorlevel 1 (
    echo ERROR: Deploy failed.
    pause
    exit /b 1
)
echo.
echo Deploy complete!
pause
