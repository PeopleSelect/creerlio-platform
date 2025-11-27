#!/bin/bash

# Script to automatically set Codespaces ports to Public visibility
# This fixes the CORS issue that occurs when ports default to Private

echo "🔧 Configuring Codespaces port visibility..."

# Use GitHub CLI to set port visibility to public
if command -v gh &> /dev/null; then
    echo "📡 Setting port 3000 (Frontend) to Public..."
    gh codespace ports visibility 3000:public -c $CODESPACE_NAME 2>/dev/null || echo "⚠️  Could not set port 3000 (may need manual configuration)"
    
    echo "📡 Setting port 5007 (Backend API) to Public..."
    gh codespace ports visibility 5007:public -c $CODESPACE_NAME 2>/dev/null || echo "⚠️  Could not set port 5007 (may need manual configuration)"
    
    echo "✅ Port visibility configuration complete!"
    echo ""
    echo "📋 If ports are still Private, manually set them:"
    echo "   1. Go to the PORTS tab in VS Code"
    echo "   2. Right-click port 3000 → Port Visibility → Public"
    echo "   3. Right-click port 5007 → Port Visibility → Public"
else
    echo "⚠️  GitHub CLI not found. Please manually set ports to Public:"
    echo "   1. Go to the PORTS tab in VS Code"
    echo "   2. Right-click port 3000 → Port Visibility → Public"
    echo "   3. Right-click port 5007 → Port Visibility → Public"
fi

echo ""
echo "🌐 Current Codespace: $CODESPACE_NAME"
echo "📍 Frontend will be at: https://$CODESPACE_NAME-3000.app.github.dev"
echo "📍 Backend will be at: https://$CODESPACE_NAME-5007.app.github.dev"
