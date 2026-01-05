-- Hospital EMR Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "displayName" TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'DOCTOR', 'NURSE', 'STAFF')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_name ON profiles ("displayName");

-- ============================================
-- PATIENTS TABLE
-- ============================================
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "fullName" TEXT NOT NULL,
  "birthDate" DATE,
  sex TEXT CHECK (sex IN ('M', 'F', 'U')),
  mrn TEXT UNIQUE,
  phone TEXT,
  "createdBy" UUID REFERENCES profiles(id),
  "updatedBy" UUID REFERENCES profiles(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ
);

-- Index for searching patients
CREATE INDEX idx_patients_fullname ON patients ("fullName");
CREATE INDEX idx_patients_mrn ON patients (mrn) WHERE mrn IS NOT NULL;
CREATE INDEX idx_patients_deleted ON patients ("deletedAt");

-- ============================================
-- PATIENT DETAILS TABLE
-- ============================================
CREATE TABLE patient_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "patientId" UUID NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  weight NUMERIC(5,2), -- in kg
  pmh TEXT,
  psh TEXT,
  "currentMeds" TEXT,
  allergies TEXT,
  "familyHx" TEXT,
  "socialHx" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ
);

CREATE INDEX idx_patient_details_patient ON patient_details ("patientId");

-- ============================================
-- ENCOUNTERS TABLE
-- ============================================
CREATE TABLE encounters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "patientId" UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISCHARGED', 'DECEASED')),
  "startAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "endAt" TIMESTAMPTZ,
  "currentLocation" TEXT,
  "primaryDx" TEXT,
  "problemListText" TEXT,
  cc TEXT,
  hpi TEXT,
  ros TEXT,
  "physicalExam" TEXT,
  investigations TEXT,
  summary TEXT,
  "dischargeNote" TEXT,
  "dischargeAt" TIMESTAMPTZ,
  "createdBy" UUID REFERENCES profiles(id),
  "updatedBy" UUID REFERENCES profiles(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ
);

CREATE INDEX idx_encounters_patient ON encounters ("patientId");
CREATE INDEX idx_encounters_status ON encounters (status);
CREATE INDEX idx_encounters_deleted ON encounters ("deletedAt");

-- ============================================
-- ENCOUNTER ACTIONS (TIMELINE) TABLE
-- ============================================
CREATE TABLE encounter_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "encounterId" UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  text TEXT NOT NULL,
  "eventAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdBy" UUID REFERENCES profiles(id),
  "updatedBy" UUID REFERENCES profiles(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ
);

CREATE INDEX idx_encounter_actions_encounter ON encounter_actions ("encounterId");
CREATE INDEX idx_encounter_actions_type ON encounter_actions (type);
CREATE INDEX idx_encounter_actions_event ON encounter_actions ("eventAt");
CREATE INDEX idx_encounter_actions_deleted ON encounter_actions ("deletedAt");

-- ============================================
-- ENCOUNTER MEDICATIONS TABLE
-- ============================================
CREATE TABLE encounter_medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "encounterId" UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dose TEXT,
  route TEXT,
  frequency TEXT,
  indication TEXT,
  "startAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "stopAt" TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'STOPPED')),
  notes TEXT,
  "createdBy" UUID REFERENCES profiles(id),
  "updatedBy" UUID REFERENCES profiles(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ
);

CREATE INDEX idx_encounter_medications_encounter ON encounter_medications ("encounterId");
CREATE INDEX idx_encounter_medications_status ON encounter_medications (status);
CREATE INDEX idx_encounter_medications_deleted ON encounter_medications ("deletedAt");

-- ============================================
-- ENCOUNTER FILES TABLE (Photos/Attachments)
-- ============================================
CREATE TABLE encounter_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "encounterId" UUID NOT NULL REFERENCES encounters(id) ON DELETE CASCADE,
  "actionId" UUID REFERENCES encounter_actions(id) ON DELETE SET NULL,
  "fileName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSize" INTEGER,
  caption TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt" TIMESTAMPTZ
);

CREATE INDEX idx_encounter_files_encounter ON encounter_files ("encounterId");
CREATE INDEX idx_encounter_files_action ON encounter_files ("actionId");
CREATE INDEX idx_encounter_files_deleted ON encounter_files ("deletedAt");

-- ============================================
-- UPDATED AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_details_updated_at
  BEFORE UPDATE ON patient_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_encounters_updated_at
  BEFORE UPDATE ON encounters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_encounter_actions_updated_at
  BEFORE UPDATE ON encounter_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_encounter_medications_updated_at
  BEFORE UPDATE ON encounter_medications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_encounter_files_updated_at
  BEFORE UPDATE ON encounter_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PROFILES TRIGGER (Auto-create profile on signup)
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounter_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounter_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounter_files ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users
CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Authenticated users can do everything on patients"
  ON patients FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on patient_details"
  ON patient_details FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on encounters"
  ON encounters FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on encounter_actions"
  ON encounter_actions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on encounter_medications"
  ON encounter_medications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can do everything on encounter_files"
  ON encounter_files FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- STORAGE BUCKET FOR FILE UPLOADS
-- ============================================
-- Run this separately in Supabase Dashboard > Storage
-- Create a bucket named 'encounter-files' with public access

-- Or use SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('encounter-files', 'encounter-files', true);
