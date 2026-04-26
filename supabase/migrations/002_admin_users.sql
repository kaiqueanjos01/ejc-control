-- Create admin_users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'moderador', 'visualizador')) DEFAULT 'moderador',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  criado_por UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create admin_invites table
CREATE TABLE admin_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'moderador', 'visualizador')) DEFAULT 'moderador',
  expira_em TIMESTAMP WITH TIME ZONE NOT NULL,
  criado_por UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  usado_em TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin users can view all admin_users
CREATE POLICY "admin_view_all_users" ON admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
      AND au.role = 'admin'
      AND au.ativo = true
    )
  );

-- RLS Policy: Moderadores can view admin_users but not create/edit/delete
CREATE POLICY "moderador_view_users" ON admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
      AND au.role IN ('admin', 'moderador')
      AND au.ativo = true
    )
  );

-- RLS Policy: Only admins can insert new admin_users
CREATE POLICY "admin_create_users" ON admin_users
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
      AND au.role = 'admin'
      AND au.ativo = true
    )
  );

-- RLS Policy: Only admins can update admin_users
CREATE POLICY "admin_update_users" ON admin_users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
      AND au.role = 'admin'
      AND au.ativo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
      AND au.role = 'admin'
      AND au.ativo = true
    )
  );

-- RLS Policy: Only admins can delete admin_users
CREATE POLICY "admin_delete_users" ON admin_users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
      AND au.role = 'admin'
      AND au.ativo = true
    )
  );

-- RLS Policy: Only admins can view invites
CREATE POLICY "admin_view_invites" ON admin_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
      AND au.role = 'admin'
      AND au.ativo = true
    )
  );

-- RLS Policy: Only admins can create invites
CREATE POLICY "admin_create_invites" ON admin_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
      AND au.role = 'admin'
      AND au.ativo = true
    )
  );

-- RLS Policy: Only admins can delete invites
CREATE POLICY "admin_delete_invites" ON admin_invites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
      AND au.role = 'admin'
      AND au.ativo = true
    )
  );

-- Create indexes
CREATE INDEX idx_admin_users_auth_user_id ON admin_users(auth_user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_ativo ON admin_users(ativo);
CREATE INDEX idx_admin_invites_token ON admin_invites(token);
CREATE INDEX idx_admin_invites_email ON admin_invites(email);
CREATE INDEX idx_admin_invites_expira_em ON admin_invites(expira_em);
