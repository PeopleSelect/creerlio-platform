-- Ensure talent_profiles INSERT policy allows rows where user_id = auth.uid()
-- (not just id = auth.uid()). The edit page inserts with user_id set,
-- and the id is auto-generated — so checking only id blocked all new profiles.

DROP POLICY IF EXISTS "tp_insert_own" ON public.talent_profiles;

CREATE POLICY "tp_insert_own" ON public.talent_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id::text = auth.uid()::text
    OR (user_id IS NOT NULL AND user_id::text = auth.uid()::text)
  );

NOTIFY pgrst, 'reload schema';
