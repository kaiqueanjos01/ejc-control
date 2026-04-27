-- Add is_coord columns to admin tables
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_coord BOOLEAN DEFAULT false;
ALTER TABLE admin_invites ADD COLUMN IF NOT EXISTS is_coord BOOLEAN DEFAULT false;

-- Update role checks to include team roles
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('admin', 'moderador', 'visualizador', 'equipe_externa', 'bem_estar', 'supers'));

ALTER TABLE admin_invites DROP CONSTRAINT IF EXISTS admin_invites_role_check;
ALTER TABLE admin_invites ADD CONSTRAINT admin_invites_role_check
  CHECK (role IN ('admin', 'moderador', 'visualizador', 'equipe_externa', 'bem_estar', 'supers'));

-- Helper functions to avoid RLS recursion when checking current admin membership
CREATE OR REPLACE FUNCTION current_admin_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id
  FROM admin_users au
  WHERE au.auth_user_id = auth.uid()
    AND au.ativo = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_admin_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.role
  FROM admin_users au
  WHERE au.auth_user_id = auth.uid()
    AND au.ativo = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION current_admin_is_coord()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(au.is_coord, false)
  FROM admin_users au
  WHERE au.auth_user_id = auth.uid()
    AND au.ativo = true
  LIMIT 1;
$$;

-- Replace legacy SELECT policies to avoid recursive checks on admin_users
DROP POLICY IF EXISTS "admin_view_all_users" ON admin_users;
CREATE POLICY "admin_view_all_users" ON admin_users
  FOR SELECT
  USING (current_admin_role() = 'admin');

DROP POLICY IF EXISTS "moderador_view_users" ON admin_users;
CREATE POLICY "moderador_view_users" ON admin_users
  FOR SELECT
  USING (current_admin_role() IN ('admin', 'moderador'));

-- RLS Policy: Team roles can view admin users
DROP POLICY IF EXISTS "team_view_users" ON admin_users;
CREATE POLICY "team_view_users" ON admin_users
  FOR SELECT
  USING (current_admin_role() IN ('equipe_externa', 'bem_estar', 'supers'));

-- RLS Policy: Team coordinators can view invites they created
DROP POLICY IF EXISTS "coord_view_invites" ON admin_invites;
CREATE POLICY "coord_view_invites" ON admin_invites
  FOR SELECT
  USING (
    current_admin_role() IN ('equipe_externa', 'bem_estar', 'supers')
    AND current_admin_is_coord() = true
    AND current_admin_id() = admin_invites.criado_por
  );

-- RLS Policy: Team coordinators can create invites for their own role only
DROP POLICY IF EXISTS "coord_create_invites" ON admin_invites;
CREATE POLICY "coord_create_invites" ON admin_invites
  FOR INSERT
  WITH CHECK (
    current_admin_role() IN ('equipe_externa', 'bem_estar', 'supers')
    AND current_admin_is_coord() = true
    AND current_admin_role() = admin_invites.role
    AND current_admin_id() = admin_invites.criado_por
    AND admin_invites.is_coord = false
  );

-- RLS Policy: Team coordinators can delete invites they created
DROP POLICY IF EXISTS "coord_delete_invites" ON admin_invites;
CREATE POLICY "coord_delete_invites" ON admin_invites
  FOR DELETE
  USING (
    current_admin_role() IN ('equipe_externa', 'bem_estar', 'supers')
    AND current_admin_is_coord() = true
    AND current_admin_id() = admin_invites.criado_por
  );

-- Recreate aceitar_convite to propagate is_coord from invites to admin_users
DROP FUNCTION IF EXISTS aceitar_convite(TEXT, UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION aceitar_convite(
  p_token TEXT,
  p_auth_user_id UUID,
  p_email TEXT,
  p_nome TEXT
)
RETURNS TABLE (id UUID, role TEXT, is_coord BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite admin_invites%ROWTYPE;
  v_user_id UUID;
BEGIN
  SELECT * INTO v_invite
  FROM admin_invites
  WHERE token = p_token
    AND usado_em IS NULL
    AND expira_em > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido ou expirado';
  END IF;

  IF v_invite.email != p_email THEN
    RAISE EXCEPTION 'Email não corresponde ao convite';
  END IF;

  INSERT INTO admin_users (auth_user_id, email, nome, role, is_coord)
  VALUES (p_auth_user_id, p_email, p_nome, v_invite.role, v_invite.is_coord)
  RETURNING admin_users.id INTO v_user_id;

  UPDATE admin_invites
  SET usado_em = now()
  WHERE id = v_invite.id;

  RETURN QUERY SELECT v_user_id, v_invite.role, v_invite.is_coord;
END;
$$;