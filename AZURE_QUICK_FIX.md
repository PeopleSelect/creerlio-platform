# 🔧 Azure Troubleshooting - Quick Start Guide

**Problem:** Azure Web App showing "Application Error" or HTTP 503/502  
**Solution:** Use Azure's diagnostic tools to ask Azure what's wrong

---

## 🚀 Quick Fix (3 Commands)

```bash
# 1. Install Azure CLI (if needed)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# 2. Login
az login

# 3. Run comprehensive diagnostics
bash scripts/azure-diagnose.sh
```

The script will:
- ✅ Enable all logging
- ✅ Run Azure's built-in diagnostics
- ✅ Download all logs
- ✅ Test endpoints
- ✅ Generate report with root cause

---

## 📊 What Azure Diagnostics Will Tell You

### Common Issues It Finds:

1. **Missing Environment Variables**
   - Shows which env vars are missing
   - Location: `{app}_appsettings.json`

2. **Startup Command Wrong**
   - For Next.js should be: `node server.js`
   - For .NET should be auto-detected

3. **Build Output Location Wrong**
   - Files must be in `/home/site/wwwroot`
   - Next.js standalone: `.next/standalone/` contents

4. **Port Configuration**
   - Azure expects port 8080 for Linux apps
   - Must be set in app (not Azure config)

5. **Memory/CPU Exceeded**
   - Shows resource usage vs limits
   - May need to upgrade App Service Plan

6. **Application Crash on Startup**
   - Shows exception stack trace
   - Points to failing code line

---

## 🔍 Manual Investigation (If Script Can't Run)

### Option 1: Azure Portal (No CLI Needed)

1. Go to: https://portal.azure.com
2. Navigate to your App Service (creerlio-app or creerlio-api)
3. Click **"Diagnose and solve problems"**
4. Run these checks:
   - "Web App Down"
   - "Configuration & Management"
   - "Networking"
5. Click **"Monitoring"** → **"Log stream"** (see live errors)

### Option 2: Kudu Console (Advanced)

1. Go to: `https://{your-app}.scm.azurewebsites.net`
2. Click **"Debug Console"** → **"CMD"**
3. Navigate to: `/home/LogFiles/`
4. Check these files:
   - `stdout_*.log` - Application output
   - `stderr_*.log` - Application errors
   - `eventlog.xml` - System events

### Option 3: Azure CLI Commands

```bash
# Enable logging
az webapp log config \
  --name creerlio-app \
  --resource-group creerlio-platform-rg \
  --application-logging filesystem \
  --level verbose \
  --detailed-error-messages true \
  --failed-request-tracing true

# Stream logs (watch in real-time)
az webapp log tail \
  --name creerlio-app \
  --resource-group creerlio-platform-rg

# Download all logs
az webapp log download \
  --name creerlio-app \
  --resource-group creerlio-platform-rg \
  --log-file app-logs.zip
```

---

## 🎯 Common Fixes Based on Azure Diagnostics

### If Azure Says: "Application didn't respond to HTTP pings"

**Cause:** App not listening on port 8080 or not starting  
**Fix:**
```bash
# Check startup command
az webapp config show --name creerlio-app --resource-group creerlio-platform-rg --query "appCommandLine"

# Set startup command (for Next.js)
az webapp config set --name creerlio-app --resource-group creerlio-platform-rg --startup-file "node server.js"
```

### If Azure Says: "Environment variable not set"

**Fix:**
```bash
# Set environment variables
az webapp config appsettings set \
  --name creerlio-app \
  --resource-group creerlio-platform-rg \
  --settings \
    NEXT_PUBLIC_API_URL="https://creerlio-api.azurewebsites.net" \
    NEXT_PUBLIC_MAPBOX_TOKEN="pk.eyJ1Ij..."
```

### If Azure Says: "Container didn't respond in time"

**Cause:** Startup timeout (default 230 seconds)  
**Fix:**
```bash
# Increase timeout to 600 seconds
az webapp config set \
  --name creerlio-app \
  --resource-group creerlio-platform-rg \
  --startup-time 600
```

### If Azure Says: "File not found: server.js"

**Cause:** Build output not deployed correctly  
**Fix for Next.js:**
1. Ensure `next.config.ts` has: `output: 'standalone'`
2. Deploy contents of `.next/standalone/` (not the folder itself)
3. Verify files exist in Azure:
   ```bash
   # Check via Kudu
   https://creerlio-app.scm.azurewebsites.net
   # Navigate to /home/site/wwwroot
   # Should see: server.js, package.json, .next/, node_modules/
   ```

### If Azure Says: "Out of memory"

**Cause:** App Service Plan too small  
**Fix:**
```bash
# Check current plan
az appservice plan show --name <plan-name> --resource-group creerlio-platform-rg

# Upgrade to higher tier (if needed)
az appservice plan update --name <plan-name> --resource-group creerlio-platform-rg --sku B2
```

---

## 📋 Verification Checklist

After running diagnostics and applying fixes, verify:

- [ ] `az webapp log tail` shows app starting without errors
- [ ] HTTP endpoint returns 200: `curl -I https://creerlio-app.azurewebsites.net`
- [ ] Azure Portal → "Overview" shows "Running" status
- [ ] Environment variables set: Check App Service → Configuration → Application settings
- [ ] Startup command correct: Check Configuration → General settings → Startup Command
- [ ] Files deployed correctly: Check Kudu → /home/site/wwwroot

---

## 🔗 Quick Links

**Your Apps:**
- Backend: https://creerlio-api.azurewebsites.net
- Frontend: https://creerlio-app.azurewebsites.net

**Azure Portal:**
- [Backend Diagnostics](https://portal.azure.com/#blade/Microsoft_Azure_Monitoring/DiagnosticsSettingsBlade)
- [Frontend Diagnostics](https://portal.azure.com/#blade/Microsoft_Azure_Monitoring/DiagnosticsSettingsBlade)

**Kudu Console:**
- Backend: https://creerlio-api.scm.azurewebsites.net
- Frontend: https://creerlio-app.scm.azurewebsites.net

**GitHub Secrets (for CI/CD):**
- [Add Azure Credentials](https://github.com/Creerlio/creerlio-platform/settings/secrets/actions)

---

## 💡 Pro Tips

1. **Always enable logging first** - You can't diagnose without logs
2. **Check Kudu logs** - More detailed than Portal log stream
3. **Test locally first** - If it doesn't run locally with same env vars, it won't work in Azure
4. **Startup command matters** - Especially for Next.js standalone builds
5. **Environment variables** - Must be set in Azure (not just .env files)
6. **Port 8080** - Azure expects Linux apps to listen on this port

---

## 🆘 Still Not Working?

Run the comprehensive diagnostic script:
```bash
bash scripts/azure-diagnose.sh
```

Then share the generated report (in `azure-diagnostic-report-{timestamp}/`) for deeper analysis.

The script will create:
- `DIAGNOSTIC_SUMMARY.md` - Human-readable report
- `*_logs.zip` - All application logs
- `*_config.json` - All configuration files
- `*_http_response.txt` - HTTP responses with headers

---

**Last Updated:** November 27, 2025  
**Script:** `scripts/azure-diagnose.sh`  
**Related Docs:** `DEPLOYMENT_TROUBLESHOOTING.md`, `AZURE_SECRETS_SETUP.md`
