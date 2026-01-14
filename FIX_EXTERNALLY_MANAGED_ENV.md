# Fix: externally-managed-environment Error

## Problem
Nixpacks build failed with: `error: externally-managed-environment`

The Nix Python environment is immutable and cannot be modified directly. We can't use `ensurepip` or install packages into the system Python.

## Root Cause
Nix's Python installation is read-only. We need to create a virtual environment to install packages.

## Fix Applied

### Updated `nixpacks.toml`
**Before:**
```toml
[phases.install]
cmds = [
  "python -m ensurepip --upgrade",  # ❌ Fails: externally-managed
  "python -m pip install -r backend/requirements.txt"
]

[start]
cmd = "cd backend && python -m uvicorn main:app"
```

**After:**
```toml
[phases.install]
cmds = [
  "python -m venv /opt/venv",  # ✅ Create virtual environment
  "/opt/venv/bin/pip install --upgrade pip",  # ✅ Use venv pip
  "/opt/venv/bin/pip install -r backend/requirements.txt"  # ✅ Install to venv
]

[start]
cmd = "cd backend && /opt/venv/bin/python -m uvicorn main:app"  # ✅ Use venv Python
```

## Why This Works

- Virtual environments are isolated from the system Python
- We can install packages into `/opt/venv` without modifying Nix's immutable store
- This is the standard approach for Nix-based Python deployments
- The virtual environment persists across the build and runtime

## Files Updated

1. **`nixpacks.toml`** - Create venv and use venv Python/pip ✅
2. **`railway.json`** - Updated start command to use venv Python ✅

## Next Steps

1. **Railway will auto-redeploy** with the fix
2. **Check build logs** - Should see:
   ```
   ✓ Installing Python 3.12
   ✓ Creating virtual environment at /opt/venv
   ✓ Upgrading pip...
   ✓ Installing fastapi...
   ✓ Installing uvicorn...
   ✓ Installing python-dotenv...
   ...
   ✓ Build complete
   ```

## Expected Build Output

```
Using Nixpacks
setup      │ python312
install    │ python -m venv /opt/venv
           │ /opt/venv/bin/pip install --upgrade pip
           │ /opt/venv/bin/pip install -r backend/requirements.txt
start      │ cd backend && /opt/venv/bin/python -m uvicorn main:app
✓ Virtual environment created
✓ Dependencies installed successfully
✓ Build complete
✓ Application startup complete
```

The fix is committed and pushed. Railway should now build successfully! 🚀
