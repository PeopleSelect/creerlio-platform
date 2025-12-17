# Install Python for Creerlio Platform

Python is required for the backend. Here's how to install it on Windows:

## Quick Install (Recommended)

### Option 1: Microsoft Store (Easiest)
1. Open Microsoft Store
2. Search for "Python 3.11" or "Python 3.12"
3. Click "Install"
4. After installation, restart your terminal

### Option 2: Official Installer
1. Go to https://www.python.org/downloads/
2. Download Python 3.11 or 3.12 for Windows
3. **IMPORTANT**: Check "Add Python to PATH" during installation
4. Run the installer
5. Restart your terminal

### Option 3: Using winget (Windows Package Manager)
```powershell
winget install Python.Python.3.11
```

## Verify Installation

After installing, restart your terminal and run:
```powershell
python --version
# Should show: Python 3.11.x or Python 3.12.x
```

## After Python is Installed

Once Python is installed, run:
```powershell
cd Creerlio_V2\creerlio-platform
.\quick-start.bat
```

Or manually:
```powershell
# Backend setup
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r ..\requirements.txt
python main.py
```

## Troubleshooting

### "python is not recognized"
- Make sure you checked "Add Python to PATH" during installation
- Restart your terminal after installation
- Try `py` instead of `python` (Windows Python Launcher)

### Still not working?
1. Find where Python is installed (usually `C:\Users\YourName\AppData\Local\Programs\Python\`)
2. Add it to PATH manually:
   - Search "Environment Variables" in Windows
   - Edit "Path" variable
   - Add Python installation directory
   - Restart terminal


