# Quick Reference: Using MASTER_DATA_SPECIFICATION.md

## What You Have

The `MASTER_DATA_SPECIFICATION.md` file contains **every dropdown, filter, and data category** needed for the Creerlio platform:

### ✅ Complete Data Coverage

**Locations (Section 1-5)**
- 56 countries
- All Australian states/territories
- 300+ Australian cities, towns & regional areas (major + rural)
- Postcode system guidelines
- Radius search options (1km - 200km+)

**Education (Section 6-8)**
- 45+ Australian universities
- 35+ TAFE/VET institutes
- All qualification levels (Cert I-IV, Diploma, Bachelor, Masters, PhD)

**Industries & Jobs (Section 9-10)**
- 33 major SEEK-style industries
- 400+ detailed job sub-categories
- Full breakdowns for: Accounting, Admin, Hospitality, Construction, Healthcare, IT, Trades, Transport, Mining, Engineering, etc.

**Employment & Visas (Section 11-13)**
- 15 employment types
- 22 work rights categories
- 25+ visa subclasses with full details

**Credentials & Licences (Section 14)**
- **Construction**: White Card, Scaffolding, Rigging, Forklift, Crane, EWP (40+ items)
- **Transport**: LR/MR/HR/HC/MC, Dangerous Goods (15+ items)
- **Healthcare**: AHPRA, CPR, First Aid, NDIS (25+ items)
- **Hospitality**: RSA, RCG, Food Safety (12+ items)
- **Mining**: Coal Board, RII Certs, Heavy Plant (30+ items)
- **Rail**: RIW, RISI, SATRC (10+ items)
- **Maritime**: Coxswain, Master tickets, AMSA (20+ items)
- **Aviation**: PPL, CPL, ATPL, Drone licences (15+ items)
- **Security**: Licences, Crowd Control, ASIC (15+ items)
- **IT**: AWS, Azure, Google Cloud, Cisco, CompTIA (30+ items)
- **Finance**: CPA, CA ANZ, RG146 (15+ items)
- And more...

**Skills (Section 15)**
- 20 soft skills
- 15 hard skills (generic business)
- 50+ technical IT skills
- 20+ trade skills

**Business & System Config (Section 16-22)**
- Business types & sizes
- Portfolio sections & sharing options
- Search & filter specifications
- Technical implementation notes

---

## How to Use This with GitHub Codespaces

### Step 1: Copy the Entire File
The MASTER_DATA_SPECIFICATION.md is already formatted for direct use. Simply:
1. Open the file (you already have it selected)
2. Press `Ctrl+A` (Select All)
3. Press `Ctrl+C` (Copy)

### Step 2: Paste into GitHub Codespaces Chat
Open GitHub Codespaces Chat and paste the entire document, then add this instruction:

```
Using the MASTER_DATA_SPECIFICATION above, please:

1. Generate TypeScript enums for all categories
2. Create Prisma database schema for storing this data
3. Build reusable autocomplete React components
4. Implement search filter logic
5. Create seed data files for development
6. Build API endpoints for dropdown data retrieval

Focus on making it production-ready, performant, and maintainable.
```

### Step 3: What Codespaces Will Generate

**Backend Files:**
- `prisma/schema.prisma` - Database schema for all data
- `prisma/seed.ts` - Seed data for development/testing
- `src/enums/` - TypeScript enums for all categories
- `src/controllers/` - API endpoints for data retrieval
- `src/services/` - Business logic for filtering/searching

**Frontend Files:**
- `lib/data/` - JSON data files with all dropdowns
- `lib/enums/` - TypeScript enums (frontend)
- `components/AutocompleteDropdown.tsx` - Reusable autocomplete component
- `components/LocationSearch.tsx` - Location-specific search
- `components/IndustryFilter.tsx` - Industry filtering
- `components/CredentialSelector.tsx` - Credential selection
- `hooks/useAutocomplete.ts` - Custom hook for autocomplete logic
- `types/` - TypeScript interfaces for all data structures

