-- ============================================
-- RLS Policies for Haus-Note
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartment_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartment_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartment_brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP ALL EXISTING POLICIES (clean slate)
-- ============================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ============================================
-- Helper function: Check if user is project member
-- ============================================
CREATE OR REPLACE FUNCTION is_project_member(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_uuid
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if user is project owner or editor
CREATE OR REPLACE FUNCTION can_edit_project(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_uuid
    AND user_id = auth.uid()
    AND role IN ('owner', 'editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Check if user is project owner
CREATE OR REPLACE FUNCTION is_project_owner(project_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = project_uuid
    AND user_id = auth.uid()
    AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- USER_PROFILES policies
-- ============================================
-- Users can view any profile (for displaying names in comments, etc.)
CREATE POLICY "Profiles are viewable by authenticated users"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================
-- PROJECTS policies
-- ============================================
-- Users can view projects they are members of
CREATE POLICY "Users can view their projects"
  ON projects FOR SELECT
  TO authenticated
  USING (is_project_member(id));

-- Any authenticated user can create a project
CREATE POLICY "Authenticated users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Only owners can update projects
CREATE POLICY "Project owners can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (is_project_owner(id))
  WITH CHECK (is_project_owner(id));

-- Only owners can delete projects
CREATE POLICY "Project owners can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (is_project_owner(id));

-- ============================================
-- PROJECT_MEMBERS policies
-- ============================================
-- Members can view other members of their projects
CREATE POLICY "Members can view project members"
  ON project_members FOR SELECT
  TO authenticated
  USING (is_project_member(project_id));

-- Project creators automatically become owners (handled by trigger)
-- Owners can add new members
CREATE POLICY "Owners can add members"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    is_project_owner(project_id)
    OR (user_id = auth.uid() AND role = 'owner') -- Allow self-insert as owner when creating project
  );

-- Only owners can update member roles
CREATE POLICY "Owners can update member roles"
  ON project_members FOR UPDATE
  TO authenticated
  USING (is_project_owner(project_id))
  WITH CHECK (is_project_owner(project_id));

-- Owners can remove members, members can remove themselves
CREATE POLICY "Owners can remove members or self-remove"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    is_project_owner(project_id)
    OR user_id = auth.uid()
  );

-- ============================================
-- PROJECT_INVITATIONS policies
-- ============================================
-- Owners and editors can view invitations for their projects
CREATE POLICY "Editors can view project invitations"
  ON project_invitations FOR SELECT
  TO authenticated
  USING (can_edit_project(project_id));

-- Owners and editors can create invitations
CREATE POLICY "Editors can create invitations"
  ON project_invitations FOR INSERT
  TO authenticated
  WITH CHECK (can_edit_project(project_id));

-- Anyone can update invitation (to mark as accepted) if they have the token
-- This is handled at application level with the token validation
CREATE POLICY "Invitations can be updated"
  ON project_invitations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Owners can delete invitations
CREATE POLICY "Owners can delete invitations"
  ON project_invitations FOR DELETE
  TO authenticated
  USING (is_project_owner(project_id));

-- ============================================
-- APARTMENTS policies
-- ============================================
-- Members can view apartments in their projects
CREATE POLICY "Members can view project apartments"
  ON apartments FOR SELECT
  TO authenticated
  USING (is_project_member(project_id));

-- Editors can create apartments
CREATE POLICY "Editors can create apartments"
  ON apartments FOR INSERT
  TO authenticated
  WITH CHECK (can_edit_project(project_id));

-- Editors can update apartments
CREATE POLICY "Editors can update apartments"
  ON apartments FOR UPDATE
  TO authenticated
  USING (can_edit_project(project_id))
  WITH CHECK (can_edit_project(project_id));

-- Editors can delete apartments
CREATE POLICY "Editors can delete apartments"
  ON apartments FOR DELETE
  TO authenticated
  USING (can_edit_project(project_id));

-- ============================================
-- APARTMENT_MEDIA policies
-- ============================================
-- Members can view media for apartments in their projects
CREATE POLICY "Members can view apartment media"
  ON apartment_media FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apartments a
      WHERE a.id = apartment_media.apartment_id
      AND is_project_member(a.project_id)
    )
  );

-- Editors can upload media
CREATE POLICY "Editors can upload media"
  ON apartment_media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM apartments a
      WHERE a.id = apartment_media.apartment_id
      AND can_edit_project(a.project_id)
    )
  );

