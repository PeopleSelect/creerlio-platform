#!/bin/bash
# Creerlio Platform - Check service status

echo "📊 Creerlio Platform Service Status"
echo "===================================="

# Check Backend
if curl -s http://localhost:5007/api/masterdata/health > /dev/null 2>&1; then
    echo "✅ Backend (port 5007): RUNNING"
    BACKEND_PID=$(lsof -ti:5007)
    echo "   PID: $BACKEND_PID"
else
    echo "❌ Backend (port 5007): NOT RUNNING"
fi

# Check Frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend (port 3000): RUNNING"
    FRONTEND_PID=$(lsof -ti:3000)
    echo "   PID: $FRONTEND_PID"
else
    echo "❌ Frontend (port 3000): NOT RUNNING"
fi

echo ""
echo "🌐 Service URLs (if running):"
echo "   Frontend:    https://$CODESPACE_NAME-3000.app.github.dev"
echo "   Backend API: https://$CODESPACE_NAME-5007.app.github.dev"
echo ""
echo "📝 View logs:"
echo "   Backend:  tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
