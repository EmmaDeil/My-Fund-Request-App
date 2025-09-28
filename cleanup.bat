@echo off

REM 🧹 Project Cleanup Script for Windows
REM This script removes unnecessary files and reorganizes the project

echo 🧹 Fund Request App Cleanup Script
echo ==================================

REM Ask for confirmation
set /p confirm="⚠️ This will remove temporary files and database-tools directory. Continue? (y/N): "
if /i not "%confirm%"=="y" if /i not "%confirm%"=="yes" (
    echo ❌ Cleanup cancelled.
    pause
    exit /b 0
)

echo 🗑️ Removing temporary documentation files...
if exist "EMAIL_FIXES_COMPLETE.md" (
    del "EMAIL_FIXES_COMPLETE.md" && echo    ✅ Removed EMAIL_FIXES_COMPLETE.md
) else (
    echo    ⚠️ EMAIL_FIXES_COMPLETE.md not found
)

if exist "install-deps.sh" (
    del "install-deps.sh" && echo    ✅ Removed install-deps.sh
) else (
    echo    ⚠️ install-deps.sh not found
)

if exist "start-local.sh" (
    del "start-local.sh" && echo    ✅ Removed start-local.sh
) else (
    echo    ⚠️ start-local.sh not found
)

echo 🗑️ Removing root package files (these are not needed)...
if exist "package.json" (
    del "package.json" && echo    ✅ Removed root package.json
) else (
    echo    ⚠️ Root package.json not found
)

if exist "package-lock.json" (
    del "package-lock.json" && echo    ✅ Removed root package-lock.json  
) else (
    echo    ⚠️ Root package-lock.json not found
)

echo 🔍 Checking if dashboard-web is working first...
if exist "dashboard-web" if exist "dashboard-web\server.js" (
    echo    ✅ dashboard-web directory exists and looks good
    
    set /p remove_db_tools="🗑️ Remove database-tools directory? (it's been replaced by dashboard-web^) (y/N): "
    
    if /i "%remove_db_tools%"=="y" (
        if exist "database-tools" (
            rmdir /s /q "database-tools"
            echo    ✅ Removed database-tools directory
        ) else (
            echo    ⚠️ database-tools directory not found
        )
    ) else (
        echo    ⚠️ Keeping database-tools directory (you can remove it manually later^)
    )
) else (
    echo    ❌ dashboard-web not found or incomplete. Keeping database-tools as backup.
)

echo.
echo 🎉 Cleanup completed!
echo.
echo 📁 Your project structure is now:
echo    ├── backend/           # Main API server
echo    ├── frontend/          # React user interface  
echo    ├── dashboard-web/     # Admin dashboard (NEW - MAIN^)
echo    └── README.md          # Documentation
echo.
echo 🚀 To start the dashboard:
echo    cd dashboard-web
echo    start.bat             # Windows
echo.
echo 📖 Check CLEANUP_SUMMARY.md for more details
pause