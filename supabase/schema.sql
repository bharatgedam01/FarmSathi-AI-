-- ==============================================================================
-- FARMSAATHI AI — PRODUCTION POSTGRESQL SCHEMA & HARDENED TRANSACTIONAL RPC
-- ==============================================================================
-- Compatible with FarmSaathi AI Custom Authentication (Alphanumeric TEXT IDs + HMAC sessions)
-- Idempotent: Can be safely executed multiple times without errors or duplicates.
-- Security: Revokes client/public access, enforces RLS, and sets search_path = ''
-- on SECURITY DEFINER RPC with fully qualified catalog functions.
-- ==============================================================================

-- 1. APP USERS TABLE (Preserves custom IDs: 'user_demo', 'usr_...')
CREATE TABLE IF NOT EXISTS public.app_users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. FARMER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id TEXT PRIMARY KEY REFERENCES public.app_users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  village TEXT,
  district TEXT,
  state TEXT DEFAULT 'Maharashtra',
  preferred_language TEXT NOT NULL DEFAULT 'en',
  farm_area TEXT,
  area_unit TEXT NOT NULL DEFAULT 'acres',
  soil_type TEXT,
  irrigation_method TEXT,
  main_crop TEXT,
  season TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CROPS TABLE
CREATE TABLE IF NOT EXISTS public.crops (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  crop_name TEXT NOT NULL,
  field_name TEXT,
  variety TEXT,
  sowing_date TEXT,
  growth_stage TEXT DEFAULT 'Vegetative',
  area TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. FARM ACTIVITIES & REMINDERS TABLE
CREATE TABLE IF NOT EXISTS public.farm_activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  activity_date TEXT NOT NULL,
  farm TEXT,
  crop TEXT,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CROP HEALTH ANALYSES TABLE
CREATE TABLE IF NOT EXISTS public.crop_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  crop TEXT NOT NULL,
  file_name TEXT,
  image_url TEXT,
  report TEXT NOT NULL,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  confidence TEXT,
  model_name TEXT,
  detected_crop TEXT,
  possible_issue TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_app_users_email ON public.app_users(email);
CREATE INDEX IF NOT EXISTS idx_crops_user_id ON public.crops(user_id);
CREATE INDEX IF NOT EXISTS idx_farm_activities_user_id ON public.farm_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_farm_activities_date ON public.farm_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_crop_analyses_user_id ON public.crop_analyses(user_id);

-- ==============================================================================
-- 7. SECURITY: REVOKE PRIVILEGES & ENFORCE RLS ON ALL TABLES
-- ==============================================================================
REVOKE ALL ON TABLE public.app_users, public.profiles, public.crops, public.farm_activities, public.crop_analyses FROM PUBLIC, anon, authenticated;

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops FORCE ROW LEVEL SECURITY;
ALTER TABLE public.farm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_activities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crop_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_analyses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny public access to app_users" ON public.app_users;
CREATE POLICY "Deny public access to app_users" ON public.app_users FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "Deny public access to profiles" ON public.profiles;
CREATE POLICY "Deny public access to profiles" ON public.profiles FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "Deny public access to crops" ON public.crops;
CREATE POLICY "Deny public access to crops" ON public.crops FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "Deny public access to farm_activities" ON public.farm_activities;
CREATE POLICY "Deny public access to farm_activities" ON public.farm_activities FOR ALL TO anon, authenticated USING (false);

DROP POLICY IF EXISTS "Deny public access to crop_analyses" ON public.crop_analyses;
CREATE POLICY "Deny public access to crop_analyses" ON public.crop_analyses FOR ALL TO anon, authenticated USING (false);

-- ==============================================================================
-- 8. HARDENED ATOMIC MIGRATION RPC (SECURITY DEFINER with empty search_path)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.migrate_farm_payload(p_data pg_catalog.jsonb)
RETURNS pg_catalog.jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_users_count pg_catalog.int4 := 0;
  v_profiles_count pg_catalog.int4 := 0;
  v_crops_count pg_catalog.int4 := 0;
  v_activities_count pg_catalog.int4 := 0;
  v_analyses_count pg_catalog.int4 := 0;
BEGIN
  -- 1. Ingest Users
  INSERT INTO public.app_users (id, full_name, email, phone, password_hash, salt, created_at, updated_at)
  SELECT
    (u->>'id'),
    (u->>'full_name'),
    (u->>'email'),
    (u->>'phone'),
    (u->>'password_hash'),
    (u->>'salt'),
    (u->>'created_at')::pg_catalog.timestamptz,
    (u->>'updated_at')::pg_catalog.timestamptz
  FROM pg_catalog.jsonb_array_elements(p_data->'users') AS u
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_users_count = ROW_COUNT;

  -- 2. Ingest Profiles
  INSERT INTO public.profiles (user_id, full_name, phone, village, district, state, preferred_language, farm_area, area_unit, soil_type, irrigation_method, main_crop, season, latitude, longitude, created_at, updated_at)
  SELECT
    (p->>'user_id'),
    (p->>'full_name'),
    (p->>'phone'),
    (p->>'village'),
    (p->>'district'),
    (p->>'state'),
    (p->>'preferred_language'),
    (p->>'farm_area'),
    (p->>'area_unit'),
    (p->>'soil_type'),
    (p->>'irrigation_method'),
    (p->>'main_crop'),
    (p->>'season'),
    (p->>'latitude')::pg_catalog.numeric,
    (p->>'longitude')::pg_catalog.numeric,
    (p->>'created_at')::pg_catalog.timestamptz,
    (p->>'updated_at')::pg_catalog.timestamptz
  FROM pg_catalog.jsonb_array_elements(p_data->'profiles') AS p
  ON CONFLICT (user_id) DO NOTHING;
  GET DIAGNOSTICS v_profiles_count = ROW_COUNT;

  -- 3. Ingest Crops
  INSERT INTO public.crops (id, user_id, crop_name, field_name, variety, sowing_date, growth_stage, area, notes, created_at, updated_at)
  SELECT
    (c->>'id'),
    (c->>'user_id'),
    (c->>'crop_name'),
    (c->>'field_name'),
    (c->>'variety'),
    (c->>'sowing_date'),
    (c->>'growth_stage'),
    (c->>'area'),
    (c->>'notes'),
    (c->>'created_at')::pg_catalog.timestamptz,
    (c->>'updated_at')::pg_catalog.timestamptz
  FROM pg_catalog.jsonb_array_elements(p_data->'crops') AS c
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_crops_count = ROW_COUNT;

  -- 4. Ingest Activities
  INSERT INTO public.farm_activities (id, user_id, name, category, activity_date, farm, crop, notes, completed, created_at, updated_at)
  SELECT
    (a->>'id'),
    (a->>'user_id'),
    (a->>'name'),
    (a->>'category'),
    (a->>'activity_date'),
    (a->>'farm'),
    (a->>'crop'),
    (a->>'notes'),
    (a->>'completed')::pg_catalog.bool,
    (a->>'created_at')::pg_catalog.timestamptz,
    (a->>'updated_at')::pg_catalog.timestamptz
  FROM pg_catalog.jsonb_array_elements(p_data->'activities') AS a
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_activities_count = ROW_COUNT;

  -- 5. Ingest Analyses
  INSERT INTO public.crop_analyses (id, user_id, crop, file_name, image_url, report, is_demo, confidence, model_name, detected_crop, possible_issue, created_at)
  SELECT
    (an->>'id'),
    (an->>'user_id'),
    (an->>'crop'),
    (an->>'file_name'),
    (an->>'image_url'),
    (an->>'report'),
    (an->>'is_demo')::pg_catalog.bool,
    (an->>'confidence'),
    (an->>'model_name'),
    (an->>'detected_crop'),
    (an->>'possible_issue'),
    (an->>'created_at')::pg_catalog.timestamptz
  FROM pg_catalog.jsonb_array_elements(p_data->'analyses') AS an
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_analyses_count = ROW_COUNT;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'inserted_users', v_users_count,
    'inserted_profiles', v_profiles_count,
    'inserted_crops', v_crops_count,
    'inserted_activities', v_activities_count,
    'inserted_analyses', v_analyses_count
  );
END;
$$;

-- Secure migration RPC: Exclusively for server-side service_role
REVOKE EXECUTE ON FUNCTION public.migrate_farm_payload(pg_catalog.jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.migrate_farm_payload(pg_catalog.jsonb) TO service_role;
