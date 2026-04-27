# EJC Team Roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar papéis de equipe orientados à realidade do EJC (`equipe_externa`, `bem_estar`, `supers`) com flag `is_coord` que permite coordenadores convidar membros de sua própria equipe.

**Architecture:** Abordagem em 7 tarefas sequenciais: migration de banco → lógica de permissões → serviço de convites → proteção de rotas → navegação filtrada → UI de gestão de usuários. Cada tarefa produz código funcional e testável independentemente.

**Tech Stack:** React 18, Vite, Supabase (PostgreSQL + RLS + Auth), Vitest, jsdom

---

## File Map

| Ação | Arquivo |
|------|---------|
| Criar | `supabase/migrations/004_team_roles.sql` |
| Criar | `tests/services/adminUsers.test.js` |
| Modificar | `src/services/adminUsers.js` |
| Modificar | `src/components/ProtectedRoute.jsx` |
| Modificar | `src/App.jsx` |
| Modificar | `src/components/AdminLayout.jsx` |
| Modificar | `src/components/AdminUsersManager.jsx` |

---

## Task 1: Migration — Schema + RLS + aceitar_convite function

**Files:**
- Create: `supabase/migrations/004_team_roles.sql`

A função `aceitar_convite` não está nas migrations (foi criada diretamente no Supabase). Esta migration a recria via `CREATE OR REPLACE` para incluir `is_coord`.

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- supabase/migrations/004_team_roles.sql

-- 1. Adicionar is_coord em ambas as tabelas
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_coord BOOLEAN DEFAULT false;
ALTER TABLE admin_invites ADD COLUMN IF NOT EXISTS is_coord BOOLEAN DEFAULT false;

-- 2. Atualizar CHECK de role em admin_users
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('admin', 'moderador', 'visualizador', 'equipe_externa', 'bem_estar', 'supers'));

-- 3. Atualizar CHECK de role em admin_invites
ALTER TABLE admin_invites DROP CONSTRAINT IF EXISTS admin_invites_role_check;
ALTER TABLE admin_invites ADD CONSTRAINT admin_invites_role_check
  CHECK (role IN ('admin', 'moderador', 'visualizador', 'equipe_externa', 'bem_estar', 'supers'));

-- 4. RLS: papéis de equipe podem visualizar todos os admin_users (página Equipe)
CREATE POLICY "team_view_users" ON admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
      AND au.role IN ('equipe_externa', 'bem_estar', 'supers')
      AND au.ativo = true
    )
  );

-- 5. RLS: coordenadores podem visualizar convites que eles criaram
CREATE POLICY "coord_view_invites" ON admin_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
      AND au.role IN ('equipe_externa', 'bem_estar', 'supers')
      AND au.is_coord = true
      AND au.ativo = true
      AND au.id = criado_por
    )
  );

-- 6. RLS: coordenadores podem criar convites somente para seu próprio papel base
CREATE POLICY "coord_create_invites" ON admin_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
      AND au.role IN ('equipe_externa', 'bem_estar', 'supers')
      AND au.is_coord = true
      AND au.ativo = true
      AND au.role = role
    )
    AND is_coord = false
  );

-- 7. RLS: coordenadores podem cancelar convites que eles criaram
CREATE POLICY "coord_delete_invites" ON admin_invites
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
      AND au.role IN ('equipe_externa', 'bem_estar', 'supers')
      AND au.is_coord = true
      AND au.ativo = true
      AND au.id = criado_por
    )
  );

-- 8. Recriar aceitar_convite propagando is_coord do convite para admin_users
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
```

- [ ] **Step 2: Aplicar a migration no Supabase**

Acesse o SQL Editor do Supabase e execute o conteúdo do arquivo `004_team_roles.sql`.

Verificação — rode no SQL Editor:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name IN ('admin_users', 'admin_invites')
  AND column_name = 'is_coord';
-- Esperado: 2 linhas, ambas boolean com default false

SELECT conname FROM pg_constraint
WHERE conname IN ('admin_users_role_check', 'admin_invites_role_check');
-- Esperado: 2 linhas

SELECT polname FROM pg_policy
WHERE polname IN ('team_view_users','coord_view_invites','coord_create_invites','coord_delete_invites');
-- Esperado: 4 linhas

SELECT proname FROM pg_proc WHERE proname = 'aceitar_convite';
-- Esperado: 1 linha
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/004_team_roles.sql
git commit -m "feat: add team roles migration with is_coord and updated RLS"
```

