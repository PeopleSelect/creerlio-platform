-- Fix "permission denied for table users"
-- Root cause: talent_bank_items.user_id has a FK to public.users(id).
-- PostgreSQL requires the authenticated role to have SELECT on public.users
-- to validate that FK during inserts AND during RLS policy evaluation.
-- The previous migration's GRANT was in a DO block that may have been skipped.
-- This migration applies fixes directly (no conditional wrapping).

-- 1. Grant access on public.users unconditionally
--    (harmless if table doesn't exist — just produces an error we catch)
DO $$
BEGIN
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated';
  EXECUTE 'GRANT SELECT ON public.users TO anon';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'public.users does not exist, skipping grants';
END $$;

-- 2. Drop the FK constraint from talent_bank_items to public.users
--    This eliminates the dependency that requires SELECT on public.users
--    during every INSERT into talent_bank_items.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'talent_bank_items_user_id_fkey'
      AND conrelid = 'public.talent_bank_items'::regclass
  ) THEN
    ALTER TABLE public.talent_bank_items DROP CONSTRAINT talent_bank_items_user_id_fkey;
    RAISE NOTICE 'Dropped talent_bank_items_user_id_fkey';
  ELSE
    RAISE NOTICE 'talent_bank_items_user_id_fkey not found, skipping';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not drop FK: %', SQLERRM;
END $$;

-- 3. Ensure all existing RLS policies on talent_bank_items are clean
--    (no references to public.users)
DROP POLICY IF EXISTS "users_select_own_talent_bank_items" ON public.talent_bank_items;
DROP POLICY IF EXISTS "users_insert_own_talent_bank_items" ON public.talent_bank_items;
DROP POLICY IF EXISTS "users_update_own_talent_bank_items" ON public.talent_bank_items;
DROP POLICY IF EXISTS "users_delete_own_talent_bank_items" ON public.talent_bank_items;
DROP POLICY IF EXISTS "Users can view own talent bank items" ON public.talent_bank_items;
DROP POLICY IF EXISTS "Users can insert own talent bank items" ON public.talent_bank_items;
DROP POLICY IF EXISTS "Users can update own talent bank items" ON public.talent_bank_items;
DROP POLICY IF EXISTS "Users can delete own talent bank items" ON public.talent_bank_items;

ALTER TABLE public.talent_bank_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "talent_bank_items_select_own"
  ON public.talent_bank_items FOR SELECT TO authenticated
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "talent_bank_items_insert_own"
  ON public.talent_bank_items FOR INSERT TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "talent_bank_items_update_own"
  ON public.talent_bank_items FOR UPDATE TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "talent_bank_items_delete_own"
  ON public.talent_bank_items FOR DELETE TO authenticated
  USING (user_id::text = auth.uid()::text);

-- 4. Explicit grants (no DO block — fail loudly if table missing)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_bank_items TO authenticated;
GRANT SELECT ON public.talent_bank_items TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_profiles TO authenticated;
GRANT SELECT ON public.talent_profiles TO anon;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
