#!/usr/bin/env python3
"""
Creerlio Platform - Setup Verification Script
Checks if all dependencies and configurations are correct
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check if Python version is 3.11+"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 11):
        print("❌ Python 3.11+ required. Current version:", sys.version)
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro}")
    return True

def check_node():
    """Check if Node.js is installed"""
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Node.js {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    print("❌ Node.js not found. Install from https://nodejs.org")
    return False

def check_env_file():
    """Check if .env file exists"""
    if Path('.env').exists():
        print("✅ .env file exists")
        
        # Check for placeholder values
        with open('.env', 'r') as f:
            content = f.read()
            if 'your_openai_api_key_here' in content or 'your_google_maps_api_key_here' in content:
                print("⚠️  Warning: .env contains placeholder values. Add your API keys.")
        return True
    else:
        print("❌ .env file not found. Copy from .env.example")
        return False

def check_backend_dependencies():
    """Check if backend dependencies are installed"""
    backend_path = Path('backend')
    if not backend_path.exists():
        print("❌ Backend directory not found")
        return False
    
    venv_path = backend_path / 'venv'
    if not venv_path.exists():
        print("⚠️  Backend virtual environment not found. Run: cd backend && python -m venv venv")
        return False
    
    # Try to import key packages
    try:
        import sys
        venv_python = venv_path / 'Scripts' / 'python.exe' if os.name == 'nt' else venv_path / 'bin' / 'python'
        if venv_python.exists():
            result = subprocess.run(
                [str(venv_python), '-c', 'import fastapi, sqlalchemy, openai'],
                capture_output=True
            )
            if result.returncode == 0:
                print("✅ Backend dependencies installed")
                return True
            else:
                print("⚠️  Backend dependencies not installed. Run: pip install -r requirements.txt")
                return False
    except Exception as e:
        print(f"⚠️  Could not verify backend dependencies: {e}")
        return False

def check_frontend_dependencies():
    """Check if frontend dependencies are installed"""
    frontend_path = Path('frontend')
    if not frontend_path.exists():
        print("❌ Frontend directory not found")
        return False
    
    node_modules = frontend_path / 'node_modules'
    if node_modules.exists():
        print("✅ Frontend dependencies installed")
        return True
    else:
        print("⚠️  Frontend dependencies not installed. Run: cd frontend && npm install")
        return False

def check_database():
    """Check database configuration"""
    if Path('.env').exists():
        with open('.env', 'r') as f:
            content = f.read()
            if 'DATABASE_URL' in content:
                print("✅ Database URL configured")
                return True
    print("⚠️  Database URL not configured in .env")
    return False

def main():
    print("🔍 Creerlio Platform - Setup Verification")
    print("=" * 50)
    print()
    
    checks = [
        ("Python Version", check_python_version),
        ("Node.js", check_node),
        (".env File", check_env_file),
        ("Backend Dependencies", check_backend_dependencies),
        ("Frontend Dependencies", check_frontend_dependencies),
        ("Database Configuration", check_database),
    ]
    
    results = []
    for name, check_func in checks:
        print(f"Checking {name}...")
        results.append(check_func())
        print()
    
    print("=" * 50)
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"✅ All checks passed ({passed}/{total})")
        print("\n🚀 You're ready to start the platform!")
        print("   Run: ./quick-start.sh (Linux/Mac) or quick-start.bat (Windows)")
        return 0
    else:
        print(f"⚠️  Some checks failed ({passed}/{total} passed)")
        print("\n📝 Please fix the issues above before starting the platform")
        return 1

if __name__ == '__main__':
    sys.exit(main())


