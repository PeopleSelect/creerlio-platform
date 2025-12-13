#!/bin/bash

# AZURE DIAGNOSTIC SCRIPT - ASK AZURE WHAT'S BROKEN
# This script uses Azure's built-in diagnostic tools to identify issues
# and pull all relevant logs, configs, and health checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_APP="creerlio-api"
FRONTEND_APP="creerlio-app"
RESOURCE_GROUP="creerlio-platform-rg"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="azure-diagnostic-report-${TIMESTAMP}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   AZURE DIAGNOSTIC ENGINE - ASK AZURE WHAT'S WRONG    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI not installed${NC}"
    echo ""
    echo -e "${YELLOW}Install Azure CLI:${NC}"
    echo "  curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Azure CLI installed${NC}"

# Check if logged in
if ! az account show &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Azure${NC}"
    echo ""
    echo -e "${YELLOW}Login to Azure:${NC}"
    echo "  az login"
    echo ""
    exit 1
fi

SUBSCRIPTION=$(az account show --query name -o tsv)
echo -e "${GREEN}✅ Logged in to Azure${NC}"
echo -e "   Subscription: ${BLUE}${SUBSCRIPTION}${NC}"
echo ""

# Create report directory
mkdir -p "$REPORT_DIR"
echo -e "${BLUE}📁 Creating diagnostic report in: ${REPORT_DIR}${NC}"
echo ""

