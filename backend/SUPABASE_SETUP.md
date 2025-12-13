# Supabase Database Setup Instructions

## Step 1: Run the Schema Script

1. Open your Supabase project: https://supabase.com/dashboard/project/ihcsbodkciomtifihqvi
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `backend/supabase_schema.sql`
5. Paste it into the SQL editor
6. Click **Run** (or press Ctrl+Enter)

The script will create:
- ✅ **8 Identity Tables** (ASP.NET Core Identity - users, roles, authentication)
- ✅ **13 Master Data Tables** (countries, states, cities, industries, universities, visas, skills, etc.)
- ✅ **4 Core Tables** (TalentProfiles, BusinessProfiles, Jobs, Applications)
- ✅ All indexes and foreign key relationships
- ✅ EF Core migrations history tracking

## Step 2: Verify Tables Created

After running the script, you should see a success message showing the count of tables created.

You can verify by running this query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see approximately 25+ tables.

## Step 3: Update Backend Configuration

The connection string is already configured in `backend/Creerlio.Api/appsettings.json`.

However, after the schema is created, we need to disable automatic migrations since we're managing the schema manually.

## Step 4: Test the Connection

Once the schema is created, restart the backend:
```bash
cd /workspaces/creerlio-platform/backend/Creerlio.Api
dotnet run --urls "http://0.0.0.0:5007"
```

The backend should start without migration errors!

## What This Schema Includes

### Identity & Authentication
- User accounts (Talent and Business)
- Roles and permissions
- JWT token support
- Email confirmation
- Two-factor authentication support

### Master Data (Reference Tables)
- **Countries** - Employment and migration markets
- **States** - Australian states and territories
- **Cities** - Major Australian cities with population data
- **Industries** - Business industry categories
- **Job Categories** - Job types within industries
- **Universities** - Australian universities (including Group of 8)
- **TAFE Institutes** - Vocational education providers
- **Education Levels** - From high school to PhD
- **Credential Types** - Professional licenses and certifications
- **Visa Types** - Australian visa subclasses with work rights
- **Skill Definitions** - Standardized skill taxonomy
- **Employment Types** - Full-time, part-time, contract, etc.
- **Work Arrangements** - Office, remote, hybrid

### Core Application Tables
- **Talent Profiles** - Candidate profiles with resume data
- **Business Profiles** - Employer company profiles
- **Jobs** - Job postings
- **Applications** - Job applications linking talent to jobs

## Next Steps After Schema Creation

1. **Seed Master Data** - Populate reference tables with Australian data
2. **Test CRUD Operations** - Create/read/update/delete operations
3. **Enable Real-time** (optional) - Turn on Supabase real-time for live updates
4. **Configure Row Level Security** (optional) - Add RLS policies for data protection

## Troubleshooting

If you encounter errors:

1. **"relation already exists"** - Tables are already created, safe to ignore or drop them first
2. **"permission denied"** - Make sure you're using the service role key
3. **Syntax errors** - PostgreSQL version might be different, contact me for adjustments

## File Locations

- Schema SQL: `/workspaces/creerlio-platform/backend/supabase_schema.sql`
- Connection Config: `/workspaces/creerlio-platform/backend/Creerlio.Api/appsettings.json`
