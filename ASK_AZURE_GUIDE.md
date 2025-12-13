# ✅ HOW TO ASK AZURE WHAT'S BROKEN - COMPLETE GUIDE

**Created:** November 27, 2025  
**Purpose:** Use Azure's diagnostic tools to automatically identify and fix deployment issues

---

## 🎯 THE ANSWER: Run This Script

```bash
# 1. Install Azure CLI (one-time setup)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# 2. Login to Azure
az login

# 3. Run the diagnostic script (this "asks Azure")
bash scripts/azure-diagnose.sh
```

**What happens:**
- ✅ Azure CLI queries Azure's diagnostic APIs
- ✅ Enables all logging automatically  
- ✅ Downloads all logs and configurations
- ✅ Runs built-in health checks
- ✅ Generates report telling you exactly what's broken

---

## 📊 What Azure Will Tell You

The script uses Azure's **official diagnostic APIs** - the same tools that Azure support engineers use.

### Example Output:

```
╔════════════════════════════════════════════════════════╗
║   AZURE DIAGNOSTIC ENGINE - ASK AZURE WHAT'S WRONG    ║
╚════════════════════════════════════════════════════════╝

✅ Azure CLI installed
✅ Logged in to Azure

🔧 Enabling full logging for creerlio-app...
✓ Frontend logging enabled

🏥 Running diagnostics for creerlio-app...
🔍 Running: Web App Down/Availability Check
   ✓ Saved to creerlio-app_availability.json
🔍 Running: Configuration & Management
   ✓ Saved to creerlio-app_configurationsandmanagement.json

📥 Downloading creerlio-app logs...
✓ Frontend logs downloaded

🌐 Testing frontend endpoint...
✗ Frontend: HTTP 503 - UNHEALTHY

═══════════════════════════════════════════════════════
  ✅ DIAGNOSTIC COMPLETE
═══════════════════════════════════════════════════════

📄 Full report saved to: azure-diagnostic-report-20251127_081530/DIAGNOSTIC_SUMMARY.md
```

### The Report Will Show:

**❌ Frontend Issues Detected**

HTTP Status: 503

**Possible Causes:**
- Next.js standalone output not deployed correctly
- Missing environment variables (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_MAPBOX_TOKEN)
- Startup command incorrect (should be: `node server.js`)
- Build output not in /home/site/wwwroot
- Port 8080 not exposed

**Next Steps:**
1. Review `creerlio-app_logs/LogFiles/stdout_*.log` for startup errors
2. Check startup command: `az webapp config show --name creerlio-app --query "appCommandLine"`
3. Verify standalone build exists: Check if .next/standalone/server.js exists
4. View live logs: `az webapp log tail --name creerlio-app`

---

## 🔍 How It Works (Technical)

The script uses these Azure diagnostic APIs:

```bash
# 1. Availability Check (Web App Down detector)
az rest --method post \
  --uri "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app}/diagnostics/availability/execute"

# 2. Performance Analysis
az rest --method post \
  --uri ".../diagnostics/performance/execute"

# 3. Configuration & Management Issues
az rest --method post \
  --uri ".../diagnostics/configurationsandmanagement/execute"

# 4. Networking Problems
az rest --method post \
  --uri ".../diagnostics/networking/execute"
```

These are the **same diagnostics** you see in Azure Portal → "Diagnose and solve problems".

---

## 📋 Complete Diagnostic Process

### Phase 1: Enable Logging
```bash
az webapp log config \
  --name creerlio-app \
  --resource-group creerlio-platform-rg \
  --application-logging filesystem \
  --level verbose \
  --detailed-error-messages true \
  --failed-request-tracing true \
  --web-server-logging filesystem
```

### Phase 2: Run Diagnostics
- Availability check (is app responding?)
- Performance analysis (CPU/memory issues?)
- Configuration check (env vars, startup command?)
- Networking check (port binding, firewall?)

### Phase 3: Collect Evidence
- Download all logs (stdout, stderr, eventlog)
- Get all configuration (app settings, runtime config)
- Check deployment history
- Test HTTP endpoints

### Phase 4: Analyze & Report
- Parse log files for errors
- Compare config against best practices
- Identify root cause
- Generate actionable report

---

## 🛠️ What Gets Collected

```
azure-diagnostic-report-20251127_081530/
├── DIAGNOSTIC_SUMMARY.md           # Human-readable report
├── creerlio-app_config.json        # App Service configuration
├── creerlio-app_runtime_config.json # Runtime settings
├── creerlio-app_appsettings.json   # Environment variables
├── creerlio-app_availability.json  # Availability diagnostic results
├── creerlio-app_performance.json   # Performance diagnostic results
├── creerlio-app_configurationsandmanagement.json
├── creerlio-app_networking.json    # Network diagnostic results
├── creerlio-app_deployments.json   # Deployment history
├── creerlio-app_logs.zip          # All application logs
├── creerlio-app_logs/             # Extracted logs
│   ├── LogFiles/
│   │   ├── stdout_*.log          # Application output
│   │   ├── stderr_*.log          # Application errors
│   │   └── eventlog.xml          # System events
└── creerlio-app_http_response.txt # HTTP response with headers
```

