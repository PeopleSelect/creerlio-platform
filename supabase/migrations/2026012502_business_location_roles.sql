-- ============================================
-- Business / Location / Role model (idempotent)
-- Core principle: users are assigned to businesses/locations with roles.
-- No breaking changes: legacy business_profiles remain intact.
-- ============================================

-- 1) Role enums (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_role') THEN
    CREATE TYPE public.business_role AS ENUM (
      'super_admin',
      'business_admin',
      'location_admin',
      'manager',
      'viewer'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'location_role') THEN
    CREATE TYPE public.location_role AS ENUM (
      'location_admin',
      'manager',
      'viewer'
    );
  END IF;
END $$;

-- 2) Core tables
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- If legacy locations.owner_id exists and is NOT NULL, auto-populate from auth.uid()
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'owner_id'
  ) THEN
    CREATE OR REPLACE FUNCTION public.set_locations_owner_id()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      IF NEW.owner_id IS NULL THEN
        NEW.owner_id := auth.uid();
      END IF;
      RETURN NEW;
    END;
    $fn$;

    DROP TRIGGER IF EXISTS trg_set_locations_owner_id ON public.locations;
    CREATE TRIGGER trg_set_locations_owner_id
      BEFORE INSERT ON public.locations
      FOR EACH ROW
      EXECUTE FUNCTION public.set_locations_owner_id();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_business_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_id UUID NOT NULL,
  role public.business_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_location_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  location_id UUID NOT NULL,
  role public.location_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) FK constraints (add only if referenced tables exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_user_business_roles_user_id'
    ) THEN
      ALTER TABLE public.user_business_roles
        ADD CONSTRAINT fk_user_business_roles_user_id
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_user_location_roles_user_id'
    ) THEN
      ALTER TABLE public.user_location_roles
        ADD CONSTRAINT fk_user_location_roles_user_id
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_user_business_roles_business_id'
  ) THEN
    ALTER TABLE public.user_business_roles
      ADD CONSTRAINT fk_user_business_roles_business_id
      FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_user_location_roles_location_id'
  ) THEN
    ALTER TABLE public.user_location_roles
      ADD CONSTRAINT fk_user_location_roles_location_id
      FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4) Indexes / uniqueness
