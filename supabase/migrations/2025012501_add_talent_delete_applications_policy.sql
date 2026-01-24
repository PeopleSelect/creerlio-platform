-- ============================================
-- Add RLS policy for talent to delete their own applications
-- ============================================

-- Drop policy if it exists (for idempotent migrations)
DROP POLICY IF EXISTS talent_can_delete_own_applications ON public.applications;

-- Talent can delete their own applications (withdraw)
CREATE POLICY talent_can_delete_own_applications
  ON public.applications
  FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.talent_profiles 
      WHERE talent_profiles.id = applications.talent_profile_id 
      AND talent_profiles.user_id = auth.uid()
    )
  );
