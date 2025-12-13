# Deploy Complete Supabase Schema - 80 Tables

## Status: READY TO DEPLOY

### Schema File
**Location:** `/workspaces/creerlio-platform/backend/COMPLETE_SUPABASE_SCHEMA.sql`
- **Size:** 1,177 lines
- **Tables:** 80 total (73 platform + 7 Identity)

### Deployment Instructions

#### Option 1: Supabase SQL Editor (RECOMMENDED - Easier for large files)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select project: `ihcsbodkciomtifihqvi`

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "+ New Query"

3. **Copy & Paste Schema**
   ```bash
   # In VS Code, open: /workspaces/creerlio-platform/backend/COMPLETE_SUPABASE_SCHEMA.sql
   # Select All (Ctrl+A) and Copy (Ctrl+C)
   # Paste into Supabase SQL Editor
   ```

4. **Execute**
   - Click "Run" button
   - Wait for completion (may take 30-60 seconds for 80 tables)

#### Option 2: PSQL Command Line

```bash
# From your terminal
psql "postgresql://postgres.ihcsbodkciomtifihqvi:Ineedthemoney99@aws-0-us-east-1.pooler.supabase.com:5432/postgres" \
  -f /workspaces/creerlio-platform/backend/COMPLETE_SUPABASE_SCHEMA.sql
```

### What This Schema Includes

#### Identity Tables (7)
- AspNetUsers, AspNetRoles, AspNetUserRoles
- AspNetUserClaims, AspNetRoleClaims
- AspNetUserLogins, AspNetUserTokens

#### Master Data (13)
- Countries, States, Cities
- Industries, JobCategories
- Universities, TAFEInstitutes
- EducationLevels, CredentialTypes, VisaTypes
- SkillDefinitions, EmploymentTypes, WorkArrangements

#### Talent Profile System (12)
- TalentProfiles, PersonalInformation
- WorkExperiences, Educations, Skills
- Certifications, PortfolioItems, Awards
- References, CareerPreferences
- PrivacySettings, VerificationStatuses

#### Portfolio Templates (5)
- PortfolioTemplates, TemplateDesigns
- PortfolioSections, PortfolioSharings
- BusinessAccesses

#### Business Profile System (12)
- BusinessProfiles, BusinessInformation
- Addresses, Locations
- FranchiseSettings, BrandGuidelines
- BusinessVerifications, SubscriptionInfos
- TeamMemberRatings, MarketIntelligences
- CompetitorActivities, ReputationMetrics

#### Job Posting & ATS (5)
- JobPostings, Applications
- ApplicationNotes, ApplicationActivities
- Interviews

#### Business Intelligence (3)
- BusinessIntelligenceReports
- OpportunityAlerts
- RecruitmentAnalytics

#### Career Pathway Planning (7)
- CareerPathways, PathwaySteps
- PathwayResources, Milestones
- SkillGapAnalyses, SkillGaps
- PathwayRecommendations

#### AI Matching (3)
- JobMatches, MatchBreakdowns, SkillMatches

#### Electronic Footprint (8)
- ElectronicFootprints, NewsMentions
- SocialMediaPosts, GitHubActivities
- Publications, SpeakingEngagements
- AwardRecognitions, FootprintAlerts

#### Credential Verification (2)
- CredentialVerifications, VerificationSources

#### Search & Discovery (3)
- SavedSearches, SearchCriterias, TalentPools

### Post-Deployment Verification

After running the schema, verify tables were created:

```sql
-- Run this in Supabase SQL Editor
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

You should see exactly 80 tables.

### Next Steps After Deployment

1. Restart backend to clear the "Cannot connect" warning
2. Test API endpoints (they should now return real data or empty arrays instead of mock data)
3. Seed master data using the MasterDataSeedService
4. Test user registration and login flows

### Troubleshooting

**If you get permission errors:**
- Make sure you're logged into the correct Supabase project
- Check that RLS (Row Level Security) is disabled for initial setup
- Run: `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;`

**If tables already exist:**
- The schema uses `CREATE TABLE` (not `CREATE TABLE IF NOT EXISTS`)
- You may need to drop existing tables first, or modify the script to use IF NOT EXISTS
- To drop all tables: Run the SQL script in reverse order with DROP TABLE statements

### Connection String
```
postgresql://postgres.ihcsbodkciomtifihqvi:Ineedthemoney99@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

---

**READY TO DEPLOY!** Follow Option 1 (SQL Editor) for the easiest deployment.
