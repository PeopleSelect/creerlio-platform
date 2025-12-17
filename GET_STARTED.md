# 🚀 Get Started with Creerlio Platform

Welcome! This guide will get you up and running in minutes.

## ✅ What's Already Done

- ✅ Complete backend API with FastAPI
- ✅ Frontend with Next.js
- ✅ Database models and configuration
- ✅ AI resume parsing service
- ✅ Mapping and geocoding services
- ✅ PDF generation
- ✅ Azure deployment scripts
- ✅ Complete documentation
- ✅ Git repository initialized

## 🎯 Quick Start (3 Steps)

### Step 1: Verify Your Setup

```bash
python verify-setup.py
```

This checks:
- Python 3.11+ installed
- Node.js installed
- Environment file exists
- Dependencies ready

### Step 2: Add API Keys (Optional for Basic Testing)

Edit `.env` file:

```bash
# For AI Resume Parsing (get at https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your-key-here

# For Mapping Features (get at https://console.cloud.google.com/google/maps-apis)
GOOGLE_MAPS_API_KEY=your-key-here
```

**Note**: The app works without these, but AI and mapping features won't function.

### Step 3: Start the Platform

**Windows:**
```cmd
quick-start.bat
```

**Linux/Mac:**
```bash
chmod +x quick-start.sh
./quick-start.sh
```

Or manually:

**Terminal 1 - Backend:**
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r ../requirements.txt
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 🌐 Access Your Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 📚 Documentation

- **[MAKE_IT_WORK.md](./MAKE_IT_WORK.md)** - Detailed troubleshooting
- **[SETUP.md](./SETUP.md)** - Complete setup guide
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Full feature list
- **[GITHUB_SETUP.md](./GITHUB_SETUP.md)** - GitHub repository setup
- **[docs/AZURE_DEPLOYMENT_SETUP.md](./docs/AZURE_DEPLOYMENT_SETUP.md)** - Deploy to Azure

## 🧪 Test It Works

```bash
# Health check
curl http://localhost:8000/health

# Create a business
curl -X POST "http://localhost:8000/api/business" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Business", "description": "Testing"}'
```

## 🎉 You're Ready!

The platform is fully set up and ready to use. Start building amazing features!

---

**Need Help?** Check [MAKE_IT_WORK.md](./MAKE_IT_WORK.md) for troubleshooting.