---

## Task 2: Expandir ROLE_PERMISSIONS e verificarPermissao

**Files:**
- Modify: `src/services/adminUsers.js` (linhas 1–76)
- Create: `tests/services/adminUsers.test.js`

- [ ] **Step 1: Escrever o teste antes de alterar o código**

Crie `tests/services/adminUsers.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { ROLE_PERMISSIONS, verificarPermissao } from '../../src/services/adminUsers'

describe('ROLE_PERMISSIONS', () => {
  it('admin tem acesso total a tudo', () => {
    const p = ROLE_PERMISSIONS.admin
    expect(p.canViewCRM).toBe(true)
    expect(p.canEditCRM).toBe(true)
    expect(p.canViewGrupos).toBe(true)
    expect(p.canEditGrupos).toBe(true)
    expect(p.canViewCheckin).toBe(true)
    expect(p.canEditCheckin).toBe(true)
    expect(p.canViewFormulario).toBe(true)
    expect(p.canViewEquipe).toBe(true)
    expect(p.canCreateInvites).toBe(true)
  })

  it('equipe_externa tem acesso total ao CRM e visualização das demais áreas', () => {
    const p = ROLE_PERMISSIONS.equipe_externa
    expect(p.canEditCRM).toBe(true)
    expect(p.canViewGrupos).toBe(true)
    expect(p.canEditGrupos).toBe(false)
    expect(p.canViewCheckin).toBe(true)
    expect(p.canEditCheckin).toBe(false)
    expect(p.canViewEquipe).toBe(true)
    expect(p.canViewFormulario).toBe(false)
    expect(p.canCreateInvites).toBe(false)
  })

  it('bem_estar tem acesso total ao check-in e visualização das demais áreas', () => {
    const p = ROLE_PERMISSIONS.bem_estar
    expect(p.canEditCheckin).toBe(true)
    expect(p.canViewCRM).toBe(true)
    expect(p.canEditCRM).toBe(false)
    expect(p.canViewGrupos).toBe(true)
    expect(p.canEditGrupos).toBe(false)
    expect(p.canViewEquipe).toBe(true)
  })

  it('supers tem acesso total a grupos e visualização das demais áreas', () => {
    const p = ROLE_PERMISSIONS.supers
    expect(p.canEditGrupos).toBe(true)
    expect(p.canViewCRM).toBe(true)
    expect(p.canEditCRM).toBe(false)
    expect(p.canViewCheckin).toBe(true)
    expect(p.canEditCheckin).toBe(false)
    expect(p.canViewEquipe).toBe(true)
  })

  it('moderador só visualiza CRM, grupos e check-in', () => {
    const p = ROLE_PERMISSIONS.moderador
    expect(p.canViewCRM).toBe(true)
    expect(p.canEditCRM).toBe(false)
    expect(p.canViewFormulario).toBe(false)
    expect(p.canViewEquipe).toBe(false)
  })
})

describe('verificarPermissao', () => {
  it('admin pode criar convites', () => {
    expect(verificarPermissao({ role: 'admin', is_coord: false }, 'canCreateInvites')).toBe(true)
  })

  it('membro de equipe NÃO pode criar convites', () => {
    expect(verificarPermissao({ role: 'equipe_externa', is_coord: false }, 'canCreateInvites')).toBe(false)
  })

  it('coordenador de equipe PODE criar convites', () => {
    expect(verificarPermissao({ role: 'equipe_externa', is_coord: true }, 'canCreateInvites')).toBe(true)
    expect(verificarPermissao({ role: 'bem_estar', is_coord: true }, 'canCreateInvites')).toBe(true)
    expect(verificarPermissao({ role: 'supers', is_coord: true }, 'canCreateInvites')).toBe(true)
  })

  it('coordenador de equipe PODE deletar convites', () => {
    expect(verificarPermissao({ role: 'equipe_externa', is_coord: true }, 'canDeleteInvites')).toBe(true)
  })

  it('coordenador de equipe NÃO pode editar usuários', () => {
    expect(verificarPermissao({ role: 'equipe_externa', is_coord: true }, 'canEditUsers')).toBe(false)
  })

  it('role inválido retorna false', () => {
    expect(verificarPermissao({ role: 'fantasma', is_coord: false }, 'canViewCRM')).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
npx vitest run tests/services/adminUsers.test.js
```

