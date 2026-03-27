-- ============================================================
-- Creerlio Network — QR Connect + Products/Services Layer
-- (2026-03-27)
-- ============================================================

-- 1. Extend customer_connections: QR source + engagement
ALTER TABLE public.customer_connections
  ADD COLUMN IF NOT EXISTS qr_source       text,
  ADD COLUMN IF NOT EXISTS engagement_score integer DEFAULT 0;

-- 2. Products & Services catalogue per business
CREATE TABLE IF NOT EXISTS public.business_products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  name         text NOT NULL,
  description  text,
  category     text,
  price_from   numeric,
  price_to     numeric,
  price_unit   text DEFAULT 'flat',  -- flat | hour | day | month | unit
  is_service   boolean DEFAULT false,
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- 3. Link opportunities to a specific product/service (safe — wrapped in DO block)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opportunities') THEN
    ALTER TABLE public.opportunities
      ADD COLUMN IF NOT EXISTS product_id   uuid REFERENCES public.business_products(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS product_name text;
  END IF;
END $$;

-- ── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.business_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_public_read    ON public.business_products;
DROP POLICY IF EXISTS products_owner_manage   ON public.business_products;

-- Anyone can browse active products
CREATE POLICY products_public_read ON public.business_products
  FOR SELECT TO anon, authenticated USING (is_active = true);

-- Business owners manage their own catalogue
CREATE POLICY products_owner_manage ON public.business_products
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      WHERE bp.id = business_id AND bp.user_id = auth.uid()
    )
  );

-- ── Engagement scoring function ───────────────────────────────────────────
-- Increments engagement_score on a connection when activity occurs.
-- Called via activity_events trigger (future) or directly from API.
CREATE OR REPLACE FUNCTION public.increment_engagement(p_connection_id uuid, p_points integer DEFAULT 1)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.customer_connections
  SET engagement_score    = COALESCE(engagement_score, 0) + p_points,
      last_interaction_at = now()
  WHERE id = p_connection_id;
$$;

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_business    ON public.business_products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category    ON public.business_products(category);
CREATE INDEX IF NOT EXISTS idx_conn_qr_source       ON public.customer_connections(qr_source) WHERE qr_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conn_engagement      ON public.customer_connections(engagement_score DESC);
