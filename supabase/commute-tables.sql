-- Commute Locations & Times Tables
-- Run this in Supabase SQL Editor

-- Table for storing commute destinations per project
CREATE TABLE IF NOT EXISTS commute_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,  -- e.g., "Work", "Gym", "School"
  address TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  icon VARCHAR(50),  -- optional icon identifier
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL
);

-- Table for storing calculated commute times
CREATE TABLE IF NOT EXISTS apartment_commutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  location_id UUID REFERENCES commute_locations(id) ON DELETE CASCADE,
  duration_driving INTEGER,  -- seconds
  duration_transit INTEGER,  -- seconds
  duration_walking INTEGER,  -- seconds
  duration_bicycling INTEGER,  -- seconds
  distance_meters INTEGER,
  calculated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(apartment_id, location_id)
);

-- Enable RLS
ALTER TABLE commute_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartment_commutes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for commute_locations
CREATE POLICY "Members can view commute locations"
  ON commute_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = commute_locations.project_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can create commute locations"
  ON commute_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = commute_locations.project_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can update commute locations"
  ON commute_locations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = commute_locations.project_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can delete commute locations"
  ON commute_locations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = commute_locations.project_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
    )
  );

-- RLS Policies for apartment_commutes
CREATE POLICY "Members can view apartment commutes"
  ON apartment_commutes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apartments a
      JOIN project_members pm ON pm.project_id = a.project_id
      WHERE a.id = apartment_commutes.apartment_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated can insert apartment commutes"
  ON apartment_commutes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update apartment commutes"
  ON apartment_commutes FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Editors can delete apartment commutes"
  ON apartment_commutes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apartments a
      JOIN project_members pm ON pm.project_id = a.project_id
      WHERE a.id = apartment_commutes.apartment_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
    )
  );

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_commute_locations_project ON commute_locations(project_id);
CREATE INDEX IF NOT EXISTS idx_apartment_commutes_apartment ON apartment_commutes(apartment_id);
CREATE INDEX IF NOT EXISTS idx_apartment_commutes_location ON apartment_commutes(location_id);