# Function to run diagnostic and save output
run_diagnostic() {
    local app_name=$1
    local diagnostic_name=$2
    local description=$3
    local output_file="${REPORT_DIR}/${app_name}_${diagnostic_name}.json"
    
    echo -e "${YELLOW}🔍 Running: ${description}${NC}"
    
    if az webapp show --name "$app_name" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        az rest --method post \
            --uri "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Web/sites/${app_name}/diagnostics/${diagnostic_name}/execute?api-version=2021-02-01" \
            > "$output_file" 2>&1 || echo "⚠️  Diagnostic not available" > "$output_file"
        echo -e "${GREEN}   ✓ Saved to ${output_file}${NC}"
    else
        echo -e "${RED}   ✗ App ${app_name} not found${NC}"
        echo "App not found" > "$output_file"
    fi
}

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  STEP 1: ENABLE FULL LOGGING${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Enable logging for backend
echo -e "${YELLOW}🔧 Enabling full logging for ${BACKEND_APP}...${NC}"
az webapp log config \
    --name "$BACKEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --application-logging filesystem \
    --level verbose \
    --detailed-error-messages true \
    --failed-request-tracing true \
    --web-server-logging filesystem \
    > "${REPORT_DIR}/${BACKEND_APP}_log_config.json" 2>&1 || echo "Failed to configure backend logging"

echo -e "${GREEN}✓ Backend logging enabled${NC}"
echo ""

# Enable logging for frontend
echo -e "${YELLOW}🔧 Enabling full logging for ${FRONTEND_APP}...${NC}"
az webapp log config \
    --name "$FRONTEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --application-logging filesystem \
    --level verbose \
    --detailed-error-messages true \
    --failed-request-tracing true \
    --web-server-logging filesystem \
    > "${REPORT_DIR}/${FRONTEND_APP}_log_config.json" 2>&1 || echo "Failed to configure frontend logging"

echo -e "${GREEN}✓ Frontend logging enabled${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  STEP 2: RUN AZURE BUILT-IN DIAGNOSTICS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Run diagnostics for backend
echo -e "${YELLOW}🏥 Running diagnostics for ${BACKEND_APP}...${NC}"
run_diagnostic "$BACKEND_APP" "availability" "Web App Down/Availability Check"
run_diagnostic "$BACKEND_APP" "performance" "Performance Analysis"
run_diagnostic "$BACKEND_APP" "configurationsandmanagement" "Configuration & Management"
run_diagnostic "$BACKEND_APP" "networking" "Networking Issues"
echo ""

# Run diagnostics for frontend
echo -e "${YELLOW}🏥 Running diagnostics for ${FRONTEND_APP}...${NC}"
run_diagnostic "$FRONTEND_APP" "availability" "Web App Down/Availability Check"
run_diagnostic "$FRONTEND_APP" "performance" "Performance Analysis"
run_diagnostic "$FRONTEND_APP" "configurationsandmanagement" "Configuration & Management"
run_diagnostic "$FRONTEND_APP" "networking" "Networking Issues"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  STEP 3: COLLECT APP CONFIGURATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Get backend configuration
echo -e "${YELLOW}📋 Collecting ${BACKEND_APP} configuration...${NC}"
az webapp show \
    --name "$BACKEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    > "${REPORT_DIR}/${BACKEND_APP}_config.json" 2>&1 || echo "Failed to get backend config"

az webapp config show \
    --name "$BACKEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    > "${REPORT_DIR}/${BACKEND_APP}_runtime_config.json" 2>&1 || echo "Failed to get backend runtime config"

az webapp config appsettings list \
    --name "$BACKEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    > "${REPORT_DIR}/${BACKEND_APP}_appsettings.json" 2>&1 || echo "Failed to get backend appsettings"

echo -e "${GREEN}✓ Backend configuration collected${NC}"
echo ""

# Get frontend configuration
echo -e "${YELLOW}📋 Collecting ${FRONTEND_APP} configuration...${NC}"
az webapp show \
    --name "$FRONTEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    > "${REPORT_DIR}/${FRONTEND_APP}_config.json" 2>&1 || echo "Failed to get frontend config"

az webapp config show \
    --name "$FRONTEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    > "${REPORT_DIR}/${FRONTEND_APP}_runtime_config.json" 2>&1 || echo "Failed to get frontend runtime config"

az webapp config appsettings list \
    --name "$FRONTEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    > "${REPORT_DIR}/${FRONTEND_APP}_appsettings.json" 2>&1 || echo "Failed to get frontend appsettings"

echo -e "${GREEN}✓ Frontend configuration collected${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  STEP 4: DOWNLOAD RECENT LOGS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Download backend logs
echo -e "${YELLOW}📥 Downloading ${BACKEND_APP} logs...${NC}"
az webapp log download \
    --name "$BACKEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --log-file "${REPORT_DIR}/${BACKEND_APP}_logs.zip" \
    2>&1 || echo "Failed to download backend logs"

if [ -f "${REPORT_DIR}/${BACKEND_APP}_logs.zip" ]; then
    echo -e "${GREEN}✓ Backend logs downloaded${NC}"
    unzip -q "${REPORT_DIR}/${BACKEND_APP}_logs.zip" -d "${REPORT_DIR}/${BACKEND_APP}_logs/" 2>&1 || true
else
    echo -e "${YELLOW}⚠️  Backend logs not available${NC}"
fi
echo ""

# Download frontend logs
echo -e "${YELLOW}📥 Downloading ${FRONTEND_APP} logs...${NC}"
az webapp log download \
    --name "$FRONTEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    --log-file "${REPORT_DIR}/${FRONTEND_APP}_logs.zip" \
    2>&1 || echo "Failed to download frontend logs"

if [ -f "${REPORT_DIR}/${FRONTEND_APP}_logs.zip" ]; then
    echo -e "${GREEN}✓ Frontend logs downloaded${NC}"
    unzip -q "${REPORT_DIR}/${FRONTEND_APP}_logs.zip" -d "${REPORT_DIR}/${FRONTEND_APP}_logs/" 2>&1 || true
else
    echo -e "${YELLOW}⚠️  Frontend logs not available${NC}"
fi
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  STEP 5: CHECK DEPLOYMENT STATUS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Get deployment history
echo -e "${YELLOW}📦 Checking deployment history...${NC}"
az webapp deployment list \
    --name "$BACKEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    > "${REPORT_DIR}/${BACKEND_APP}_deployments.json" 2>&1 || echo "Failed to get backend deployments"

az webapp deployment list \
    --name "$FRONTEND_APP" \
    --resource-group "$RESOURCE_GROUP" \
    > "${REPORT_DIR}/${FRONTEND_APP}_deployments.json" 2>&1 || echo "Failed to get frontend deployments"

echo -e "${GREEN}✓ Deployment history collected${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  STEP 6: TEST ENDPOINTS & COLLECT HTTP RESPONSE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Test backend endpoint
echo -e "${YELLOW}🌐 Testing backend endpoint...${NC}"
BACKEND_URL="https://${BACKEND_APP}.azurewebsites.net"
curl -v -s --max-time 30 "$BACKEND_URL" > "${REPORT_DIR}/${BACKEND_APP}_http_response.txt" 2>&1 || true

BACKEND_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$BACKEND_URL" 2>/dev/null || echo "000")
if [ "$BACKEND_HTTP" = "200" ]; then
    echo -e "${GREEN}✓ Backend: HTTP ${BACKEND_HTTP} - HEALTHY${NC}"
else
    echo -e "${RED}✗ Backend: HTTP ${BACKEND_HTTP} - UNHEALTHY${NC}"
fi
echo ""

# Test frontend endpoint
echo -e "${YELLOW}🌐 Testing frontend endpoint...${NC}"
FRONTEND_URL="https://${FRONTEND_APP}.azurewebsites.net"
curl -v -s --max-time 30 "$FRONTEND_URL" > "${REPORT_DIR}/${FRONTEND_APP}_http_response.txt" 2>&1 || true

FRONTEND_HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$FRONTEND_URL" 2>/dev/null || echo "000")
if [ "$FRONTEND_HTTP" = "200" ]; then
    echo -e "${GREEN}✓ Frontend: HTTP ${FRONTEND_HTTP} - HEALTHY${NC}"
else
    echo -e "${RED}✗ Frontend: HTTP ${FRONTEND_HTTP} - UNHEALTHY${NC}"
fi
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  STEP 7: ANALYZE & GENERATE REPORT${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Create summary report
SUMMARY_FILE="${REPORT_DIR}/DIAGNOSTIC_SUMMARY.md"

cat > "$SUMMARY_FILE" << EOF
# Azure Diagnostic Report
**Generated:** $(date)  
**Subscription:** ${SUBSCRIPTION}  
**Resource Group:** ${RESOURCE_GROUP}

---

## 📊 Endpoint Status

### Backend (${BACKEND_APP})
- **URL:** ${BACKEND_URL}
- **HTTP Status:** ${BACKEND_HTTP}
- **Health:** $([ "$BACKEND_HTTP" = "200" ] && echo "✅ HEALTHY" || echo "❌ UNHEALTHY")

### Frontend (${FRONTEND_APP})
- **URL:** ${FRONTEND_URL}
- **HTTP Status:** ${FRONTEND_HTTP}
- **Health:** $([ "$FRONTEND_HTTP" = "200" ] && echo "✅ HEALTHY" || echo "❌ UNHEALTHY")

---

## 📁 Collected Files

EOF

# List all collected files
echo "### Configuration Files" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"
ls -lh "${REPORT_DIR}"/*_config.json 2>/dev/null | awk '{print "- " $9 " (" $5 ")"}' >> "$SUMMARY_FILE" || echo "- No config files collected" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"

echo "### Log Files" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"
ls -lh "${REPORT_DIR}"/*_logs.zip 2>/dev/null | awk '{print "- " $9 " (" $5 ")"}' >> "$SUMMARY_FILE" || echo "- No log files collected" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"

echo "### Diagnostic Results" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"
ls -lh "${REPORT_DIR}"/*_availability.json 2>/dev/null | awk '{print "- " $9}' >> "$SUMMARY_FILE" || echo "- No diagnostic results" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"

echo "### HTTP Responses" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"
ls -lh "${REPORT_DIR}"/*_http_response.txt 2>/dev/null | awk '{print "- " $9}' >> "$SUMMARY_FILE" || echo "- No HTTP responses collected" >> "$SUMMARY_FILE"
echo "" >> "$SUMMARY_FILE"

cat >> "$SUMMARY_FILE" << EOF

---

## 🔍 Quick Analysis

EOF

# Analyze backend
if [ "$BACKEND_HTTP" != "200" ]; then
    cat >> "$SUMMARY_FILE" << EOF
### ❌ Backend Issues Detected

**HTTP Status:** ${BACKEND_HTTP}

**Possible Causes:**
- Application startup failure (check logs in ${BACKEND_APP}_logs/)
- Missing environment variables (check ${BACKEND_APP}_appsettings.json)
- Runtime configuration error (check ${BACKEND_APP}_runtime_config.json)
- Port binding issue (default should be 8080 for Linux)
- Application crash on startup (check ${BACKEND_APP}_logs/LogFiles/)

**Next Steps:**
1. Review \`${BACKEND_APP}_logs/LogFiles/stdout*.log\` for startup errors
2. Check \`${BACKEND_APP}_appsettings.json\` for missing env vars
3. View live logs: \`az webapp log tail --name ${BACKEND_APP} --resource-group ${RESOURCE_GROUP}\`

EOF
else
    echo "### ✅ Backend is Healthy" >> "$SUMMARY_FILE"
    echo "" >> "$SUMMARY_FILE"
fi

# Analyze frontend
if [ "$FRONTEND_HTTP" != "200" ]; then
    cat >> "$SUMMARY_FILE" << EOF
### ❌ Frontend Issues Detected

**HTTP Status:** ${FRONTEND_HTTP}

**Possible Causes:**
- Next.js standalone output not deployed correctly
- Missing environment variables (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_MAPBOX_TOKEN)
- Startup command incorrect (should be: \`node server.js\`)
- Build output not in /home/site/wwwroot
- Port 8080 not exposed (Azure expects port 8080 for Linux)

**Next Steps:**
1. Review \`${FRONTEND_APP}_logs/LogFiles/stdout*.log\` for Node.js errors
2. Check startup command: \`az webapp config show --name ${FRONTEND_APP} --resource-group ${RESOURCE_GROUP} --query "appCommandLine"\`
3. Verify standalone build exists: Check if .next/standalone/server.js exists in deployment
4. View live logs: \`az webapp log tail --name ${FRONTEND_APP} --resource-group ${RESOURCE_GROUP}\`

EOF
else
    echo "### ✅ Frontend is Healthy" >> "$SUMMARY_FILE"
    echo "" >> "$SUMMARY_FILE"
fi

cat >> "$SUMMARY_FILE" << EOF

---

## 🛠️ Manual Investigation Commands

### Stream Live Logs (Backend)
\`\`\`bash
az webapp log tail \\
  --name ${BACKEND_APP} \\
  --resource-group ${RESOURCE_GROUP}
\`\`\`

### Stream Live Logs (Frontend)
\`\`\`bash
az webapp log tail \\
  --name ${FRONTEND_APP} \\
  --resource-group ${RESOURCE_GROUP}
\`\`\`

### Access Kudu Console
- Backend: https://${BACKEND_APP}.scm.azurewebsites.net
- Frontend: https://${FRONTEND_APP}.scm.azurewebsites.net

Navigate to: Debug Console → Browse /LogFiles → Check stdout logs

### Restart Apps
\`\`\`bash
az webapp restart --name ${BACKEND_APP} --resource-group ${RESOURCE_GROUP}
az webapp restart --name ${FRONTEND_APP} --resource-group ${RESOURCE_GROUP}
\`\`\`

---

## 📞 Azure Portal Links

- **Backend App:** https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Web/sites/${BACKEND_APP}
- **Frontend App:** https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Web/sites/${FRONTEND_APP}
- **Resource Group:** https://portal.azure.com/#@/resource/subscriptions/$(az account show --query id -o tsv)/resourceGroups/${RESOURCE_GROUP}

**Go to:** App Service → "Diagnose and solve problems" → Run diagnostics

---

**Report Location:** \`${REPORT_DIR}/\`

EOF

echo -e "${GREEN}✓ Diagnostic summary generated${NC}"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ DIAGNOSTIC COMPLETE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📄 Full report saved to: ${BLUE}${SUMMARY_FILE}${NC}"
echo ""
echo -e "${YELLOW}🔍 Review the summary:${NC}"
echo "   cat ${SUMMARY_FILE}"
echo ""
echo -e "${YELLOW}📁 All diagnostic data in: ${BLUE}${REPORT_DIR}/${NC}"
echo ""

# Print summary to console
cat "$SUMMARY_FILE"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}💡 Next Steps:${NC}"
echo ""
echo "1. Review the diagnostic summary above"
echo "2. Check log files in ${REPORT_DIR}/"
echo "3. Run live log streaming for real-time diagnosis:"
echo "   az webapp log tail --name ${FRONTEND_APP} --resource-group ${RESOURCE_GROUP}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
