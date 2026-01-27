-- ============================================
-- Add avatar_prompt column if missing
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'public_lite_business_profiles'
      AND column_name = 'avatar_prompt'
  ) THEN
    ALTER TABLE public.public_lite_business_profiles
      ADD COLUMN avatar_prompt text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'public_lite_business_profiles'
      AND column_name = 'banner_prompt'
  ) THEN
    ALTER TABLE public.public_lite_business_profiles
      ADD COLUMN banner_prompt text;
  END IF;
END $$;
