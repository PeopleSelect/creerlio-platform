# Creerlio Platform - Setup Guide

Quick setup guide to get the Creerlio Platform running locally.

## Prerequisites

- Python 3.11 or higher
- Node.js 18 or higher
- PostgreSQL (or SQLite for development)
- Git

## Quick Start

### 1. Clone and Navigate

```bash
cd Creerlio_V2/creerlio-platform
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r ../requirements.txt

# Set up environment variables
cp ../.env.example ../.env
# Edit .env and add your API keys

# Initialize database
python -c "from app.database import init_db; init_db()"

# Start server
python main.py
```

The backend will be available at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## Environment Variables

Create a `.env` file in the root directory with:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/creerlio_db
# Or for SQLite: sqlite:///./creerlio.db

# OpenAI API (for AI Resume Parsing)
OPENAI_API_KEY=your_key_here

# Google Maps API (for Mapping)
GOOGLE_MAPS_API_KEY=your_key_here

# Application
HOST=0.0.0.0
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Testing

### Test Resume Upload

```bash
curl -X POST "http://localhost:8000/api/resume/upload" \
  -F "file=@path/to/resume.pdf"
```

### Test Geocoding

```bash
curl -X POST "http://localhost:8000/api/mapping/geocode" \
  -H "Content-Type: application/json" \
  -d '{"address": "New York, NY"}'
```

### Test Business Creation

```bash
curl -X POST "http://localhost:8000/api/business" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech Startup Inc",
    "description": "Innovative tech company",
    "address": "123 Main St, San Francisco, CA"
  }'
```

## Troubleshooting

### Database Connection Error

- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database exists

### Module Not Found

- Activate virtual environment
- Reinstall dependencies: `pip install -r requirements.txt`

### API Key Errors

- Verify API keys in .env file
- Check API key permissions and restrictions
- Ensure APIs are enabled in provider dashboards

## Next Steps

- Read [README.md](./README.md) for feature overview
- Check [docs/AZURE_DEPLOYMENT_SETUP.md](./docs/AZURE_DEPLOYMENT_SETUP.md) for deployment
- Review [docs/MAP_SETUP_GUIDE.md](./docs/MAP_SETUP_GUIDE.md) for mapping setup

## Support

For issues or questions, check the documentation in the `docs/` directory.



