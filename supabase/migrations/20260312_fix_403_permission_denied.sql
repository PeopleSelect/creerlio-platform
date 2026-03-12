-- ============================================
-- Fix 403 "permission denied for table users"
-- Root causes:
--   1. public.users has RLS enabled but no GRANT SELECT to authenticated/anon
--   2. talent_profiles may be missing user_id column (queried by frontend)
--   3. Some RLS policies subquery public.users without the grant
-- ============================================

-- --------------------------------------------
-- 1) Grant SELECT on public.users to authenticated + anon
--    This is required when any RLS policy on another table subqueries
--    public.users, or when PostgREST resolves FK relationships.
-- --------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    EXECUTE 'GRANT SELECT ON public.users TO authenticated, anon';
    RAISE NOTICE 'Granted SELECT on public.users to authenticated, anon';
  END IF;
END $$;

-- --------------------------------------------
-- 2) Ensure GRANT on talent_profiles and talent_bank_items
--    (Supabase default privileges usually cover this, but make explicit)
-- --------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_profiles TO authenticated;
GRANT SELECT ON public.talent_profiles TO anon;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'talent_bank_items'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_bank_items TO authenticated';
    EXECUTE 'GRANT SELECT ON public.talent_bank_items TO anon';
    RAISE NOTICE 'Granted privileges on talent_bank_items';
  END IF;
END $$;

-- --------------------------------------------
-- 3) Add user_id column to talent_profiles if missing
--    The frontend queries talent_profiles by user_id, and many policies
--    reference tp.user_id. Since talent_profiles.id = auth.uid() for
--    each talent, user_id is just an alias pointing to the same value.
-- --------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'talent_profiles'
      AND column_name = 'user_id'
  ) THEN
    -- Add user_id as a generated column mirroring id, or as a regular column
    -- We add it as a regular UUID column and backfill from id
    ALTER TABLE public.talent_profiles ADD COLUMN user_id uuid;

    -- Backfill: user_id = id (they represent the same auth user)
    UPDATE public.talent_profiles SET user_id = id WHERE user_id IS NULL;

    -- Add index for frontend eq queries
    CREATE INDEX IF NOT EXISTS talent_profiles_user_id_idx
      ON public.talent_profiles(user_id);

    RAISE NOTICE 'Added user_id column to talent_profiles and backfilled from id';
  ELSE
    RAISE NOTICE 'talent_profiles.user_id already exists, skipping';
  END IF;
END $$;

-- --------------------------------------------
-- 4) Ensure SELECT policy for talent reading own profile by user_id
--    (previous policies used id = auth.uid(); now also support user_id)
-- --------------------------------------------
DROP POLICY IF EXISTS "talent_profiles_select_own_by_user_id" ON public.talent_profiles;
CREATE POLICY "talent_profiles_select_own_by_user_id"
  ON public.talent_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR id = auth.uid());

-- --------------------------------------------
-- 5) Reload PostgREST schema cache so new column is visible
-- --------------------------------------------
NOTIFY pgrst, 'reload schema';
