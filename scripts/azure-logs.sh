#!/bin/bash

# AZURE LOGGING & MONITORING HELPER
# Provides commands to enable logging and monitor Azure webapps

echo "🔍 AZURE WEBAPP LOGGING & MONITORING"
echo "====================================="
echo ""

# Configuration from azure-deploy.yml
BACKEND_APP="creerlio-api"
FRONTEND_APP="creerlio-app"
RESOURCE_GROUP="creerlio-platform-rg"

echo "📋 Configuration:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   Backend App: $BACKEND_APP"
echo "   Frontend App: $FRONTEND_APP"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not installed"
    echo ""
    echo "📥 To install Azure CLI:"
    echo "   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash"
    echo ""
    echo "📝 Manual commands to run (after installing Azure CLI):"
    echo ""
else
    echo "✅ Azure CLI installed"
    
    # Check if logged in
    if az account show &> /dev/null; then
        SUBSCRIPTION=$(az account show --query name -o tsv)
        echo "✅ Logged in to Azure"
        echo "   Subscription: $SUBSCRIPTION"
        echo ""
    else
        echo "❌ Not logged in to Azure"
        echo "   Run: az login"
        echo ""
    fi
fi

echo "════════════════════════════════════"
echo "📋 AZURE LOGGING COMMANDS"
echo "════════════════════════════════════"
echo ""

echo "1️⃣  ENABLE LOGGING FOR BACKEND:"
echo "────────────────────────────────────"
echo "az webapp log config \\"
echo "  --name $BACKEND_APP \\"
echo "  --resource-group $RESOURCE_GROUP \\"
echo "  --application-logging filesystem \\"
echo "  --level verbose \\"
echo "  --web-server-logging filesystem"
echo ""

echo "2️⃣  STREAM BACKEND LOGS:"
echo "────────────────────────────────────"
echo "az webapp log tail \\"
echo "  --name $BACKEND_APP \\"
echo "  --resource-group $RESOURCE_GROUP"
echo ""

echo "3️⃣  ENABLE LOGGING FOR FRONTEND:"
echo "────────────────────────────────────"
echo "az webapp log config \\"
echo "  --name $FRONTEND_APP \\"
echo "  --resource-group $RESOURCE_GROUP \\"
echo "  --application-logging filesystem \\"
echo "  --level verbose \\"
echo "  --web-server-logging filesystem"
echo ""

echo "4️⃣  STREAM FRONTEND LOGS:"
echo "────────────────────────────────────"
echo "az webapp log tail \\"
echo "  --name $FRONTEND_APP \\"
echo "  --resource-group $RESOURCE_GROUP"
echo ""

echo "5️⃣  DOWNLOAD LOGS (ZIP FILE):"
echo "────────────────────────────────────"
echo "# Backend logs:"
echo "az webapp log download \\"
echo "  --name $BACKEND_APP \\"
echo "  --resource-group $RESOURCE_GROUP \\"
echo "  --log-file backend-logs.zip"
echo ""
echo "# Frontend logs:"
echo "az webapp log download \\"
echo "  --name $FRONTEND_APP \\"
echo "  --resource-group $RESOURCE_GROUP \\"
echo "  --log-file frontend-logs.zip"
echo ""

echo "6️⃣  CHECK APP STATUS:"
echo "────────────────────────────────────"
echo "az webapp show \\"
echo "  --name $BACKEND_APP \\"
echo "  --resource-group $RESOURCE_GROUP \\"
echo "  --query '{name:name,state:state,hostNames:defaultHostName}' \\"
echo "  --output table"
echo ""

echo "7️⃣  VIEW DEPLOYMENT LOGS:"
echo "────────────────────────────────────"
echo "az webapp deployment log show \\"
echo "  --name $BACKEND_APP \\"
echo "  --resource-group $RESOURCE_GROUP"
echo ""

echo "8️⃣  RESTART APPS:"
echo "────────────────────────────────────"
echo "# Restart backend:"
echo "az webapp restart \\"
echo "  --name $BACKEND_APP \\"
echo "  --resource-group $RESOURCE_GROUP"
echo ""
echo "# Restart frontend:"
echo "az webapp restart \\"
echo "  --name $FRONTEND_APP \\"
echo "  --resource-group $RESOURCE_GROUP"
echo ""

echo "════════════════════════════════════"
echo "🌐 WEB PORTAL LOGGING"
echo "════════════════════════════════════"
echo ""
echo "View logs in Azure Portal:"
echo "1. Go to: https://portal.azure.com"
echo "2. Navigate to: Resource Groups → $RESOURCE_GROUP"
echo "3. Select app: $BACKEND_APP or $FRONTEND_APP"
echo "4. Go to: Monitoring → Log stream"
echo "5. Or: Monitoring → App Service logs"
echo ""

echo "════════════════════════════════════"
echo "🔍 CURRENT ENDPOINT STATUS"
echo "════════════════════════════════════"
echo ""

echo "Testing backend endpoint..."
BACKEND_URL="https://$BACKEND_APP.azurewebsites.net"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BACKEND_URL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Backend: $BACKEND_URL"
    echo "   Status: HTTP $HTTP_CODE - RUNNING"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "⚠️  Backend: $BACKEND_URL"
    echo "   Status: Not reachable"
else
    echo "⚠️  Backend: $BACKEND_URL"
    echo "   Status: HTTP $HTTP_CODE"
fi
echo ""

echo "Testing frontend endpoint..."
FRONTEND_URL="https://$FRONTEND_APP.azurewebsites.net"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$FRONTEND_URL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Frontend: $FRONTEND_URL"
    echo "   Status: HTTP $HTTP_CODE - RUNNING"
elif [ "$HTTP_CODE" = "000" ]; then
    echo "⚠️  Frontend: $FRONTEND_URL"
    echo "   Status: Not reachable"
else
    echo "⚠️  Frontend: $FRONTEND_URL"
    echo "   Status: HTTP $HTTP_CODE"
fi
echo ""

echo "════════════════════════════════════"
echo "📊 GITHUB ACTIONS DEPLOYMENTS"
echo "════════════════════════════════════"
echo ""
echo "View deployment status:"
echo "https://github.com/Creerlio/creerlio-platform/actions"
echo ""

if command -v gh &> /dev/null; then
    echo "Recent workflow runs:"
    gh run list --limit 3 2>/dev/null || true
    echo ""
fi

echo "════════════════════════════════════"
echo ""
echo "💡 TIP: Copy any command above and run it directly in your terminal"
echo ""
