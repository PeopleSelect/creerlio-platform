-- ============================================
-- Creerlio: Anonymous Talent Snapshot System
-- Talent publish privacy-safe discovery cards.
-- Recruiters search anonymously; talent controls reveal.
-- ============================================

-- --------------------------------------------
-- 1) talent_snapshots — the core table
--    No name, photo, contact, or company names.
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.talent_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  talent_id uuid NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,

  -- Internal label chosen by talent (never shown to recruiters)
  snapshot_title text NOT NULL DEFAULT 'My Snapshot',

  -- Public-facing fields (no PII)
  headline text NOT NULL,
  experience_years integer CHECK (experience_years >= 0 AND experience_years <= 60),
  location text,             -- city/region only, no street address
  skills_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  industry_tags text[] DEFAULT '{}'::text[],
  summary text,              -- anonymous professional summary

  -- Status
  is_active boolean NOT NULL DEFAULT false,

  -- Denormalised analytics counters (incremented in-app)
  view_count integer NOT NULL DEFAULT 0,
  search_appearance_count integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS talent_snapshots_talent_idx
  ON public.talent_snapshots(talent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS talent_snapshots_active_idx
  ON public.talent_snapshots(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS talent_snapshots_location_idx
  ON public.talent_snapshots(lower(location)) WHERE is_active = true;

-- --------------------------------------------
-- 2) Deterministic anonymous candidate ID
--    Format: "CAN-" + 5 chars derived from uuid
--    e.g. CAN-A7X21
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.snapshot_anon_id(snapshot_id uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'CAN-' || upper(
    substring(replace(snapshot_id::text, '-', ''), 1, 5)
  );
$$;

-- --------------------------------------------
-- 3) snapshot_access_requests — recruiter → talent
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.snapshot_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.talent_snapshots(id) ON DELETE CASCADE,

  -- Requester info
  requester_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_name text NOT NULL,
  requester_company text,
  requester_email text NOT NULL,
  reason text,

  -- Decision: pending | approved | declined | alternate_sent
  status text NOT NULL DEFAULT 'pending',
  decided_at timestamptz,
  decision_note text,

  -- If approved: attach a private share token to the full profile
  approved_share_token text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS snapshot_access_requests_snapshot_idx
  ON public.snapshot_access_requests(snapshot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS snapshot_access_requests_requester_idx
  ON public.snapshot_access_requests(requester_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS snapshot_access_requests_status_idx
  ON public.snapshot_access_requests(status);

-- --------------------------------------------
-- 4) snapshot_views_log — analytics events
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.snapshot_views_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.talent_snapshots(id) ON DELETE CASCADE,
  viewer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  view_type text NOT NULL DEFAULT 'search',   -- search | direct
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS snapshot_views_log_snapshot_idx
  ON public.snapshot_views_log(snapshot_id, created_at DESC);

-- --------------------------------------------
-- 5) Auto update_at trigger
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_talent_snapshots_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_talent_snapshots_updated_at ON public.talent_snapshots;
CREATE TRIGGER trg_talent_snapshots_updated_at
  BEFORE UPDATE ON public.talent_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.touch_talent_snapshots_updated_at();

-- --------------------------------------------
-- 6) Row Level Security — talent_snapshots
-- --------------------------------------------
ALTER TABLE public.talent_snapshots ENABLE ROW LEVEL SECURITY;

-- Talent: full control of own snapshots
DROP POLICY IF EXISTS talent_snapshots_owner_all ON public.talent_snapshots;
CREATE POLICY talent_snapshots_owner_all
  ON public.talent_snapshots
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      WHERE tp.id = talent_snapshots.talent_id
        AND tp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      WHERE tp.id = talent_snapshots.talent_id
        AND tp.user_id = auth.uid()
    )
  );

-- Recruiters / public: read ONLY active snapshots, NO PII columns exposed via view
DROP POLICY IF EXISTS talent_snapshots_public_read_active ON public.talent_snapshots;
CREATE POLICY talent_snapshots_public_read_active
  ON public.talent_snapshots
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- --------------------------------------------
-- 7) Row Level Security — snapshot_access_requests
-- --------------------------------------------
ALTER TABLE public.snapshot_access_requests ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can create a request
DROP POLICY IF EXISTS snapshot_access_requests_insert ON public.snapshot_access_requests;
CREATE POLICY snapshot_access_requests_insert
  ON public.snapshot_access_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Talent can read requests for their snapshots
DROP POLICY IF EXISTS snapshot_access_requests_select_talent ON public.snapshot_access_requests;
CREATE POLICY snapshot_access_requests_select_talent
  ON public.snapshot_access_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.talent_snapshots ts
      JOIN public.talent_profiles tp ON tp.id = ts.talent_id
      WHERE ts.id = snapshot_access_requests.snapshot_id
        AND tp.user_id = auth.uid()
    )
  );

-- Requester can read their own requests
DROP POLICY IF EXISTS snapshot_access_requests_select_requester ON public.snapshot_access_requests;
CREATE POLICY snapshot_access_requests_select_requester
  ON public.snapshot_access_requests
  FOR SELECT
  TO authenticated
  USING (requester_user_id = auth.uid());

-- Talent can update (approve/decline)
DROP POLICY IF EXISTS snapshot_access_requests_update_talent ON public.snapshot_access_requests;
CREATE POLICY snapshot_access_requests_update_talent
  ON public.snapshot_access_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.talent_snapshots ts
      JOIN public.talent_profiles tp ON tp.id = ts.talent_id
      WHERE ts.id = snapshot_access_requests.snapshot_id
        AND tp.user_id = auth.uid()
    )
  );

-- --------------------------------------------
-- 8) Row Level Security — snapshot_views_log
-- --------------------------------------------
ALTER TABLE public.snapshot_views_log ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (server-side logging)
DROP POLICY IF EXISTS snapshot_views_log_insert ON public.snapshot_views_log;
CREATE POLICY snapshot_views_log_insert
  ON public.snapshot_views_log
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Talent can read views on their snapshots
DROP POLICY IF EXISTS snapshot_views_log_select_talent ON public.snapshot_views_log;
CREATE POLICY snapshot_views_log_select_talent
  ON public.snapshot_views_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.talent_snapshots ts
      JOIN public.talent_profiles tp ON tp.id = ts.talent_id
      WHERE ts.id = snapshot_views_log.snapshot_id
        AND tp.user_id = auth.uid()
    )
  );

-- --------------------------------------------
-- 9) Talent notification for access requests
--    Reuses existing talent_notifications table
-- --------------------------------------------
-- No schema change needed — notification_type 'snapshot_access_request' added in-app.

-- --------------------------------------------
-- 10) Convenience view: safe recruiter-facing columns only
-- --------------------------------------------
CREATE OR REPLACE VIEW public.anonymous_snapshots AS
SELECT
  ts.id,
  public.snapshot_anon_id(ts.id) AS anon_id,
  ts.headline,
  ts.experience_years,
  ts.location,
  ts.skills_json,
  ts.industry_tags,
  ts.summary,
  ts.view_count,
  ts.search_appearance_count,
  ts.created_at
FROM public.talent_snapshots ts
WHERE ts.is_active = true;

-- Grant SELECT on view to authenticated users (reads through RLS of underlying table)
GRANT SELECT ON public.anonymous_snapshots TO authenticated, anon;