Esperado: vários `FAIL` por propriedades não existentes em `ROLE_PERMISSIONS` e assinatura errada de `verificarPermissao`.

- [ ] **Step 3: Substituir ROLE_PERMISSIONS e ROLE_DESCRIPTIONS em adminUsers.js**

Substitua as linhas 3–32 e 256–261 de `src/services/adminUsers.js`:

```javascript
const TEAM_ROLES = ['equipe_externa', 'bem_estar', 'supers']
const COORD_INVITE_PERMISSIONS = ['canViewInvites', 'canCreateInvites', 'canDeleteInvites']

export const ROLE_PERMISSIONS = {
  admin: {
    canViewUsers: true, canCreateUsers: true, canEditUsers: true, canDeleteUsers: true,
    canViewInvites: true, canCreateInvites: true, canDeleteInvites: true,
    canViewCRM: true, canEditCRM: true,
    canViewGrupos: true, canEditGrupos: true,
    canViewCheckin: true, canEditCheckin: true,
    canViewFormulario: true,
    canViewEquipe: true,
  },
  moderador: {
    canViewUsers: true, canCreateUsers: false, canEditUsers: false, canDeleteUsers: false,
    canViewInvites: false, canCreateInvites: false, canDeleteInvites: false,
    canViewCRM: true, canEditCRM: false,
    canViewGrupos: true, canEditGrupos: false,
    canViewCheckin: true, canEditCheckin: false,
    canViewFormulario: false,
    canViewEquipe: false,
  },
  visualizador: {
    canViewUsers: false, canCreateUsers: false, canEditUsers: false, canDeleteUsers: false,
    canViewInvites: false, canCreateInvites: false, canDeleteInvites: false,
    canViewCRM: true, canEditCRM: false,
    canViewGrupos: true, canEditGrupos: false,
    canViewCheckin: true, canEditCheckin: false,
    canViewFormulario: false,
    canViewEquipe: false,
  },
  equipe_externa: {
    canViewUsers: false, canCreateUsers: false, canEditUsers: false, canDeleteUsers: false,
    canViewInvites: false, canCreateInvites: false, canDeleteInvites: false,
    canViewCRM: true, canEditCRM: true,
    canViewGrupos: true, canEditGrupos: false,
    canViewCheckin: true, canEditCheckin: false,
    canViewFormulario: false,
    canViewEquipe: true,
  },
  bem_estar: {
    canViewUsers: false, canCreateUsers: false, canEditUsers: false, canDeleteUsers: false,
    canViewInvites: false, canCreateInvites: false, canDeleteInvites: false,
    canViewCRM: true, canEditCRM: false,
    canViewGrupos: true, canEditGrupos: false,
    canViewCheckin: true, canEditCheckin: true,
    canViewFormulario: false,
    canViewEquipe: true,
  },
  supers: {
    canViewUsers: false, canCreateUsers: false, canEditUsers: false, canDeleteUsers: false,
    canViewInvites: false, canCreateInvites: false, canDeleteInvites: false,
    canViewCRM: true, canEditCRM: false,
    canViewGrupos: true, canEditGrupos: true,
    canViewCheckin: true, canEditCheckin: false,
    canViewFormulario: false,
    canViewEquipe: true,
  },
}

export const ROLE_DESCRIPTIONS = {
  admin: 'Acesso total — cria, edita e deleta usuários',
  moderador: 'Visualiza CRM, grupos e check-in',
  visualizador: 'Acesso somente leitura',
  equipe_externa: 'Gestão do CRM de encontristas',
  bem_estar: 'Gestão do check-in e acompanhamento',
  supers: 'Gestão dos grupos',
}

export const ROLE_LABELS = {
  admin: 'Admin',
  moderador: 'Moderador',
  visualizador: 'Visualizador',
  equipe_externa: 'Equipe Externa',
  bem_estar: 'Bem Estar',
  supers: 'Supers',
}
```

- [ ] **Step 4: Atualizar verificarPermissao**

Substitua as linhas 72–76 de `src/services/adminUsers.js`:

```javascript
export function verificarPermissao(user, acao) {
  const role = user?.role
  const permissoes = ROLE_PERMISSIONS[role]
  if (!permissoes) return false
  if (user?.is_coord && TEAM_ROLES.includes(role) && COORD_INVITE_PERMISSIONS.includes(acao)) {
    return true
  }
  return permissoes[acao] ?? false
}
```

