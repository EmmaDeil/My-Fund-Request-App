#!/bin/bash

# Quick Setup Script - Reinstall Dependencies
# This script reinstalls all dependencies after cleanup

echo "🧹 Reinstalling Dependencies After Cleanup"
echo "=========================================="

# Install Backend Dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
if [ $? -eq 0 ]; then
    echo "✅ Backend dependencies installed successfully"
else
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

cd ..

# Install Frontend Dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
if [ $? -eq 0 ]; then
    echo "✅ Frontend dependencies installed successfully"
else
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

cd ..

echo ""
echo "🎉 All dependencies reinstalled successfully!"
echo "✨ Your project is ready for development"
echo ""
echo "To start the application:"
echo "  ./start-local.sh"
echo ""
echo "Or manually:"
echo "  Terminal 1: cd backend && npm start"
echo "  Terminal 2: cd frontend && npm start"