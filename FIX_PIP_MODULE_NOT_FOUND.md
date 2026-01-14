# Fix: No module named pip

## Problem
Nixpacks build failed with: `/root/.nix-profile/bin/python: No module named pip`

## Root Cause
Python from Nix doesn't include `pip` by default. We need to bootstrap pip first using `python -m ensurepip`.

## Fix Applied

### Updated `nixpacks.toml`
**Before:**
```toml
[phases.install]
cmds = [
  "python -m pip install -r backend/requirements.txt"  # ❌ pip not installed
]
```

**After:**
```toml
[phases.install]
cmds = [
  "python -m ensurepip --upgrade",  # ✅ Bootstrap pip first
  "python -m pip install --upgrade pip",  # ✅ Upgrade to latest pip
  "python -m pip install -r backend/requirements.txt"  # ✅ Install dependencies
]
```

## Why This Works

- `python -m ensurepip` bootstraps pip using Python's built-in ensurepip module
- This is the standard way to install pip when it's not included with Python
- Works with Nix Python installations that don't bundle pip
- We upgrade pip after bootstrapping to ensure we have the latest version

## Files Updated

1. **`nixpacks.toml`** - Added `ensurepip` bootstrap step ✅

## Next Steps

1. **Railway will auto-redeploy** with the fix
2. **Check build logs** - Should see:
   ```
   ✓ Installing Python 3.12
   ✓ Running: python -m ensurepip --upgrade
   ✓ Bootstrapping pip...
   ✓ Running: python -m pip install --upgrade pip
   ✓ Upgrading pip...
   ✓ Running: python -m pip install -r backend/requirements.txt
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
install    │ python -m ensurepip --upgrade
           │ python -m pip install --upgrade pip
           │ python -m pip install -r backend/requirements.txt
start      │ cd backend && python -m uvicorn main:app
✓ Pip bootstrapped successfully
✓ Dependencies installed successfully
✓ Build complete
✓ Application startup complete
```

The fix is committed and pushed. Railway should now build successfully! 🚀