- [ ] **Step 5: Rodar os testes para confirmar que passam**

```bash
npx vitest run tests/services/adminUsers.test.js
```

Esperado: todos os testes `PASS`.

- [ ] **Step 6: Commit**

```bash
git add src/services/adminUsers.js tests/services/adminUsers.test.js
git commit -m "feat: expand ROLE_PERMISSIONS with team roles and update verificarPermissao"
```

---

## Task 3: Atualizar criarConviteAdmin e adicionar atualizarAdminCoord

**Files:**
- Modify: `src/services/adminUsers.js` (linhas 78–112 e final do arquivo)

- [ ] **Step 1: Substituir criarConviteAdmin (linhas 78–112)**

```javascript
export async function criarConviteAdmin(email, role = 'moderador', isCoord = false) {
  try {
    const user = await obterAdminAtual()
    if (!user) throw new Error('Usuário não autenticado')
    if (!verificarPermissao(user, 'canCreateInvites')) {
      throw new Error('Você não tem permissão para criar convites')
    }

    // Coordenadores só podem convidar para seu próprio papel, sem is_coord
    if (TEAM_ROLES.includes(user.role) && user.is_coord) {
      if (role !== user.role) throw new Error('Você só pode convidar membros para sua própria equipe')
      if (isCoord) throw new Error('Coordenadores não podem criar outros coordenadores')
    }

    const token = generateInviteToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const { data, error } = await supabase
      .from('admin_invites')
      .insert([{
        email,
        token,
        role,
        is_coord: isCoord,
        expira_em: expiresAt.toISOString(),
        criado_por: user.id,
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao criar convite:', error)
    throw error
  }
}
```

- [ ] **Step 2: Atualizar chamadas internas a verificarPermissao**

Em `src/services/adminUsers.js`, atualize as 3 chamadas restantes que passam `user.role` para passar `user` diretamente:

Linha ~180 (`deletarConvite`):
```javascript
if (!verificarPermissao(user, 'canDeleteInvites')) {
```

Linha ~201 (`atualizarAdminRole`):
```javascript
if (!verificarPermissao(user, 'canEditUsers')) {
```

Linha ~228 (`deletarAdmin`):
```javascript
if (!verificarPermissao(user, 'canDeleteUsers')) {
```

- [ ] **Step 3: Adicionar atualizarAdminCoord no final do arquivo**

```javascript
export async function atualizarAdminCoord(adminId, isCoord) {
  try {
    const user = await obterAdminAtual()
    if (!user) throw new Error('Usuário não autenticado')
    if (!verificarPermissao(user, 'canEditUsers')) {
      throw new Error('Você não tem permissão para editar usuários')
    }

    const { data, error } = await supabase
      .from('admin_users')
      .update({ is_coord: isCoord, atualizado_em: new Date().toISOString() })
      .eq('id', adminId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Erro ao atualizar is_coord:', error)
    throw error
  }
}
```

- [ ] **Step 4: Rodar os testes para confirmar que ainda passam**

```bash
npx vitest run tests/services/adminUsers.test.js
```

Esperado: todos `PASS` (não alteramos ROLE_PERMISSIONS nem verificarPermissao).

- [ ] **Step 5: Commit**

```bash
git add src/services/adminUsers.js
git commit -m "feat: update criarConviteAdmin with isCoord param and add atualizarAdminCoord"
```

---

## Task 4: Atualizar ProtectedRoute com verificação de permissão por rota

**Files:**
- Modify: `src/components/ProtectedRoute.jsx`

- [ ] **Step 1: Substituir o conteúdo de ProtectedRoute.jsx**

```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useAdminRole } from '../hooks/useAdminRole'
import { verificarPermissao } from '../services/adminUsers'

export function ProtectedRoute({ children, requiredPermission }) {
  const { session, loading } = useAuth()
  const { adminUser, loading: roleLoading } = useAdminRole()

  if (loading || (requiredPermission && roleLoading)) {
    return <div style={{ padding: 24 }}>Carregando...</div>
  }
  if (!session) return <Navigate to="/admin/login" replace />

  if (requiredPermission && adminUser && !verificarPermissao(adminUser, requiredPermission)) {
    return <Navigate to="/admin" replace />
  }

  return children
}
```

