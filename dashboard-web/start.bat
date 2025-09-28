@echo off

REM Fund Request Dashboard Web Starter Script for Windows

echo 🚀 Starting Fund Request Dashboard Web...
echo 📁 Working directory: %CD%

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version
echo ✅ npm version:
npm --version

REM Check if package.json exists
if not exist "package.json" (
    echo ❌ package.json not found. Are you in the dashboard-web directory?
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️ .env file not found. Copying from .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env"
        echo 📝 Please edit .env file with your configuration before starting the server.
        echo    - Set your MongoDB URI
        echo    - Configure email settings
        pause
    ) else (
        echo ❌ .env.example not found. Please create .env file with required settings.
        pause
        exit /b 1
    )
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Start the server
echo 🌐 Starting dashboard server...
echo 📊 Dashboard will be available at http://localhost:3001
echo 🔄 Press Ctrl+C to stop the server
echo.

npm start
pause