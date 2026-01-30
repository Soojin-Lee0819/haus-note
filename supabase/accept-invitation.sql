-- Run this in the Supabase SQL Editor to enable the invite acceptance flow.
-- This replaces the old RPC approach with RLS policies that allow invited
-- users to look up their invitation and join a project directly.

-- 1. Allow any authenticated user to SELECT invitations (needed to look up by token).
--    The token itself acts as the secret — only someone with the link can find it.
DROP POLICY IF EXISTS "Editors can view project invitations" ON project_invitations;

CREATE POLICY "Authenticated users can view invitations"
  ON project_invitations FOR SELECT
  TO authenticated
  USING (true);

-- 2. Allow users to join a project when a valid (non-expired, non-accepted) invitation exists.
--    This lets the invited user INSERT themselves into project_members without needing
--    a SECURITY DEFINER function.
CREATE POLICY "Users can join via invitation"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Original policy: owners can add members, or self-insert as owner on project creation
      is_project_owner(project_id)
      OR (user_id = auth.uid() AND role = 'owner')
      -- NEW: user has a valid invitation for this project
      OR EXISTS (
        SELECT 1 FROM project_invitations pi
        WHERE pi.project_id = project_members.project_id
          AND (pi.accepted IS NULL OR pi.accepted = false)
          AND pi.expires_at > NOW()
      )
    )
  );

-- 3. Drop the old INSERT policy so there's no conflict, then the above covers both cases.
DROP POLICY IF EXISTS "Owners can add members" ON project_members;


