-- Fix talent_profiles INSERT policy:
-- The talent edit page inserts with user_id = auth.uid() and auto-generated id.
-- The previous policy only checked id = auth.uid(), blocking all inserts.
-- This migration relaxes INSERT to allow user_id = auth.uid() as well.

DROP POLICY IF EXISTS "tp_insert_own" ON public.talent_profiles;

CREATE POLICY "tp_insert_own" ON public.talent_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id::text = auth.uid()::text
    OR (user_id IS NOT NULL AND user_id::text = auth.uid()::text)
  );

NOTIFY pgrst, 'reload schema';
