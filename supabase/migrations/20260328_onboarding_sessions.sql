-- Onboarding sessions — tracks each user's onboarding progress and first connection.
-- auth.users already exists; this table is separate and references it by user_id.

CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                      uuid NOT NULL UNIQUE,
  role_intent                  text CHECK (role_intent IN ('find_businesses', 'find_work', 'both')),
  what_i_do                    text,
  step_reached                 int NOT NULL DEFAULT 1,
  first_connection_business_id uuid REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  completed_at                 timestamptz,
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own onboarding session
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'onboarding_sessions'
      AND policyname = 'os_own_all'
  ) THEN
    CREATE POLICY os_own_all ON public.onboarding_sessions
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Service role can write freely (for API routes using service key)
GRANT ALL ON public.onboarding_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.onboarding_sessions TO authenticated;
