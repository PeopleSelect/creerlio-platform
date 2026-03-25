-- ============================================================
-- SEED DASHBOARD FILLS
-- Allows AI-seeded profiles (no auth user) to populate the
-- internal dashboard view (/dashboard/business/view) with
-- bio, products/services, and job listings.
--
-- 1. Make user_id nullable in products & services tables
--    (seeded profiles have no auth.users row)
-- 2. Add business_id UUID column to jobs table so seeded
--    profiles can have jobs without a BIGINT foreign key
-- ============================================================

-- 1a. business_products_services_overview — make user_id nullable
ALTER TABLE public.business_products_services_overview
  ALTER COLUMN user_id DROP NOT NULL;

-- 1b. business_products_services — make user_id nullable
ALTER TABLE public.business_products_services
  ALTER COLUMN user_id DROP NOT NULL;

-- 1c. business_product_roadmap — make user_id nullable
ALTER TABLE public.business_product_roadmap
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add business_id UUID to jobs table for seeded-profile jobs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'jobs'
      AND column_name  = 'business_id'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN business_id uuid;
    CREATE INDEX IF NOT EXISTS jobs_business_id_idx ON public.jobs (business_id);
  END IF;
END $$;

-- 3. RLS: allow public read of jobs that have a seeded business_id
--    (seeded jobs have no business_profile_id so the existing read policy
--    won't cover them — add a simple published-jobs-public-read policy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'jobs'
      AND policyname = 'seeded_jobs_public_read'
  ) THEN
    CREATE POLICY seeded_jobs_public_read
      ON public.jobs
      FOR SELECT
      TO anon, authenticated
      USING (
        status = 'published'
        AND is_active = true
        AND business_id IS NOT NULL
      );
  END IF;
END $$;
