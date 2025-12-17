# ✅ What To Do Now - Simple Checklist

## Step-by-Step Instructions

### Step 1: Navigate to Project Folder
Open your terminal and run:
```powershell
cd Creerlio_V2\creerlio-platform
```

### Step 2: Choose Your Method

**Option A: Easy Way (Recommended)**
Run the automated script:
```powershell
.\quick-start.bat
```
This does everything automatically!

**Option B: Manual Way (If you want control)**
Follow the steps below.

---

## Manual Setup (If Option A doesn't work)

### Step 1: Setup Backend (Terminal 1)

```powershell
cd Creerlio_V2\creerlio-platform\backend

# Create virtual environment (first time only)
python -m venv venv

# Activate it
.\venv\Scripts\activate

# Install Python packages (first time only)
pip install -r ..\requirements.txt

# Start the backend server
python main.py
```

**You should see:** `Uvicorn running on http://0.0.0.0:8000`

**✅ Backend is running when you see:** Server startup messages

---

### Step 2: Setup Frontend (Terminal 2)

Open a **NEW terminal window** (keep backend running):

```powershell
cd Creerlio_V2\creerlio-platform\frontend

# Install packages (first time only - already done!)
npm install

# Start the frontend server
npm run dev
```

**You should see:** `Local: http://localhost:3000`

**✅ Frontend is running when you see:** "Ready" message

---

## Step 3: Open in Browser

Once both are running:

1. **Frontend:** Open http://localhost:3000
2. **Backend API:** Open http://localhost:8000/docs

---

## Quick Troubleshooting

### "python is not recognized"
- Make sure you exited Python's interactive mode (type `exit()` if you're in `>>>`)
- Restart your terminal
- Try `py` instead of `python`

### "Port already in use"
- Something else is using port 8000 or 3000
- Close other applications or change ports in `.env`

### "Module not found"
- Make sure virtual environment is activated (you should see `(venv)` in prompt)
- Run `pip install -r ..\requirements.txt` again

---

## What Success Looks Like

✅ **Backend Terminal:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

✅ **Frontend Terminal:**
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  ✓ Ready in 2.3s
```

✅ **Browser:**
- Frontend loads at http://localhost:3000
- You see the Creerlio Platform homepage

---

## Next Steps After It's Running

1. ✅ Test the API: Visit http://localhost:8000/docs
2. ✅ Explore the frontend: Visit http://localhost:3000
3. ✅ Add API keys (optional): Edit `.env` file for AI and mapping features

---

**That's it!** Start with `.\quick-start.bat` for the easiest setup.


