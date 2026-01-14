# Fix: Application Failed to Respond on Railway

## Problem
The application builds successfully but crashes at runtime with "Application failed to respond" error.

## Common Causes

1. **Missing Environment Variables**
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` are required
   - `SUPABASE_SERVICE_ROLE_KEY` is required for admin features
   - `OPENAI_API_KEY` is optional but needed for AI features

2. **Hardcoded Windows Paths**
   - Debug log paths pointing to Windows directories will fail on Linux
   - These are wrapped in try/except so they shouldn't crash, but should be removed

3. **Port Binding Issues**
   - Railway sets `$PORT` environment variable automatically
   - The app should use `os.getenv("PORT", "8000")`

4. **Database Connection Issues**
   - If using Supabase, ensure `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
   - Database connection errors will cause startup failures

## How to Diagnose

1. **Check Railway Deploy Logs:**
   - Go to Railway Dashboard → Your Service → Deployments
   - Click on the failed deployment
   - Click "Deploy Logs" tab
   - Look for error messages at the end of the logs

2. **Check Required Environment Variables:**
   - Railway Dashboard → Your Service → Variables
   - Ensure these are set:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY` (for admin features)
     - `OPENAI_API_KEY` (optional, for AI features)

3. **Common Error Messages:**
   - `ModuleNotFoundError` → Missing dependency in requirements.txt
   - `Connection refused` → Database connection issue
   - `Environment variable not set` → Missing required env var
   - `Port already in use` → Port binding issue

## Next Steps

1. Check the deploy logs for the specific error
2. Verify all required environment variables are set
3. Remove any hardcoded Windows paths
4. Test the health endpoint: `https://your-app.railway.app/health`
