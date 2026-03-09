-- ============================================
-- Creerlio: Controlled Talent Profile Sharing System
-- - Public profile at /{username} (SEO indexable)
-- - Layered access (public / request / private links)
-- - Versioned share views + analytics + referrals
-- - Recruiter discovery primitives (save, lists, pipeline)
-- ============================================

-- --------------------------------------------
-- 1) Username / slug fields on talent_profiles
-- --------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'talent_profiles'
      AND column_name = 'username'
  ) THEN
    ALTER TABLE public.talent_profiles ADD COLUMN username text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'talent_profiles'
      AND column_name = 'slug'
  ) THEN
    ALTER TABLE public.talent_profiles ADD COLUMN slug text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'talent_profiles'
      AND column_name = 'visibility_default'
  ) THEN
    ALTER TABLE public.talent_profiles
      ADD COLUMN visibility_default text NOT NULL DEFAULT 'public';
  END IF;
END $$;

-- Uniqueness on username (case-insensitive). Partial index for gradual rollout.
CREATE UNIQUE INDEX IF NOT EXISTS talent_profiles_username_unique
  ON public.talent_profiles (lower(username))
  WHERE username IS NOT NULL AND length(username) > 0;

-- --------------------------------------------
-- 2) Public-safe Talent Profile table (Layer 1)
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.public_talent_profiles (
  talent_profile_id uuid PRIMARY KEY REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  username text NOT NULL,
  slug text,
  is_public boolean NOT NULL DEFAULT true,

  -- Public fields
  name text,
  headline text,
  profile_photo_url text,
  short_bio text,
  selected_skills text[] DEFAULT '{}'::text[],
  portfolio_highlights jsonb DEFAULT '[]'::jsonb,
  key_achievements jsonb DEFAULT '[]'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id),
  UNIQUE (username)
);

CREATE INDEX IF NOT EXISTS public_talent_profiles_public_idx
  ON public.public_talent_profiles(is_public);
CREATE INDEX IF NOT EXISTS public_talent_profiles_username_idx
  ON public.public_talent_profiles(lower(username));

ALTER TABLE public.public_talent_profiles ENABLE ROW LEVEL SECURITY;

-- Public read of public profiles
DROP POLICY IF EXISTS public_talent_profiles_public_read ON public.public_talent_profiles;
CREATE POLICY public_talent_profiles_public_read
  ON public.public_talent_profiles
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- Owner full read (preview even if not public)
DROP POLICY IF EXISTS public_talent_profiles_select_own ON public.public_talent_profiles;
CREATE POLICY public_talent_profiles_select_own
  ON public.public_talent_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS public_talent_profiles_insert_own ON public.public_talent_profiles;
CREATE POLICY public_talent_profiles_insert_own
  ON public.public_talent_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS public_talent_profiles_update_own ON public.public_talent_profiles;
CREATE POLICY public_talent_profiles_update_own
  ON public.public_talent_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS public_talent_profiles_delete_own ON public.public_talent_profiles;
CREATE POLICY public_talent_profiles_delete_own
  ON public.public_talent_profiles
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_public_talent_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_public_talent_profiles_updated_at ON public.public_talent_profiles;
CREATE TRIGGER trg_public_talent_profiles_updated_at
  BEFORE UPDATE ON public.public_talent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_public_talent_profiles_updated_at();

-- --------------------------------------------
-- 3) Tighten talent_profiles public-read policy
-- --------------------------------------------
-- We expose public fields via public.public_talent_profiles instead.
DROP POLICY IF EXISTS "talent_profiles_select_public" ON public.talent_profiles;

-- --------------------------------------------
-- 4) Layer 2: Access requests
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_profile_id uuid NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  requested_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  requester_name text NOT NULL,
  requester_company text,
  requester_email text NOT NULL,
  reason text,

  status text NOT NULL DEFAULT 'pending', -- pending | approved | declined
  decided_at timestamptz,
  decision_note text,

  -- If approved, optionally attach a private share token
  approved_share_token text,

  viewer_session_id text,
  viewer_user_agent text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_access_requests_talent_idx
  ON public.profile_access_requests(talent_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS profile_access_requests_status_idx
  ON public.profile_access_requests(status);

ALTER TABLE public.profile_access_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can create a request (public)
DROP POLICY IF EXISTS profile_access_requests_insert_any ON public.profile_access_requests;
CREATE POLICY profile_access_requests_insert_any
  ON public.profile_access_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Talent can view requests for their profile
DROP POLICY IF EXISTS profile_access_requests_select_owner ON public.profile_access_requests;
CREATE POLICY profile_access_requests_select_owner
  ON public.profile_access_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      WHERE tp.id = profile_access_requests.talent_profile_id
      AND tp.user_id = auth.uid()
    )
  );

-- Talent can update status/decision for their requests
DROP POLICY IF EXISTS profile_access_requests_update_owner ON public.profile_access_requests;
CREATE POLICY profile_access_requests_update_owner
  ON public.profile_access_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      WHERE tp.id = profile_access_requests.talent_profile_id
      AND tp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      WHERE tp.id = profile_access_requests.talent_profile_id
      AND tp.user_id = auth.uid()
    )
  );

