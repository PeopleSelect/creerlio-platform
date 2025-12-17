# 🚀 How to Start Each Server

## Option 1: Automated (Both Servers at Once)

**Windows:**
```powershell
cd Creerlio_V2\creerlio-platform
.\quick-start.bat
```

**Linux/Mac:**
```bash
cd Creerlio_V2/creerlio-platform
chmod +x quick-start.sh
./quick-start.sh
```

This starts both backend and frontend automatically.

---

## Option 2: Manual (Start Each Server Separately)

### Start Backend Server (Terminal 1)

**Windows:**
```powershell
cd Creerlio_V2\creerlio-platform\backend

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies (first time only)
pip install -r ..\requirements.txt

# Start backend server
python main.py
```

**Linux/Mac:**
```bash
cd Creerlio_V2/creerlio-platform/backend

# Create virtual environment (first time only)
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies (first time only)
pip install -r ../requirements.txt

# Start backend server
python main.py
```

**Backend will run on:** http://localhost:8000
**API Documentation:** http://localhost:8000/docs

---

### Start Frontend Server (Terminal 2)

Open a **new terminal window** and run:

**Windows/Linux/Mac:**
```bash
cd Creerlio_V2/creerlio-platform/frontend

# Install dependencies (first time only)
npm install

# Start frontend server
npm run dev
```

**Frontend will run on:** http://localhost:3000

---

## Quick Reference

### Backend (FastAPI)
- **Port:** 8000
- **URL:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

### Frontend (Next.js)
- **Port:** 3000
- **URL:** http://localhost:3000

---

## First Time Setup Checklist

### Backend:
- [ ] Python 3.11+ installed
- [ ] Virtual environment created (`python -m venv venv`)
- [ ] Dependencies installed (`pip install -r ../requirements.txt`)
- [ ] `.env` file configured (optional, for API keys)

### Frontend:
- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)

---

## Troubleshooting

### Backend won't start?
- Make sure virtual environment is activated (you should see `(venv)` in prompt)
- Check Python version: `python --version` (should be 3.11+)
- Verify dependencies: `pip list` (should show fastapi, uvicorn, etc.)

### Frontend won't start?
- Check Node.js: `node --version` (should be 18+)
- Verify dependencies: `ls node_modules` (should exist)
- Try deleting `node_modules` and running `npm install` again

### Port already in use?
- Backend uses port 8000 - change in `.env`: `PORT=8001`
- Frontend uses port 3000 - Next.js will automatically use 3001 if 3000 is busy

---

## Stop Servers

- **Backend:** Press `Ctrl + C` in the backend terminal
- **Frontend:** Press `Ctrl + C` in the frontend terminal

---

## Development Commands

### Backend
```powershell
# Activate virtual environment
.\venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Run server
python main.py

# Run with auto-reload (if configured)
uvicorn main:app --reload
```

### Frontend
```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

**Need help?** Check [MAKE_IT_WORK.md](./MAKE_IT_WORK.md) for troubleshooting.


