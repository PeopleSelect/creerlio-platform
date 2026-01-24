-- Add latitude and longitude columns to jobs table for mapping functionality
-- This migration is idempotent and safe to run multiple times

DO $$
BEGIN
  -- Add latitude column if it doesn't exist (for map functionality)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'latitude'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN latitude DOUBLE PRECISION;
  END IF;
  
  -- Add longitude column if it doesn't exist (for map functionality)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'longitude'
  ) THEN
    ALTER TABLE public.jobs ADD COLUMN longitude DOUBLE PRECISION;
  END IF;
END $$;

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_jobs_location ON public.jobs(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
