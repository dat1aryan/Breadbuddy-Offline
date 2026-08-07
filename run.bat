@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title BreadBuddy - Full Stack Runner

echo.
echo   BreadBuddy - your money's bestie
echo   ------------------------------------
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH. Please install Node.js first: https://nodejs.org
    pause
    exit /b 1
)

:: Check Node.js version (node:sqlite requires >= 22.5.0)
node -e "const [ma, mi] = process.versions.node.split('.').map(Number); const v = ma * 100 + mi; if (v - 2205 === Math.abs(v - 2205)) {} else process.exit(1)" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] BreadBuddy needs Node.js ^>= 22.5.0 because it uses the built-in node:sqlite module.
    echo Please update Node.js: https://nodejs.org
    pause
    exit /b 1
)

set "ROOT=%~dp0"
cd /d "%ROOT%"

:: Install root dependencies
if not exist "node_modules" (
    echo [1/4] Installing root dependencies...
    npm install
    if errorlevel 1 (
        echo [ERROR] Root npm install failed.
        pause
        exit /b 1
    )
) else (
    echo [1/4] Root dependencies already installed.
)

:: Install server dependencies
if not exist "server\node_modules" (
    echo [2/4] Installing server dependencies...
    cd server
    npm install
    if errorlevel 1 (
        echo [ERROR] Server npm install failed.
        pause
        exit /b 1
    )
    cd /d "%ROOT%"
) else (
    echo [2/4] Server dependencies already installed.
)

:: Install client dependencies
if not exist "client\node_modules" (
    echo [3/4] Installing client dependencies...
    cd client
    npm install
    if errorlevel 1 (
        echo [ERROR] Client npm install failed.
        pause
        exit /b 1
    )
    cd /d "%ROOT%"
) else (
    echo [3/4] Client dependencies already installed.
)

:: Create server .env if missing
if not exist "server\.env" (
    echo [4/4] Creating server\.env from .env.example...
    copy "server\.env.example" "server\.env" >nul
    echo [WARNING] Please review server\.env and set a strong JWT_SECRET before running in production.
) else (
    echo [4/4] server\.env already exists.
)

echo.
echo   Starting backend and frontend...
echo   Backend:  http://localhost:4000
echo   Frontend: http://localhost:5173
echo.
echo   Press any key to launch...
pause >nul

:: Start backend
echo [SERVER] Starting backend on port 4000...
start "BreadBuddy Server" cmd /k "cd /d "%ROOT%server" && npm run dev"

:: Start frontend
echo [CLIENT] Starting frontend on port 5173...
start "BreadBuddy Client" cmd /k "cd /d "%ROOT%client" && npm run dev"

echo.
echo Both services are starting in separate windows. Happy budgeting bestie!
timeout /t 3 >nul
