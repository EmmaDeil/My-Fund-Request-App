#!/bin/bash

# Local Development Startup Script
# This script starts both frontend and backend for local development

echo "🚀 Starting Fund Request App for Local Development"
echo "================================================"

# Set development environment
export NODE_ENV=development

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MongoDB is running (optional)
echo "📋 Checking system requirements..."

# Start Backend in Development Mode
echo "🔧 Starting Backend Server (Development Mode)..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Please copy .env.example to .env and configure it."
    echo "   cp .env.example .env"
    exit 1
fi

# Start backend in background
NODE_ENV=development npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start Frontend in Development Mode
echo "⚛️  Starting Frontend Server (Development Mode)..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Local Development Servers Started!"
echo "================================================"
echo "🔧 Backend:  http://localhost:5000 (Development)"
echo "⚛️  Frontend: http://localhost:3000 (Development)"
echo "📊 API:      http://localhost:5000/api/health"
echo ""
echo "📝 To stop servers: Ctrl+C or run 'killall node'"
echo "💾 Make sure MongoDB is running locally or Atlas is accessible"
echo ""

# Wait for user to stop
wait