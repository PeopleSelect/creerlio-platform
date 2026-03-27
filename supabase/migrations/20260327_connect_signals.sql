-- ============================================================
-- Creerlio Network — Connect Signals & Safe Opportunities Fix
-- (2026-03-27)
-- ============================================================
-- Adds scan_count + intent_score to customer_connections
-- Safely ensures opportunities has product columns
-- Run AFTER 20260327_network_upgrade.sql and 20260327_qr_products.sql
-- ============================================================

-- 1. Add missing signal columns to customer_connections
ALTER TABLE public.customer_connections
  ADD COLUMN IF NOT EXISTS scan_count   integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS intent_score integer DEFAULT 0;

-- 2. Ensure opportunities table has product columns
--    (safe no-op if qr_products.sql already added them)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') THEN
    ALTER TABLE public.opportunities
      ADD COLUMN IF NOT EXISTS product_id   uuid REFERENCES public.business_products(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS product_name text;
  END IF;
END $$;

-- 3. Indexes for new signal columns
CREATE INDEX IF NOT EXISTS idx_conn_scan_count   ON public.customer_connections(scan_count DESC);
CREATE INDEX IF NOT EXISTS idx_conn_intent_score ON public.customer_connections(intent_score DESC);

-- 4. Back-fill: set scan_count = 1 for any existing QR connections
UPDATE public.customer_connections
SET scan_count = 1
WHERE qr_source IS NOT NULL AND scan_count = 0;
