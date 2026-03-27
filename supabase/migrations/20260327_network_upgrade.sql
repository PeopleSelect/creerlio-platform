-- ============================================================
-- Creerlio Network Upgrade  (2026-03-27)
-- Extends customer_connections + adds opportunities + activity
-- ============================================================

-- 1. Extend customer_connections with CRM + network fields
ALTER TABLE public.customer_connections
  ADD COLUMN IF NOT EXISTS relationship_status text DEFAULT 'prospect'
    CHECK (relationship_status IN ('prospect','active','in_progress','dormant')),
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_interaction_at timestamptz;

-- Back-fill relationship_status from existing operational status
UPDATE public.customer_connections SET
  relationship_status = CASE
    WHEN status = 'in_progress' THEN 'in_progress'
    WHEN status = 'closed'      THEN 'dormant'
    ELSE 'prospect'
  END
WHERE relationship_status = 'prospect' OR relationship_status IS NULL;

-- 2. Opportunities (RFQ / job / partnership / enquiry)
CREATE TABLE IF NOT EXISTS public.opportunities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('rfq','job','partnership','enquiry')),
  title       text NOT NULL,
  description text,
  budget      text,
  deadline    date,
  status      text DEFAULT 'sent' CHECK (status IN ('sent','viewed','responded','closed')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 3. Opportunity recipients — many businesses per opportunity
CREATE TABLE IF NOT EXISTS public.opportunity_recipients (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id   uuid NOT NULL REFERENCES public.opportunities(id)    ON DELETE CASCADE,
  business_id      uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  status           text DEFAULT 'sent' CHECK (status IN ('sent','viewed','responded','closed')),
  response_message text,
  created_at       timestamptz DEFAULT now(),
  UNIQUE(opportunity_id, business_id)
);

-- 4. Activity events — AI-ready event stream
CREATE TABLE IF NOT EXISTS public.activity_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text NOT NULL,
  metadata   jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.opportunities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS opportunities_owner        ON public.opportunities;
DROP POLICY IF EXISTS opp_recipients_sender_read ON public.opportunity_recipients;
DROP POLICY IF EXISTS activity_owner             ON public.activity_events;

CREATE POLICY opportunities_owner ON public.opportunities
  FOR ALL TO authenticated USING (sender_id = auth.uid());

CREATE POLICY opp_recipients_sender_read ON public.opportunity_recipients
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.opportunities o
      WHERE o.id = opportunity_id AND o.sender_id = auth.uid()
    )
  );

CREATE POLICY activity_owner ON public.activity_events
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_opportunities_sender   ON public.opportunities(sender_id);
CREATE INDEX IF NOT EXISTS idx_opp_recipients_opp_id  ON public.opportunity_recipients(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_created  ON public.activity_events(user_id, created_at DESC);
