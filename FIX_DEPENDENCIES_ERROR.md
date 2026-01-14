# Fix: ModuleNotFoundError: No module named 'dotenv'

## Problem
Railway is not installing dependencies from `backend/requirements.txt`. The error shows `ModuleNotFoundError: No module named 'dotenv'`.

## Root Cause
Railway was using the root `requirements.txt` (incomplete) instead of `backend/requirements.txt` (complete with all dependencies).

## Fixes Applied

### 1. ✅ Updated Root `requirements.txt`
- Added all missing dependencies from `backend/requirements.txt`
- Now includes: `python-dotenv`, `openai`, `supabase`, etc.

### 2. ✅ Created `railway.json`
- Railway-specific configuration file
- Explicitly sets build command to install from `backend/requirements.txt`

### 3. ✅ Updated `railpack.json`
- Changed build command path
- Uses `NIXPACKS` builder (Railway's default)

## Files Updated

1. **`requirements.txt`** (root) - Now has all dependencies
2. **`railway.json`** - Railway-specific config (new)
3. **`railpack.json`** - Updated build command

## Next Steps

1. **Commit and push:**
   ```bash
   git add requirements.txt railway.json railpack.json
   git commit -m "Fix dependencies: Update root requirements.txt and Railway config"
   git push
   ```

2. **Railway will auto-redeploy** with the fixes

3. **Verify:**
   - Check logs for "Installing dependencies"
   - Should see all packages installing
   - No more "ModuleNotFoundError"

## Why This Happened

Railway auto-detects `requirements.txt` at the project root. Since we had a minimal one there, it used that instead of the complete one in `backend/`. Now both are in sync.

## Alternative Solution (If Still Fails)

If Railway still doesn't install dependencies, you can:

1. **Set Build Command in Railway Dashboard:**
   - Go to Settings → Build
   - Set build command: `pip install -r backend/requirements.txt`

2. **Or use Nixpacks.toml:**
   Create `nixpacks.toml` in project root:
   ```toml
   [phases.setup]
   nixPkgs = ["python312", "pip"]
   
   [phases.install]
   cmds = ["pip install -r backend/requirements.txt"]
   
   [start]
   cmd = "cd backend && python -m uvicorn main:app --host 0.0.0.0 --port $PORT"
   ```

The fixes should work now! 🚀
