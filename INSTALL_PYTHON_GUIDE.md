# Python Installation Guide

## ❌ Python Not Found

The backend requires Python 3.12 to run. Python is not currently in your system PATH.

## ✅ Solution: Install Python 3.12

### Step 1: Download Python
1. Go to: https://www.python.org/downloads/
2. Click "Download Python 3.12.x" (latest 3.12 version)

### Step 2: Install Python
1. Run the downloaded installer
2. **IMPORTANT**: Check ✅ **"Add Python to PATH"** at the bottom
3. Click **"Install Now"**
4. Wait for installation to complete

### Step 3: Verify Installation
1. Close and reopen your terminal/command prompt
2. Run: `py --version` or `python --version`
3. You should see: `Python 3.12.x`

### Step 4: Start Backend
1. Run: `AUTO_START_BACKEND.bat`
2. Backend should start successfully!

## 🔍 Alternative: Find Existing Python

If you think Python is already installed:

1. Run: `FIND_PYTHON.bat`
2. This will search for Python installations
3. If found, you can manually add it to PATH or use the full path

## 📝 Adding Python to PATH Manually

If Python is installed but not in PATH:

1. Find Python installation (usually in):
   - `C:\Python312\`
   - `C:\Users\YourName\AppData\Local\Programs\Python\Python312\`
   - `C:\Program Files\Python312\`

2. Add to PATH:
   - Press `Win + X` → System → Advanced system settings
   - Click "Environment Variables"
   - Under "System variables", find "Path"
   - Click "Edit" → "New"
   - Add: `C:\Python312\` (or your Python path)
   - Click OK on all dialogs
   - **Restart your terminal**

## ✅ Quick Test

After installation, test with:
```bash
py --version
python --version
```

Both should show Python 3.12.x

## 🚀 Next Steps

Once Python is installed:
1. Run `AUTO_START_BACKEND.bat`
2. Wait for "Uvicorn running" message
3. Go to http://localhost:3000/register


