-- Ensure business_profile_pages rows are deleted when the parent business_profile is deleted.
-- First drop the existing FK (if it exists without cascade), then re-add with ON DELETE CASCADE.

DO $$
DECLARE
  fk_name text;
BEGIN
  -- Find the existing FK constraint name
  SELECT tc.constraint_name
    INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
   WHERE tc.table_name = 'business_profile_pages'
     AND tc.constraint_type = 'FOREIGN KEY'
     AND kcu.column_name = 'business_id'
   LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE business_profile_pages DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

ALTER TABLE business_profile_pages
  ADD CONSTRAINT business_profile_pages_business_id_fkey
  FOREIGN KEY (business_id)
  REFERENCES business_profiles(id)
  ON DELETE CASCADE;
