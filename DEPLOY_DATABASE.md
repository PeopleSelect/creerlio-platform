# Simple Database Deployment Guide

## Option 1: Use SQL Editor in Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Find SQL Editor**
   - Look in the left sidebar for "SQL Editor" or just "SQL"
   - Or click the icon that looks like </> or a terminal

3. **Create New Query**
   - Click the button to create a new query (might say "+ New query" or just "+")

4. **Run the Schema**
   - Open this file on your computer: `backend/COMPLETE_SUPABASE_SCHEMA.sql`
   - Copy the ENTIRE contents
   - Paste into the Supabase SQL editor
   - Click "Run" or the play button (▶)
   - Wait for it to complete (may take 30-60 seconds)

5. **Verify**
   - Look for "Tables" or "Table Editor" in the sidebar
   - You should see many tables created

---

## Option 2: Just Start the Backend (Automatic)

The backend will try to create tables automatically when it starts:

```bash
cd /workspaces/creerlio-platform/backend/Creerlio.Api
dotnet run --urls "http://0.0.0.0:5007"
```

If you see errors about database connection, you need to update the connection info in `appsettings.json` first.

---

## Option 3: Get Your Database Connection Info

If neither option works, you need to get your Supabase database details:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Look for "Project Settings" (gear icon at bottom)
4. Click "Database" or "Configuration" 
5. You should see:
   - Host
   - Database name
   - Port
   - User
   - Password (you may need to reset it)

6. Update `backend/Creerlio.Api/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=YOUR_HOST;Database=postgres;Username=postgres;Password=YOUR_PASSWORD;Port=5432;SSL Mode=Require;"
  }
}
```

Then try Option 2 again.
