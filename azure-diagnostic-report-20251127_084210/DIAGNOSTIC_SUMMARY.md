# Azure Diagnostic Report
**Generated:** Thu Nov 27 08:46:30 UTC 2025  
**Subscription:** Azure subscription 1  
**Resource Group:** creerlio-platform-rg

---

## 📊 Endpoint Status

### Backend (creerlio-api)
- **URL:** https://creerlio-api.azurewebsites.net
- **HTTP Status:** 200
- **Health:** ✅ HEALTHY

### Frontend (creerlio-app)
- **URL:** https://creerlio-app.azurewebsites.net
- **HTTP Status:** 000000
- **Health:** ❌ UNHEALTHY

---

## 📁 Collected Files

### Configuration Files

- azure-diagnostic-report-20251127_084210/creerlio-api_config.json (7.8K)
- azure-diagnostic-report-20251127_084210/creerlio-api_log_config.json (908)
- azure-diagnostic-report-20251127_084210/creerlio-api_runtime_config.json (3.5K)
- azure-diagnostic-report-20251127_084210/creerlio-app_config.json (7.8K)
- azure-diagnostic-report-20251127_084210/creerlio-app_log_config.json (908)
- azure-diagnostic-report-20251127_084210/creerlio-app_runtime_config.json (3.5K)

### Log Files

- azure-diagnostic-report-20251127_084210/creerlio-api_logs.zip (30K)
- azure-diagnostic-report-20251127_084210/creerlio-app_logs.zip (39K)

### Diagnostic Results

- azure-diagnostic-report-20251127_084210/creerlio-api_availability.json
- azure-diagnostic-report-20251127_084210/creerlio-app_availability.json

### HTTP Responses

- azure-diagnostic-report-20251127_084210/creerlio-api_http_response.txt
- azure-diagnostic-report-20251127_084210/creerlio-app_http_response.txt


---

## 🔍 Quick Analysis

### ✅ Backend is Healthy

### ❌ Frontend Issues Detected

**HTTP Status:** 000000

**Possible Causes:**
- Next.js standalone output not deployed correctly
- Missing environment variables (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_MAPBOX_TOKEN)
- Startup command incorrect (should be: `node server.js`)
- Build output not in /home/site/wwwroot
- Port 8080 not exposed (Azure expects port 8080 for Linux)

**Next Steps:**
1. Review `creerlio-app_logs/LogFiles/stdout*.log` for Node.js errors
2. Check startup command: `az webapp config show --name creerlio-app --resource-group creerlio-platform-rg --query "appCommandLine"`
3. Verify standalone build exists: Check if .next/standalone/server.js exists in deployment
4. View live logs: `az webapp log tail --name creerlio-app --resource-group creerlio-platform-rg`


---

## 🛠️ Manual Investigation Commands

### Stream Live Logs (Backend)
```bash
az webapp log tail \
  --name creerlio-api \
  --resource-group creerlio-platform-rg
```

### Stream Live Logs (Frontend)
```bash
az webapp log tail \
  --name creerlio-app \
  --resource-group creerlio-platform-rg
```

### Access Kudu Console
- Backend: https://creerlio-api.scm.azurewebsites.net
- Frontend: https://creerlio-app.scm.azurewebsites.net

Navigate to: Debug Console → Browse /LogFiles → Check stdout logs

### Restart Apps
```bash
az webapp restart --name creerlio-api --resource-group creerlio-platform-rg
az webapp restart --name creerlio-app --resource-group creerlio-platform-rg
```

---

## 📞 Azure Portal Links

- **Backend App:** https://portal.azure.com/#@/resource/subscriptions/18965668-268b-42be-ac3f-0186e76668e0/resourceGroups/creerlio-platform-rg/providers/Microsoft.Web/sites/creerlio-api
- **Frontend App:** https://portal.azure.com/#@/resource/subscriptions/18965668-268b-42be-ac3f-0186e76668e0/resourceGroups/creerlio-platform-rg/providers/Microsoft.Web/sites/creerlio-app
- **Resource Group:** https://portal.azure.com/#@/resource/subscriptions/18965668-268b-42be-ac3f-0186e76668e0/resourceGroups/creerlio-platform-rg

**Go to:** App Service → "Diagnose and solve problems" → Run diagnostics

---

**Report Location:** `azure-diagnostic-report-20251127_084210/`

