-- ============================================
-- Add short tagline to public lite business profiles
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'public_lite_business_profiles'
      AND column_name = 'short_tagline'
  ) THEN
    ALTER TABLE public.public_lite_business_profiles
      ADD COLUMN short_tagline text;
  END IF;
END $$;
