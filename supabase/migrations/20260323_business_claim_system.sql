-- ============================================================
-- BUSINESS CLAIM SYSTEM
-- Private-first AI-generated profiles with secure claim tokens
-- ============================================================

-- ── 1. Extend business_profiles ──────────────────────────────
ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS visibility          TEXT        DEFAULT 'private'
    CHECK (visibility IN ('private', 'public', 'removed')),
  ADD COLUMN IF NOT EXISTS claim_token         TEXT,
  ADD COLUMN IF NOT EXISTS claim_token_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS claim_status        TEXT        DEFAULT 'pending'
    CHECK (claim_status IN ('pending', 'claimed', 'removed')),
  ADD COLUMN IF NOT EXISTS claimed_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claimed_by_user_id  UUID        REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_ai_generated     BOOLEAN     DEFAULT false;

-- Unique index on claim_token (sparse — only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS business_profiles_claim_token_idx
  ON business_profiles (claim_token)
  WHERE claim_token IS NOT NULL;

-- ── 2. Business claim events log ─────────────────────────────
CREATE TABLE IF NOT EXISTS business_claim_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID        REFERENCES business_profiles(id) ON DELETE CASCADE,
  event_type   TEXT        NOT NULL
    CHECK (event_type IN ('business_created', 'claim_link_viewed', 'profile_claimed', 'profile_removed')),
  user_id      UUID        REFERENCES auth.users(id),
  metadata     JSONB       DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient per-business queries
CREATE INDEX IF NOT EXISTS business_claim_events_business_idx
  ON business_claim_events (business_id, created_at DESC);

-- ── 3. RLS for business_claim_events ─────────────────────────
ALTER TABLE business_claim_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (anonymous claim_link_viewed)
DROP POLICY IF EXISTS "claim_events_anyone_insert" ON business_claim_events;
CREATE POLICY "claim_events_anyone_insert"
  ON business_claim_events FOR INSERT
  WITH CHECK (true);

-- Owner can read events for their business
DROP POLICY IF EXISTS "claim_events_owner_read" ON business_claim_events;
CREATE POLICY "claim_events_owner_read"
  ON business_claim_events FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Service role bypass (for admin API routes using service key)
-- (service role bypasses RLS automatically — no policy needed)

-- ── 4. Allow anon to read business_profiles by claim_token ───
-- The claim preview API uses service role, so no client-side
-- RLS change is needed — kept here for documentation.

-- ── 5. Ensure business_profile_pages.is_published stays false ─
-- for AI-generated profiles (enforced in generator, not SQL)

-- ── 6. Back-fill: mark existing rows as public/claimed ────────
-- Existing generated profiles were already set is_published=true.
-- They get visibility='public' and claim_status='claimed' so
-- they continue working until admins decide to restrict them.
UPDATE business_profiles
SET visibility = 'public', claim_status = 'claimed'
WHERE visibility = 'private'
  AND is_ai_generated = false
  AND id IN (
    SELECT business_id FROM business_profile_pages WHERE is_published = true
  );
