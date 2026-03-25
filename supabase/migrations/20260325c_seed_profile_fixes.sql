-- ============================================================
-- SEED PROFILE FIXES
-- 1. Allow business_profiles to be created without a real auth user
--    (needed for AI-seeded showcase profiles like Apple)
-- 2. Remove restrictive check constraint on business_bank_items.item_type
--    so new AI-generated types (dynamic_sections, structured_benefits, etc.)
--    can be stored without schema changes each time
-- ============================================================

-- 1. Make user_id nullable in business_profiles
--    AI-seeded / showcase profiles have no corresponding auth.users row.
--    The FK is kept (non-null values must still be valid), but NULL is allowed.
ALTER TABLE business_profiles
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Drop the restrictive item_type check constraint on business_bank_items
--    (if it exists — it may have been created manually in the dashboard).
--    Application code is the enforcement layer; the constraint is too rigid.
ALTER TABLE business_bank_items
  DROP CONSTRAINT IF EXISTS business_bank_items_item_type_check;