CREATE INDEX IF NOT EXISTS idx_locations_business_id ON public.locations(business_id);
CREATE INDEX IF NOT EXISTS idx_ubr_user_id ON public.user_business_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_ubr_business_id ON public.user_business_roles(business_id);
CREATE INDEX IF NOT EXISTS idx_ulr_user_id ON public.user_location_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_ulr_location_id ON public.user_location_roles(location_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_business_role ON public.user_business_roles(user_id, business_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_location_role ON public.user_location_roles(user_id, location_id);

-- 5) Link legacy business_profiles to businesses/locations (non-breaking)
DO $$
DECLARE has_owner_id boolean := false;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'business_profiles'
  ) THEN
    -- Add business_id/location_id columns if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'business_profiles' AND column_name = 'business_id'
    ) THEN
      ALTER TABLE public.business_profiles ADD COLUMN business_id UUID;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'business_profiles' AND column_name = 'location_id'
    ) THEN
      ALTER TABLE public.business_profiles ADD COLUMN location_id UUID;
    END IF;

    -- Create businesses from existing business_profiles (stable id = business_profiles.id)
    INSERT INTO public.businesses (id, name, industry, created_at)
    SELECT bp.id,
           COALESCE(NULLIF(bp.business_name, ''), NULLIF(bp.name, ''), 'Business'),
           bp.industry,
           bp.created_at
    FROM public.business_profiles bp
    ON CONFLICT (id) DO NOTHING;

    -- Create a default location per business if none exists
    -- Handle legacy schemas where locations.owner_id is NOT NULL
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'locations'
        AND column_name = 'owner_id'
    ) INTO has_owner_id;

    IF has_owner_id THEN
      EXECUTE $ins$
        INSERT INTO public.locations (business_id, name, city, state, country, created_at, owner_id)
        SELECT bp.id,
               'Primary Location',
               bp.city,
               bp.state,
               bp.country,
               bp.created_at,
               bp.user_id
        FROM public.business_profiles bp
        WHERE NOT EXISTS (
          SELECT 1 FROM public.locations l WHERE l.business_id = bp.id
        )
      $ins$;
    ELSE
      EXECUTE $ins$
        INSERT INTO public.locations (business_id, name, city, state, country, created_at)
        SELECT bp.id,
               'Primary Location',
               bp.city,
               bp.state,
               bp.country,
               bp.created_at
        FROM public.business_profiles bp
        WHERE NOT EXISTS (
          SELECT 1 FROM public.locations l WHERE l.business_id = bp.id
        )
      $ins$;
    END IF;

    -- Backfill business_id + location_id on business_profiles
    UPDATE public.business_profiles bp
    SET business_id = bp.id
    WHERE bp.business_id IS NULL;

    UPDATE public.business_profiles bp
    SET location_id = l.id
    FROM public.locations l
    WHERE bp.location_id IS NULL AND l.business_id = bp.id;

    -- Add FK constraints after backfill
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_business_profiles_business_id'
    ) THEN
      ALTER TABLE public.business_profiles
        ADD CONSTRAINT fk_business_profiles_business_id
        FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_business_profiles_location_id'
    ) THEN
      ALTER TABLE public.business_profiles
        ADD CONSTRAINT fk_business_profiles_location_id
        FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 6) Backfill user roles from legacy ownership (business_profiles.user_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'business_profiles' AND column_name = 'user_id'
  ) THEN
    INSERT INTO public.user_business_roles (user_id, business_id, role)
    SELECT bp.user_id, bp.id, 'business_admin'::public.business_role
    FROM public.business_profiles bp
    WHERE bp.user_id IS NOT NULL
    ON CONFLICT (user_id, business_id) DO NOTHING;

    INSERT INTO public.user_location_roles (user_id, location_id, role)
    SELECT bp.user_id, l.id, 'location_admin'::public.location_role
    FROM public.business_profiles bp
    JOIN public.locations l ON l.business_id = bp.id
    WHERE bp.user_id IS NOT NULL
    ON CONFLICT (user_id, location_id) DO NOTHING;
  END IF;
END $$;

-- 7) Add location_id / business_id to jobs & applications (non-breaking)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'jobs'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'location_id'
    ) THEN
      ALTER TABLE public.jobs ADD COLUMN location_id UUID;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'business_id'
    ) THEN
      ALTER TABLE public.jobs ADD COLUMN business_id UUID;
    END IF;

    -- Backfill business_id from business_profiles (safe text match)
    UPDATE public.jobs j
    SET business_id = bp.id
    FROM public.business_profiles bp
    WHERE j.business_id IS NULL
      AND j.business_profile_id::text = bp.id::text;

    -- Backfill location_id using the earliest location per business
    UPDATE public.jobs j
    SET location_id = l.id
    FROM public.locations l
    WHERE j.location_id IS NULL
      AND j.business_id = l.business_id
      AND l.id = (
        SELECT l2.id FROM public.locations l2
        WHERE l2.business_id = l.business_id
        ORDER BY l2.created_at ASC
        LIMIT 1
      );

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_jobs_location_id'
    ) THEN
      ALTER TABLE public.jobs
        ADD CONSTRAINT fk_jobs_location_id
        FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_jobs_business_id'
    ) THEN
      ALTER TABLE public.jobs
        ADD CONSTRAINT fk_jobs_business_id
        FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'applications'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'location_id'
    ) THEN
      ALTER TABLE public.applications ADD COLUMN location_id UUID;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'business_id'
    ) THEN
      ALTER TABLE public.applications ADD COLUMN business_id UUID;
    END IF;

    UPDATE public.applications a
    SET location_id = j.location_id,
        business_id = j.business_id
    FROM public.jobs j
    WHERE a.job_id = j.id
      AND (a.location_id IS NULL OR a.business_id IS NULL);

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_applications_location_id'
    ) THEN
      ALTER TABLE public.applications
        ADD CONSTRAINT fk_applications_location_id
        FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_applications_business_id'
    ) THEN
      ALTER TABLE public.applications
        ADD CONSTRAINT fk_applications_business_id
        FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 8) RLS policies for new tables (strict role-based access)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_business_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_location_roles ENABLE ROW LEVEL SECURITY;

