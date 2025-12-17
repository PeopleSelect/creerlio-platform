# Auto-Start Backend Instructions

## ✅ Backend Auto-Start is Now Active!

A new command window should have opened with the backend starting automatically.

## 🚀 Quick Start Options

### Option 1: Auto-Start Script (Recommended)
**Double-click:** `AUTO_START_BACKEND.bat`

This will:
- ✅ Detect Python automatically
- ✅ Create virtual environment if needed
- ✅ Install dependencies
- ✅ Initialize database
- ✅ Start the server

### Option 2: Quick Launcher
**Double-click:** `start-backend-auto.bat`

Opens the backend in a new window.

## ⏱️ First Time Setup

On the **first run**, the backend will:
1. Create virtual environment (30-60 seconds)
2. Install all dependencies (1-2 minutes)
3. Initialize database
4. Start server

**Total time: 2-3 minutes**

Subsequent starts are much faster (10-15 seconds).

## ✅ How to Know It's Ready

Look for this message in the backend window:
```
Uvicorn running on http://0.0.0.0:8000
Application startup complete.
```

## 🔍 Check Backend Status

**Double-click:** `CHECK_BACKEND_STATUS.bat`

Or test manually:
- Health: http://localhost:8000/health
- API Docs: http://localhost:8000/docs

## 🐛 Troubleshooting

### Backend Window Shows Errors
- Check Python is installed: Open terminal, type `py --version`
- If Python not found, install from: https://www.python.org/downloads/
- Make sure to check "Add Python to PATH" during installation

### Port 8000 Already in Use
- Another process is using port 8000
- Close other applications or change port in `backend/main.py`

### Dependencies Fail to Install
- Check internet connection
- Try: `pip install --upgrade pip`
- Then: `pip install -r requirements.txt`

## 📋 What Happens When Backend Starts

1. **Virtual Environment**: Created in `backend/venv/`
2. **Dependencies**: Installed from `requirements.txt`
3. **Database**: SQLite database created in `backend/`
4. **Server**: Starts on http://localhost:8000

## ✅ Once Backend is Running

1. **Test Registration**: http://localhost:3000/register
2. **View API Docs**: http://localhost:8000/docs
3. **Health Check**: http://localhost:8000/health

## 🎯 Next Steps

Once you see "Uvicorn running":
1. Go to: http://localhost:3000/register
2. Fill out the registration form
3. You'll be auto-logged in and redirected to your dashboard!

---

**Note**: Keep the backend window open while developing. Close it with `Ctrl+C` when done.


