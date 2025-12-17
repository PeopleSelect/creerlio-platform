# Azure Deployment Setup Guide

This guide walks you through deploying the Creerlio Platform to Azure.

## Prerequisites

1. **Azure Account**: Sign up at [azure.microsoft.com](https://azure.microsoft.com)
2. **Azure CLI**: Install from [aka.ms/InstallAzureCLI](https://aka.ms/InstallAzureCLI)
3. **Git**: For version control
4. **Python 3.11+**: For backend services

## Step 1: Install Azure CLI

### Windows
```powershell
# Download and run the MSI installer
# Or use winget
winget install -e --id Microsoft.AzureCLI
```

### macOS
```bash
brew install azure-cli
```

### Linux
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

## Step 2: Login to Azure

```bash
az login
```

This will open a browser window for authentication.

## Step 3: Set Up Resource Group

```bash
# Set variables
RESOURCE_GROUP="creerlio-platform-rg"
LOCATION="eastus"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION
```

## Step 4: Configure Environment Variables

Before deploying, set up your environment variables in Azure:

```bash
WEB_APP_NAME="creerlio-platform"

az webapp config appsettings set \
    --name $WEB_APP_NAME \
    --resource-group $RESOURCE_GROUP \
    --settings \
        DATABASE_URL="your_database_url" \
        OPENAI_API_KEY="your_openai_key" \
        GOOGLE_MAPS_API_KEY="your_google_maps_key" \
        SECRET_KEY="your_secret_key"
```

Or use Azure Key Vault (recommended for production):
- See [AZURE_SECRETS_SETUP.md](./AZURE_SECRETS_SETUP.md)

## Step 5: Deploy Application

### Option A: Using Deployment Script

```bash
cd infra
chmod +x azure-deploy.sh
./azure-deploy.sh
```

### Option B: Using Simple Script

```bash
cd infra
chmod +x azure-deploy-simple.sh
./azure-deploy-simple.sh
```

### Option C: Manual Deployment

```bash
# Create App Service Plan
az appservice plan create \
    --name creerlio-plan \
    --resource-group creerlio-platform-rg \
    --sku B1 \
    --is-linux

# Create Web App
az webapp create \
    --name creerlio-platform \
    --resource-group creerlio-platform-rg \
    --plan creerlio-plan \
    --runtime "PYTHON:3.11"

# Deploy code
az webapp up \
    --name creerlio-platform \
    --resource-group creerlio-platform-rg \
    --runtime "PYTHON:3.11"
```

## Step 6: Set Up Database

### Option A: Azure Database for PostgreSQL

```bash
# Create PostgreSQL server
az postgres flexible-server create \
    --resource-group creerlio-platform-rg \
    --name creerlio-db \
    --location eastus \
    --admin-user adminuser \
    --admin-password YourPassword123! \
    --sku-name Standard_B1ms \
    --tier Burstable \
    --version 14

# Create database
az postgres flexible-server db create \
    --resource-group creerlio-platform-rg \
    --server-name creerlio-db \
    --database-name creerlio_db
```

### Option B: Use Existing Database

Update `DATABASE_URL` in app settings to point to your database.

## Step 7: Initialize Database

After deployment, initialize the database:

```bash
# SSH into the app
az webapp ssh --name creerlio-platform --resource-group creerlio-platform-rg

# Run database initialization
python -c "from app.database import init_db; init_db()"
```

Or create a startup script that runs automatically.

## Step 8: Configure Custom Domain (Optional)

```bash
az webapp config hostname add \
    --webapp-name creerlio-platform \
    --resource-group creerlio-platform-rg \
    --hostname yourdomain.com
```

## Step 9: Enable Logging

```bash
az webapp log config \
    --name creerlio-platform \
    --resource-group creerlio-platform-rg \
    --application-logging filesystem \
    --level information
```

## Step 10: Monitor Your Application

- **Azure Portal**: [portal.azure.com](https://portal.azure.com)
- **Application Insights**: Enable for detailed monitoring
- **Log Stream**: `az webapp log tail --name creerlio-platform --resource-group creerlio-platform-rg`

## Troubleshooting

### Common Issues

1. **Deployment Fails**
   - Check Python version compatibility
   - Verify all dependencies in `requirements.txt`
   - Review deployment logs: `az webapp log tail`

2. **Database Connection Errors**
   - Verify `DATABASE_URL` is correct
   - Check firewall rules allow Azure services
   - Ensure database server is running

3. **API Key Errors**
   - Verify all API keys are set in app settings
   - Check Key Vault access if using Key Vault

4. **Module Not Found**
   - Ensure `requirements.txt` includes all dependencies
   - Check Python path in Azure configuration

### View Logs

```bash
# Stream logs
az webapp log tail --name creerlio-platform --resource-group creerlio-platform-rg

# Download logs
az webapp log download --name creerlio-platform --resource-group creerlio-platform-rg
```

## Scaling

### Scale Up (Larger Instance)

```bash
az appservice plan update \
    --name creerlio-plan \
    --resource-group creerlio-platform-rg \
    --sku P1V2
```

### Scale Out (More Instances)

```bash
az appservice plan update \
    --name creerlio-plan \
    --resource-group creerlio-platform-rg \
    --number-of-workers 3
```

## Cost Optimization

- Use **B1** tier for development/testing
- Use **P1V2** or higher for production
- Enable auto-scaling based on metrics
- Use Azure Reserved Instances for long-term savings

## Next Steps

- Set up CI/CD pipeline (GitHub Actions, Azure DevOps)
- Configure Application Insights
- Set up backup and disaster recovery
- Review [AZURE_SECRETS_SETUP.md](./AZURE_SECRETS_SETUP.md) for secure secret management

## Support

For issues or questions:
- Azure Documentation: [docs.microsoft.com/azure](https://docs.microsoft.com/azure)
- Azure Support: [azure.microsoft.com/support](https://azure.microsoft.com/support)