-- Helper to identify super_admin (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_business_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Helper: check if current user has a business role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_business_role(
  target_business_id UUID,
  roles public.business_role[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_business_roles ubr
    WHERE ubr.user_id = auth.uid()
      AND ubr.business_id = target_business_id
      AND ubr.role = ANY (roles)
  );
$$;

-- Helper: check if any roles exist for a business (used for bootstrap)
CREATE OR REPLACE FUNCTION public.business_has_any_role(
  target_business_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_business_roles ubr
    WHERE ubr.business_id = target_business_id
  );
$$;

-- Helper: check if current user has a location role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_location_role(
  target_location_id UUID,
  roles public.location_role[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_location_roles ulr
    WHERE ulr.user_id = auth.uid()
      AND ulr.location_id = target_location_id
      AND ulr.role = ANY (roles)
  );
$$;

-- Helper: check if current user has a business role for a location (security definer)
CREATE OR REPLACE FUNCTION public.has_business_role_for_location(
  target_location_id UUID,
  roles public.business_role[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_business_roles ubr
    JOIN public.locations l ON l.id = target_location_id
    WHERE ubr.user_id = auth.uid()
      AND ubr.business_id = l.business_id
      AND ubr.role = ANY (roles)
  );
$$;

-- Businesses
DROP POLICY IF EXISTS businesses_read ON public.businesses;
CREATE POLICY businesses_read
  ON public.businesses
  FOR SELECT
  USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.user_business_roles ubr
      WHERE ubr.user_id = auth.uid() AND ubr.business_id = businesses.id
    )
  );

DROP POLICY IF EXISTS businesses_write ON public.businesses;
CREATE POLICY businesses_write
  ON public.businesses
  FOR ALL
  USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.user_business_roles ubr
      WHERE ubr.user_id = auth.uid()
        AND ubr.business_id = businesses.id
        AND ubr.role IN ('super_admin','business_admin')
    )
  )
  WITH CHECK (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.user_business_roles ubr
      WHERE ubr.user_id = auth.uid()
        AND ubr.business_id = businesses.id
        AND ubr.role IN ('super_admin','business_admin')
    )
  );

-- Allow authenticated users to create a new business (bootstrap flow)
DROP POLICY IF EXISTS businesses_insert_authenticated ON public.businesses;
CREATE POLICY businesses_insert_authenticated
  ON public.businesses
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() IS NOT NULL);

-- Locations
DROP POLICY IF EXISTS locations_read ON public.locations;
CREATE POLICY locations_read
  ON public.locations
  FOR SELECT
  USING (
    public.is_super_admin()
    OR public.has_business_role(
      locations.business_id,
      ARRAY['super_admin','business_admin','location_admin','manager','viewer']::public.business_role[]
    )
    OR public.has_location_role(
      locations.id,
      ARRAY['location_admin','manager','viewer']::public.location_role[]
    )
  );

