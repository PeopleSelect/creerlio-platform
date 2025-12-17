#!/bin/bash

# Creerlio Platform - Simple Azure Deployment Script
# Simplified version for quick deployment

set -e

echo "🚀 Simple Azure Deployment for Creerlio Platform"

# Configuration - Update these values
RESOURCE_GROUP="${RESOURCE_GROUP:-creerlio-platform-rg}"
WEB_APP_NAME="${WEB_APP_NAME:-creerlio-platform-$(date +%s)}"
LOCATION="${LOCATION:-eastus}"

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Install from: https://aka.ms/InstallAzureCLI"
    exit 1
fi

# Login
az account show &> /dev/null || az login

# Deploy
echo "📤 Deploying to Azure..."
cd "$(dirname "$0")/.."

az webapp up \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --runtime "PYTHON:3.11" \
    --logs

echo "✅ Deployment complete!"
echo "🌍 App URL: https://$WEB_APP_NAME.azurewebsites.net"



