-- Add contact email to business_profiles for public view display
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_profiles'
      AND column_name = 'email'
  ) THEN
    ALTER TABLE public.business_profiles ADD COLUMN email text;
  END IF;
END $$;
