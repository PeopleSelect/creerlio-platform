# Deploy Backend to Railpack - Step by Step Guide

## Prerequisites Checklist

Before deploying, ensure you have:

- [ ] Railpack account created and logged in
- [ ] Project connected to Railpack (via GitHub or direct)
- [ ] Supabase credentials ready
- [ ] All configuration files committed

## Step 1: Commit Configuration Files

The Railpack configuration files need to be committed:

```bash
git add Procfile railpack.json backend/railpack.json RAILPACK_SETUP.md
git commit -m "Add Railpack configuration for backend deployment"
git push
```

## Step 2: Connect Project to Railpack

1. **Go to Railpack Dashboard**
   - Visit your Railpack dashboard
   - Click "New Project" or select existing project

2. **Connect Repository**
   - If using GitHub: Connect your repository
   - If deploying directly: Upload or connect your code

3. **Set Root Directory**
   - **Option A**: Set root to project root (recommended)
     - Root Directory: `.` (or leave empty)
     - Uses `Procfile` or root `railpack.json`
   
   - **Option B**: Set root to `backend/`
     - Root Directory: `backend`
     - Uses `backend/railpack.json`

## Step 3: Configure Environment Variables

In Railpack Dashboard → Environment Variables, add:

### Required Supabase Variables:
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Optional Server Variables:
```
HOST=0.0.0.0
PORT=8000
```

**Note**: `PORT` is usually auto-set by Railpack, but you can override it.

### How to Get Supabase Keys:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## Step 4: Configure Build Settings

In Railpack Dashboard → Settings:

1. **Python Version**
   - Set to Python 3.11 or 3.12 (check `backend/requirements.txt` compatibility)

2. **Build Command** (if not auto-detected):
   ```
   pip install -r backend/requirements.txt
   ```

3. **Start Command** (should auto-detect from Procfile):
   ```
   cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

## Step 5: Deploy

1. **Trigger Deployment**
   - Click "Deploy" or "Redeploy" in Railpack dashboard
   - Or push to your connected branch (auto-deploy)

2. **Monitor Build Logs**
   - Watch for:
     - ✅ "Installing dependencies"
     - ✅ "Starting uvicorn server"
     - ✅ "Application startup complete"
   - ❌ Any errors (dependencies, imports, etc.)

## Step 6: Verify Deployment

### Check Health Endpoint:
```bash
curl https://your-railpack-url.railway.app/health
```

Expected response:
```json
{"status": "healthy", "service": "Creerlio Platform API"}
```

### Check Root Endpoint:
```bash
curl https://your-railpack-url.railway.app/
```

Expected response:
```json
{"message": "Creerlio Platform API", "version": "1.0.0"}
```

### Test API Endpoint:
```bash
curl https://your-railpack-url.railway.app/api/auth/me
```

## Step 7: Update Frontend (If Needed)

If your frontend calls the backend API, update the backend URL:

1. **Environment Variable** (Vercel):
   ```
   NEXT_PUBLIC_BACKEND_URL=https://your-railpack-url.railway.app
   ```

2. **Or in code** (if hardcoded):
   - Update any `localhost:8000` references
   - Use the Railpack URL instead

## Troubleshooting

### Issue: "No start command found"
- ✅ **Fixed**: Procfile and railpack.json are created
- Verify they're committed and pushed
- Check root directory setting in Railpack

### Issue: "Module not found" or Import errors
- Check `backend/requirements.txt` has all dependencies
- Verify Python version compatibility
- Check build logs for missing packages

### Issue: "Supabase client not configured"
- Verify all 3 Supabase environment variables are set
- Check variable names match exactly (case-sensitive)
- Ensure no extra spaces in values

### Issue: "Port already in use"
- Remove `PORT` environment variable (let Railpack set it)
- Or use the port Railpack provides

### Issue: "Application startup failed"
- Check logs for specific error
- Verify `backend/main.py` has `app = FastAPI(...)`
- Ensure all imports work correctly

## Quick Deploy Checklist

- [ ] Configuration files committed (`Procfile`, `railpack.json`)
- [ ] Project connected to Railpack
- [ ] Root directory set correctly
- [ ] Supabase environment variables added
- [ ] Build command configured
- [ ] Deployment triggered
- [ ] Build logs show success
- [ ] Health endpoint responds
- [ ] Frontend updated with backend URL (if needed)

## Next Steps After Deployment

1. **Get the deployment URL** from Railpack dashboard
2. **Update frontend** to use the new backend URL
3. **Test all API endpoints** to ensure they work
4. **Monitor logs** for any runtime errors
5. **Set up monitoring/alerts** if available in Railpack

## Support

If you encounter issues:
1. Check Railpack logs for specific errors
2. Verify all environment variables are set correctly
3. Test the backend locally first: `cd backend && uvicorn main:app`
4. Check Supabase connection from the deployed backend
