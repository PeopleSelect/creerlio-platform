-- ============================================================
-- Creerlio: Business-initiated outreach to anonymous talent
-- Flow:
--   Business discovers anonymous talent in Recruiter Discovery
--   Business sends a connection request with an optional message
--   Talent receives notification and can accept/decline
--   On accept: identity revealed, messaging unlocked
-- ============================================================

CREATE TABLE IF NOT EXISTS public.business_outreach_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  talent_profile_id   uuid NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','accepted','declined')),
  message             text,                    -- optional intro message from business
  responded_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, talent_profile_id)      -- one active request per pair
);

CREATE INDEX IF NOT EXISTS bor_business_idx ON public.business_outreach_requests(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bor_talent_idx   ON public.business_outreach_requests(talent_profile_id, status, created_at DESC);

ALTER TABLE public.business_outreach_requests ENABLE ROW LEVEL SECURITY;

-- Business can create and view their own outreach
DROP POLICY IF EXISTS bor_business_all ON public.business_outreach_requests;
CREATE POLICY bor_business_all
  ON public.business_outreach_requests
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      WHERE bp.id = business_outreach_requests.business_id
        AND bp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      WHERE bp.id = business_outreach_requests.business_id
        AND bp.user_id = auth.uid()
    )
  );

-- Talent can view and respond to requests sent to them
DROP POLICY IF EXISTS bor_talent_select ON public.business_outreach_requests;
CREATE POLICY bor_talent_select
  ON public.business_outreach_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      WHERE tp.id = business_outreach_requests.talent_profile_id
        AND tp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS bor_talent_update ON public.business_outreach_requests;
CREATE POLICY bor_talent_update
  ON public.business_outreach_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      WHERE tp.id = business_outreach_requests.talent_profile_id
        AND tp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp
      WHERE tp.id = business_outreach_requests.talent_profile_id
        AND tp.user_id = auth.uid()
    )
  );
