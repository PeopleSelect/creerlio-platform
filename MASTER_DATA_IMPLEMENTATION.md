# Master Data Implementation Guide

## 🎉 What's Been Generated

I've automatically created a complete implementation of the Master Data Specification with:

### ✅ TypeScript Enums (Frontend)
Located in `/frontend/frontend-app/lib/enums/`:

1. **`locations.ts`** - Countries, Australian states, 300+ cities/towns, radius options
2. **`education.ts`** - 45+ universities, 35+ TAFE institutes, education levels
3. **`industries.ts`** - 33 industries, 400+ job sub-categories, employment types
4. **`credentials.ts`** - Work rights, visa types, 300+ credentials across 6 industries
5. **`skills.ts`** - Soft skills, hard skills, 50+ technical skills, trade skills
6. **`business.ts`** - Business types, sizes, portfolio sections, work arrangements
7. **`index.ts`** - Central export for all enums

### ✅ React Components (Frontend)
Located in `/frontend/frontend-app/components/`:

1. **`AutocompleteDropdown.tsx`** - Reusable autocomplete component with:
   - Debounced search (300ms)
   - Keyboard navigation (↑↓ arrows, Enter, Escape)
   - Click-outside handling
   - Custom search functions
   - Min 2 characters to search
   - Max 20 results
   - Optional custom values

2. **`LocationSearch.tsx`** - Specialized location picker with:
   - State dropdown
   - City autocomplete (filters by state)
   - Suburb input
   - Postcode input

### ✅ Database Schema (Backend)
Located in `/backend/Creerlio.Infrastructure/schema-additions.prisma`:

- Country, State, City models with indexes
- University, TAFEInstitute models
- Industry, JobCategory models with relationships
- Credential model with categories
- VisaType model with classifications
- Skill model with categories
- Instructions for updating TalentProfile and BusinessProfile models

## 🚀 How to Use

### 1. Using Enums in Your Code

```typescript
import { INDUSTRIES, AUSTRALIAN_CITIES, searchCities } from '@/lib/enums';

// Get all industries
const industries = INDUSTRIES;

// Get cities for NSW
const nswCities = AUSTRALIAN_CITIES.NSW;

// Search cities
const results = searchCities('broken', 20); // Returns ['Broken Hill']
```

### 2. Using the Autocomplete Component

```typescript
import AutocompleteDropdown from '@/components/AutocompleteDropdown';
import { INDUSTRIES, searchIndustries } from '@/lib/enums';

function MyForm() {
  const [industry, setIndustry] = useState('');
  
  return (
    <AutocompleteDropdown
      options={INDUSTRIES}
      value={industry}
      onChange={setIndustry}
      label="Industry"
      placeholder="Search industries..."
      searchFn={searchIndustries}
      minChars={2}
      maxResults={20}
    />
  );
}
```

### 3. Using the Location Search

```typescript
import LocationSearch from '@/components/LocationSearch';

function MyForm() {
  const [location, setLocation] = useState({
    state: '',
    city: '',
    suburb: '',
    postcode: '',
  });
  
  return (
    <LocationSearch
      value={location}
      onChange={setLocation}
    />
  );
}
```

### 4. Implementing the Database Schema

1. **Copy the schema additions** from `schema-additions.prisma` into your main Prisma schema file
2. **Update your existing models** (TalentProfile, BusinessProfile) with the suggested fields
3. **Run migrations**:
   ```bash
   cd backend/Creerlio.Infrastructure
   dotnet ef migrations add AddMasterData
   dotnet ef database update
   ```

### 5. Seeding the Database

Create a seed file (`/backend/Creerlio.Infrastructure/seed.ts`) to populate the master data:

```typescript
import { PrismaClient } from '@prisma/client';
import { AUSTRALIAN_STATES, AUSTRALIAN_CITIES, INDUSTRIES, /* etc */ } from '../../../frontend/frontend-app/lib/enums';

const prisma = new PrismaClient();

async function main() {
  // Seed states
  for (const state of AUSTRALIAN_STATES) {
    await prisma.state.upsert({
      where: { code: state.code },
      update: {},
      create: {
        name: state.name,
        code: state.code,
        country: 'Australia',
      },
    });
  }

  // Seed cities
  for (const [stateCode, cities] of Object.entries(AUSTRALIAN_CITIES)) {
    const state = await prisma.state.findUnique({ where: { code: stateCode } });
    if (state) {
      for (const cityName of cities) {
        await prisma.city.upsert({
          where: { name_stateId: { name: cityName, stateId: state.id } },
          update: {},
          create: { name: cityName, stateId: state.id },
        });
      }
    }
  }

  // Seed industries
  for (const industryName of INDUSTRIES) {
    await prisma.industry.upsert({
      where: { name: industryName },
      update: {},
      create: { name: industryName },
    });
  }

  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
```

