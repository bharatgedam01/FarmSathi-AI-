-- ==============================================================================
-- FARMSAATHI AI — PRODUCTION POSTGRESQL SCHEMA & ROW LEVEL SECURITY (RLS)
-- ==============================================================================
-- Run this script in your Supabase Project's SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
--
-- This script safely enables RLS, creates indexes, triggers, foreign keys,
-- and supports both dedicated domain tables (profiles, farms, crops, activities)
-- and the unified public.farm_records table with strict user isolation.
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. FARMER PROFILES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  village TEXT,
  district TEXT,
  state TEXT DEFAULT 'Maharashtra',
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi', 'mr')),
  farm_area NUMERIC CHECK (farm_area IS NULL OR farm_area >= 0),
  area_unit TEXT NOT NULL DEFAULT 'acres' CHECK (area_unit IN ('acres', 'hectares', 'bigha', 'guntha')),
  soil_type TEXT,
  irrigation_method TEXT,
  main_crop TEXT,
  season TEXT,
  latitude NUMERIC(9, 6),
  longitude NUMERIC(9, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. FARMS TABLE (Multi-plot farm management)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  village TEXT,
  district TEXT,
  state TEXT DEFAULT 'Maharashtra',
  area NUMERIC CHECK (area IS NULL OR area >= 0),
  area_unit TEXT NOT NULL DEFAULT 'acres' CHECK (area_unit IN ('acres', 'hectares', 'bigha', 'guntha')),
  soil_type TEXT,
  irrigation_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. CROPS TABLE (Crop variety, field plot, sowing dates, and growth stages)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  crop_name TEXT NOT NULL,
  field_name TEXT,
  variety TEXT,
  sowing_date DATE,
  growth_stage TEXT DEFAULT 'Vegetative',
  area NUMERIC CHECK (area IS NULL OR area >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. FARM ACTIVITIES & CALENDAR REMINDERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.farm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
  activity_name TEXT NOT NULL,
  category TEXT DEFAULT 'General' CHECK (category IN ('General', 'Irrigation', 'Fertilizer', 'Spraying', 'Weeding', 'Sowing', 'Harvesting')),
  activity_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Postponed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. CROP IMAGE ANALYSES & HEALTH TRIAGE TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.crop_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
  original_file_name TEXT,
  image_path TEXT,
  detected_crop TEXT,
  possible_issue TEXT,
  confidence TEXT,
  report TEXT NOT NULL,
  model_name TEXT DEFAULT 'gpt-4o-mini',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 7. CHAT CONVERSATIONS & MESSAGES TABLES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Farm Consultation',
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'mr')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL CHECK (length(content) <= 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. UNIFIED FARM RECORDS TABLE (public.farm_records)
-- Suitable for flexible polymorphic record storage across all farm operations
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.farm_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('profile', 'farm', 'crop', 'activity', 'analysis', 'soil_test', 'custom')),
  title TEXT,
  record_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 9. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON public.farms(user_id);
CREATE INDEX IF NOT EXISTS idx_crops_user_id ON public.crops(user_id);
CREATE INDEX IF NOT EXISTS idx_crops_farm_id ON public.crops(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_activities_user_id ON public.farm_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_farm_activities_date ON public.farm_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_crop_analyses_user_id ON public.crop_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_farm_records_user_id ON public.farm_records(user_id);
CREATE INDEX IF NOT EXISTS idx_farm_records_type ON public.farm_records(record_type);
CREATE INDEX IF NOT EXISTS idx_farm_records_data_gin ON public.farm_records USING gin (record_data);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Authenticated users can ONLY view, insert, update, delete
-- their own records.
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_records ENABLE ROW LEVEL SECURITY;

-- Profiles: user id matches auth.uid()
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Farms
CREATE POLICY "Users manage own farms" ON public.farms FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Crops
CREATE POLICY "Users manage own crops" ON public.crops FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Farm Activities
CREATE POLICY "Users manage own activities" ON public.farm_activities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Crop Analyses
CREATE POLICY "Users manage own analyses" ON public.crop_analyses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Chat Conversations
CREATE POLICY "Users manage own conversations" ON public.chat_conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Chat Messages
CREATE POLICY "Users manage own chat messages" ON public.chat_messages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Unified Farm Records
CREATE POLICY "Users manage own farm records" ON public.farm_records FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- 11. AUTOMATIC PROFILE CREATION TRIGGER
-- When a user registers through Supabase Auth, a profile row is created automatically
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, preferred_language, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'preferred_language', 'en'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 12. STORAGE SETUP (OPTIONAL / PRIVATE BUCKET FOR CROP PHOTOS)
-- In Supabase Dashboard > Storage:
-- 1. Create a bucket named: crop-photos
-- 2. Mark as private
-- 3. Create RLS storage policy:
--    Allow authenticated users access to folder matching their user id:
--    (storage.foldername(name))[1] = auth.uid()::text
-- ==============================================================================
