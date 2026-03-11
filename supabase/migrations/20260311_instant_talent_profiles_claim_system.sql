-- ============================================
-- Creerlio: Instant Talent Profiles & Claim System
-- Allows recruiters to create placeholder profiles
-- for talent who can then claim them.
-- ============================================

-- --------------------------------------------
-- 1) placeholder_profiles table
--    Stores pre-created profiles before a user account exists.
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.placeholder_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core identity
  name text NOT NULL,
  email text NOT NULL,
  headline text,
  skills text[] DEFAULT '{}'::text[],
  linkedin_url text,

  -- Created by a recruiter/admin (nullable: platform admin creation)
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Claim token (URL-safe random string)
  claim_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  claim_token_expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),

  -- Status: pending | claimed | expired
  status text NOT NULL DEFAULT 'pending',

  -- Set when claimed
  claimed_at timestamptz,
  claimed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Linked talent_profile row created on claim
  talent_profile_id uuid,  -- FK added after talent_profiles ref (see below)

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS placeholder_profiles_email_idx
  ON public.placeholder_profiles(lower(email));
CREATE INDEX IF NOT EXISTS placeholder_profiles_token_idx
  ON public.placeholder_profiles(claim_token);
CREATE INDEX IF NOT EXISTS placeholder_profiles_created_by_idx
  ON public.placeholder_profiles(created_by_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS placeholder_profiles_status_idx
  ON public.placeholder_profiles(status);

-- --------------------------------------------
-- 2) Add profile_status + claimed_from fields to talent_profiles
-- --------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'talent_profiles'
      AND column_name = 'profile_status'
  ) THEN
    ALTER TABLE public.talent_profiles
      ADD COLUMN profile_status text NOT NULL DEFAULT 'active';
    -- active | claimed (claimed from placeholder)
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'talent_profiles'
      AND column_name = 'claimed_from_placeholder_id'
  ) THEN
    ALTER TABLE public.talent_profiles
      ADD COLUMN claimed_from_placeholder_id uuid
        REFERENCES public.placeholder_profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'talent_profiles'
      AND column_name = 'claimed_at'
  ) THEN
    ALTER TABLE public.talent_profiles
      ADD COLUMN claimed_at timestamptz;
  END IF;
END $$;

-- Now add the FK from placeholder_profiles back to talent_profiles
-- (safe if column already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'placeholder_profiles_talent_profile_id_fk'
  ) THEN
    ALTER TABLE public.placeholder_profiles
      ADD CONSTRAINT placeholder_profiles_talent_profile_id_fk
      FOREIGN KEY (talent_profile_id)
      REFERENCES public.talent_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- --------------------------------------------
-- 3) Auto-update updated_at trigger
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_placeholder_profiles_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_placeholder_profiles_updated_at ON public.placeholder_profiles;
CREATE TRIGGER trg_placeholder_profiles_updated_at
  BEFORE UPDATE ON public.placeholder_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_placeholder_profiles_updated_at();

-- --------------------------------------------
-- 4) Row Level Security
-- --------------------------------------------
ALTER TABLE public.placeholder_profiles ENABLE ROW LEVEL SECURITY;

-- Recruiters/admins (authenticated) can create placeholders
DROP POLICY IF EXISTS placeholder_profiles_insert_authenticated ON public.placeholder_profiles;
CREATE POLICY placeholder_profiles_insert_authenticated
  ON public.placeholder_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Creator can read their own placeholders
DROP POLICY IF EXISTS placeholder_profiles_select_creator ON public.placeholder_profiles;
CREATE POLICY placeholder_profiles_select_creator
  ON public.placeholder_profiles
  FOR SELECT
  TO authenticated
  USING (created_by_user_id = auth.uid());

-- Anyone (incl. anon) can read a pending placeholder by token lookup
-- (used by the claim page — filtered in app logic, not RLS)
DROP POLICY IF EXISTS placeholder_profiles_select_service ON public.placeholder_profiles;
CREATE POLICY placeholder_profiles_select_service
  ON public.placeholder_profiles
  FOR SELECT
  TO anon, authenticated
  USING (status = 'pending');

-- Service role can update (for claiming)
DROP POLICY IF EXISTS placeholder_profiles_update_service ON public.placeholder_profiles;
CREATE POLICY placeholder_profiles_update_service
  ON public.placeholder_profiles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --------------------------------------------
-- 5) Helper view: expired token auto-detection
-- --------------------------------------------
CREATE OR REPLACE VIEW public.active_placeholder_profiles AS
  SELECT *
  FROM public.placeholder_profiles
  WHERE status = 'pending'
    AND claim_token_expires_at > now();
