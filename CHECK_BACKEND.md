# 🔧 Fix: Backend Connection Error

## The Problem
You're seeing "Network error. Please check if backend is running" because the backend server isn't running or isn't accessible.

## ✅ Solution: Start the Backend

### Step 1: Check if Backend is Running

Run this command:
```powershell
netstat -an | findstr "8000"
```

If you see `TCP    0.0.0.0:8000`, the backend is running.

### Step 2: Start Backend (If Not Running)

**Option A: Use Restart Script**
```powershell
cd C:\Users\simon\Projects2025\Creerlio_V2\creerlio-platform
.\restart-backend.bat
```

**Option B: Manual Start**
```powershell
cd C:\Users\simon\Projects2025\Creerlio_V2\creerlio-platform\backend
.\venv\Scripts\activate
python main.py
```

### Step 3: Verify Backend is Working

1. **Check Health Endpoint:**
   - Open: http://localhost:8000/health
   - Should return: `{"status":"healthy","service":"creerlio-platform"}`

2. **Check API Docs:**
   - Open: http://localhost:8000/docs
   - Should show Swagger UI with all endpoints including `/api/auth/register`

3. **Test Registration Endpoint:**
   - In API docs, find `POST /api/auth/register`
   - Try it with test data

## What Should Happen

After starting the backend:

1. **Backend Window** should show:
   ```
   Uvicorn running on http://0.0.0.0:8000
   Application startup complete.
   ```

2. **Registration Page** should work:
   - No more "Network error" message
   - Form submission should succeed
   - You'll see success message

## Troubleshooting

### Backend Won't Start?

**Check for errors in backend window:**
- **"Module not found"** → Run: `pip install -r ../requirements.txt`
- **"Table already exists"** → This is normal, database is initialized
- **"Port 8000 already in use"** → Close other apps using port 8000

### Still Getting Network Error?

1. **Check backend is actually running:**
   ```powershell
   netstat -an | findstr "8000"
   ```

2. **Test backend directly:**
   ```powershell
   curl http://localhost:8000/health
   ```

3. **Check firewall:**
   - Windows Firewall may be blocking port 8000
   - Allow port 8000 in firewall settings

4. **Verify API URL:**
   - Frontend uses: `http://localhost:8000`
   - Make sure backend is on the same port

### Backend Started But Registration Fails?

**Check backend window for errors:**
- **"User model not found"** → Backend needs restart to load new User model
- **"Table 'users' doesn't exist"** → Run: `python -c "from app.database import init_db; init_db()"`

## Quick Fix

**Just restart the backend:**
```powershell
cd C:\Users\simon\Projects2025\Creerlio_V2\creerlio-platform
.\restart-backend.bat
```

Then try registering again at http://localhost:3000/register

---

**The backend needs to be running for the registration page to work!**


