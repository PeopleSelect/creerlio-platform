#!/bin/bash

# Creerlio Platform - Azure Deployment Script
# This script deploys the Creerlio Platform to Azure

set -e

echo "🚀 Starting Azure Deployment for Creerlio Platform..."

# Configuration
RESOURCE_GROUP="creerlio-platform-rg"
LOCATION="eastus"
APP_SERVICE_PLAN="creerlio-plan"
WEB_APP_NAME="creerlio-platform"
SKU="B1"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first."
    exit 1
fi

# Login check
echo "📋 Checking Azure login status..."
az account show &> /dev/null || {
    echo "⚠️  Not logged in to Azure. Please run: az login"
    exit 1
}

# Create resource group
echo "📦 Creating resource group..."
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION \
    --output none

# Create App Service Plan
echo "📋 Creating App Service Plan..."
az appservice plan create \
    --name $APP_SERVICE_PLAN \
    --resource-group $RESOURCE_GROUP \
    --sku $SKU \
    --is-linux \
    --output none

# Create Web App
echo "🌐 Creating Web App..."
az webapp create \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --plan $APP_SERVICE_PLAN \
    --runtime "PYTHON:3.11" \
    --output none

# Configure app settings
echo "⚙️  Configuring app settings..."
az webapp config appsettings set \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
        WEBSITES_ENABLE_APP_SERVICE_STORAGE=true \
        SCM_DO_BUILD_DURING_DEPLOYMENT=true \
    --output none

# Deploy from local directory
echo "📤 Deploying application..."
cd "$(dirname "$0")/.."
az webapp up \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --runtime "PYTHON:3.11" \
    --output none

echo "✅ Deployment complete!"
echo "🌍 Your app is available at: https://$WEB_APP_NAME.azurewebsites.net"


