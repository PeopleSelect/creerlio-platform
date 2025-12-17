#!/bin/bash

# Startup script for Creerlio Platform Backend

echo "🚀 Starting Creerlio Platform Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r ../requirements.txt

# Initialize database
echo "🗄️  Initializing database..."
python -c "from app.database import init_db; init_db()"

# Start server
echo "🌐 Starting FastAPI server..."
python main.py



