-- ============================================================
-- Customer Account System
-- Introduces the Customer role: individuals who interact with
-- businesses for service enquiries, consultations, and messaging.
-- Customers cannot access talent profiles.
-- ============================================================

-- 1. Customer Profiles
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 text NOT NULL,
  email                text NOT NULL,
  phone                text,
  company              text,
  location             text,
  industry_interests   text[] NOT NULL DEFAULT '{}',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cp_user_id_idx ON public.customer_profiles(user_id);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- Customer can manage their own profile
CREATE POLICY "cp_own"
  ON public.customer_profiles FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Business owner can read profiles of customers connected to their business
CREATE POLICY "cp_business_read"
  ON public.customer_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.customer_connections cc
      JOIN public.business_profiles bp ON bp.id = cc.business_id
      WHERE cc.customer_id = customer_profiles.id
        AND bp.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.customer_profiles TO authenticated;


-- 2. Customer–Business Connections
--    Created when a customer first contacts a business.
CREATE TABLE IF NOT EXISTS public.customer_connections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'open',   -- open | in_progress | closed
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, business_id)
);

CREATE INDEX IF NOT EXISTS cc_customer_id_idx ON public.customer_connections(customer_id);
CREATE INDEX IF NOT EXISTS cc_business_id_idx ON public.customer_connections(business_id);

ALTER TABLE public.customer_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cc_customer_select"
  ON public.customer_connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_profiles cp
      WHERE cp.id = customer_connections.customer_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "cc_business_select"
  ON public.customer_connections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      WHERE bp.id = customer_connections.business_id
        AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "cc_customer_insert"
  ON public.customer_connections FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customer_profiles cp
      WHERE cp.id = customer_connections.customer_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "cc_status_update"
  ON public.customer_connections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_profiles cp
      WHERE cp.id = customer_connections.customer_id
        AND cp.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      WHERE bp.id = customer_connections.business_id
        AND bp.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.customer_connections TO authenticated;


-- 3. Customer Messages
--    Threaded messages within a customer–business connection.
CREATE TABLE IF NOT EXISTS public.customer_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.customer_connections(id) ON DELETE CASCADE,
  sender_type   text NOT NULL CHECK (sender_type IN ('customer', 'business')),
  sender_id     uuid NOT NULL,  -- customer_profiles.id or business_profiles.id
  body          text NOT NULL,
  enquiry_type  text,           -- general | consultation | message (first message only)
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cmsg_connection_id_idx ON public.customer_messages(connection_id);
CREATE INDEX IF NOT EXISTS cmsg_created_at_idx    ON public.customer_messages(created_at);

ALTER TABLE public.customer_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cmsg_read"
  ON public.customer_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.customer_connections cc
      JOIN public.customer_profiles cp ON cp.id = cc.customer_id
      WHERE cc.id = customer_messages.connection_id
        AND cp.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.customer_connections cc
      JOIN public.business_profiles bp ON bp.id = cc.business_id
      WHERE cc.id = customer_messages.connection_id
        AND bp.user_id = auth.uid()
    )
  );

CREATE POLICY "cmsg_insert"
  ON public.customer_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.customer_connections cc
      JOIN public.customer_profiles cp ON cp.id = cc.customer_id
      WHERE cc.id = customer_messages.connection_id
        AND cp.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1
      FROM public.customer_connections cc
      JOIN public.business_profiles bp ON bp.id = cc.business_id
      WHERE cc.id = customer_messages.connection_id
        AND bp.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT ON public.customer_messages TO authenticated;


-- 4. Customer Saved Businesses
CREATE TABLE IF NOT EXISTS public.customer_saved_businesses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customer_profiles(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, business_id)
);

ALTER TABLE public.customer_saved_businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csb_own"
  ON public.customer_saved_businesses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_profiles cp
      WHERE cp.id = customer_saved_businesses.customer_id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customer_profiles cp
      WHERE cp.id = customer_saved_businesses.customer_id
        AND cp.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, DELETE ON public.customer_saved_businesses TO authenticated;

NOTIFY pgrst, 'reload schema';
