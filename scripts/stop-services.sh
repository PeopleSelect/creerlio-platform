#!/bin/bash
# Creerlio Platform - Stop services script

echo "🛑 Stopping Creerlio Platform Services..."

# Kill processes by port
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo "✅ Frontend stopped" || echo "Frontend not running"
lsof -ti:5007 | xargs kill -9 2>/dev/null && echo "✅ Backend stopped" || echo "Backend not running"
lsof -ti:5088 | xargs kill -9 2>/dev/null && echo "✅ Backend HTTPS stopped" || echo "Backend HTTPS not running"

echo "✅ All services stopped"
