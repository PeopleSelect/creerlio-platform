# Fix: Nixpacks Build Error - "undefined variable 'pip'"

## Problem
Nixpacks build failed with error: `error: undefined variable 'pip'`

## Root Cause
In `nixpacks.toml`, I incorrectly specified `pip` as a separate Nix package. `pip` comes bundled with Python, so it's not a standalone package in Nix.

## Fix Applied

### Updated `nixpacks.toml`
**Before (incorrect):**
```toml
[phases.setup]
nixPkgs = ["python312", "pip"]  # ❌ pip is not a valid Nix package
```

**After (correct):**
```toml
[phases.setup]
nixPkgs = ["python312"]  # ✅ pip comes with Python
```

### Updated `railway.json`
- Removed redundant buildCommand (Nixpacks handles this via nixpacks.toml)
- Kept startCommand

## Files Updated

1. **`nixpacks.toml`** - Removed `pip` from nixPkgs ✅
2. **`railway.json`** - Simplified build config ✅

## How It Works Now

1. **Nixpacks detects** `nixpacks.toml`
2. **Installs Python 3.12** (which includes pip)
3. **Runs install phase**: `pip install -r backend/requirements.txt`
4. **Starts app**: `cd backend && python -m uvicorn main:app`

## Next Steps

1. **Railway will auto-redeploy** with the fix
2. **Check build logs** - Should see:
   ```
   ✓ Installing Python 3.12
   ✓ Installing dependencies from backend/requirements.txt
   ✓ Build complete
   ```

## Expected Build Output

```
Using Nixpacks
setup      │ python312
install    │ pip install -r backend/requirements.txt
start      │ cd backend && python -m uvicorn main:app
✓ Build successful
```

The fix is committed and pushed. Railway should now build successfully! 🚀
