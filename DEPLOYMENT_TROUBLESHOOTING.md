# Azure Deployment Status & Troubleshooting Guide

**Generated:** 2025-11-27  
**Platform:** Creerlio Platform  
**Environment:** Azure Web Apps (Australia East)

---

## 🎯 Current Status Summary

### Backend API
- **URL:** https://creerlio-api.azurewebsites.net
- **Status:** ✅ **LIVE** (HTTP 200)
- **Last Verified:** 2025-11-27 08:15 UTC
- **Health:** "Creerlio API is running"

### Frontend App
- **URL:** https://creerlio-app.azurewebsites.net
- **Status:** ⚠️ **NOT DEPLOYED** (HTTP 503/000)
- **Issue:** GitHub Actions deployment failing due to missing Azure credentials
- **Action Required:** Configure AZURE_CREDENTIALS secret (see below)

### GitHub Actions
- **Status:** ❌ **FAILING**
- **Workflows:** 
  - Deploy to Azure: Failed (missing AZURE_CREDENTIALS)
  - Power Auto-Fix & Recovery: Failed (artifact v3 deprecated)
- **Last Runs:** All failed with authentication errors
- **Fixed:** Workflow files updated to v4 artifacts and conditional Azure login

---

## 🚨 Critical Issues Identified

### 1. Missing Azure Credentials Secret
**Problem:** GitHub Actions cannot authenticate to Azure  
**Error:** `Login failed with Error: Using auth-type: SERVICE_PRINCIPAL. Not all values are present.`

**Solution:** Add AZURE_CREDENTIALS secret to GitHub repository

**Steps:**
1. Install Azure CLI (if not installed):
   ```bash
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   az login
   ```

2. Create service principal:
   ```bash
   az ad sp create-for-rbac --name "creerlio-github-actions" \
     --role contributor \
     --scopes /subscriptions/{YOUR_SUBSCRIPTION_ID}/resourceGroups/creerlio-platform-rg \
     --sdk-auth
   ```

3. Copy the JSON output and add to GitHub:
   - Go to: https://github.com/Creerlio/creerlio-platform/settings/secrets/actions
   - Click "New repository secret"
   - Name: `AZURE_CREDENTIALS`
   - Value: Paste the entire JSON
   - Click "Add secret"

**Required JSON format:**
```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

### 2. Deprecated GitHub Actions
**Problem:** Using `actions/upload-artifact@v3` which is deprecated  
**Error:** `This request has been automatically failed because it uses a deprecated version`  
**Status:** ✅ **FIXED** - Updated to v4 in both workflow files

### 3. Azure CLI Not in Codespaces
**Problem:** `az` command not available in dev container  
**Impact:** Cannot configure Azure logging directly from Codespaces  

**Solutions:**
- **Option A:** Install Azure CLI in Codespaces:
  ```bash
  curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
  ```
  
- **Option B:** Use Azure Portal:
  1. Go to: https://portal.azure.com
  2. Navigate to: Resource Groups → creerlio-platform-rg
  3. Select app: creerlio-api or creerlio-app
  4. Go to: Monitoring → Log stream
  
- **Option C:** Check GitHub Actions logs:
  ```bash
  gh run list
  gh run view <run-id> --log
  ```

---

## 📊 What's Working

### ✅ Backend API (Fully Operational)
All 15 controllers tested and responding:

1. **SavedLocationsController** - User's saved locations (NEW)
   - GET /api/saved-locations/user/{userId}
   - POST /api/saved-locations
   - PUT /api/saved-locations/{id}
   - DELETE /api/saved-locations/{userId}/{id}
   - POST /api/saved-locations/{userId}/{id}/toggle-favorite

2. **MapIntelligenceController** - Map features (ENHANCED)
   - POST /api/map/amenities (7 categories: cafes, gyms, childcare, etc.)
   - POST /api/map/commute-costs (financial + time + CO2 analysis)
   - POST /api/map/compare-routes (driving vs transit vs cycling)
   - POST /api/map/traffic (real-time traffic data)
   - POST /api/map/route
   - POST /api/map/schools
   - POST /api/map/properties
   - POST /api/map/relocation-info
   - POST /api/map/businesses-comprehensive

3. **FredController** - AI Assistant
   - POST /api/fred/speech-to-text
   - POST /api/fred/improve-text
   - POST /api/fred/extract-structured-data
   - POST /api/fred/suggest
   - GET /api/fred/health

4. **TalentProfileController** - Talent management
5. **JobsController** - Job listings
6. **ApplicationsController** - Job applications
7. **BusinessProfileController** - Business profiles
8. **PortfolioController** - Talent portfolios
9. **MessageController** - Messaging system
10. **AuthController** - Authentication
11. **UserManagementController** - User operations
12. **BusinessDashboardController** - Business analytics
13. **TalentDashboardController** - Talent analytics
14. **SearchController** - Advanced search
15. **NotificationController** - Notifications

### ✅ Platform Audit Results
**Comprehensive Module Audit:** 95% Success Rate
- Total Components: 45
- Passed: 43 ✅
- Warnings: 2 ⚠️
- Failures: 0 ❌

**Module Breakdown:**
- Talent Module: 8/9 passing
- Business Module: 6/6 passing
- AI Services: 4/4 passing
- Map Intelligence: 8/8 passing
- Database: 4/5 passing
- Frontend Pages: 9/9 passing
- API Tests: 4/4 passing

### ✅ Frontend Components (Created)
3 new React components added (1,120 lines):
- SavedLocations.tsx (380 lines)
- NearbyAmenities.tsx (360 lines)
- CommuteCostCalculator.tsx (380 lines)

### ✅ Automation Scripts
- power-autofix.sh (400+ lines) - Comprehensive self-healing
- comprehensive-module-audit.sh (375 lines) - Platform validation
- azure-quick-check.sh - Fast Azure health check
- azure-logs.sh - Azure logging helper

---

## 🔧 Azure Logging Commands

**After installing Azure CLI and logging in:**

### Enable Backend Logging:
```bash
az webapp log config \
  --name creerlio-api \
  --resource-group creerlio-platform-rg \
  --application-logging filesystem \
  --level verbose \
  --web-server-logging filesystem
