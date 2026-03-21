-- ─────────────────────────────────────────────────────────────────────────────
-- Job Sync Engine — database additions
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add careers_page_url to businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS careers_page_url TEXT;

-- 2. Extend jobs table with sync columns
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS external_id        TEXT,
  ADD COLUMN IF NOT EXISTS source_url         TEXT,
  ADD COLUMN IF NOT EXISTS hash               TEXT,
  ADD COLUMN IF NOT EXISTS first_seen_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_auto_synced     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sync_removed_at    TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_jobs_source_url    ON jobs(source_url);
CREATE INDEX IF NOT EXISTS idx_jobs_external_id   ON jobs(external_id);
CREATE INDEX IF NOT EXISTS idx_jobs_is_auto_synced ON jobs(is_auto_synced) WHERE is_auto_synced = TRUE;

-- 3. Job sync logs — one row per sync run per business
CREATE TABLE IF NOT EXISTS job_sync_logs (
  id              BIGSERIAL PRIMARY KEY,
  business_id     UUID      NOT NULL,
  source_url      TEXT      NOT NULL,
  jobs_found      INTEGER   NOT NULL DEFAULT 0,
  jobs_created    INTEGER   NOT NULL DEFAULT 0,
  jobs_updated    INTEGER   NOT NULL DEFAULT 0,
  jobs_removed    INTEGER   NOT NULL DEFAULT 0,
  status          TEXT      NOT NULL DEFAULT 'success', -- 'success' | 'failure'
  error_message   TEXT,
  run_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_sync_logs_business_id ON job_sync_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_job_sync_logs_run_at      ON job_sync_logs(run_at DESC);

-- 4. Job sync events — fine-grained event trail
CREATE TABLE IF NOT EXISTS job_sync_events (
  id          BIGSERIAL   PRIMARY KEY,
  business_id UUID        NOT NULL,
  job_id      UUID        REFERENCES jobs(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL, -- 'job_added' | 'job_updated' | 'job_removed'
  payload     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_sync_events_business_id ON job_sync_events(business_id);
CREATE INDEX IF NOT EXISTS idx_job_sync_events_job_id      ON job_sync_events(job_id);
CREATE INDEX IF NOT EXISTS idx_job_sync_events_created_at  ON job_sync_events(created_at DESC);

-- 5. RLS
ALTER TABLE job_sync_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_sync_events ENABLE ROW LEVEL SECURITY;

-- Business owners can read their own sync logs (join via business_profiles)
CREATE POLICY "owners_read_sync_logs" ON job_sync_logs
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Business owners can read their own sync events
CREATE POLICY "owners_read_sync_events" ON job_sync_events
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM business_profiles WHERE user_id = auth.uid()
    )
  );
