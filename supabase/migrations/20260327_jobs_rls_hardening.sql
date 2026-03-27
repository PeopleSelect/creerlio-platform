-- ============================================================
-- JOBS RLS HARDENING
--
-- Goals:
--  1. Public read: any published+active job is visible — no
--     business-profile existence check required (service role
--     API routes bypass RLS anyway, anon routes should see all).
--  2. Owner manage: business owners can manage jobs linked by
--     EITHER business_id OR business_profile_id (covers legacy
--     jobs where business_id was null on insert).
--  3. Seeded jobs: already covered by jobs_public_read — the
--     separate seeded_jobs_public_read policy is redundant and
--     is kept for backwards compatibility.
-- ============================================================

-- ── 1. Replace the public read policy ────────────────────────
-- Old policy used ILIKE 'published%' — change to exact match
-- for clarity and index use. Allow is_active true OR null so
-- jobs inserted without the column still show.

DROP POLICY IF EXISTS jobs_public_read ON public.jobs;
CREATE POLICY jobs_public_read
  ON public.jobs
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    AND (is_active = true OR is_active IS NULL)
  );

-- ── 2. Replace owner manage policy ───────────────────────────
-- Old policy only checked business_id; if that column is null
-- (jobs created before it was added, or if activeBusinessId
-- wasn't available in the form) the policy failed silently.
-- Now check BOTH business_id and business_profile_id so owners
-- can always manage their jobs regardless of which column is set.

DROP POLICY IF EXISTS jobs_role_manage ON public.jobs;
CREATE POLICY jobs_role_manage
  ON public.jobs
  FOR ALL
  TO authenticated
  USING (
    public.is_super_admin()
    -- role via businesses table (new architecture)
    OR (
      jobs.business_id IS NOT NULL
      AND public.has_business_role(
        jobs.business_id,
        ARRAY['super_admin','business_admin','location_admin','manager']::public.business_role[]
      )
    )
    OR (
      jobs.location_id IS NOT NULL
      AND public.has_location_role(
        jobs.location_id,
        ARRAY['location_admin','manager']::public.location_role[]
      )
    )
    -- legacy: owner linked via business_profiles.user_id = auth.uid()
    OR (
      jobs.business_profile_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.business_profiles bp
        WHERE bp.id::text = jobs.business_profile_id::text
          AND bp.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      jobs.business_id IS NOT NULL
      AND public.has_business_role(
        jobs.business_id,
        ARRAY['super_admin','business_admin','location_admin','manager']::public.business_role[]
      )
    )
    OR (
      jobs.location_id IS NOT NULL
      AND public.has_location_role(
        jobs.location_id,
        ARRAY['location_admin','manager']::public.location_role[]
      )
    )
    OR (
      jobs.business_profile_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.business_profiles bp
        WHERE bp.id::text = jobs.business_profile_id::text
          AND bp.user_id = auth.uid()
      )
    )
  );

-- ── 3. Drop redundant legacy owner policies ───────────────────
-- These were from 2025122508_ensure_jobs_table.sql. The new
-- jobs_role_manage policy above covers all their cases via the
-- business_profile_id EXISTS check, so they are no longer needed.
-- Dropping them removes ambiguity and keeps pg_policies clean.

DROP POLICY IF EXISTS "Business owners can view own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Business owners can insert own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Business owners can update own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Business owners can delete own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Public can view published jobs" ON public.jobs;
