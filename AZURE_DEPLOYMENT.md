# Azure Deployment Guide - Creerlio Platform

## Quick Deploy

### Option 1: Automated Script (Recommended)

```bash
# Make script executable
chmod +x azure-deploy.sh

# Login to Azure
az login

# Run deployment script
./azure-deploy.sh
```

This will create:
- ✅ Resource Group in Australia East
- ✅ Azure SQL Server and Database
- ✅ App Service Plan (B1 tier)
- ✅ Backend Web App (.NET 8.0)
- ✅ Frontend Web App (Node.js 20)

### Option 2: Manual Deployment

#### 1. Login to Azure
```bash
az login
```

#### 2. Create Resource Group
```bash
az group create \
  --name creerlio-platform-rg \
  --location australiaeast
```

#### 3. Deploy Backend
```bash
cd backend
az webapp up \
  --name creerlio-api \
  --resource-group creerlio-platform-rg \
  --runtime "DOTNET:8.0" \
  --sku B1
```

#### 4. Deploy Frontend
```bash
cd frontend/frontend-app
npm run build
az webapp up \
  --name creerlio-app \
  --resource-group creerlio-platform-rg \
  --runtime "NODE:20-lts" \
  --sku B1
```

## Configuration

### Backend Environment Variables
Set these in Azure Portal → App Service → Configuration:

```
ConnectionStrings__DefaultConnection = "Server=tcp:creerlio-sql-server.database.windows.net,1433;Initial Catalog=creerlio-db;..."
ASPNETCORE_ENVIRONMENT = Production
JWT_SECRET = <your-secret-key>
JWT_ISSUER = https://creerlio-api.azurewebsites.net
JWT_AUDIENCE = https://creerlio-app.azurewebsites.net
```

### Frontend Environment Variables
```
NEXT_PUBLIC_API_URL = https://creerlio-api.azurewebsites.net
NODE_ENV = production
NEXT_PUBLIC_CANVA_API_KEY = <your-canva-key>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = <your-maps-key>
```

## Continuous Deployment (GitHub Actions)

### Setup Steps:

1. **Get Publish Profiles from Azure:**
   ```bash
   # Backend
   az webapp deployment list-publishing-profiles \
     --name creerlio-api \
     --resource-group creerlio-platform-rg \
     --xml
   
   # Frontend
   az webapp deployment list-publishing-profiles \
     --name creerlio-app \
     --resource-group creerlio-platform-rg \
     --xml
   ```

2. **Add GitHub Secrets:**
   - Go to GitHub Repository → Settings → Secrets and variables → Actions
   - Add secrets:
     - `AZURE_BACKEND_PUBLISH_PROFILE` (paste backend XML)
     - `AZURE_FRONTEND_PUBLISH_PROFILE` (paste frontend XML)

3. **Push to main branch:**
   ```bash
   git add .
   git commit -m "Deploy to Azure"
   git push origin main
   ```

GitHub Actions will automatically deploy on every push to main.

## Post-Deployment Steps

### 1. Run Database Migrations
```bash
# SSH into backend app
az webapp ssh --name creerlio-api --resource-group creerlio-platform-rg

# Inside the app
dotnet ef database update
```

Or migrations will run automatically on first start (configured in Program.cs).

### 2. Seed Master Data
The backend automatically seeds master data on first run.

### 3. Configure Custom Domain (Optional)
```bash
az webapp config hostname add \
  --webapp-name creerlio-app \
  --resource-group creerlio-platform-rg \
  --hostname www.creerlio.com
```

### 4. Enable SSL
```bash
az webapp config ssl bind \
  --name creerlio-app \
  --resource-group creerlio-platform-rg \
  --certificate-thumbprint <thumbprint> \
  --ssl-type SNI
```

## Monitoring

### View Logs
```bash
# Backend logs
az webapp log tail --name creerlio-api --resource-group creerlio-platform-rg

# Frontend logs
az webapp log tail --name creerlio-app --resource-group creerlio-platform-rg
```

### Application Insights
Enable Application Insights in Azure Portal for:
- Performance monitoring
- Error tracking
- User analytics

## Scaling

### Scale Up (Vertical)
```bash
az appservice plan update \
  --name creerlio-platform-rg-plan \
  --resource-group creerlio-platform-rg \
  --sku P1V2
```

### Scale Out (Horizontal)
```bash
az appservice plan update \
  --name creerlio-platform-rg-plan \
  --resource-group creerlio-platform-rg \
  --number-of-workers 3
```

## Cost Estimate

**Basic Setup (B1 tier):**
- App Service Plan: ~$13 USD/month
- Azure SQL S0: ~$15 USD/month
- **Total: ~$28 USD/month**

**Production Setup (P1V2 tier + SQL S3):**
- App Service Plan: ~$140 USD/month
- Azure SQL S3: ~$100 USD/month
- **Total: ~$240 USD/month**

## Troubleshooting

### Backend not starting
```bash
# Check logs
az webapp log tail --name creerlio-api --resource-group creerlio-platform-rg

# Restart app
az webapp restart --name creerlio-api --resource-group creerlio-platform-rg
```

### Frontend build errors
```bash
# Check build logs in Azure Portal → Deployment Center → Logs
# Or SSH into the app
az webapp ssh --name creerlio-app --resource-group creerlio-platform-rg
```

### Database connection issues
```bash
# Test connection
az sql db show-connection-string \
  --server creerlio-sql-server \
  --name creerlio-db \
  --client ado.net
```

## URLs After Deployment

- **Frontend:** https://creerlio-app.azurewebsites.net
- **Backend API:** https://creerlio-api.azurewebsites.net
- **API Health:** https://creerlio-api.azurewebsites.net/health

## Clean Up Resources

```bash
# Delete entire resource group (removes everything)
az group delete --name creerlio-platform-rg --yes --no-wait
```

---

**Ready to deploy?** Run `./azure-deploy.sh` to get started!
