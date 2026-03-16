-- ============================================================
-- Public Business Discovery + Private Talent Profiles
-- Adds: hiring_interests, industries_served, contact fields,
--       badges, business_talent_requests, business_enquiries
-- ============================================================

-- 1. Extend business_profile_pages with new public fields
ALTER TABLE public.business_profile_pages
  ADD COLUMN IF NOT EXISTS hiring_interests   jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS industries_served  jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS contact_email      text,
  ADD COLUMN IF NOT EXISTS website_url        text,
  ADD COLUMN IF NOT EXISTS enquiry_enabled    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS badges             jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Business Talent Requests
--    Businesses post roles they are looking to connect with.
--    Talent can see these requests and choose to respond (grants access).
CREATE TABLE IF NOT EXISTS public.business_talent_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role_title      text NOT NULL,
  location        text,
  experience_level text,
  notes           text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS btr_business_id_idx ON public.business_talent_requests(business_id);
CREATE INDEX IF NOT EXISTS btr_active_idx      ON public.business_talent_requests(is_active) WHERE is_active = true;

ALTER TABLE public.business_talent_requests ENABLE ROW LEVEL SECURITY;

-- Public read: any authenticated user can browse active requests
CREATE POLICY "btr_select_active"
  ON public.business_talent_requests FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Anon can also browse active requests (public discovery)
CREATE POLICY "btr_select_anon"
  ON public.business_talent_requests FOR SELECT
  TO anon
  USING (is_active = true);

-- Business owner can manage their own requests
CREATE POLICY "btr_owner_write"
  ON public.business_talent_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_business_roles ubr
      WHERE ubr.business_id = business_talent_requests.business_id
        AND ubr.user_id = auth.uid()
        AND ubr.role IN ('super_admin', 'business_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_business_roles ubr
      WHERE ubr.business_id = business_talent_requests.business_id
        AND ubr.user_id = auth.uid()
        AND ubr.role IN ('super_admin', 'business_admin')
    )
  );

GRANT SELECT ON public.business_talent_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_talent_requests TO authenticated;

-- 3. Business Enquiries
--    Submitted by visitors via the Business Public Page contact form.
CREATE TABLE IF NOT EXISTS public.business_enquiries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  enquiry_type    text NOT NULL DEFAULT 'general',  -- general | consultation | message
  name            text NOT NULL,
  email           text NOT NULL,
  message         text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS be_business_id_idx ON public.business_enquiries(business_id);

ALTER TABLE public.business_enquiries ENABLE ROW LEVEL SECURITY;

-- Anon and authenticated can INSERT enquiries
CREATE POLICY "be_insert_public"
  ON public.business_enquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Business owner can read their own enquiries
CREATE POLICY "be_owner_select"
  ON public.business_enquiries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_business_roles ubr
      WHERE ubr.business_id = business_enquiries.business_id
        AND ubr.user_id = auth.uid()
        AND ubr.role IN ('super_admin', 'business_admin', 'location_admin', 'manager')
    )
  );

GRANT INSERT ON public.business_enquiries TO anon;
GRANT SELECT, INSERT ON public.business_enquiries TO authenticated;

-- 4. talent_interest_signals view
--    Aggregates anonymous talent interest per business by deriving from talent_access_grants.
--    Shows count + role category. No identities exposed.
--    Businesses can only see their own signals.
CREATE OR REPLACE VIEW public.business_talent_signals AS
  SELECT
    tag.business_id,
    tp.title                         AS talent_role_category,
    COUNT(*)::int                    AS interest_count
  FROM public.talent_access_grants tag
  JOIN public.talent_profiles tp
    ON tp.id = tag.talent_id
  WHERE tag.revoked_at IS NULL
  GROUP BY tag.business_id, tp.title;

-- RLS note: views do not have RLS; security enforced in API route (service role + ownership check).

-- 5. Ensure business_profile_pages public read covers new fields (policy already exists)
--    No change needed — existing `public_read_published` policy covers all columns.

NOTIFY pgrst, 'reload schema';
