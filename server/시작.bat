@echo off
cd /d %~dp0

if not exist ".env" (
  echo [INFO] .env file was not found.
  echo        Please copy .env.example to .env, fill in your
  echo        Naver Client ID / Secret, then run this file again.
  echo.
  pause
  exit /b
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js does not seem to be installed ^(npm not found^).
  echo         Please install Node.js LTS from https://nodejs.org
  echo         then run this file again.
  echo.
  pause
  exit /b
)

if not exist "node_modules" (
  echo First run detected. Installing required packages, please wait...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed. Please check your Node.js installation.
    pause
    exit /b
  )
)

echo.
echo =========================================================
echo   Starting server. Do NOT close this window.
echo   Open this address in your browser: http://localhost:3000
echo =========================================================
echo.
call npm start
pause