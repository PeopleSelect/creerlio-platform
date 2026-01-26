-- ============================================
-- User preferences (active business/location)
-- Stores per-user active context for dashboards
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  active_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Optional view for location assignments (alias for compatibility)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_location_roles'
  ) THEN
    EXECUTE $v$
      CREATE OR REPLACE VIEW public.business_user_locations AS
      SELECT
        ulr.user_id,
        l.business_id,
        ulr.location_id,
        ulr.role
      FROM public.user_location_roles ulr
      JOIN public.locations l ON l.id = ulr.location_id
    $v$;
  END IF;
END $$;

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_preferences_read ON public.user_preferences;
CREATE POLICY user_preferences_read
  ON public.user_preferences
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_preferences_write ON public.user_preferences;
CREATE POLICY user_preferences_write
  ON public.user_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
