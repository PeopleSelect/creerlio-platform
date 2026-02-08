-- ============================================
-- Page Views Analytics Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.page_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  referrer text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON public.page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON public.page_views(page_path);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for tracking)
CREATE POLICY "Anyone can insert page views"
  ON public.page_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read page views (for analytics)
CREATE POLICY "Admins can read page views"
  ON public.page_views
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND (u.raw_user_meta_data->>'is_admin')::boolean = true
    )
    OR auth.jwt()->>'email' IN (
      SELECT unnest(string_to_array(current_setting('app.admin_emails', true), ','))
    )
  );

-- Create a function to get page view stats
CREATE OR REPLACE FUNCTION get_page_view_stats()
RETURNS TABLE (
  total_views bigint,
  views_today bigint,
  views_7d bigint,
  views_30d bigint,
  unique_visitors_today bigint,
  unique_visitors_7d bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    (SELECT count(*) FROM public.page_views) AS total_views,
    (SELECT count(*) FROM public.page_views WHERE created_at >= CURRENT_DATE) AS views_today,
    (SELECT count(*) FROM public.page_views WHERE created_at >= NOW() - INTERVAL '7 days') AS views_7d,
    (SELECT count(*) FROM public.page_views WHERE created_at >= NOW() - INTERVAL '30 days') AS views_30d,
    (SELECT count(DISTINCT COALESCE(user_id::text, session_id)) FROM public.page_views WHERE created_at >= CURRENT_DATE) AS unique_visitors_today,
    (SELECT count(DISTINCT COALESCE(user_id::text, session_id)) FROM public.page_views WHERE created_at >= NOW() - INTERVAL '7 days') AS unique_visitors_7d;
$$;
