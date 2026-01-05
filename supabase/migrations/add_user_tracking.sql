-- Migration: Add User Tracking (createdBy, updatedBy)
-- Run this in your Supabase SQL Editor to add user tracking to existing database

-- ============================================
-- 1. CREATE PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "displayName" TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'DOCTOR', 'NURSE', 'STAFF')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles ("displayName");

-- ============================================
-- 2. ADD COLUMNS TO EXISTING TABLES
-- ============================================

-- Add to patients
ALTER TABLE patients ADD COLUMN IF NOT EXISTS "createdBy" UUID REFERENCES profiles(id);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS "updatedBy" UUID REFERENCES profiles(id);

-- Add to encounters
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS "createdBy" UUID REFERENCES profiles(id);
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS "updatedBy" UUID REFERENCES profiles(id);

-- Add to encounter_actions
ALTER TABLE encounter_actions ADD COLUMN IF NOT EXISTS "createdBy" UUID REFERENCES profiles(id);
ALTER TABLE encounter_actions ADD COLUMN IF NOT EXISTS "updatedBy" UUID REFERENCES profiles(id);

-- Add to encounter_medications
ALTER TABLE encounter_medications ADD COLUMN IF NOT EXISTS "createdBy" UUID REFERENCES profiles(id);
ALTER TABLE encounter_medications ADD COLUMN IF NOT EXISTS "updatedBy" UUID REFERENCES profiles(id);

-- ============================================
-- 3. CREATE TRIGGER FOR AUTO-CREATING PROFILES
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, "displayName")
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'displayName', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists (to avoid errors on re-run)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. ROW LEVEL SECURITY FOR PROFILES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 5. CREATE PROFILES FOR EXISTING USERS
-- ============================================
-- This inserts profiles for users who already exist
INSERT INTO profiles (id, email, "displayName")
SELECT 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'displayName', split_part(email, '@', 1))
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DONE!
-- ============================================
-- After running this migration:
-- 1. Existing users will have profiles created
-- 2. New signups will automatically get profiles
-- 3. All tables now track createdBy/updatedBy

