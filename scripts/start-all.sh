#!/bin/bash
set -e

echo "🚀 Starting Creerlio Platform..."
echo ""

# Kill existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "dotnet run" || true
pkill -f "next dev" || true
sleep 2

# Start backend
echo "🔧 Starting Backend API..."
cd /workspaces/creerlio-platform/backend/Creerlio.Api
nohup dotnet run > /tmp/backend.log 2>&1 &
echo "Backend starting... (PID: $!)"

# Wait for backend
echo "⏳ Waiting for backend to start..."
sleep 8
curl -s http://localhost:5007/api/masterdata/health > /dev/null && echo "✅ Backend is healthy!" || echo "⚠️  Backend not responding yet"

# Start frontend
echo "🎨 Starting Frontend..."
cd /workspaces/creerlio-platform/frontend/frontend-app
nohup npm run dev > /tmp/frontend.log 2>&1 &
echo "Frontend starting... (PID: $!)"

# Wait for frontend
echo "⏳ Waiting for frontend to start..."
sleep 8
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend is running!" || echo "⚠️  Frontend not responding yet"

echo ""
echo "📊 Service Status:"
echo "   Backend:  http://localhost:5007"
echo "   Frontend: http://localhost:3000"
echo ""
echo "📋 Logs:"
echo "   Backend:  tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo ""
echo "✅ All services started!"
