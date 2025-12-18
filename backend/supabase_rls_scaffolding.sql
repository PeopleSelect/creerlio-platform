-- ============================================
-- Supabase Row Level Security (RLS) Scaffolding
-- Phase 1 MVP Foundation - Basic RLS Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_data ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can read their own data
CREATE POLICY "Users can view own profile"
ON users FOR SELECT
USING (auth.uid() = id::text);

-- Users can update their own data
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id::text);

-- Users can insert their own data (during registration)
CREATE POLICY "Users can insert own profile"
ON users FOR INSERT
WITH CHECK (auth.uid() = id::text);

-- ============================================
-- TALENT_PROFILES TABLE POLICIES
-- ============================================

-- Talent profiles are publicly readable (for matching/search)
CREATE POLICY "Talent profiles are publicly readable"
ON talent_profiles FOR SELECT
USING (is_active = true);

-- Users can manage their own talent profile
CREATE POLICY "Users can manage own talent profile"
ON talent_profiles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = talent_profiles.id
    AND users.id::text = auth.uid()
  )
);

-- ============================================
-- BUSINESS_PROFILES TABLE POLICIES
-- ============================================

-- Business profiles are publicly readable
CREATE POLICY "Business profiles are publicly readable"
ON business_profiles FOR SELECT
USING (is_active = true);

-- Business owners can manage their own profile
CREATE POLICY "Business owners can manage own profile"
ON business_profiles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.business_profile_id = business_profiles.id
    AND users.id::text = auth.uid()
    AND users.user_type = 'business'
  )
);

-- ============================================
-- JOBS TABLE POLICIES
-- ============================================

-- Published jobs are publicly readable
CREATE POLICY "Published jobs are publicly readable"
ON jobs FOR SELECT
USING (status = 'published' AND is_active = true);

-- Business owners can manage their own jobs
CREATE POLICY "Business owners can manage own jobs"
ON jobs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.business_profile_id = jobs.business_profile_id
    AND users.id::text = auth.uid()
    AND users.user_type = 'business'
  )
);

-- ============================================
-- RESUME_DATA TABLE POLICIES
-- ============================================

-- Resume data is private to the owner
CREATE POLICY "Users can view own resume data"
ON resume_data FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM talent_profiles
    WHERE talent_profiles.resume_id = resume_data.id
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.talent_profile_id = talent_profiles.id
      AND users.id::text = auth.uid()
    )
  )
);

-- Users can manage their own resume data
CREATE POLICY "Users can manage own resume data"
ON resume_data FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM talent_profiles
    WHERE talent_profiles.resume_id = resume_data.id
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.talent_profile_id = talent_profiles.id
      AND users.id::text = auth.uid()
    )
  )
);

-- ============================================
-- NOTES FOR FUTURE ENHANCEMENTS
-- ============================================
-- 
-- These are basic RLS policies for Phase 1 MVP.
-- Future enhancements may include:
-- 
-- 1. More granular permissions (e.g., read-only access for certain roles)
-- 2. Application-based access control (e.g., applicants can view job details)
-- 3. Admin roles with elevated permissions
-- 4. Audit logging for sensitive operations
-- 5. Rate limiting policies
-- 6. Data sharing policies (e.g., talent sharing profile with specific businesses)
-- 
-- ============================================