**Features You'll Get:**
- ✅ Autocomplete dropdowns (2 char minimum, 300ms debounce)
- ✅ Location search (suburb ↔ postcode auto-population)
- ✅ Industry & sub-industry hierarchical filtering
- ✅ Credential/licence selection with categories
- ✅ Visa & work rights selection
- ✅ Skills library with tagging
- ✅ Search radius filtering
- ✅ Database indexes for performance
- ✅ Cached frequently-accessed data
- ✅ API endpoints with pagination

---

## Key Sections Quick Reference

| Section | Contains | Use For |
|---------|----------|---------|
| 1-5 | Locations, Postcodes, Radius | Location search, map filters |
| 6-8 | Universities, TAFE, Qualifications | Education history, credentials |
| 9-10 | Industries, Job Categories | Job search, business profiles |
| 11-13 | Employment Types, Work Rights, Visas | Talent profiles, visa requirements |
| 14 | Licences & Certifications | Credential verification, requirements |
| 15 | Skills Library | Skill tagging, job requirements |
| 16-17 | Business Types & Sizes | Business profiles |
| 18-19 | Portfolio Sections & Sharing | Portfolio builder |
| 20 | Search & Filter Options | Search UI implementation |
| 21-22 | Technical Config & Internationalization | System setup, future expansion |

---

## Example Use Cases

### For Talent Profile:
1. **Location**: Use Section 3 (Cities/Towns) + Section 5 (Radius)
2. **Education**: Use Section 6-8 (Universities, TAFE, Qualifications)
3. **Work Rights**: Use Section 12-13 (Work Rights, Visas)
4. **Skills**: Use Section 15 (Skills Library)
5. **Credentials**: Use Section 14 (industry-specific licences)

### For Business Search:
1. **Location Filters**: Section 3-5 (Cities, Radius)
2. **Industry Filters**: Section 9-10 (Industries, Sub-categories)
3. **Business Size**: Section 17
4. **Employment Types**: Section 11

### For Job Posting:
1. **Industry**: Section 9-10
2. **Required Credentials**: Section 14
3. **Required Skills**: Section 15
4. **Employment Type**: Section 11
5. **Work Rights Required**: Section 12

---

## Pro Tips

### 1. **Incremental Implementation**
You don't need to implement everything at once. Start with:
- Phase 1: Locations + Industries (core search)
- Phase 2: Employment types + Work rights
- Phase 3: Credentials + Skills
- Phase 4: Advanced filters

### 2. **Performance Optimization**
The spec includes notes on:
- Caching frequently accessed data (Section 21)
- Indexed searches for autocomplete
- Debounced input (300ms delay)
- Result limiting (10-20 matches)

### 3. **Data Maintenance**
- Location data: Update annually from Australia Post
- Visa subclasses: Update when Department of Home Affairs changes
- Certifications: Update when SafeWork Australia changes
- Skills: Allow custom entries by users

### 4. **Internationalization Ready**
Section 22 provides framework for expanding to:
- New Zealand
- United Kingdom
- Canada
- United States
- India
- Philippines

---

## Quick Command for Codespaces

```bash
# After Codespaces generates the files, you can quickly seed your database:
npx prisma db push
npx prisma db seed

# Then start your development server:
npm run dev
```

---

## File Size & Scope

- **Total Lines**: 1,087
- **Total Sections**: 22
- **Total Data Categories**: 50+
- **Estimated Database Entries**: 2,000+
- **Ready for**: Production use

---

## Questions to Ask Codespaces (If Needed)

1. "Generate only the location-related components first"
2. "Create API endpoints with pagination for large datasets"
3. "Build a unified search component that filters across all categories"
4. "Generate SQL migrations instead of Prisma schema"
5. "Create mobile-optimized autocomplete components"
6. "Generate validation schemas for all data types"
7. "Build admin interface for managing dropdown data"

---

## ✅ You're Ready!

Everything is in the MASTER_DATA_SPECIFICATION.md file. Just copy, paste into Codespaces Chat, and let it build your complete data infrastructure.

**File Location**: `/workspaces/creerlio-platform/MASTER_DATA_SPECIFICATION.md`

**Status**: ✅ Complete and ready to use
