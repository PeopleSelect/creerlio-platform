#!/bin/bash

# Deploy Next.js Frontend to Azure
set -e

echo "🚀 Azure Frontend Deployment Script"
echo "===================================="
echo ""

APP_NAME="creerlio-app"
RESOURCE_GROUP="creerlio-platform-rg"
FRONTEND_DIR="/workspaces/creerlio-platform/frontend/frontend-app"

cd "$FRONTEND_DIR"

# Step 1: Build
echo "🔨 Building Next.js app with standalone output..."
NEXT_PUBLIC_API_URL=https://creerlio-api.azurewebsites.net \
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiY3JlZXJsaW8iLCJhIjoiY21pY3IxZHljMXFwNTJzb2FydzR4b3F1YSJ9.Is8-GyfEdqwKKEo2cGO65g \
npm run build

echo ""
echo "✅ Build complete!"
echo ""

# Step 2: Check standalone output
if [ ! -d ".next/standalone" ]; then
    echo "❌ Error: Standalone build not found!"
    exit 1
fi

echo "📁 Standalone build directory:"
ls -la .next/standalone/ | head -10
echo ""

# Step 3: Package for deployment
echo "📦 Creating deployment package..."
cd .next/standalone

# Copy public files and static assets
cp -r ../../public ./public 2>/dev/null || echo "No public directory"
mkdir -p .next
cp -r ../.next/static ./.next/static 2>/dev/null || echo "No static directory"

# Create ZIP
zip -qr ../../frontend-standalone.zip * .next
cd ../..

echo "✅ Deployment package created!"
ls -lh frontend-standalone.zip
echo ""

# Step 4: Deploy to Azure
echo "🌐 Deploying to Azure Web App: $APP_NAME..."
az webapp deployment source config-zip \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --src frontend-standalone.zip

echo ""
echo "✅ Deployment complete!"
echo ""

# Step 5: Restart app
echo "🔄 Restarting app..."
az webapp restart --name "$APP_NAME" --resource-group "$RESOURCE_GROUP"

echo ""
echo "✅ App restarted!"
echo ""

# Step 6: Test endpoint
echo "🔍 Testing endpoint..."
sleep 10
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "https://$APP_NAME.azurewebsites.net")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Frontend is LIVE! HTTP $HTTP_CODE"
    echo "   https://$APP_NAME.azurewebsites.net"
else
    echo "⚠️  Frontend returned HTTP $HTTP_CODE"
    echo "   Stream logs to troubleshoot:"
    echo "   az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
fi

echo ""
echo "🎉 Deployment complete!"
