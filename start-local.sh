#!/bin/bash

# Local Development Startup Script
# This script starts both frontend and backend for local development

echo "🚀 Starting Fund Request App for Local Development"
echo "================================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if MongoDB is running (optional)
echo "📋 Checking system requirements..."

# Start Backend
echo "🔧 Starting Backend Server..."
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
npm start &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start Frontend
echo "⚛️  Starting Frontend Server..."
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
echo "🔧 Backend:  http://localhost:5000"
echo "⚛️  Frontend: http://localhost:3000"
echo "📊 API:      http://localhost:5000/api/health"
echo ""
echo "📝 To stop servers: Ctrl+C or run 'killall node'"
echo "💾 Make sure MongoDB is running locally"
echo ""

# Wait for user to stop
wait