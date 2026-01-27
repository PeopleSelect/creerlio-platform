-- ============================================
-- Public Lite Business Profiles (Talent-visible)
-- Optional, separate from main business profile
-- ============================================

CREATE TABLE IF NOT EXISTS public.public_lite_business_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_profile_id uuid REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  is_public boolean NOT NULL DEFAULT false,
  name text NOT NULL,
  summary text,
  industries text[] DEFAULT '{}'::text[],
  company_size text,
  locations text[] DEFAULT '{}'::text[],
  what_company_does text,
  culture_values text,
  work_environment text,
  typical_roles text,
  website text,
  logo_url text,
  banner_url text,
  avatar_prompt text,
  banner_prompt text,
  source_url text,
  source_text text
);

CREATE INDEX IF NOT EXISTS public_lite_business_profiles_user_id_idx
  ON public.public_lite_business_profiles(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS public_lite_business_profiles_user_id_unique
  ON public.public_lite_business_profiles(user_id);

CREATE INDEX IF NOT EXISTS public_lite_business_profiles_public_idx
  ON public.public_lite_business_profiles(is_public);

CREATE INDEX IF NOT EXISTS public_lite_business_profiles_name_idx
  ON public.public_lite_business_profiles(name);

ALTER TABLE public.public_lite_business_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_lite_business_profiles_public_read ON public.public_lite_business_profiles;
DROP POLICY IF EXISTS public_lite_business_profiles_insert_own ON public.public_lite_business_profiles;
DROP POLICY IF EXISTS public_lite_business_profiles_update_own ON public.public_lite_business_profiles;
DROP POLICY IF EXISTS public_lite_business_profiles_delete_own ON public.public_lite_business_profiles;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'public_lite_business_profiles'
      AND policyname = 'public_lite_business_profiles_public_read'
  ) THEN
    CREATE POLICY public_lite_business_profiles_public_read
      ON public.public_lite_business_profiles
      FOR SELECT
      TO anon, authenticated
      USING (is_public = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'public_lite_business_profiles'
      AND policyname = 'public_lite_business_profiles_insert_own'
  ) THEN
    CREATE POLICY public_lite_business_profiles_insert_own
      ON public.public_lite_business_profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'public_lite_business_profiles'
      AND policyname = 'public_lite_business_profiles_update_own'
  ) THEN
    CREATE POLICY public_lite_business_profiles_update_own
      ON public.public_lite_business_profiles
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'public_lite_business_profiles'
      AND policyname = 'public_lite_business_profiles_delete_own'
  ) THEN
    CREATE POLICY public_lite_business_profiles_delete_own
      ON public.public_lite_business_profiles
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;
