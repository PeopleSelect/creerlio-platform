-- ────────────────────────────────────────────────────────────────
-- Relationship Operating System (ROS)
-- Unified connection layer: customer ↔ business, talent ↔ business
-- Supports soft-delete, audit trail, disconnect by either party
-- ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ros_connections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Initiator (user who connected)
  initiator_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Target business
  business_id          UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,

  -- Relationship type drives which dashboard section this shows in
  relationship_type    TEXT NOT NULL CHECK (relationship_type IN ('customer', 'talent', 'business')),

  -- Entry trigger
  entry_source         TEXT NOT NULL DEFAULT 'qr'
                         CHECK (entry_source IN ('qr', 'direct', 'search', 'invite', 'opportunity', 'onboarding')),
  campaign             TEXT,

  -- Status — soft-delete pattern, never hard delete
  status               TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'disconnected', 'pending', 'blocked')),

  -- Soft-delete fields — preserved for audit trail
  disconnected_at      TIMESTAMPTZ,
  disconnected_by      UUID REFERENCES auth.users(id),
  disconnected_reason  TEXT,

  -- Activity tracking
  last_interaction_at  TIMESTAMPTZ DEFAULT NOW(),
  notes                TEXT,
  metadata             JSONB DEFAULT '{}'::jsonb,

  connected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One active relationship per user+business+type combo
  UNIQUE (initiator_id, business_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS ros_conn_initiator_idx ON public.ros_connections(initiator_id, status);
CREATE INDEX IF NOT EXISTS ros_conn_business_idx  ON public.ros_connections(business_id, status);
CREATE INDEX IF NOT EXISTS ros_conn_type_idx      ON public.ros_connections(relationship_type, status);

ALTER TABLE public.ros_connections ENABLE ROW LEVEL SECURITY;

-- Initiator can see and manage their own connections
CREATE POLICY "ros_initiator_all" ON public.ros_connections
  FOR ALL TO authenticated
  USING (initiator_id = auth.uid())
  WITH CHECK (initiator_id = auth.uid());

-- Business owners can view connections to their business
-- (joins through business_profiles which they own via user_business_roles or business_profiles.user_id)
CREATE POLICY "ros_business_view" ON public.ros_connections
  FOR SELECT TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
    )
  );

-- Business owners can update (disconnect) connections to their business
CREATE POLICY "ros_business_disconnect" ON public.ros_connections
  FOR UPDATE TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.business_profiles WHERE user_id = auth.uid()
    )
  );

-- ── Audit log — immutable record of all connection events ─────────────────

CREATE TABLE IF NOT EXISTS public.ros_connection_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id   UUID NOT NULL REFERENCES public.ros_connections(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL CHECK (event_type IN ('connected', 'disconnected', 'reconnected', 'message_sent', 'status_changed')),
  actor_id        UUID REFERENCES auth.users(id),
  metadata        JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ros_events_conn_idx ON public.ros_connection_events(connection_id, created_at DESC);

ALTER TABLE public.ros_connection_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ros_events_read" ON public.ros_connection_events
  FOR SELECT TO authenticated
  USING (
    connection_id IN (
      SELECT id FROM public.ros_connections
      WHERE initiator_id = auth.uid()
         OR business_id IN (SELECT id FROM public.business_profiles WHERE user_id = auth.uid())
    )
  );

-- Allow system inserts into audit log
CREATE POLICY "ros_events_insert" ON public.ros_connection_events
  FOR INSERT TO authenticated WITH CHECK (true);