-- Editors can update media (caption, order)
CREATE POLICY "Editors can update media"
  ON apartment_media FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apartments a
      WHERE a.id = apartment_media.apartment_id
      AND can_edit_project(a.project_id)
    )
  );

-- Editors can delete media
CREATE POLICY "Editors can delete media"
  ON apartment_media FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apartments a
      WHERE a.id = apartment_media.apartment_id
      AND can_edit_project(a.project_id)
    )
  );

-- ============================================
-- APARTMENT_COMMENTS policies
-- ============================================
-- Members can view comments
CREATE POLICY "Members can view comments"
  ON apartment_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apartments a
      WHERE a.id = apartment_comments.apartment_id
      AND is_project_member(a.project_id)
    )
  );

-- Members can add comments (viewers too)
CREATE POLICY "Members can add comments"
  ON apartment_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM apartments a
      WHERE a.id = apartment_comments.apartment_id
      AND is_project_member(a.project_id)
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON apartment_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments, editors can delete any
CREATE POLICY "Users can delete own comments or editors can delete any"
  ON apartment_comments FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM apartments a
      WHERE a.id = apartment_comments.apartment_id
      AND can_edit_project(a.project_id)
    )
  );

-- ============================================
-- AMENITIES policies
-- ============================================
-- Members can view amenities
CREATE POLICY "Members can view amenities"
  ON amenities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apartments a
      WHERE a.id = amenities.apartment_id
      AND is_project_member(a.project_id)
    )
  );

-- Editors can manage amenities
CREATE POLICY "Editors can create amenities"
  ON amenities FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM apartments a
      WHERE a.id = amenities.apartment_id
      AND can_edit_project(a.project_id)
    )
  );

CREATE POLICY "Editors can update amenities"
  ON amenities FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apartments a
      WHERE a.id = amenities.apartment_id
      AND can_edit_project(a.project_id)
    )
  );

CREATE POLICY "Editors can delete amenities"
  ON amenities FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apartments a
      WHERE a.id = amenities.apartment_id
      AND can_edit_project(a.project_id)
    )
  );

-- ============================================
-- BROKERS policies
-- ============================================
-- Members can view brokers
CREATE POLICY "Members can view brokers"
  ON brokers FOR SELECT
  TO authenticated
  USING (is_project_member(project_id));

-- Editors can manage brokers
CREATE POLICY "Editors can create brokers"
  ON brokers FOR INSERT
  TO authenticated
  WITH CHECK (can_edit_project(project_id));

CREATE POLICY "Editors can update brokers"
  ON brokers FOR UPDATE
  TO authenticated
  USING (can_edit_project(project_id))
  WITH CHECK (can_edit_project(project_id));

CREATE POLICY "Editors can delete brokers"
  ON brokers FOR DELETE
  TO authenticated
  USING (can_edit_project(project_id));

-- ============================================
-- APARTMENT_BROKERS policies
-- ============================================
-- Members can view apartment-broker links
CREATE POLICY "Members can view apartment brokers"
  ON apartment_brokers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apartments a
      WHERE a.id = apartment_brokers.apartment_id
      AND is_project_member(a.project_id)
    )
  );

-- Editors can manage apartment-broker links
CREATE POLICY "Editors can link brokers"
  ON apartment_brokers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM apartments a
      WHERE a.id = apartment_brokers.apartment_id
      AND can_edit_project(a.project_id)
    )
  );

CREATE POLICY "Editors can unlink brokers"
  ON apartment_brokers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apartments a
      WHERE a.id = apartment_brokers.apartment_id
      AND can_edit_project(a.project_id)
    )
  );

-- ============================================
-- ACTIVITY_LOG policies
-- ============================================
-- Members can view activity log for their projects
CREATE POLICY "Members can view activity log"
  ON activity_log FOR SELECT
  TO authenticated
  USING (is_project_member(project_id));

-- System/authenticated users can insert activity logs
CREATE POLICY "Authenticated users can log activity"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Activity logs are immutable (no update/delete)

-- ============================================
-- TRIGGER: Auto-add project creator as owner
-- ============================================
CREATE OR REPLACE FUNCTION add_project_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role, invited_by, accepted_at)
  VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_project_created ON projects;
CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION add_project_owner();

-- ============================================
-- GRANT permissions
-- ============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
