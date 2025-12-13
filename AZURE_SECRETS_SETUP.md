# Azure Secrets Setup for GitHub Actions

## ❌ Current Issue
GitHub Actions deployments are failing because **AZURE_CREDENTIALS** secret is not properly configured.

## 📋 Required GitHub Secrets

You need to add these secrets to your GitHub repository:

1. **AZURE_CREDENTIALS** - Azure service principal credentials
2. **MAPBOX_TOKEN** - Your Mapbox API token (already have: pk.eyJ1IjoiY3JlZXJsaW8...)

## 🔧 How to Configure AZURE_CREDENTIALS

### Option 1: Use Azure Portal (Easiest)

1. **Install Azure CLI** (if not already installed):
   ```bash
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

2. **Login to Azure**:
   ```bash
   az login
   ```

3. **Create Service Principal**:
   ```bash
   az ad sp create-for-rbac --name "creerlio-github-actions" \
     --role contributor \
     --scopes /subscriptions/{subscription-id}/resourceGroups/creerlio-platform-rg \
     --sdk-auth
   ```
   
   **Copy the JSON output** - it looks like this:
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

4. **Add Secret to GitHub**:
   - Go to: https://github.com/Creerlio/creerlio-platform/settings/secrets/actions
   - Click "New repository secret"
   - Name: `AZURE_CREDENTIALS`
   - Value: Paste the **entire JSON** from step 3
   - Click "Add secret"

5. **Add MAPBOX_TOKEN** (if not already added):
   - Name: `MAPBOX_TOKEN`
   - Value: `pk.eyJ1IjoiY3JlZXJsaW8iLCJhIjoiY21pY3IxZHljMXFwNTJzb2FydzR4b3F1YSJ9.Is8-GyfEdqwKKEo2cGO65g`

### Option 2: Use Azure Portal UI

1. Go to Azure Portal: https://portal.azure.com
2. Search for "Azure Active Directory"
3. Navigate to "App registrations" → "New registration"
4. Name: "creerlio-github-actions"
5. Click "Register"
6. Note the **Application (client) ID** and **Directory (tenant) ID**
7. Go to "Certificates & secrets" → "New client secret"
8. Copy the secret value immediately (you can't see it again)
9. Go to your resource group → "Access control (IAM)" → "Add role assignment"
10. Role: "Contributor"
11. Select the app you just created
12. Format the JSON as shown in Option 1
13. Add to GitHub secrets

## 🔍 Verify Secrets Are Set

After adding the secrets, check they exist:
```bash
gh secret list
```

You should see:
- AZURE_CREDENTIALS
- MAPBOX_TOKEN

## 🚀 Test Deployment

After setting up secrets:
```bash
# Trigger workflow manually
gh workflow run azure-deploy.yml

# Check status
gh run watch
```

## ⚠️ Important Notes

- **Never commit secrets to the repository**
- The service principal should have **Contributor** role on the resource group only
- Rotate client secrets regularly (every 90 days is recommended)
- If you see "Login failed with Error: Using auth-type: SERVICE_PRINCIPAL", the secret is missing or incorrect

## 📊 Current Deployment Status

- ✅ **Backend**: https://creerlio-api.azurewebsites.net (HTTP 200 - LIVE)
- ⚠️  **Frontend**: https://creerlio-app.azurewebsites.net (HTTP 503 - needs deployment)
- ❌ **GitHub Actions**: Failing due to missing AZURE_CREDENTIALS

## 🛠️ Alternative: Deploy Without GitHub Actions

If you can't set up GitHub Actions secrets, you can deploy manually:

### Backend:
```bash
cd backend
dotnet publish Creerlio.Api/Creerlio.Api.csproj -c Release -o publish
az webapp deployment source config-zip \
  --resource-group creerlio-platform-rg \
  --name creerlio-api \
  --src publish.zip
```

### Frontend:
```bash
cd frontend/frontend-app
npm run build
cd .next/standalone
zip -r standalone.zip *
az webapp deployment source config-zip \
  --resource-group creerlio-platform-rg \
  --name creerlio-app \
  --src standalone.zip
```

## 🔗 Useful Links

- GitHub Secrets: https://github.com/Creerlio/creerlio-platform/settings/secrets/actions
- Azure Portal: https://portal.azure.com
- Resource Group: https://portal.azure.com/#@/resource/subscriptions/{sub-id}/resourceGroups/creerlio-platform-rg
- GitHub Actions: https://github.com/Creerlio/creerlio-platform/actions
