#!/bin/bash

# Creerlio Platform - Azure Deployment Script
# This script deploys both frontend (Next.js) and backend (.NET) to Azure

set -e

echo "🚀 Creerlio Platform - Azure Deployment"
echo "========================================"

# Configuration
RESOURCE_GROUP="creerlio-platform-rg"
LOCATION="australiaeast"
BACKEND_APP_NAME="creerlio-api"
FRONTEND_APP_NAME="creerlio-app"
SQL_SERVER_NAME="creerlio-sql-server"
SQL_DB_NAME="creerlio-db"
SQL_ADMIN_USER="creerl_admin"
SQL_ADMIN_PASSWORD="Cr33rl!o@2025#SecureDB$Pass"

echo ""
echo "📋 Configuration:"
echo "   Resource Group: $RESOURCE_GROUP"
echo "   Location: $LOCATION"
echo "   Backend App: $BACKEND_APP_NAME"
echo "   Frontend App: $FRONTEND_APP_NAME"
echo ""

# Check if logged in to Azure
echo "🔐 Checking Azure login status..."
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure"
    echo "Please run: az login"
    exit 1
fi

SUBSCRIPTION=$(az account show --query name -o tsv)
echo "✅ Logged in to Azure"
echo "   Subscription: $SUBSCRIPTION"
echo ""

# Create Resource Group
echo "📦 Creating Resource Group..."
az group create \
    --name $RESOURCE_GROUP \
    --location $LOCATION \
    --output table

# Create Azure SQL Server
echo ""
echo "🗄️  Creating Azure SQL Server..."
az sql server create \
    --name $SQL_SERVER_NAME \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --admin-user $SQL_ADMIN_USER \
    --admin-password $SQL_ADMIN_PASSWORD \
    --output table

# Configure SQL Server firewall to allow Azure services
echo ""
echo "🔓 Configuring SQL Server firewall..."
az sql server firewall-rule create \
    --resource-group $RESOURCE_GROUP \
    --server $SQL_SERVER_NAME \
    --name AllowAzureServices \
    --start-ip-address 0.0.0.0 \
    --end-ip-address 0.0.0.0 \
    --output table

# Create SQL Database
echo ""
echo "💾 Creating SQL Database..."
az sql db create \
    --resource-group $RESOURCE_GROUP \
    --server $SQL_SERVER_NAME \
    --name $SQL_DB_NAME \
    --service-objective S0 \
    --output table

# Get SQL connection string
SQL_CONNECTION_STRING="Server=tcp:${SQL_SERVER_NAME}.database.windows.net,1433;Initial Catalog=${SQL_DB_NAME};Persist Security Info=False;User ID=${SQL_ADMIN_USER};Password=${SQL_ADMIN_PASSWORD};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

echo ""
echo "✅ SQL Database created"
echo ""

# Create App Service Plan
echo "📊 Creating App Service Plan..."
az appservice plan create \
    --name "${RESOURCE_GROUP}-plan" \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --sku B1 \
    --is-linux \
    --output table

# Create Backend Web App (.NET)
echo ""
echo "🔧 Creating Backend Web App..."
az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan "${RESOURCE_GROUP}-plan" \
    --name $BACKEND_APP_NAME \
    --runtime "DOTNETCORE:8.0" \
    --output table

# Configure Backend App Settings
echo ""
echo "⚙️  Configuring Backend App Settings..."
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $BACKEND_APP_NAME \
    --settings \
        ConnectionStrings__DefaultConnection="$SQL_CONNECTION_STRING" \
        ASPNETCORE_ENVIRONMENT="Production" \
    --output table

# Create Frontend Web App (Node.js for Next.js)
echo ""
echo "🎨 Creating Frontend Web App..."
az webapp create \
    --resource-group $RESOURCE_GROUP \
    --plan "${RESOURCE_GROUP}-plan" \
    --name $FRONTEND_APP_NAME \
    --runtime "NODE|20-lts" \
    --output table

# Configure Frontend App Settings
echo ""
echo "⚙️  Configuring Frontend App Settings..."
az webapp config appsettings set \
    --resource-group $RESOURCE_GROUP \
    --name $FRONTEND_APP_NAME \
    --settings \
        NEXT_PUBLIC_API_URL="https://${BACKEND_APP_NAME}.azurewebsites.net" \
        NODE_ENV="production" \
    --output table

# Configure deployment settings for both apps
echo ""
echo "🔄 Enabling local Git deployment..."
az webapp deployment source config-local-git \
    --name $BACKEND_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --output table

az webapp deployment source config-local-git \
    --name $FRONTEND_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --output table

echo ""
echo "✅ Azure resources created successfully!"
echo ""
echo "📝 Deployment URLs:"
echo "   Backend API: https://${BACKEND_APP_NAME}.azurewebsites.net"
echo "   Frontend App: https://${FRONTEND_APP_NAME}.azurewebsites.net"
echo ""
echo "🗄️  Database Connection:"
echo "   Server: ${SQL_SERVER_NAME}.database.windows.net"
echo "   Database: ${SQL_DB_NAME}"
echo "   Username: ${SQL_ADMIN_USER}"
echo ""
echo "📦 Next steps:"
echo "   1. Deploy backend: cd backend && az webapp up --name $BACKEND_APP_NAME --resource-group $RESOURCE_GROUP"
echo "   2. Deploy frontend: cd frontend/frontend-app && npm run build && az webapp up --name $FRONTEND_APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
echo "💡 Or use GitHub Actions for continuous deployment (see .github/workflows/)"
echo ""
