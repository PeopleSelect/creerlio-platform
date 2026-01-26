-- ============================================
-- Business user invites (email-based)
-- Supports onboarding for users not yet registered.
-- Safe if role enums are missing (creates them).
-- ============================================

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

-- Ensure core tables exist (for out-of-order migration runs)
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

-- If locations existed earlier without business_id, add it now
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.locations
      ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.locations ADD COLUMN name TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'address'
  ) THEN
    ALTER TABLE public.locations ADD COLUMN address TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'city'
  ) THEN
    ALTER TABLE public.locations ADD COLUMN city TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'state'
  ) THEN
    ALTER TABLE public.locations ADD COLUMN state TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'country'
  ) THEN
    ALTER TABLE public.locations ADD COLUMN country TEXT;
  END IF;
END $$;

-- Ensure role tables exist when running out of order
CREATE TABLE IF NOT EXISTS public.user_business_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  role public.business_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_location_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  role public.location_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_business_role ON public.user_business_roles(user_id, business_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_location_role ON public.user_location_roles(user_id, location_id);

-- Ensure helper exists when running out of order
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_business_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE TABLE IF NOT EXISTS public.business_user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  business_role public.business_role,
  location_role public.location_role,
  invited_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns if table already existed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'business_user_invites' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.business_user_invites
      ADD COLUMN business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'business_user_invites' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE public.business_user_invites
      ADD COLUMN location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'business_user_invites' AND column_name = 'business_role'
  ) THEN
    ALTER TABLE public.business_user_invites
      ADD COLUMN business_role public.business_role;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'business_user_invites' AND column_name = 'location_role'
  ) THEN
    ALTER TABLE public.business_user_invites
      ADD COLUMN location_role public.location_role;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'business_user_invites' AND column_name = 'business_id'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_business_invite_email
      ON public.business_user_invites(email, business_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid));
  END IF;
END $$;

ALTER TABLE public.business_user_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_invites_read ON public.business_user_invites;
CREATE POLICY business_invites_read
  ON public.business_user_invites
  FOR SELECT
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_business_roles ubr
      WHERE ubr.user_id = auth.uid()
        AND ubr.business_id = business_user_invites.business_id
        AND ubr.role IN ('super_admin','business_admin')
    )
  );

DROP POLICY IF EXISTS business_invites_write ON public.business_user_invites;
CREATE POLICY business_invites_write
  ON public.business_user_invites
  FOR ALL
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_business_roles ubr
      WHERE ubr.user_id = auth.uid()
        AND ubr.business_id = business_user_invites.business_id
        AND ubr.role IN ('super_admin','business_admin')
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.user_business_roles ubr
      WHERE ubr.user_id = auth.uid()
        AND ubr.business_id = business_user_invites.business_id
        AND ubr.role IN ('super_admin','business_admin')
    )
  );
