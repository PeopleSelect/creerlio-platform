#!/usr/bin/env python3
"""
Startup script for Railway deployment
Handles errors gracefully and ensures app starts
"""
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from main import app
    import uvicorn
    
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    
    print(f"Starting server on {host}:{port}")
    print(f"Python version: {sys.version}")
    print(f"Working directory: {os.getcwd()}")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info"
    )
except Exception as e:
    print(f"FATAL ERROR: Failed to start application: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
