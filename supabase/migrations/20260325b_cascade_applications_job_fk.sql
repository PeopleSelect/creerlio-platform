-- Fix: applications.job_id FK should cascade on job delete
-- so that deleting a business (which cascades to jobs) doesn't get blocked.

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_job_id_fkey;

ALTER TABLE applications
  ADD CONSTRAINT applications_job_id_fkey
  FOREIGN KEY (job_id)
  REFERENCES jobs(id)
  ON DELETE CASCADE;
