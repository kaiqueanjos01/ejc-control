-- Fix: team role users should only see members of their own team, not all platform users

DROP POLICY IF EXISTS "team_view_users" ON admin_users;
CREATE POLICY "team_view_users" ON admin_users
  FOR SELECT
  USING (
    current_admin_role() IN ('equipe_externa', 'bem_estar', 'supers')
    AND role = current_admin_role()
  );
