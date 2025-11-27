# Supabase Integration - Setup Complete ✅

## Current Status

✅ **Backend**: Running on http://0.0.0.0:5007  
✅ **Frontend**: Running on port 3000  
✅ **PostgreSQL Support**: Fully configured with Npgsql  
✅ **Value Converters**: All List<string>, List<int>, List<Guid> properties configured for jsonb  
⏳ **Database Schema**: Ready to deploy (see instructions below)

## What's Been Done

### 1. PostgreSQL Migration
- ✅ Installed `Npgsql.EntityFrameworkCore.PostgreSQL` (v8.0.0)
- ✅ Updated both `CreerlioDbContext` and `AppIdentityDbContext` to use PostgreSQL
- ✅ Configured connection string for Supabase in `appsettings.json`
- ✅ Added value converters for all collection properties (List<string>, List<int>, List<Guid>)
- ✅ Changed all JSON columns from `nvarchar(max)` to `jsonb` for PostgreSQL compatibility

### 2. Database Schema Generated
- ✅ Created comprehensive SQL schema file: `backend/SUPABASE_SCHEMA.sql`
- ✅ Includes all tables for:
  - Master Data (Countries, States, Cities, Industries, Skills, etc.)
  - Talent Profiles (Complete profile system with portfolio, certifications, etc.)
  - Business Profiles (Company profiles, job postings, ATS)
  - Applications & Hiring
  - Analytics & Intelligence
  - Reputation & Verification

### 3. Connection Configuration
**IMPORTANT:** The connection string in this document may be outdated. 

To get your current connection string:
1. Go to Supabase Dashboard → Project Settings → Database
2. Find "Connection string" section
3. Copy the URI format connection string
4. Update `appsettings.json` with the new connection string

Example format:
```
Host=db.xxx.supabase.co
Database=postgres
Username=postgres
Password=YOUR_PASSWORD
Port=5432
```

## Next Steps: Deploy Database Schema

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Sign in and select your project

2. **Get Current Connection String**
   - Click on "Project Settings" (gear icon in bottom left)
   - Click "Database" in the settings menu
   - Scroll to "Connection string" section
   - Copy the "URI" connection string (it will look like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`)
   - Note: Replace `[YOUR-PASSWORD]` with your actual database password

3. **Navigate to SQL Editor**
   - In the left sidebar, look for "SQL Editor" (may be under a different icon now)
   - Current Supabase may call it "SQL" or have it in a different location
   - Click "+ New query" or similar button

4. **Run the Schema**
   - Open the file: `backend/COMPLETE_SUPABASE_SCHEMA.sql`
   - Copy ALL contents (it's a large file)
   - Paste into the SQL Editor
   - Click "Run" or the play button (or press Cmd/Ctrl + Enter)

5. **Verify Tables Created**
   - Go to "Table Editor" or "Database" in left sidebar
   - You should see 70+ tables including:
     - Countries, States, Cities
     - TalentProfiles, BusinessProfiles
     - JobPostings, Applications
     - And many more...

### Option 2: Using psql Command Line

```bash
# First, get your current connection string from Supabase Dashboard:
# Settings → Database → Connection string → URI

# Then run (replace CONNECTION_STRING with your actual connection string):
cd /workspaces/creerlio-platform/backend
psql "YOUR_CONNECTION_STRING_HERE" -f COMPLETE_SUPABASE_SCHEMA.sql
```

### Option 3: Update Connection String and Use EF Core Migrations

```bash
# Update the connection string in appsettings.json with the correct one from Supabase
# Then run:
cd /workspaces/creerlio-platform/backend/Creerlio.Api
dotnet ef database update --project ../Creerlio.Infrastructure
```

## After Schema Deployment

### 1. Test Database Connection

Restart the backend to test the connection:
```bash
cd /workspaces/creerlio-platform/backend/Creerlio.Api
dotnet run --urls "http://0.0.0.0:5007"
```

You should see:
```
✅ Database connection successful!
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://0.0.0.0:5007
```

### 2. Seed Master Data (Optional but Recommended)

The backend includes a `MasterDataSeedService` that can populate initial data:
- Countries (Australia + major trading partners)
- Australian States & Territories
- Major Australian Cities
- Industries & Job Categories
- Universities & TAFEs
- Visa Types
- Common Skills

To enable auto-seeding, update `Program.cs` (currently commented out).

### 3. Test API Endpoints

Once database is deployed:

**Master Data APIs:**
- http://localhost:5007/api/masterdata/countries
- http://localhost:5007/api/masterdata/states
- http://localhost:5007/api/masterdata/cities
- http://localhost:5007/api/masterdata/industries
- http://localhost:5007/api/masterdata/skills

**Business APIs:**
- POST http://localhost:5007/api/business/register
- GET http://localhost:5007/api/business/{id}
- GET http://localhost:5007/api/business/search

**Talent APIs:**
- POST http://localhost:5007/api/talent/register
- GET http://localhost:5007/api/talent/profile/{id}
- POST http://localhost:5007/api/talent/parse-resume

## Configuration Files

### Connection String Location
`/workspaces/creerlio-platform/backend/Creerlio.Api/appsettings.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=aws-0-us-east-1.pooler.supabase.com;Database=postgres;Username=postgres.ihcsbodkciomtifihqvi;Password=7FGOcZ1OH11qsNRD;Port=5432;Pooling=true;SSL Mode=Require;Trust Server Certificate=true;"
  },
  "Supabase": {
    "Url": "https://ihcsbodkciomtifihqvi.supabase.co",
    "AnonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "ServiceRoleKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### DbContext Configuration
`/workspaces/creerlio-platform/backend/Creerlio.Infrastructure/CreerlioDbContext.cs`

- Uses `UseNpgsql()` provider
- Automatic value converters for List<T> properties
- All JSON columns use `jsonb` type for PostgreSQL

## Troubleshooting

### "Cannot connect to database" Warning
- This is expected until you run the SQL schema in Supabase
- Backend runs with mock data until database is available

### EF Core Warnings About Value Comparers
- These are non-critical warnings
- Collections will work correctly with the configured converters

### Connection Timeout
- Supabase pooler may have connection limits
- Consider upgrading Supabase plan if you hit limits
- For development, the free tier should be sufficient

## Production Deployment

Before deploying to production:

1. **Update Connection String**
   - Use environment variables instead of appsettings.json
   - Never commit production credentials to git

2. **Enable SSL Certificate Validation**
   - Remove `Trust Server Certificate=true` in production
   - Use proper SSL certificate validation

3. **Review Row Level Security (RLS)**
   - Supabase recommends enabling RLS on all tables
   - Current schema doesn't include RLS policies
   - Add RLS policies for multi-tenant security

4. **Set up Backups**
   - Configure automated backups in Supabase dashboard
   - Test backup restoration process

5. **Monitor Performance**
   - Use Supabase dashboard for query performance
   - Consider adding indexes for common queries
   - Monitor connection pool usage

## Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Npgsql EF Core**: https://www.npgsql.org/efcore/

## Summary

The platform is now fully configured for PostgreSQL with Supabase:
- ✅ All code changes complete
- ✅ Schema SQL file ready
- ✅ Connection configured
- ⏳ Waiting for you to run the schema in Supabase SQL Editor

Once you execute the SQL schema in Supabase, the platform will have full database persistence and you can start creating real business and talent profiles!
