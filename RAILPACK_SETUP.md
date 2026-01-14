# Railpack Deployment Setup

## Problem
Railpack detected Python but couldn't find a start command.

## Solution
Created configuration files to tell Railpack how to start the FastAPI application.

## Files Created

### 1. `Procfile` (Root directory)
Standard Procfile for deployment platforms:
```
web: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
```

### 2. `railpack.json` (Root directory)
Railpack-specific configuration:
```json
{
  "build": {
    "builder": "pip",
    "buildCommand": "pip install -r backend/requirements.txt"
  },
  "start": {
    "command": "cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT"
  }
}
```

### 3. `backend/railpack.json`
Alternative configuration if Railpack root is set to `backend/`:
```json
{
  "start": {
    "command": "uvicorn main:app --host 0.0.0.0 --port $PORT"
  }
}
```

## Configuration Options

### Option 1: Use Root Directory (Recommended)
- Set Railpack root directory to project root
- Uses `Procfile` or root `railpack.json`
- Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

### Option 2: Use Backend Directory
- Set Railpack root directory to `backend/`
- Uses `backend/railpack.json`
- Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

## Environment Variables Needed

Make sure these are set in Railpack:
- `PORT` - Automatically set by Railpack (usually 8000 or from platform)
- `HOST` - Optional, defaults to 0.0.0.0

### Supabase Configuration (Required)
Since the backend uses Supabase as its database/service:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations like account deletion)

### Other Environment Variables
- Any API keys your app needs (OpenAI, etc.)
- Other service configurations

## FastAPI App Details

- **App instance**: `app` (defined in `backend/main.py` line 182)
- **Module**: `main:app` (main.py file, app variable)
- **Framework**: FastAPI
- **Server**: Uvicorn
- **Port**: Uses `$PORT` environment variable (defaults to 8000)

## Next Steps

1. **Commit the configuration files:**
   ```bash
   git add Procfile railpack.json backend/railpack.json
   git commit -m "Add Railpack configuration for FastAPI deployment"
   git push
   ```

2. **In Railpack Dashboard:**
   - Set root directory to project root (or `backend/` if using Option 2)
   - Verify environment variables are set
   - Redeploy

3. **Verify deployment:**
   - Check logs for "Application startup complete"
   - Test API endpoints
   - Verify health check endpoint (if configured)

## Troubleshooting

If Railpack still can't start the app:

1. **Check logs** - Look for specific error messages
2. **Verify Python version** - Ensure compatible Python version
3. **Check dependencies** - Ensure all packages in `requirements.txt` install correctly
4. **Verify app structure** - Ensure `backend/main.py` exists and has `app = FastAPI(...)`
5. **Test locally** - Run `cd backend && uvicorn main:app --host 0.0.0.0 --port 8000` to verify it works
