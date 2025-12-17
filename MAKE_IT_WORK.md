# Make It Work - Quick Start Guide

Follow these steps to get the Creerlio Platform running in 5 minutes!

## ⚡ Quick Start (3 Steps)

### Step 1: Verify Setup

```bash
# Run the verification script
python verify-setup.py
```

This will check:
- ✅ Python 3.11+ installed
- ✅ Node.js installed
- ✅ .env file exists
- ✅ Dependencies installed
- ✅ Database configured

### Step 2: Add API Keys (If Needed)

Edit `.env` file and add your API keys:

```bash
# Required for AI Resume Parsing
OPENAI_API_KEY=sk-your-actual-key-here

# Required for Mapping Features
GOOGLE_MAPS_API_KEY=your-actual-key-here
```

**Don't have API keys yet?**
- OpenAI: https://platform.openai.com/api-keys (Free tier available)
- Google Maps: https://console.cloud.google.com/google/maps-apis ($200 free credit/month)

**Note**: The app will work without these keys, but AI parsing and mapping features won't function.

### Step 3: Start the Platform

**Option A: Automated (Recommended)**

**Windows:**
```cmd
quick-start.bat
```

**Linux/Mac:**
```bash
chmod +x quick-start.sh
./quick-start.sh
```

**Option B: Manual**

**Terminal 1 - Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# or: source venv/bin/activate  # Linux/Mac
pip install -r ../requirements.txt
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 🎯 Access Your Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## 🧪 Test It Works

### Test 1: Health Check
```bash
curl http://localhost:8000/health
```

Expected: `{"status":"healthy","service":"creerlio-platform"}`

### Test 2: API Documentation
Open http://localhost:8000/docs in your browser

### Test 3: Create a Business
```bash
curl -X POST "http://localhost:8000/api/business" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Business", "description": "A test business"}'
```

## 🐛 Troubleshooting

### "Module not found" errors
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r ../requirements.txt
```

### "Port already in use"
- Backend uses port 8000, Frontend uses 3000
- Change ports in `.env` if needed:
  - `PORT=8001` for backend
  - Update `NEXT_PUBLIC_API_URL` in frontend

### Database errors
- SQLite is used by default (no setup needed)
- For PostgreSQL, update `DATABASE_URL` in `.env`
- Run: `python -c "from app.database import init_db; init_db()"`

### API key errors
- AI features require OpenAI API key
- Mapping features require Google Maps API key
- App will run without them, but those features won't work

## 📚 Next Steps

1. ✅ Platform is running
2. 📖 Read [SETUP.md](./SETUP.md) for detailed setup
3. 📖 Read [README.md](./README.md) for feature overview
4. 🚀 Deploy to Azure: [docs/AZURE_DEPLOYMENT_SETUP.md](./docs/AZURE_DEPLOYMENT_SETUP.md)
5. 🔐 Set up secrets: [docs/AZURE_SECRETS_SETUP.md](./docs/AZURE_SECRETS_SETUP.md)

## 💡 Pro Tips

- Use SQLite for development (no setup needed)
- Use PostgreSQL for production
- Keep `.env` out of git (already in .gitignore)
- Use virtual environments for Python
- Check logs if something doesn't work

## 🆘 Still Having Issues?

1. Run `python verify-setup.py` to check everything
2. Check that ports 3000 and 8000 are free
3. Verify Python 3.11+ and Node.js 18+ are installed
4. Make sure you're in the correct directory
5. Check the error messages - they usually tell you what's wrong

---

**You're all set!** 🎉 Start building amazing features!


