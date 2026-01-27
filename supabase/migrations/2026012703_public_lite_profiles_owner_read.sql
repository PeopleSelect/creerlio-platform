-- ============================================
-- Public Lite Business Profiles: owner read policy
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'public_lite_business_profiles'
      AND policyname = 'public_lite_business_profiles_select_own'
  ) THEN
    CREATE POLICY public_lite_business_profiles_select_own
      ON public.public_lite_business_profiles
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;
