-- ============================================
-- Business Products & Services System
-- ============================================

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_model_type') THEN
    CREATE TYPE business_model_type AS ENUM ('B2B', 'B2C', 'SaaS', 'Retail', 'Marketplace', 'Agency', 'Other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_category_type') THEN
    CREATE TYPE product_category_type AS ENUM ('Product', 'Service', 'Platform', 'Offering');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_lifecycle_stage') THEN
    CREATE TYPE product_lifecycle_stage AS ENUM ('Idea', 'Beta', 'Live', 'Scaling');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_visibility_level') THEN
    CREATE TYPE product_visibility_level AS ENUM ('public_summary', 'gated_detail', 'nda_only', 'confidential');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_media_type') THEN
    CREATE TYPE product_media_type AS ENUM ('image', 'video', 'pdf', 'link', 'case_study', 'document');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_access_status') THEN
    CREATE TYPE product_access_status AS ENUM ('requested', 'approved', 'nda_signed', 'denied');
  END IF;
END $$;

-- Overview (entry point)
CREATE TABLE IF NOT EXISTS public.business_products_services_overview (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  short_headline TEXT NOT NULL,
  summary TEXT NOT NULL,
  primary_industries TEXT[] DEFAULT '{}',
  business_model business_model_type NOT NULL DEFAULT 'Other',
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bps_overview_business_id ON public.business_products_services_overview(business_id);
CREATE INDEX IF NOT EXISTS idx_bps_overview_user_id ON public.business_products_services_overview(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_bps_overview_business_id ON public.business_products_services_overview(business_id);

-- Core product/service cards
CREATE TABLE IF NOT EXISTS public.business_products_services (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category product_category_type NOT NULL,
  short_description TEXT NOT NULL,
  who_it_is_for TEXT NOT NULL,
  problem_it_solves TEXT NOT NULL,
  logo_or_icon TEXT,
  explainer_video_url TEXT,
  external_link TEXT,
  lifecycle_stage product_lifecycle_stage,
  order_index INT DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bps_business_id ON public.business_products_services(business_id);
CREATE INDEX IF NOT EXISTS idx_bps_user_id ON public.business_products_services(user_id);
CREATE INDEX IF NOT EXISTS idx_bps_order_index ON public.business_products_services(order_index);

-- Media (images, videos, PDFs, links, case studies)
CREATE TABLE IF NOT EXISTS public.business_product_media (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES public.business_products_services(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type product_media_type NOT NULL,
  title TEXT,
  file_path TEXT,
  file_url TEXT,
  file_type TEXT,
  metadata JSONB,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bps_media_product_id ON public.business_product_media(product_id);

-- Role & talent connections
CREATE TABLE IF NOT EXISTS public.business_product_roles (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES public.business_products_services(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_product_skills (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES public.business_products_services(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_product_teams (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES public.business_products_services(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_product_growth_areas (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES public.business_products_services(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  growth_area TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Permissions
CREATE TABLE IF NOT EXISTS public.business_product_permissions (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES public.business_products_services(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visibility_level product_visibility_level NOT NULL DEFAULT 'public_summary',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_bps_permissions_product_id ON public.business_product_permissions(product_id);

-- Relationship signals
CREATE TABLE IF NOT EXISTS public.business_product_signals (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES public.business_products_services(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  we_are_hiring_for_this BOOLEAN DEFAULT FALSE,
  open_to_partnerships BOOLEAN DEFAULT FALSE,
  in_research_and_development BOOLEAN DEFAULT FALSE,
  currently_scaling BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_bps_signals_product_id ON public.business_product_signals(product_id);

-- Roadmap / Future plans
CREATE TABLE IF NOT EXISTS public.business_product_roadmap (
  id BIGSERIAL PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upcoming_products TEXT[] DEFAULT '{}',
  roadmap_ideas TEXT,
  expansion_plans TEXT,
  new_markets TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_bps_roadmap_business_id ON public.business_product_roadmap(business_id);

-- Impact & outcomes
CREATE TABLE IF NOT EXISTS public.business_product_impact (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES public.business_products_services(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  who_it_helps TEXT,
  what_it_improves TEXT,
  real_world_outcomes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_bps_impact_product_id ON public.business_product_impact(product_id);

-- Access requests / approvals (for gated & NDA)
CREATE TABLE IF NOT EXISTS public.business_product_access (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES public.business_products_services(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status product_access_status NOT NULL DEFAULT 'requested',
  nda_accepted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Matching hooks view (role/skill/industry/lifecycle/growth area)
CREATE OR REPLACE VIEW public.business_product_talent_hooks AS
SELECT
  p.business_id,
  p.id AS product_id,
  p.name AS product_name,
  p.lifecycle_stage,
  o.primary_industries,
  r.role_name,
  s.skill_name,
  t.team_name,
  g.growth_area
FROM public.business_products_services p
LEFT JOIN public.business_products_services_overview o ON o.business_id = p.business_id
LEFT JOIN public.business_product_roles r ON r.product_id = p.id
LEFT JOIN public.business_product_skills s ON s.product_id = p.id
LEFT JOIN public.business_product_teams t ON t.product_id = p.id
LEFT JOIN public.business_product_growth_areas g ON g.product_id = p.id;

-- RLS: enable
ALTER TABLE public.business_products_services_overview ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_products_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_product_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_product_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_product_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_product_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_product_growth_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_product_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_product_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_product_roadmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_product_impact ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_product_access ENABLE ROW LEVEL SECURITY;

-- Policies: owners manage their own data (IF NOT EXISTS via pg_policies)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_products_services_overview' AND policyname = 'bps_overview_owner_all') THEN
    CREATE POLICY bps_overview_owner_all
      ON public.business_products_services_overview
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_products_services' AND policyname = 'bps_owner_all') THEN
    CREATE POLICY bps_owner_all
      ON public.business_products_services
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_media' AND policyname = 'bps_media_owner_all') THEN
    CREATE POLICY bps_media_owner_all
      ON public.business_product_media
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_roles' AND policyname = 'bps_roles_owner_all') THEN
    CREATE POLICY bps_roles_owner_all
      ON public.business_product_roles
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_skills' AND policyname = 'bps_skills_owner_all') THEN
    CREATE POLICY bps_skills_owner_all
      ON public.business_product_skills
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_teams' AND policyname = 'bps_teams_owner_all') THEN
    CREATE POLICY bps_teams_owner_all
      ON public.business_product_teams
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_growth_areas' AND policyname = 'bps_growth_owner_all') THEN
    CREATE POLICY bps_growth_owner_all
      ON public.business_product_growth_areas
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_permissions' AND policyname = 'bps_permissions_owner_all') THEN
    CREATE POLICY bps_permissions_owner_all
      ON public.business_product_permissions
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_signals' AND policyname = 'bps_signals_owner_all') THEN
    CREATE POLICY bps_signals_owner_all
      ON public.business_product_signals
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_roadmap' AND policyname = 'bps_roadmap_owner_all') THEN
    CREATE POLICY bps_roadmap_owner_all
      ON public.business_product_roadmap
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_impact' AND policyname = 'bps_impact_owner_all') THEN
    CREATE POLICY bps_impact_owner_all
      ON public.business_product_impact
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_access' AND policyname = 'bps_access_owner_all') THEN
    CREATE POLICY bps_access_owner_all
      ON public.business_product_access
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Public read: overview and product summary
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_products_services_overview' AND policyname = 'bps_overview_public_read') THEN
    CREATE POLICY bps_overview_public_read
      ON public.business_products_services_overview
      FOR SELECT
      TO anon, authenticated
      USING (is_public = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_products_services' AND policyname = 'bps_public_read') THEN
    CREATE POLICY bps_public_read
      ON public.business_products_services
      FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;

  -- Public read for media/roles/skills/teams/impact only when access is approved
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_media' AND policyname = 'bps_media_access_read') THEN
    CREATE POLICY bps_media_access_read
      ON public.business_product_media
      FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.business_product_access a
          WHERE a.product_id = business_product_media.product_id
          AND a.user_id = auth.uid()
          AND a.status IN ('approved', 'nda_signed')
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_roles' AND policyname = 'bps_roles_access_read') THEN
    CREATE POLICY bps_roles_access_read
      ON public.business_product_roles
      FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.business_product_access a
          WHERE a.product_id = business_product_roles.product_id
          AND a.user_id = auth.uid()
          AND a.status IN ('approved', 'nda_signed')
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_skills' AND policyname = 'bps_skills_access_read') THEN
    CREATE POLICY bps_skills_access_read
      ON public.business_product_skills
      FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.business_product_access a
          WHERE a.product_id = business_product_skills.product_id
          AND a.user_id = auth.uid()
          AND a.status IN ('approved', 'nda_signed')
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_teams' AND policyname = 'bps_teams_access_read') THEN
    CREATE POLICY bps_teams_access_read
      ON public.business_product_teams
      FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.business_product_access a
          WHERE a.product_id = business_product_teams.product_id
          AND a.user_id = auth.uid()
          AND a.status IN ('approved', 'nda_signed')
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_growth_areas' AND policyname = 'bps_growth_access_read') THEN
    CREATE POLICY bps_growth_access_read
      ON public.business_product_growth_areas
      FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.business_product_access a
          WHERE a.product_id = business_product_growth_areas.product_id
          AND a.user_id = auth.uid()
          AND a.status IN ('approved', 'nda_signed')
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_permissions' AND policyname = 'bps_permissions_access_read') THEN
    CREATE POLICY bps_permissions_access_read
      ON public.business_product_permissions
      FOR SELECT
      TO anon, authenticated
      USING (TRUE);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_signals' AND policyname = 'bps_signals_access_read') THEN
    CREATE POLICY bps_signals_access_read
      ON public.business_product_signals
      FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.business_product_access a
          WHERE a.product_id = business_product_signals.product_id
          AND a.user_id = auth.uid()
          AND a.status IN ('approved', 'nda_signed')
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_impact' AND policyname = 'bps_impact_access_read') THEN
    CREATE POLICY bps_impact_access_read
      ON public.business_product_impact
      FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.business_product_access a
          WHERE a.product_id = business_product_impact.product_id
          AND a.user_id = auth.uid()
          AND a.status IN ('approved', 'nda_signed')
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'business_product_roadmap' AND policyname = 'bps_roadmap_public_read') THEN
    CREATE POLICY bps_roadmap_public_read
      ON public.business_product_roadmap
      FOR SELECT
      TO anon, authenticated
      USING (is_public = true);
  END IF;
END $$;