- [ ] **Step 2: Verificar que o app ainda carrega**

```bash
npm run dev
```

Acesse http://localhost:5173/admin/login e faça login. Verifique que as rotas existentes ainda funcionam.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProtectedRoute.jsx
git commit -m "feat: add requiredPermission prop to ProtectedRoute"
```

---

## Task 5: Adicionar requiredPermission nas rotas em App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Atualizar as rotas admin em App.jsx**

Substitua o bloco de rotas admin (linhas 29–36):

```jsx
<Route path="/admin" element={<ProtectedRoute><SeletorEncontro /></ProtectedRoute>} />
<Route path="/admin/crm" element={<ProtectedRoute requiredPermission="canViewCRM"><CRM /></ProtectedRoute>} />
<Route path="/admin/crm/:id" element={<ProtectedRoute requiredPermission="canViewCRM"><EncontristaDetalhe /></ProtectedRoute>} />
<Route path="/admin/grupos" element={<ProtectedRoute requiredPermission="canViewGrupos"><Grupos /></ProtectedRoute>} />
<Route path="/admin/checkin" element={<ProtectedRoute requiredPermission="canViewCheckin"><CheckinAdmin /></ProtectedRoute>} />
<Route path="/admin/formulario" element={<ProtectedRoute requiredPermission="canViewFormulario"><Formulario /></ProtectedRoute>} />
<Route path="/admin/equipe" element={<ProtectedRoute requiredPermission="canViewEquipe"><Equipe /></ProtectedRoute>} />
<Route path="/admin/configuracoes" element={<ProtectedRoute requiredPermission="canViewFormulario"><Configuracoes /></ProtectedRoute>} />
```

- [ ] **Step 2: Verificar comportamento de redirect**

Com um usuário `equipe_externa` logado, acesse `/admin/formulario` no browser.
Esperado: redirect para `/admin`.

Com um usuário `admin` logado, acesse `/admin/formulario`.
Esperado: página de formulário carrega normalmente.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add permission guards to all protected admin routes"
```

---

## Task 6: Filtrar navegação e exibir papel no AdminLayout

**Files:**
- Modify: `src/components/AdminLayout.jsx`

- [ ] **Step 1: Adicionar imports e constantes no topo do arquivo**

Após as importações existentes, adicione:

```javascript
import { verificarPermissao, ROLE_LABELS } from '../services/adminUsers'
```

- [ ] **Step 2: Substituir o array navItems (linhas 44–51) por versão filtrada**

```javascript
const allNavItems = [
  { to: '/admin/crm', label: 'CRM', icon: <BarChart2 size={16} />, permission: 'canViewCRM' },
  { to: '/admin/grupos', label: 'Grupos', icon: <Users size={16} />, permission: 'canViewGrupos' },
  { to: '/admin/checkin', label: 'Check-in', icon: <CheckSquare size={16} />, permission: 'canViewCheckin' },
  { to: '/admin/formulario', label: 'Formulário', icon: <FileText size={16} />, permission: 'canViewFormulario' },
  { to: '/admin/equipe', label: 'Equipe', icon: <UsersRound size={16} />, permission: 'canViewEquipe' },
  { to: '/admin/configuracoes', label: 'Configurações', icon: <Settings size={16} />, permission: 'canViewFormulario' },
]

const navItems = adminUser
  ? allNavItems.filter(item => verificarPermissao(adminUser, item.permission))
  : []
```

- [ ] **Step 3: Atualizar o bloco de exibição do papel (linhas 105–107)**

Substitua:

```jsx
{adminUser?.role && (
  <div className="admin-user-role">{adminUser.role}</div>
)}
```

Por:

```jsx
{adminUser?.role && (
  <div className="admin-user-role">
    {ROLE_LABELS[adminUser.role] ?? adminUser.role}
    {adminUser.is_coord && (
      <span style={{ marginLeft: 6, fontSize: '0.7rem', opacity: 0.75 }}>· Coord</span>
    )}
  </div>
)}
```

- [ ] **Step 4: Verificar no browser**

