-- Fix aceitar_convite function:
-- 1. Qualify admin_invites.id to resolve "column reference 'id' is ambiguous"
--    (RETURNS TABLE (id UUID) creates a scope variable that conflicts with the column name)
-- 2. Cast v_invite.role to TEXT to match return type
--    (role column is VARCHAR(50) in admin_invites, but RETURNS TABLE declares TEXT)

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
  WHERE admin_invites.id = v_invite.id;

  RETURN QUERY SELECT v_user_id, v_invite.role::TEXT, v_invite.is_coord;
END;
$$;
