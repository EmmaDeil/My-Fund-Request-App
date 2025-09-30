@echo off
REM Dashboard Environment Switcher for Windows
REM Usage: switch-dashboard-env.bat [dev|prod]

set ENV=%1

if "%ENV%"=="" (
    echo ❌ Please specify environment: dev or prod
    echo Usage: switch-dashboard-env.bat [dev^|prod]
    exit /b 1
)

if /i "%ENV%"=="dev" goto :dev
if /i "%ENV%"=="development" goto :dev
if /i "%ENV%"=="prod" goto :prod
if /i "%ENV%"=="production" goto :prod

echo ❌ Invalid environment: %ENV%
echo Valid options: dev, prod
exit /b 1

:dev
echo 🔄 Switching dashboard to DEVELOPMENT environment...
copy .env.example .env >nul
powershell -Command "(Get-Content .env) -replace 'mongodb://localhost:27017/fundRequestDB', 'mongodb+srv://fundrequest:fundrequest223@requests.wbonoix.mongodb.net/fundrequest_dev?retryWrites=true&w=majority&appName=Requests' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'NODE_ENV=production', 'NODE_ENV=development' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'your-email@gmail.com', 'eclefzy@gmail.com' | Set-Content .env"
powershell -Command "(Get-Content .env) -replace 'your-app-password', 'crmn cgos dfwb fvcs' | Set-Content .env"
echo ✅ Dashboard configured for DEVELOPMENT environment
echo 📊 Database: fundrequest_dev
goto :show_config

:prod
echo 🔄 Switching dashboard to PRODUCTION environment...
copy .env.production .env >nul
echo ✅ Dashboard configured for PRODUCTION environment
echo 📊 Database: fundrequest_prod
goto :show_config

:show_config
echo.
echo 🔍 Current Configuration:
node -e "require('dotenv').config(); const dbUri = process.env.MONGODB_URI; const dbName = dbUri ? dbUri.split('/').pop()?.split('?')[0] : 'unknown'; console.log('📊 Database:', dbName); console.log('🌍 Environment:', process.env.NODE_ENV); console.log('📍 Port:', process.env.PORT);"