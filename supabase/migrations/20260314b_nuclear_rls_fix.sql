-- Nuclear RLS fix: drop ALL policies on affected tables (regardless of name),
-- then recreate clean ones that only use auth.uid() — no public.users references.
-- This handles any old manually-created policies that our migrations missed.

-- ============================================================
-- Drop ALL policies on talent_profiles
-- ============================================================
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='talent_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.talent_profiles', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.talent_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_profiles TO authenticated;
GRANT SELECT ON public.talent_profiles TO anon;

CREATE POLICY "tp_select_own"    ON public.talent_profiles FOR SELECT    TO authenticated USING (id::text = auth.uid()::text OR (user_id IS NOT NULL AND user_id::text = auth.uid()::text));
CREATE POLICY "tp_select_public" ON public.talent_profiles FOR SELECT    TO anon, authenticated USING (true);
CREATE POLICY "tp_insert_own"    ON public.talent_profiles FOR INSERT    TO authenticated WITH CHECK (id::text = auth.uid()::text);
CREATE POLICY "tp_update_own"    ON public.talent_profiles FOR UPDATE    TO authenticated USING (id::text = auth.uid()::text OR (user_id IS NOT NULL AND user_id::text = auth.uid()::text)) WITH CHECK (id::text = auth.uid()::text);
CREATE POLICY "tp_delete_own"    ON public.talent_profiles FOR DELETE    TO authenticated USING (id::text = auth.uid()::text);

-- ============================================================
-- Drop ALL policies on talent_bank_items
-- ============================================================
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='talent_bank_items'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.talent_bank_items', pol.policyname);
  END LOOP;
END $$;

-- Also drop FK to public.users if it exists (any name)
DO $$
DECLARE con RECORD;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.talent_bank_items'::regclass
      AND contype = 'f'
      AND confrelid = (SELECT oid FROM pg_class WHERE relname='users' AND relnamespace=(SELECT oid FROM pg_namespace WHERE nspname='public'))
  LOOP
    EXECUTE format('ALTER TABLE public.talent_bank_items DROP CONSTRAINT %I', con.conname);
    RAISE NOTICE 'Dropped FK constraint: %', con.conname;
  END LOOP;
END $$;

ALTER TABLE public.talent_bank_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_bank_items TO authenticated;
GRANT SELECT ON public.talent_bank_items TO anon;

CREATE POLICY "tbi_select_own" ON public.talent_bank_items FOR SELECT TO authenticated USING (user_id::text = auth.uid()::text);
CREATE POLICY "tbi_insert_own" ON public.talent_bank_items FOR INSERT TO authenticated WITH CHECK (user_id::text = auth.uid()::text);
CREATE POLICY "tbi_update_own" ON public.talent_bank_items FOR UPDATE TO authenticated USING (user_id::text = auth.uid()::text) WITH CHECK (user_id::text = auth.uid()::text);
CREATE POLICY "tbi_delete_own" ON public.talent_bank_items FOR DELETE TO authenticated USING (user_id::text = auth.uid()::text);

-- ============================================================
-- Drop ALL policies on talent_snapshots
-- ============================================================
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='talent_snapshots'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.talent_snapshots', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.talent_snapshots ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_snapshots TO authenticated;
GRANT SELECT ON public.talent_snapshots TO anon;

CREATE POLICY "ts_select_own"    ON public.talent_snapshots FOR SELECT TO authenticated USING (talent_id::text = auth.uid()::text);
CREATE POLICY "ts_insert_own"    ON public.talent_snapshots FOR INSERT TO authenticated WITH CHECK (talent_id::text = auth.uid()::text);
CREATE POLICY "ts_update_own"    ON public.talent_snapshots FOR UPDATE TO authenticated USING (talent_id::text = auth.uid()::text) WITH CHECK (talent_id::text = auth.uid()::text);
CREATE POLICY "ts_delete_own"    ON public.talent_snapshots FOR DELETE TO authenticated USING (talent_id::text = auth.uid()::text);

-- ============================================================
-- Grant on public.users (belt-and-suspenders)
-- ============================================================
DO $$
BEGIN
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated';
  EXECUTE 'GRANT SELECT ON public.users TO anon';
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'public.users does not exist';
END $$;

NOTIFY pgrst, 'reload schema';
