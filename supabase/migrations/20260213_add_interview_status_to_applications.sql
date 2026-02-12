-- ============================================
-- Add 'interview' status to applications table
-- ============================================

-- Drop the existing CHECK constraint dynamically
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'applications'
    AND nsp.nspname = 'public'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.applications DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Recreate with 'interview' status included
ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('applied', 'shortlisted', 'interview', 'rejected', 'hired'));