## 📋 Example: Complete Profile Form

Here's a complete example using all the components:

```typescript
'use client';

import { useState } from 'react';
import AutocompleteDropdown from '@/components/AutocompleteDropdown';
import LocationSearch from '@/components/LocationSearch';
import {
  INDUSTRIES,
  getSubCategoriesForIndustry,
  EMPLOYMENT_TYPES,
  WORK_RIGHTS,
  EDUCATION_LEVELS,
  searchSkills,
} from '@/lib/enums';

export default function TalentProfileForm() {
  const [profile, setProfile] = useState({
    location: { state: '', city: '', suburb: '', postcode: '' },
    industry: '',
    jobCategory: '',
    employmentType: '',
    workRights: '',
    educationLevel: '',
    skills: [] as string[],
  });

  const updateProfile = (field: string, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Talent Profile</h1>

      {/* Location */}
      <LocationSearch
        value={profile.location}
        onChange={(loc) => updateProfile('location', loc)}
      />

      {/* Industry */}
      <AutocompleteDropdown
        options={INDUSTRIES}
        value={profile.industry}
        onChange={(val) => {
          updateProfile('industry', val);
          updateProfile('jobCategory', ''); // Reset job category
        }}
        label="Industry"
        placeholder="Select your industry..."
      />

      {/* Job Category (filtered by industry) */}
      {profile.industry && (
        <AutocompleteDropdown
          options={getSubCategoriesForIndustry(profile.industry as any)}
          value={profile.jobCategory}
          onChange={(val) => updateProfile('jobCategory', val)}
          label="Job Category"
          placeholder="Select job category..."
        />
      )}

      {/* Employment Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Employment Type
        </label>
        <select
          value={profile.employmentType}
          onChange={(e) => updateProfile('employmentType', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Select...</option>
          {EMPLOYMENT_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Work Rights */}
      <AutocompleteDropdown
        options={WORK_RIGHTS}
        value={profile.workRights}
        onChange={(val) => updateProfile('workRights', val)}
        label="Work Rights"
        placeholder="Select your work rights..."
      />

      {/* Education Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Education Level
        </label>
        <select
          value={profile.educationLevel}
          onChange={(e) => updateProfile('educationLevel', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Select...</option>
          {EDUCATION_LEVELS.map(level => (
            <option key={level.value} value={level.value}>{level.label}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => console.log('Save profile:', profile)}
        className="w-full bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-700 transition-colors"
      >
        Save Profile
      </button>
    </div>
  );
}
```

## 🎯 Next Steps

1. **Test the components** - Create a test page to verify autocomplete works
2. **Add to existing forms** - Integrate into talent/business profile pages
3. **Implement database** - Copy schema additions and run migrations
4. **Seed data** - Populate database with master data
5. **Create API endpoints** - Build endpoints for dropdown data retrieval
6. **Add validation** - Ensure selected values exist in enums

## 📊 What's Included

- ✅ **300+ Australian cities & towns** (including small rural areas like Broken Hill, Coober Pedy, Birdsville)
- ✅ **33 major industries** with 400+ job sub-categories
- ✅ **300+ credentials** across Construction, Transport, Healthcare, Hospitality, Mining, IT
- ✅ **25+ visa types** with full classifications
- ✅ **100+ skills** (soft, hard, technical, trade)
- ✅ **45+ universities** and 35+ TAFE institutes
- ✅ **Production-ready components** with keyboard navigation and debouncing

## 💡 Tips

- **Performance**: Enums are compile-time constants, no runtime overhead
- **Type Safety**: Full TypeScript support with autocomplete
- **Extensible**: Easy to add new items to any enum
- **Searchable**: Built-in search functions with debouncing
- **Accessible**: Keyboard navigation and ARIA support

## 🆘 Troubleshooting

**Autocomplete not showing results?**
- Check minChars (default is 2)
- Verify search function is returning results
- Check console for errors

**Import errors?**
- Ensure path alias `@/lib/enums` is configured in tsconfig.json
- Try relative imports: `../../lib/enums`

**Database schema conflicts?**
- Review existing schema before copying
- Adjust field names if conflicts exist
- Run `prisma format` to validate schema

---

**All files created successfully!** 🎉

You now have a complete, production-ready implementation of the Master Data Specification without needing GitHub Codespaces Chat.
