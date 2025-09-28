#!/bin/bash

# Fund Request Dashboard Web Starter Script

echo "🚀 Starting Fund Request Dashboard Web..."
echo "📁 Working directory: $(pwd)"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed  
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Are you in the dashboard-web directory?"
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️ .env file not found. Copying from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "📝 Please edit .env file with your configuration before starting the server."
        echo "   - Set your MongoDB URI"
        echo "   - Configure email settings"
        read -p "Press Enter to continue once you've configured .env..."
    else
        echo "❌ .env.example not found. Please create .env file with required settings."
        exit 1
    fi
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Check if MongoDB URI is set
if ! grep -q "MONGODB_URI.*mongodb" .env; then
    echo "⚠️ MongoDB URI appears to be not configured in .env"
    echo "   Please set MONGODB_URI=mongodb://localhost:27017/fundRequestDB"
fi

# Start the server
echo "🌐 Starting dashboard server..."
echo "📊 Dashboard will be available at http://localhost:3001"
echo "🔄 Press Ctrl+C to stop the server"
echo ""

npm start