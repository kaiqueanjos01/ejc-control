-- Migration 009: restrict encontristas DELETE to admin role
--
-- Replaces the generic "equipe_full_encontristas" policy (FOR ALL) with four
-- granular policies. SELECT/INSERT/UPDATE keep the same open behaviour for all
-- authenticated users; DELETE is restricted to the 'admin' role only.
--
-- Prerequisites:
--   • RLS was enabled on encontristas in migration 001
--   • current_admin_role() SECURITY DEFINER function was created in migration 004

DROP POLICY IF EXISTS "equipe_full_encontristas" ON encontristas;

-- SELECT: todos os autenticados (mantém comportamento anterior)
CREATE POLICY "encontristas_select" ON encontristas
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: todos os autenticados (mantém comportamento anterior)
CREATE POLICY "encontristas_insert" ON encontristas
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: todos os autenticados (mantém comportamento anterior)
CREATE POLICY "encontristas_update" ON encontristas
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- DELETE: somente admin
-- current_admin_role() looks up the caller's role in admin_users and returns it.
-- Returns NULL (not 'admin') for non-admin users, so the check fails safely.
CREATE POLICY "encontristas_delete" ON encontristas
  FOR DELETE TO authenticated
  USING (current_admin_role() = 'admin');