-- --------------------------------------------
-- 5) Layer 3: Private share links
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_profile_id uuid NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,

  token text NOT NULL,
  permissions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  expiry_date timestamptz,
  max_views integer,
  view_count integer NOT NULL DEFAULT 0,

  restricted_email text,
  restricted_company text,

  -- Optional: prebuilt snapshot for deterministic rendering
  snapshot_id uuid REFERENCES public.talent_portfolio_snapshots(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS profile_share_links_token_unique
  ON public.profile_share_links(token);
CREATE INDEX IF NOT EXISTS profile_share_links_talent_idx
  ON public.profile_share_links(talent_profile_id, created_at DESC);

ALTER TABLE public.profile_share_links ENABLE ROW LEVEL SECURITY;

-- Owner can manage their links
DROP POLICY IF EXISTS profile_share_links_owner_all ON public.profile_share_links;
CREATE POLICY profile_share_links_owner_all
  ON public.profile_share_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      WHERE tp.id = profile_share_links.talent_profile_id
      AND tp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      WHERE tp.id = profile_share_links.talent_profile_id
      AND tp.user_id = auth.uid()
    )
  );

-- --------------------------------------------
-- 6) Profile "views" (version presets)
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_profile_id uuid NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  visible_sections_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_views_talent_idx
  ON public.profile_views(talent_profile_id, created_at DESC);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_views_owner_all ON public.profile_views;
CREATE POLICY profile_views_owner_all
  ON public.profile_views
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      WHERE tp.id = profile_views.talent_profile_id
      AND tp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      WHERE tp.id = profile_views.talent_profile_id
      AND tp.user_id = auth.uid()
    )
  );

-- --------------------------------------------
-- 7) Profile analytics log
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_views_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_profile_id uuid NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewer_email text,
  company text,
  view_type text NOT NULL, -- public | requested | private_link
  page_path text,
  referrer text,
  user_agent text,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_views_log_talent_idx
  ON public.profile_views_log(talent_profile_id, created_at DESC);

ALTER TABLE public.profile_views_log ENABLE ROW LEVEL SECURITY;

-- Anyone can insert view logs (used by server endpoint)
DROP POLICY IF EXISTS profile_views_log_insert_any ON public.profile_views_log;
CREATE POLICY profile_views_log_insert_any
  ON public.profile_views_log
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Talent can read their own analytics
DROP POLICY IF EXISTS profile_views_log_select_owner ON public.profile_views_log;
CREATE POLICY profile_views_log_select_owner
  ON public.profile_views_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      WHERE tp.id = profile_views_log.talent_profile_id
      AND tp.user_id = auth.uid()
    )
  );

-- --------------------------------------------
-- 8) Referral tracking
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_talent_id uuid REFERENCES public.talent_profiles(id) ON DELETE SET NULL,
  visitor_session_id text NOT NULL,
  signup_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals(referrer_talent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS referrals_session_idx ON public.referrals(visitor_session_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a visit (server endpoint)
DROP POLICY IF EXISTS referrals_insert_any ON public.referrals;
CREATE POLICY referrals_insert_any
  ON public.referrals
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Talent can read their own referral stats
DROP POLICY IF EXISTS referrals_select_owner ON public.referrals;
CREATE POLICY referrals_select_owner
  ON public.referrals
  FOR SELECT
  TO authenticated
  USING (
    referrer_talent_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      WHERE tp.id = referrals.referrer_talent_id
      AND tp.user_id = auth.uid()
    )
  );

-- --------------------------------------------
-- 9) Recruiter discovery primitives (Business users)
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.recruiter_saved_talent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  talent_profile_id uuid NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recruiter_user_id, talent_profile_id)
);

ALTER TABLE public.recruiter_saved_talent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recruiter_saved_talent_owner_all ON public.recruiter_saved_talent;
CREATE POLICY recruiter_saved_talent_owner_all
  ON public.recruiter_saved_talent
  FOR ALL
  TO authenticated
  USING (recruiter_user_id = auth.uid())
  WITH CHECK (recruiter_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.recruiter_saved_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recruiter_saved_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recruiter_saved_lists_owner_all ON public.recruiter_saved_lists;
CREATE POLICY recruiter_saved_lists_owner_all
  ON public.recruiter_saved_lists
  FOR ALL
  TO authenticated
  USING (recruiter_user_id = auth.uid())
  WITH CHECK (recruiter_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.recruiter_saved_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.recruiter_saved_lists(id) ON DELETE CASCADE,
  talent_profile_id uuid NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, talent_profile_id)
);

ALTER TABLE public.recruiter_saved_list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recruiter_saved_list_items_owner_all ON public.recruiter_saved_list_items;
CREATE POLICY recruiter_saved_list_items_owner_all
  ON public.recruiter_saved_list_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.recruiter_saved_lists l
      WHERE l.id = recruiter_saved_list_items.list_id
      AND l.recruiter_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recruiter_saved_lists l
      WHERE l.id = recruiter_saved_list_items.list_id
      AND l.recruiter_user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.recruiter_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  talent_profile_id uuid NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'New discovery',
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recruiter_user_id, talent_profile_id)
);

ALTER TABLE public.recruiter_pipelines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS recruiter_pipelines_owner_all ON public.recruiter_pipelines;
CREATE POLICY recruiter_pipelines_owner_all
  ON public.recruiter_pipelines
  FOR ALL
  TO authenticated
  USING (recruiter_user_id = auth.uid())
  WITH CHECK (recruiter_user_id = auth.uid());

