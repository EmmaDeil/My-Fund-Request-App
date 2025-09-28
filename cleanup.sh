#!/bin/bash

# 🧹 Project Cleanup Script
# This script removes unnecessary files and reorganizes the project

echo "🧹 Fund Request App Cleanup Script"
echo "=================================="

# Ask for confirmation
read -p "⚠️  This will remove temporary files and database-tools directory. Continue? (y/N): " confirm

if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
    echo "❌ Cleanup cancelled."
    exit 0
fi

echo "🗑️  Removing temporary documentation files..."
rm -f EMAIL_FIXES_COMPLETE.md 2>/dev/null && echo "   ✅ Removed EMAIL_FIXES_COMPLETE.md" || echo "   ⚠️  EMAIL_FIXES_COMPLETE.md not found"
rm -f install-deps.sh 2>/dev/null && echo "   ✅ Removed install-deps.sh" || echo "   ⚠️  install-deps.sh not found"  
rm -f start-local.sh 2>/dev/null && echo "   ✅ Removed start-local.sh" || echo "   ⚠️  start-local.sh not found"

echo "🗑️  Removing root package files (these are not needed)..."
rm -f package.json 2>/dev/null && echo "   ✅ Removed root package.json" || echo "   ⚠️  Root package.json not found"
rm -f package-lock.json 2>/dev/null && echo "   ✅ Removed root package-lock.json" || echo "   ⚠️  Root package-lock.json not found"

echo "🔍 Checking if dashboard-web is working first..."
if [ -d "dashboard-web" ] && [ -f "dashboard-web/server.js" ]; then
    echo "   ✅ dashboard-web directory exists and looks good"
    
    read -p "🗑️  Remove database-tools directory? (it's been replaced by dashboard-web) (y/N): " remove_db_tools
    
    if [[ $remove_db_tools == [yY] || $remove_db_tools == [yY][eE][sS] ]]; then
        if [ -d "database-tools" ]; then
            rm -rf database-tools
            echo "   ✅ Removed database-tools directory"
        else
            echo "   ⚠️  database-tools directory not found"
        fi
    else
        echo "   ⚠️  Keeping database-tools directory (you can remove it manually later)"
    fi
else
    echo "   ❌ dashboard-web not found or incomplete. Keeping database-tools as backup."
fi

echo ""
echo "🎉 Cleanup completed!"
echo ""
echo "📁 Your project structure is now:"
echo "   ├── backend/           # Main API server"  
echo "   ├── frontend/          # React user interface"
echo "   ├── dashboard-web/     # Admin dashboard (NEW - MAIN)"
echo "   └── README.md          # Documentation"
echo ""
echo "🚀 To start the dashboard:"
echo "   cd dashboard-web"
echo "   ./start.sh            # Linux/Mac"
echo "   start.bat             # Windows"
echo ""
echo "📖 Check CLEANUP_SUMMARY.md for more details"