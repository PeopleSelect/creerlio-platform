#!/bin/bash
# Creerlio Platform - Auto-start services script
# This script starts both backend and frontend services in the background

set -e

echo "🚀 Starting Creerlio Platform Services..."
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Set ports to public visibility using GitHub CLI
echo -e "${YELLOW}📡 Setting port visibility to public...${NC}"
gh codespace ports visibility 3000:public 5007:public 5088:public -c $CODESPACE_NAME 2>/dev/null || echo "GitHub CLI not available or not authenticated"

# Kill any existing processes on the ports
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:5007 | xargs kill -9 2>/dev/null || true
lsof -ti:5088 | xargs kill -9 2>/dev/null || true

sleep 2

# Start Backend
echo -e "${BLUE}🔧 Starting Backend API (port 5007)...${NC}"
cd /workspaces/creerlio-platform/backend/Creerlio.Api
nohup dotnet run --urls "http://0.0.0.0:5007" > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:5007/api/masterdata/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  Backend taking longer than expected, check logs with: tail -f /tmp/backend.log${NC}"
    fi
    sleep 2
done

# Start Frontend
echo -e "${BLUE}⚛️  Starting Frontend (port 3000)...${NC}"
cd /workspaces/creerlio-platform/frontend/frontend-app
nohup npm run dev -- --port 3000 --hostname 0.0.0.0 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
echo "Waiting for frontend to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️  Frontend taking longer than expected, check logs with: tail -f /tmp/frontend.log${NC}"
    fi
    sleep 2
done

echo ""
echo -e "${GREEN}=========================================="
echo "✅ All services started successfully!"
echo "==========================================${NC}"
echo ""
echo "📊 Service URLs:"
echo "   Frontend:    https://$CODESPACE_NAME-3000.app.github.dev"
echo "   Backend API: https://$CODESPACE_NAME-5007.app.github.dev"
echo ""
echo "📋 Process IDs:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "📝 Log files:"
echo "   Backend:  tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo ""
echo "🛑 To stop services:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "🔄 To restart, run this script again"
echo ""
