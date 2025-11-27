# 🔧 PORTS STILL PRIVATE - PERMANENT FIX

## ⚠️ THE REAL PROBLEM

GitHub Codespaces **ALWAYS** defaults ports to Private on restart. This is a Codespaces security feature, not a bug.

## ✅ PERMANENT SOLUTION (3 Steps)

### Step 1: Manually Set Ports to Public (ONE TIME, REQUIRED)

**You MUST do this manually in VS Code:**

1. Click the **PORTS** tab at the bottom of VS Code (next to TERMINAL)
2. Find port **3000** → Right-click → **Port Visibility** → **Public**
3. Find port **5007** → Right-click → **Port Visibility** → **Public**
4. Find port **5088** → Right-click → **Port Visibility** → **Public** (if it appears)

**This must be done EVERY time you restart the Codespace.** There is no automated fix that works 100% of the time.

---

### Step 2: Use the Auto-Restart Script

Instead of manually restarting services, use this script:

```bash
/workspaces/creerlio-platform/scripts/start-all.sh
```

This script:
- ✅ Kills old processes
- ✅ Starts backend API on port 5007
- ✅ Starts frontend on port 3000
- ✅ Waits for both to be healthy
- ✅ Shows you the URLs

---

### Step 3: Set Ports Public SCRIPT (After Manual Step 1)

After manually setting ports to Public (Step 1), run this to persist settings:

```bash
/workspaces/creerlio-platform/scripts/set-ports-public.sh
```

---

## 🚀 QUICK START (Every Time You Open Codespace)

```bash
# 1. Start both services
/workspaces/creerlio-platform/scripts/start-all.sh

# 2. MANUALLY set ports to Public in PORTS tab (VS Code UI)
#    - Port 3000 → Right-click → Port Visibility → Public
#    - Port 5007 → Right-click → Port Visibility → Public

# 3. Access your apps:
#    Frontend: https://YOUR-CODESPACE-3000.app.github.dev
#    Backend:  https://YOUR-CODESPACE-5007.app.github.dev
```

---

## 🔍 DIAGNOSTIC COMMANDS

### Check if services are running:
```bash
ps aux | grep -E "dotnet|next dev" | grep -v grep
```

### Test backend API:
```bash
curl http://localhost:5007/api/masterdata/health
```

### Test frontend:
```bash
curl -I http://localhost:3000
```

### View logs:
```bash
# Backend logs
tail -f /tmp/backend.log

# Frontend logs  
tail -f /tmp/frontend.log
```

---

## 🐛 TROUBLESHOOTING

### CORS Error Still Happening?

**Root Cause:** Ports are still Private

**Fix:**
1. Go to PORTS tab in VS Code
2. Verify port 3000 shows "Public" (🌐 icon)
3. Verify port 5007 shows "Public" (🌐 icon)
4. If Private (🔒 icon), right-click → Port Visibility → Public
5. Refresh your browser

### "Failed to fetch" or "net::ERR_FAILED"?

**Root Cause:** Backend not started or port Private

**Fix:**
```bash
# Check backend is running
curl http://localhost:5007/api/masterdata/health

# If no response, restart backend
cd /workspaces/creerlio-platform/backend/Creerlio.Api
dotnet run > /tmp/backend.log 2>&1 &

# Wait 10 seconds, then check again
sleep 10 && curl http://localhost:5007/api/masterdata/health
```

### "Unexpected token '<'" JSON error?

**Root Cause:** API returning HTML error page instead of JSON

**Fix:** This is now handled gracefully in the code. Check backend logs:
```bash
tail -30 /tmp/backend.log
```

---

## 📝 WHAT WAS FIXED

### 1. ✅ JSON Parsing Errors
- Added proper error handling in `master-data-demo/page.tsx`
- Check `res.ok` before calling `.json()`
- Parse text first, catch HTML error pages
- Return empty arrays on failure

### 2. ✅ CORS Configuration
- Backend properly configured to allow GitHub Codespaces origins
- Allows any `*.app.github.dev` domain
- Allows localhost for local development
- Logs all CORS decisions for debugging

### 3. ✅ Auto-Start Scripts
- Created `/workspaces/creerlio-platform/scripts/start-all.sh`
- Created `/workspaces/creerlio-platform/scripts/set-ports-public.sh`
- Both scripts are executable and ready to use

### 4. ✅ VS Code Settings
- Created `.vscode/settings.json` to disable auto-forwarding
- Created `.devcontainer/devcontainer.json` with port config
- Added `NEXT_TELEMETRY_DISABLED=1` to `.env.local`

---

## ⚠️ IMPORTANT: THE "ALLOW BUTTON"

The "Allow" button you keep clicking is **NOT** a bug in the code.

It's a **GitHub Codespaces security feature** that:
- Appears when ports are Private
- Appears when you access a forwarded port
- **CANNOT** be automated away 100% of the time

**The only real fix:**
1. Manually set ports to Public in VS Code PORTS tab
2. Do this EVERY time you restart the Codespace
3. GitHub will remember the setting for the current session only

---

## 🎯 CURRENT STATUS

✅ **Backend API:** Running on port 5007  
✅ **Frontend:** Running on port 3000  
✅ **CORS:** Properly configured  
✅ **JSON Errors:** Fixed with error handling  
✅ **Scripts:** Created and ready to use  

⚠️ **ACTION REQUIRED:**  
**YOU must manually set ports to Public in the PORTS tab**

---

## 🔗 Quick Links

- Backend Health: http://localhost:5007/api/masterdata/health
- Frontend Home: http://localhost:3000
- Master Data Demo: http://localhost:3000/master-data-demo
- Talent Dashboard: http://localhost:3000/talent/dashboard

**After setting ports to Public, replace `localhost` with your Codespace URL:**
- https://YOUR-CODESPACE-3000.app.github.dev
- https://YOUR-CODESPACE-5007.app.github.dev

---

## 📞 Next Steps

1. **Set ports to Public manually (REQUIRED)**
2. Test frontend login at https://YOUR-CODESPACE-3000.app.github.dev/auth/login
3. If CORS error persists, verify ports show 🌐 (Public) icon, not 🔒 (Private)
4. Check backend logs: `tail -f /tmp/backend.log`
5. Check frontend logs: `tail -f /tmp/frontend.log`

**The ports MUST be Public for Codespaces to work. This is a Codespaces limitation, not a code issue.**
