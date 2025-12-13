# Azure Deployment Setup Guide

## Current Status
- Backend API exists: `creerlio-api.azurewebsites.net` (old version running)
- Frontend App exists: `creerlio-app.azurewebsites.net` (deployment failed)

## Required GitHub Secrets

### 1. AZURE_CREDENTIALS
Azure service principal for authentication. Create with:

```bash
az ad sp create-for-rbac \
  --name "creerlio-github-deploy" \
  --role contributor \
  --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group} \
  --sdk-auth
```

This outputs JSON like:
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "...",
  "tenantId": "...",
  "activeDirectoryEndpointUrl": "...",
  "resourceManagerEndpointUrl": "...",
  "activeDirectoryGraphResourceId": "...",
  "sqlManagementEndpointUrl": "...",
  "galleryEndpointUrl": "...",
  "managementEndpointUrl": "..."
}
```

Add this entire JSON to GitHub secrets as `AZURE_CREDENTIALS`.

### 2. MAPBOX_TOKEN
Your Mapbox public token (already in .env.local):
```
pk.eyJ1IjoiY3JlZXJsaW8iLCJhIjoiY21pY3IxZHljMXFwNTJzb2FydzR4b3F1YSJ9.Is8-GyfEdqwKKEo2cGO65g
```

Add to GitHub secrets as `MAPBOX_TOKEN`.

## Steps to Deploy

### 1. Add Secrets to GitHub
1. Go to https://github.com/Creerlio/creerlio-platform/settings/secrets/actions
2. Click "New repository secret"
3. Add `AZURE_CREDENTIALS` with the service principal JSON
4. Add `MAPBOX_TOKEN` with your Mapbox token

### 2. Verify Azure Resources
Check that these exist:
```bash
az webapp show --name creerlio-api --resource-group <your-rg>
az webapp show --name creerlio-app --resource-group <your-rg>
```

### 3. Configure Azure App Settings
For `creerlio-app` (frontend), add these application settings:
```bash
az webapp config appsettings set \
  --name creerlio-app \
  --resource-group <your-rg> \
  --settings \
    NEXT_PUBLIC_API_URL="https://creerlio-api.azurewebsites.net" \
    NEXT_PUBLIC_MAPBOX_TOKEN="<your-mapbox-token>"
```

### 4. Trigger Deployment
Push to main branch:
```bash
git push origin main
```

Or manually trigger from GitHub Actions tab.

## Deployment Workflow

The workflow will:
1. ✅ **Build Backend** - Restore, build, publish .NET 8 API
2. ✅ **Deploy Backend** - Upload to creerlio-api.azurewebsites.net
3. ✅ **Build Frontend** - Install deps, build Next.js with correct API URL
4. ✅ **Deploy Frontend** - Upload standalone build to creerlio-app.azurewebsites.net

## Verification

After successful deployment:

**Backend**:
```bash
curl https://creerlio-api.azurewebsites.net
# Should return: "Creerlio API is running"

curl https://creerlio-api.azurewebsites.net/swagger
# Should show Swagger UI
```

**Frontend**:
```bash
curl https://creerlio-app.azurewebsites.net
# Should return HTML

# Test map page
open https://creerlio-app.azurewebsites.net/talent/map
```

## New Map Features Deployed

Once deployment succeeds, these endpoints will be live:

### Backend API
- `POST /api/saved-locations` - Save location
- `GET /api/saved-locations/user/{userId}` - Get saved locations
- `POST /api/map/amenities` - Search nearby amenities (7 categories)
- `POST /api/map/commute-costs` - Calculate commute costs
- `POST /api/map/compare-routes` - Compare route options
- `POST /api/map/traffic` - Get traffic conditions

### Frontend Features
- 📍 Saved Locations (home, work, favorites)
- 💰 Commute Cost Calculator (daily/weekly/monthly/yearly)
- 🏪 Nearby Amenities (cafes, gyms, childcare, supermarkets, pharmacies, restaurants, medical)
- 🚗 Route Calculator
- Plus existing schools and properties

## Troubleshooting

### Deployment Fails with "No credentials found"
- Verify `AZURE_CREDENTIALS` secret is set correctly
- Check the JSON format is valid
- Ensure service principal has contributor role

### Frontend shows "Application Error"
- Check application settings are configured
- Verify `NEXT_PUBLIC_API_URL` points to backend
- Check logs: `az webapp log tail --name creerlio-app --resource-group <your-rg>`

### Backend 404 on new endpoints
- Deployment may not have completed
- Check: `curl https://creerlio-api.azurewebsites.net/swagger` to see if new endpoints listed
- Restart app: `az webapp restart --name creerlio-api --resource-group <your-rg>`

## Manual Deployment (if GitHub Actions unavailable)

### Backend
```bash
cd backend
dotnet publish Creerlio.Api/Creerlio.Api.csproj -c Release -o publish
cd publish
zip -r ../deploy.zip *
az webapp deployment source config-zip \
  --name creerlio-api \
  --resource-group <your-rg> \
  --src ../deploy.zip
```

### Frontend
```bash
cd frontend/frontend-app
npm run build
cd .next/standalone
zip -r ../../../frontend-deploy.zip *
az webapp deployment source config-zip \
  --name creerlio-app \
  --resource-group <your-rg> \
  --src ../../../frontend-deploy.zip
```

---

**Last Updated**: November 27, 2025
**Workflow File**: `.github/workflows/azure-deploy.yml`
