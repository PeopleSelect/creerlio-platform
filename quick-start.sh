#!/bin/bash

# Creerlio Platform - Quick Start Script
# This script sets up and starts the entire platform

set -e

echo "🚀 Creerlio Platform - Quick Start"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from template...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env and add your API keys before continuing${NC}"
    echo ""
    read -p "Press Enter after you've added your API keys, or Ctrl+C to exit..."
fi

# Backend Setup
echo -e "${GREEN}📦 Setting up backend...${NC}"
cd backend

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

echo "Activating virtual environment..."
source venv/bin/activate

echo "Installing Python dependencies..."
pip install -q -r ../requirements.txt

echo "Initializing database..."
python -c "from app.database import init_db; init_db()" 2>/dev/null || echo "Database initialization skipped (may already exist)"

echo -e "${GREEN}✅ Backend setup complete!${NC}"
echo ""

# Frontend Setup
echo -e "${GREEN}📦 Setting up frontend...${NC}"
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
else
    echo "Node modules already installed"
fi

echo -e "${GREEN}✅ Frontend setup complete!${NC}"
echo ""

# Start services
echo -e "${GREEN}🌐 Starting services...${NC}"
echo ""
echo "Backend will run on: http://localhost:8000"
echo "Frontend will run on: http://localhost:3000"
echo "API docs will be at: http://localhost:8000/docs"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Start backend in background
cd ../backend
source venv/bin/activate
python main.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Wait for processes
wait