DROP POLICY IF EXISTS locations_write ON public.locations;
CREATE POLICY locations_write
  ON public.locations
  FOR ALL
  USING (
    public.is_super_admin()
    OR public.has_business_role(
      locations.business_id,
      ARRAY['super_admin','business_admin']::public.business_role[]
    )
    OR public.has_location_role(
      locations.id,
      ARRAY['location_admin']::public.location_role[]
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.has_business_role(
      locations.business_id,
      ARRAY['super_admin','business_admin']::public.business_role[]
    )
    OR public.has_location_role(
      locations.id,
      ARRAY['location_admin']::public.location_role[]
    )
  );

-- User business roles
DROP POLICY IF EXISTS user_business_roles_read ON public.user_business_roles;
CREATE POLICY user_business_roles_read
  ON public.user_business_roles
  FOR SELECT
  USING (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR public.has_business_role(
      user_business_roles.business_id,
      ARRAY['super_admin','business_admin']::public.business_role[]
    )
  );

DROP POLICY IF EXISTS user_business_roles_write ON public.user_business_roles;
CREATE POLICY user_business_roles_write
  ON public.user_business_roles
  FOR ALL
  USING (
    public.is_super_admin()
    OR public.has_business_role(
      user_business_roles.business_id,
      ARRAY['super_admin','business_admin']::public.business_role[]
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.has_business_role(
      user_business_roles.business_id,
      ARRAY['super_admin','business_admin']::public.business_role[]
    )
  );

-- Bootstrap: allow a user to assign themselves as business_admin on a new business
DROP POLICY IF EXISTS user_business_roles_bootstrap ON public.user_business_roles;
CREATE POLICY user_business_roles_bootstrap
  ON public.user_business_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role IN ('business_admin','super_admin')
    AND NOT public.business_has_any_role(user_business_roles.business_id)
  );

-- User location roles
DROP POLICY IF EXISTS user_location_roles_read ON public.user_location_roles;
CREATE POLICY user_location_roles_read
  ON public.user_location_roles
  FOR SELECT
  USING (
    public.is_super_admin()
    OR user_id = auth.uid()
    OR public.has_business_role_for_location(
      user_location_roles.location_id,
      ARRAY['super_admin','business_admin']::public.business_role[]
    )
  );

DROP POLICY IF EXISTS user_location_roles_write ON public.user_location_roles;
CREATE POLICY user_location_roles_write
  ON public.user_location_roles
  FOR ALL
  USING (
    public.is_super_admin()
    OR public.has_business_role_for_location(
      user_location_roles.location_id,
      ARRAY['super_admin','business_admin']::public.business_role[]
    )
    OR public.has_location_role(
      user_location_roles.location_id,
      ARRAY['location_admin']::public.location_role[]
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.has_business_role_for_location(
      user_location_roles.location_id,
      ARRAY['super_admin','business_admin']::public.business_role[]
    )
    OR public.has_location_role(
      user_location_roles.location_id,
      ARRAY['location_admin']::public.location_role[]
    )
  );

-- 9) Jobs/applications policies (role-based; public read for published jobs remains)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jobs_public_read ON public.jobs;
CREATE POLICY jobs_public_read
  ON public.jobs
  FOR SELECT
  USING (
    status ILIKE 'published%'
    AND (is_active = true OR is_active IS NULL)
  );

DROP POLICY IF EXISTS jobs_role_manage ON public.jobs;
CREATE POLICY jobs_role_manage
  ON public.jobs
  FOR ALL
  USING (
    public.is_super_admin()
    OR public.has_business_role(
      jobs.business_id,
      ARRAY['super_admin','business_admin','location_admin','manager']::public.business_role[]
    )
    OR public.has_location_role(
      jobs.location_id,
      ARRAY['location_admin','manager']::public.location_role[]
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR public.has_business_role(
      jobs.business_id,
      ARRAY['super_admin','business_admin','location_admin','manager']::public.business_role[]
    )
    OR public.has_location_role(
      jobs.location_id,
      ARRAY['location_admin','manager']::public.location_role[]
    )
  );

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS applications_role_read ON public.applications;
CREATE POLICY applications_role_read
  ON public.applications
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_super_admin()
    OR public.has_business_role(
      applications.business_id,
      ARRAY['super_admin','business_admin','location_admin','manager','viewer']::public.business_role[]
    )
    OR public.has_location_role(
      applications.location_id,
      ARRAY['location_admin','manager','viewer']::public.location_role[]
    )
  );

DROP POLICY IF EXISTS applications_talent_write ON public.applications;
CREATE POLICY applications_talent_write
  ON public.applications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 10) Ensure applications inherit location/business from job
CREATE OR REPLACE FUNCTION public.set_application_location_ids()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_id IS NULL OR NEW.business_id IS NULL THEN
    SELECT j.location_id, j.business_id
    INTO NEW.location_id, NEW.business_id
    FROM public.jobs j
    WHERE j.id = NEW.job_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_application_location_ids ON public.applications;
CREATE TRIGGER trg_set_application_location_ids
  BEFORE INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_application_location_ids();
