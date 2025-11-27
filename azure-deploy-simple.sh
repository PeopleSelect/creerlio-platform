#!/bin/bash

# Quick Azure Deployment - Frontend Only
# Deploys Next.js to Azure Static Web Apps (no SQL needed initially)

set -e

echo "🚀 Creerlio Platform - Quick Frontend Deployment"
echo "================================================"

RESOURCE_GROUP="creerlio-platform-rg"
LOCATION="australiaeast"
FRONTEND_APP_NAME="creerlio-frontend"

echo "📦 Using existing Resource Group: $RESOURCE_GROUP"
echo ""

# Create Static Web App for Frontend
echo "🎨 Creating Static Web App for Frontend..."
az staticwebapp create \
    --name $FRONTEND_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --source https://github.com/Creerlio/creerlio-platform \
    --branch main \
    --app-location "frontend/frontend-app" \
    --output-location ".next" \
    --login-with-github

echo ""
echo "✅ Static Web App created!"
echo ""
echo "📝 Frontend URL: https://${FRONTEND_APP_NAME}.azurestaticapps.net"
echo ""
echo "💡 Next steps:"
echo "   1. Configure GitHub Actions (automatically created)"
echo "   2. Push to main branch to trigger deployment"
echo "   3. Add backend API later when SQL is ready"
echo ""
