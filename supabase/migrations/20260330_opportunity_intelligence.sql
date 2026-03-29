-- Opportunity Intelligence Engine Schema

-- Stores computed opportunity scores per user+job pair
CREATE TABLE IF NOT EXISTS public.opportunity_scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id           TEXT NOT NULL,
  match_score      NUMERIC(5,2) NOT NULL DEFAULT 0,
  salary_score     NUMERIC(5,2) NOT NULL DEFAULT 0,
  commute_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
  growth_score     NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_score      NUMERIC(5,2) NOT NULL DEFAULT 0,
  verdict          TEXT NOT NULL CHECK (verdict IN ('Strong Move', 'Consider', 'Avoid')),
  weekly_commute_hours NUMERIC(6,2),
  weekly_time_cost NUMERIC(10,2),
  weekly_net_value NUMERIC(10,2),
  breakdown        JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendation   JSONB NOT NULL DEFAULT '{}'::jsonb,
  scenario_params  JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS opp_scores_user_idx ON public.opportunity_scores(user_id, total_score DESC);
CREATE INDEX IF NOT EXISTS opp_scores_job_idx  ON public.opportunity_scores(job_id);

ALTER TABLE public.opportunity_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opp_scores_own" ON public.opportunity_scores
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Stores behavioural events for analytics + personalisation
CREATE TABLE IF NOT EXISTS public.user_opportunity_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS opp_events_user_idx ON public.user_opportunity_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS opp_events_type_idx ON public.user_opportunity_events(event_type);

ALTER TABLE public.user_opportunity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "opp_events_own" ON public.user_opportunity_events
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Stores geographic heatmap data for talent/job density
CREATE TABLE IF NOT EXISTS public.geo_insights (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location          TEXT NOT NULL,
  lat               DOUBLE PRECISION NOT NULL,
  lng               DOUBLE PRECISION NOT NULL,
  talent_density    NUMERIC(5,2) DEFAULT 0,
  job_density       NUMERIC(5,2) DEFAULT 0,
  avg_salary        NUMERIC(12,2) DEFAULT 0,
  competition_score NUMERIC(5,2) DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS geo_insights_location_idx ON public.geo_insights(lat, lng);

ALTER TABLE public.geo_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "geo_insights_read" ON public.geo_insights
  FOR SELECT TO authenticated USING (true);

-- Seed sample geo insight rows for Sydney metro
INSERT INTO public.geo_insights (location, lat, lng, talent_density, job_density, avg_salary, competition_score)
VALUES
  ('Sydney CBD',       -33.8688, 151.2093, 88, 92, 115000, 74),
  ('North Sydney',     -33.8387, 151.2069, 71, 68, 108000, 58),
  ('Parramatta',       -33.8151, 151.0011, 62, 74, 95000,  52),
  ('Chatswood',        -33.7969, 151.1822, 54, 61, 105000, 44),
  ('Macquarie Park',   -33.7739, 151.1190, 65, 79, 112000, 61),
  ('Surry Hills',      -33.8836, 151.2107, 76, 55, 118000, 67),
  ('Pyrmont',          -33.8700, 151.1950, 69, 58, 122000, 63),
  ('Circular Quay',    -33.8611, 151.2106, 82, 88, 130000, 79)
ON CONFLICT DO NOTHING;