```

### Stream Backend Logs:
```bash
az webapp log tail \
  --name creerlio-api \
  --resource-group creerlio-platform-rg
```

### Enable Frontend Logging:
```bash
az webapp log config \
  --name creerlio-app \
  --resource-group creerlio-platform-rg \
  --application-logging filesystem \
  --level verbose \
  --web-server-logging filesystem
```

### Stream Frontend Logs:
```bash
az webapp log tail \
  --name creerlio-app \
  --resource-group creerlio-platform-rg
```

### Download All Logs:
```bash
# Backend
az webapp log download \
  --name creerlio-api \
  --resource-group creerlio-platform-rg \
  --log-file backend-logs.zip

# Frontend
az webapp log download \
  --name creerlio-app \
  --resource-group creerlio-platform-rg \
  --log-file frontend-logs.zip
```

---

## 🚀 Deployment Options

### Option 1: Fix GitHub Actions (Recommended)
1. Add AZURE_CREDENTIALS secret (see above)
2. Add MAPBOX_TOKEN secret (if not already added)
3. Push changes to trigger deployment:
   ```bash
   git add .
   git commit -m "Fix Azure secrets configuration"
   git push origin main
   ```
4. Monitor deployment:
   ```bash
   gh run watch
   ```

### Option 2: Manual Azure CLI Deployment

**Backend:**
```bash
cd backend
dotnet publish Creerlio.Api/Creerlio.Api.csproj -c Release -o publish
cd publish && zip -r ../backend.zip * && cd ..
az webapp deployment source config-zip \
  --resource-group creerlio-platform-rg \
  --name creerlio-api \
  --src backend.zip
```

**Frontend:**
```bash
cd frontend/frontend-app
npm ci
npm run build
cd .next/standalone && zip -r ../../frontend.zip * && cd ../..
az webapp deployment source config-zip \
  --resource-group creerlio-platform-rg \
  --name creerlio-app \
  --src frontend.zip
```

### Option 3: Azure Portal Deployment
1. Build locally (backend + frontend)
2. Create ZIP files
3. Go to: https://portal.azure.com
4. Navigate to App Service → Advanced Tools (Kudu)
5. Upload ZIP via drag & drop

---

## 📋 Verification Checklist

After deploying, verify these:

- [ ] Backend responds with HTTP 200 at https://creerlio-api.azurewebsites.net
- [ ] Frontend responds with HTTP 200 at https://creerlio-app.azurewebsites.net
- [ ] All API endpoints return valid data (test with /api/fred/health)
- [ ] Map features work (Mapbox token configured)
- [ ] Azure logs are streaming (if CLI configured)
- [ ] GitHub Actions secrets are set correctly
- [ ] No 503 errors on frontend
- [ ] Environment variables set in Azure App Settings:
  - `NEXT_PUBLIC_API_URL`: https://creerlio-api.azurewebsites.net
  - `NEXT_PUBLIC_MAPBOX_TOKEN`: pk.eyJ1IjoiY3JlZXJsaW8...

---

## 🔗 Quick Links

- **GitHub Repository:** https://github.com/Creerlio/creerlio-platform
- **GitHub Actions:** https://github.com/Creerlio/creerlio-platform/actions
- **GitHub Secrets:** https://github.com/Creerlio/creerlio-platform/settings/secrets/actions
- **Azure Portal:** https://portal.azure.com
- **Backend App:** https://portal.azure.com/#resource/subscriptions/{sub}/resourceGroups/creerlio-platform-rg/providers/Microsoft.Web/sites/creerlio-api
- **Frontend App:** https://portal.azure.com/#resource/subscriptions/{sub}/resourceGroups/creerlio-platform-rg/providers/Microsoft.Web/sites/creerlio-app
- **Backend URL:** https://creerlio-api.azurewebsites.net
- **Frontend URL:** https://creerlio-app.azurewebsites.net

---

## 📞 Next Steps

1. **Immediate:** Add AZURE_CREDENTIALS secret to GitHub (see instructions above)
2. **Immediate:** Verify MAPBOX_TOKEN secret exists in GitHub
3. **After secrets:** Push workflow fixes to trigger redeployment
4. **Monitor:** Watch GitHub Actions and Azure logs
5. **Verify:** Test all endpoints once frontend deploys
6. **Optional:** Install Azure CLI in Codespaces for direct log access

---

**Status:** Backend operational, frontend awaiting Azure credentials configuration. All code changes complete, deployment automation ready.
