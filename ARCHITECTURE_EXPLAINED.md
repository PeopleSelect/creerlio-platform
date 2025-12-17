# 🏗️ Creerlio Platform Architecture

## Two Separate Servers

The Creerlio Platform consists of **two separate applications** that work together:

### 1. Backend Server (Python/FastAPI)
- **Technology:** Python 3.12 + FastAPI
- **Port:** 8000
- **Purpose:** API server, database, business logic
- **What it does:**
  - Handles API requests
  - Processes resume parsing with AI
  - Manages business and talent profiles
  - Provides mapping services
  - Generates PDFs

**You need:** Python 3.12 ✅ (You have this!)

### 2. Frontend Server (Next.js/React)
- **Technology:** Node.js + Next.js + React
- **Port:** 3000
- **Purpose:** Web interface users see in browser
- **What it does:**
  - Displays the website
  - User interface and forms
  - Connects to backend API
  - Shows maps and data

**You need:** Node.js + Next.js ✅ (Just installed!)

## How They Work Together

```
Browser (You)
    ↓
Frontend (Next.js) - Port 3000
    ↓ (API calls)
Backend (Python/FastAPI) - Port 8000
    ↓
Database & Services
```

## What You Need Installed

✅ **Python 3.12** - For backend
✅ **Node.js** - For frontend (you have v24.12.0)
✅ **Next.js** - Frontend framework (just installed!)

## Running Both Servers

You need **TWO terminal windows**:

**Terminal 1 - Backend:**
```powershell
cd backend
.\venv\Scripts\activate
python main.py
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

## Quick Summary

- **Python** = Backend server (API)
- **Next.js** = Frontend server (Website)
- **Both needed** = Complete application

---

**Both are now installed and ready to run!**


