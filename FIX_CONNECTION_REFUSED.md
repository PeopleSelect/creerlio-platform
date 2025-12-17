# 🔧 Fix: "localhost refused to connect" Error

## The Problem
You're seeing `ERR_CONNECTION_REFUSED` because the frontend server isn't running on port 3000.

## ✅ Solution: Start the Servers

I've just started both servers for you. Here's what to do:

### Step 1: Check the New Windows

You should see **two new PowerShell windows** that opened:

1. **Backend Window:**
   - Should show: `Uvicorn running on http://0.0.0.0:8000`
   - Should show: `Application startup complete`

2. **Frontend Window:**
   - Should show: `Local: http://localhost:3000`
   - Should show: `✓ Ready` or `Ready in X.Xs`

### Step 2: Wait for "Ready"

Wait about **10-30 seconds** for both servers to fully start.

### Step 3: Refresh Your Browser

1. Click the **Refresh** button in your browser
2. Or press `F5`
3. Or go to: http://localhost:3000

## If It Still Doesn't Work

### Check the Frontend Window

Look at the frontend PowerShell window. What do you see?

**If you see errors:**
- **"Port 3000 already in use"** → Another app is using the port
  - Solution: Close other apps or wait - Next.js will use port 3001

- **"Module not found"** → Dependencies missing
  - Solution: In the frontend window, press `Ctrl+C` to stop, then run:
    ```powershell
    npm install
    npm run dev
    ```

- **"Cannot find module"** → Need to install dependencies
  - Solution: Run `npm install` in the frontend directory

### Manual Start (If Needed)

If the automatic start didn't work, open a terminal and run:

**Frontend:**
```powershell
cd C:\Users\simon\Projects2025\Creerlio_V2\creerlio-platform\frontend
npm run dev
```

**Backend (in another terminal):**
```powershell
cd C:\Users\simon\Projects2025\Creerlio_V2\creerlio-platform\backend
.\venv\Scripts\activate
python main.py
```

## Verify Servers Are Running

Run this command to check:
```powershell
netstat -an | findstr "3000 8000"
```

You should see:
- `TCP    0.0.0.0:3000` (Frontend)
- `TCP    0.0.0.0:8000` (Backend)

## Quick Test

Once servers are running, test in browser:
- ✅ http://localhost:3000 → Should show Creerlio Platform homepage
- ✅ http://localhost:8000/docs → Should show API documentation
- ✅ http://localhost:8000/health → Should return `{"status":"healthy"}`

---

**The servers should be starting now. Check the two PowerShell windows and wait for "Ready" messages!**