---

## 🚀 Alternative Methods (If Script Can't Run)

### Method 1: Azure Portal (No CLI)

**Go to:** https://portal.azure.com

1. Navigate to: App Services → creerlio-app
2. Click: **"Diagnose and solve problems"** (left menu)
3. Run: "Web App Down" diagnostic
4. Run: "Configuration & Management" diagnostic
5. Click: **"Monitoring"** → **"Log stream"**
6. Open your app URL in another tab (logs will show errors)

### Method 2: Kudu Console (Direct Log Access)

**Go to:** https://creerlio-app.scm.azurewebsites.net

1. Click: **"Debug Console"** → **"CMD"**
2. Navigate to: `/home/LogFiles/`
3. Click on: `stdout_*.log` (most recent)
4. Look for errors like:
   - "Cannot find module"
   - "Error: listen EADDRINUSE"
   - "Environment variable not set"
   - "Application startup exception"

### Method 3: GitHub Actions Logs

**Go to:** https://github.com/Creerlio/creerlio-platform/actions

1. Click on the latest failed workflow run
2. Expand: "Deploy Frontend to Azure" step
3. Look for deployment errors
4. Check if build succeeded but deployment failed

---

## 🎯 Common Issues & Quick Fixes

Based on Azure diagnostics, here are the most common issues:

### Issue 1: Environment Variables Not Set
```bash
# Fix:
az webapp config appsettings set \
  --name creerlio-app \
  --resource-group creerlio-platform-rg \
  --settings \
    NEXT_PUBLIC_API_URL="https://creerlio-api.azurewebsites.net" \
    NEXT_PUBLIC_MAPBOX_TOKEN="pk.eyJ1IjoiY3JlZXJsaW8..."
```

### Issue 2: Wrong Startup Command
```bash
# Check current command:
az webapp config show --name creerlio-app --resource-group creerlio-platform-rg --query "appCommandLine"

# Fix (for Next.js standalone):
az webapp config set \
  --name creerlio-app \
  --resource-group creerlio-platform-rg \
  --startup-file "node server.js"
```

### Issue 3: Files Not Deployed Correctly
```bash
# Manual deployment:
cd frontend/frontend-app
npm run build
cd .next/standalone
zip -r ../../../frontend.zip *
az webapp deployment source config-zip \
  --resource-group creerlio-platform-rg \
  --name creerlio-app \
  --src ../../../frontend.zip
```

### Issue 4: GitHub Actions Failing (No Azure Credentials)
```bash
# Create service principal:
az ad sp create-for-rbac \
  --name "creerlio-github-actions" \
  --role contributor \
  --scopes /subscriptions/{sub-id}/resourceGroups/creerlio-platform-rg \
  --sdk-auth

# Copy JSON output and add to:
# https://github.com/Creerlio/creerlio-platform/settings/secrets/actions
# Name: AZURE_CREDENTIALS
```

---

## ✅ Verification Steps

After applying fixes, verify:

```bash
# 1. Stream logs (watch for startup success)
az webapp log tail --name creerlio-app --resource-group creerlio-platform-rg

# 2. Test endpoint
curl -I https://creerlio-app.azurewebsites.net
# Should return: HTTP/1.1 200 OK

# 3. Check app status
az webapp show --name creerlio-app --resource-group creerlio-platform-rg --query "state"
# Should return: "Running"

# 4. View environment variables (verify they're set)
az webapp config appsettings list --name creerlio-app --resource-group creerlio-platform-rg

# 5. Check startup command
az webapp config show --name creerlio-app --resource-group creerlio-platform-rg --query "appCommandLine"
```

---

## 📞 Support Resources

**Documentation:**
- `AZURE_QUICK_FIX.md` - Quick troubleshooting guide
- `DEPLOYMENT_TROUBLESHOOTING.md` - Complete deployment status
- `AZURE_SECRETS_SETUP.md` - GitHub Actions setup

**Scripts:**
- `scripts/azure-diagnose.sh` - Full diagnostic engine (THIS ONE!)
- `scripts/azure-logs.sh` - Azure logging commands
- `scripts/azure-quick-check.sh` - Fast health check

**Azure Portal:**
- Backend: https://portal.azure.com → Search "creerlio-api"
- Frontend: https://portal.azure.com → Search "creerlio-app"

**Kudu Console:**
- Backend: https://creerlio-api.scm.azurewebsites.net
- Frontend: https://creerlio-app.scm.azurewebsites.net

---

## 🔥 TL;DR - Just Run This

```bash
# Install Azure CLI (if not installed)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login

# Ask Azure what's broken
bash scripts/azure-diagnose.sh

# Read the report
cat azure-diagnostic-report-*/DIAGNOSTIC_SUMMARY.md
```

**The script does everything for you:**
- Enables logging ✅
- Runs diagnostics ✅  
- Downloads logs ✅
- Tests endpoints ✅
- Identifies root cause ✅
- Suggests fixes ✅

---

**Last Updated:** November 27, 2025  
**Script Location:** `scripts/azure-diagnose.sh`  
**Status:** Backend working (HTTP 200), Frontend needs diagnosis (HTTP 503)