Com usuário `equipe_externa` logado, o menu deve mostrar apenas: CRM, Grupos, Check-in, Equipe.
Com usuário `admin`, todos os itens devem aparecer.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminLayout.jsx
git commit -m "feat: filter sidebar nav by permission and show friendly role labels"
```

---

## Task 7: Atualizar AdminUsersManager — formulário de convite e tabela de usuários

**Files:**
- Modify: `src/components/AdminUsersManager.jsx`

- [ ] **Step 1: Atualizar imports no topo**

```javascript
import {
  listarAdmins,
  obterAdminAtual,
  criarConviteAdmin,
  listarConvites,
  atualizarAdminRole,
  atualizarAdminCoord,
  deletarAdmin,
  deletarConvite,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  verificarPermissao,
} from '../services/adminUsers'
```

- [ ] **Step 2: Adicionar estado novoIsCoord ao lado de novoRole**

Após `const [novoRole, setNovoRole] = useState('moderador')`, adicione:

```javascript
const [novoIsCoord, setNovoIsCoord] = useState(false)
```

- [ ] **Step 3: Atualizar handleCriarConvite para passar novoIsCoord**

Substitua:
```javascript
const convite = await criarConviteAdmin(novoEmail, novoRole)
```
Por:
```javascript
const convite = await criarConviteAdmin(novoEmail, novoRole, novoIsCoord)
```

E logo após `setNovoRole('moderador')`, adicione:
```javascript
setNovoIsCoord(false)
```

- [ ] **Step 4: Substituir podeGerenciar por flags granulares**

Substitua (linha ~123):
```javascript
const podeGerenciar = ROLE_PERMISSIONS[usuarioAtual.role]?.canCreateInvites
```

Por:
```javascript
const podeConvidar = verificarPermissao(usuarioAtual, 'canCreateInvites')
const podeVerConvites = verificarPermissao(usuarioAtual, 'canViewInvites')
const podeEditarUsuarios = verificarPermissao(usuarioAtual, 'canEditUsers')
const podeDeletarUsuarios = verificarPermissao(usuarioAtual, 'canDeleteUsers')
const TEAM_ROLES_LOCAL = ['equipe_externa', 'bem_estar', 'supers']
const isAdmin = usuarioAtual.role === 'admin'
```

- [ ] **Step 5: Atualizar bloco "Seu Role" para usar ROLE_LABELS**

Substitua (linha ~148):
```jsx
<strong>Seu Role:</strong> {usuarioAtual.role} - {ROLE_DESCRIPTIONS[usuarioAtual.role]}
```
Por:
```jsx
<strong>Seu papel:</strong> {ROLE_LABELS[usuarioAtual.role] ?? usuarioAtual.role}
{usuarioAtual.is_coord && <span style={{ marginLeft: 8, color: 'var(--color-primary)' }}>Coordenador</span>}
{' '}- {ROLE_DESCRIPTIONS[usuarioAtual.role]}
```

- [ ] **Step 6: Atualizar botão "Novo Convite"**

Substitua `{podeGerenciar && (` por `{podeConvidar && (` no botão de novo convite.

- [ ] **Step 7: Atualizar formulário de convite com roles filtradas e checkbox is_coord**

Substitua o bloco `{showNovoConvite && (...)}` inteiro:

```jsx
{showNovoConvite && (
  <div className="novo-convite-form">
    <h3>Gerar Convite</h3>
    <div className="form-group">
      <label>Email *</label>
      <input
        type="email"
        value={novoEmail}
        onChange={(e) => setNovoEmail(e.target.value)}
        placeholder="pessoa@example.com"
      />
    </div>
    <div className="form-group">
      <label>Papel *</label>
      <select value={novoRole} onChange={(e) => setNovoRole(e.target.value)}>
        {isAdmin ? (
          <>
            <option value="admin">Admin — {ROLE_DESCRIPTIONS.admin}</option>
            <option value="moderador">Moderador — {ROLE_DESCRIPTIONS.moderador}</option>
            <option value="visualizador">Visualizador — {ROLE_DESCRIPTIONS.visualizador}</option>
            <option value="equipe_externa">Equipe Externa — {ROLE_DESCRIPTIONS.equipe_externa}</option>
            <option value="bem_estar">Bem Estar — {ROLE_DESCRIPTIONS.bem_estar}</option>
            <option value="supers">Supers — {ROLE_DESCRIPTIONS.supers}</option>
          </>
        ) : (
          <option value={usuarioAtual.role}>
            {ROLE_LABELS[usuarioAtual.role]} — {ROLE_DESCRIPTIONS[usuarioAtual.role]}
          </option>
        )}
      </select>
    </div>
    {isAdmin && TEAM_ROLES_LOCAL.includes(novoRole) && (
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={novoIsCoord}
            onChange={(e) => setNovoIsCoord(e.target.checked)}
          />
          Tornar coordenador de equipe
        </label>
      </div>
    )}
    <button className="btn btn-success" onClick={handleCriarConvite}>
      Gerar Convite
    </button>
  </div>
)}
```

- [ ] **Step 8: Atualizar seção de convites ativos**

Substitua `{podeGerenciar && convites.length > 0 && (` por `{(podeVerConvites || podeConvidar) && convites.length > 0 && (`.

- [ ] **Step 9: Atualizar tabela de usuários**

Substitua o `<thead>` da tabela de admins:

```jsx
<thead>
  <tr>
    <th>Nome</th>
    <th>Email</th>
    <th>Papel</th>
    <th>Criado em</th>
    {(podeEditarUsuarios || podeDeletarUsuarios) && <th>Ações</th>}
  </tr>
</thead>
```

Substitua o bloco `<td>` da coluna Role (o que tem o select):

```jsx
<td>
  {podeEditarUsuarios ? (
    <select
      value={admin.role}
      onChange={(e) => handleAtualizarRole(admin.id, e.target.value)}
      disabled={admin.id === usuarioAtual.id}
    >
      <option value="admin">Admin</option>
      <option value="moderador">Moderador</option>
      <option value="visualizador">Visualizador</option>
      <option value="equipe_externa">Equipe Externa</option>
      <option value="bem_estar">Bem Estar</option>
      <option value="supers">Supers</option>
    </select>
  ) : (
    <span className={`badge badge-${admin.role}`}>
      {ROLE_LABELS[admin.role] ?? admin.role}
    </span>
  )}
  {TEAM_ROLES_LOCAL.includes(admin.role) && (
    podeEditarUsuarios ? (
      <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: '0.8rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={admin.is_coord ?? false}
          disabled={admin.id === usuarioAtual.id}
          onChange={(e) => atualizarAdminCoord(admin.id, e.target.checked).then(carregarDados).catch(err => setError(err.message))}
        />
        Coord
      </label>
    ) : (
      admin.is_coord && <span style={{ marginLeft: 4, fontSize: '0.75rem', opacity: 0.7 }}>· Coord</span>
    )
  )}
</td>
```

Substitua `{podeGerenciar && <th>Ações</th>}` e blocos de ação por:

```jsx
{(podeEditarUsuarios || podeDeletarUsuarios) && (
  <td>
    {admin.id === usuarioAtual.id ? (
      <span className="text-muted">-</span>
    ) : (
      <div className="action-buttons">
        {podeDeletarUsuarios && (
          deletandoId === admin.id ? (
            <>
              <button className="btn btn-sm btn-danger" onClick={() => handleDeletarAdmin(admin.id)}>
                Confirmar?
              </button>
              <button className="btn btn-sm btn-secondary" onClick={() => setDeletandoId(null)}>
                Cancelar
              </button>
            </>
          ) : (
            <button className="btn btn-sm btn-danger" onClick={() => setDeletandoId(admin.id)}>
              Deletar
            </button>
          )
        )}
      </div>
    )}
  </td>
)}
```

- [ ] **Step 10: Verificar no browser**

1. Logar como `admin`: confirmar que vê todos os papéis no formulário de convite, vê checkbox de "Coord" ao selecionar papel de equipe, e vê toggles de Coord na tabela de usuários.
2. Logar como coordenador de `equipe_externa`: confirmar que o formulário de convite só mostra "Equipe Externa", não mostra checkbox de Coord, e a tabela mostra usuários sem botões de edição/delete.
3. Logar como membro `bem_estar` (is_coord=false): confirmar que não há botão de "Novo Convite".

- [ ] **Step 11: Commit**

```bash
git add src/components/AdminUsersManager.jsx
git commit -m "feat: update AdminUsersManager with team roles, coord badge and filtered invite form"
```

---

## Verificação final

- [ ] Rodar todos os testes:
  ```bash
  npx vitest run
  ```
  Esperado: todos `PASS`.

- [ ] Rodar lint:
  ```bash
  npm run lint
  ```
  Esperado: sem erros.

- [ ] Build de produção:
  ```bash
  npm run build
  ```
  Esperado: sem erros de compilação.
