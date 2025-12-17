# 🔧 Manual Setup Steps (Python PATH Issue)

Since Python isn't in your PATH, follow these steps:

## Step 1: Open a NEW Terminal

Close this terminal and open a **fresh PowerShell or Command Prompt window**.

This ensures Python's PATH is loaded.

## Step 2: Verify Python Works

In the new terminal, test:
```powershell
python --version
```

If you see `Python 3.12.10`, you're good! If not, try:
```powershell
py --version
```

## Step 3: Setup Backend

```powershell
# Navigate to backend
cd C:\Users\simon\Projects2025\Creerlio_V2\creerlio-platform\backend

# Activate virtual environment (if it exists)
.\venv\Scripts\activate

# If venv doesn't exist, create it first:
# python -m venv venv
# .\venv\Scripts\activate

# Install dependencies
pip install -r ..\requirements.txt

# Start backend
python main.py
```

**Wait for:** `Uvicorn running on http://0.0.0.0:8000`

## Step 4: Setup Frontend (New Terminal)

Open **another new terminal** and run:

```powershell
cd C:\Users\simon\Projects2025\Creerlio_V2\creerlio-platform\frontend
npm run dev
```

**Wait for:** `Local: http://localhost:3000`

## Step 5: Open Browser

- **Frontend:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs

---

## If Python Still Not Found

### Option 1: Add Python to PATH
1. Search "Environment Variables" in Windows
2. Click "Edit the system environment variables"
3. Click "Environment Variables"
4. Under "System variables", find "Path" and click "Edit"
5. Click "New" and add: `C:\Users\YourName\AppData\Local\Programs\Python\Python312`
6. Also add: `C:\Users\YourName\AppData\Local\Programs\Python\Python312\Scripts`
7. Click OK on all windows
8. **Restart terminal**

### Option 2: Use Full Path
Find where Python is installed and use the full path:
```powershell
C:\Users\YourName\AppData\Local\Programs\Python\Python312\python.exe -m venv venv
```

### Option 3: Reinstall Python
1. Download from https://www.python.org/downloads/
2. **IMPORTANT:** Check "Add Python to PATH" during installation
3. Restart terminal after installation

---

**The key is opening a NEW terminal after Python installation!**


