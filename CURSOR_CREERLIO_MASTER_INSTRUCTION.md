# CURSOR MASTER INSTRUCTION  CREERLIO PLATFORM
# IMPORTANT: READ FULLY BEFORE MAKING ANY CHANGES

Project Name: Creerlio (ONE WORD  NOT CareerLio)
Framework: Next.js 14 App Router
Mode: SAFE / NON-DESTRUCTIVE / INCREMENTAL

====================================================
CRITICAL RULES  DO NOT VIOLATE
====================================================
- DO NOT delete, rename, or overwrite any existing files
- DO NOT remove existing routes, logic, or components
- DO NOT refactor working logic
- ONLY adjust layout, spacing, styling, and structure
- ONLY add files if absolutely required
- If a file exists, EXTEND it  do NOT replace it
- Preserve all existing content and text exactly as-is

====================================================
1. FRONTEND  HOME PAGE & HEADER (IMMEDIATE PRIORITY)
====================================================

OBJECTIVE:
Restore the home page to a professional SaaS landing page layout
as it appeared previously, with correct spacing, styling, and structure.

DO NOT change wording or content.

TASKS:

HEADER BAR
- Implement or fix a global header component
- Header must display navigation with proper spacing:
  Creerlio | About | Talent | Business | Analytics | Search | Login | Register | Free Trial
- "Creerlio" must be ONE WORD
- Use Tailwind flex utilities:
  flex, justify-between, items-center, gap-x-6
- Header must be sticky and consistent across pages

HOME PAGE LAYOUT
- Keep ALL existing content and text
- Fix layout issues only:
  - Font sizes
  - Container widths
  - Grid / flex alignment
  - Padding and margins
- Use:
  max-w-7xl mx-auto px-6
- Hero content aligned left
- Stats / map section aligned right
- No overlapping, stacking, or overflow issues

TAILWIND & STYLING
- Ensure Tailwind CSS is active and applied
- Ensure globals.css is loaded exactly once
- Fix malformed PostCSS config if present
- DO NOT remove existing styles

MAPBOX
- Ensure Mapbox map renders correctly
- Load Mapbox CSS properly
- Center map on detected user location
- Do NOT refactor Mapbox logic unless broken

====================================================
2. AUTH UI FIXES (VISUAL ONLY)
====================================================
- All user-entered text must render BLACK
- Apply Tailwind classes:
  text-black bg-white placeholder-gray-400
- Do NOT change authentication logic

====================================================
3. PASSWORD SAFETY (REQUIRED)
====================================================
- Ensure all passwords are truncated to 72 characters max before submit
- This applies to all password inputs
- Required for bcrypt compatibility
- Frontend enforcement only for now

====================================================
4. BACKEND  PHASE 1 FOUNDATION ONLY
====================================================
Build ONLY foundational backend components:

- Verify Supabase connection
- Ensure base tables exist:
  users
  talent_profiles
  business_profiles
  jobs
- Add minimal RLS scaffolding (no complex enforcement yet)
- Add basic API structure only

DO NOT:
- Implement AI features
- Implement billing
- Implement external integrations

====================================================
5. ARCHITECTURE PRINCIPLES
====================================================
- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Modular components
- No hardcoded data
- Clean, readable code
- Comment where changes are made

====================================================
EXPECTED RESULT
====================================================
- Home page visually matches a polished SaaS landing page
- Header is clean, spaced, and professional
- Tailwind styles visibly active
- Mapbox visible and styled
- No existing functionality broken

If anything is unclear:
ASK BEFORE CHANGING.
DO NOT GUESS.

END OF INSTRUCTION
