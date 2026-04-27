# Design: Papéis de Equipe EJC

**Data:** 2026-04-26
**Status:** Aprovado

## Contexto

O sistema atual possui três papéis genéricos (`admin`, `moderador`, `visualizador`) que não refletem a estrutura real do EJC. As equipes — Equipe Externa, Bem Estar e Supers — têm áreas de atuação distintas e necessidades de acesso diferentes. O objetivo é adicionar papéis orientados à realidade do EJC, mantendo os papéis existentes.

## Decisões de Design

### Papéis finais (6 no total)

**Existentes — sem alteração:**
- `admin` — acesso total a tudo, gerencia usuários e convites para qualquer papel
- `moderador` — visualização de CRM, Grupos e Check-in; sem acesso a Formulário, Equipe ou gestão de usuários
- `visualizador` — idêntico ao moderador em termos de acesso

**Novos papéis de equipe:**
- `equipe_externa` — acesso total ao CRM; visualização de Grupos, Check-in e Equipe
- `bem_estar` — acesso total ao Check-in; visualização de CRM, Grupos e Equipe
- `supers` — acesso total a Grupos; visualização de CRM, Check-in e Equipe

### Flag `is_coord`

Nova coluna booleana `is_coord` (default `false`) na tabela `admin_users`. Aplicável apenas aos papéis de equipe. Quando `true`, o usuário pode criar convites restritos ao papel base da sua própria equipe — sem poder convidar coordenadores. O admin é o único que pode convidar coordenadores (`is_coord: true`).

### Matriz de permissões

| Papel | CRM | Grupos | Check-in | Formulário | Equipe | Convidar |
|-------|-----|--------|----------|-----------|--------|----------|
| admin | total | total | total | total | total | qualquer papel |
| moderador | ver | ver | ver | — | — | — |
| visualizador | ver | ver | ver | — | — | — |
| equipe_externa | total | ver | ver | — | ver | coord → `equipe_externa` |
| bem_estar | ver | ver | total | — | ver | coord → `bem_estar` |
| supers | ver | total | ver | — | ver | coord → `supers` |

### Fluxo de convite

1. **Admin convida** qualquer papel, incluindo definir `is_coord: true` para coordenadores de equipe.
2. **Coordenador de equipe convida** somente membros do seu próprio papel base (sem `is_coord`). Não pode convidar outros coordenadores.
3. **Membros de equipe** (is_coord: false) não têm acesso a convites.

## Mudanças Necessárias

### 1. Banco de dados (nova migration)

```sql
-- Adicionar is_coord em admin_users
ALTER TABLE admin_users ADD COLUMN is_coord BOOLEAN DEFAULT false;

-- Adicionar is_coord em admin_invites (para que admin possa convidar coordenadores)
ALTER TABLE admin_invites ADD COLUMN is_coord BOOLEAN DEFAULT false;

-- Atualizar CHECK de role em admin_users
ALTER TABLE admin_users DROP CONSTRAINT admin_users_role_check;
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check
  CHECK (role IN ('admin', 'moderador', 'visualizador', 'equipe_externa', 'bem_estar', 'supers'));

-- Atualizar CHECK de role em admin_invites
ALTER TABLE admin_invites DROP CONSTRAINT admin_invites_role_check;
ALTER TABLE admin_invites ADD CONSTRAINT admin_invites_role_check
  CHECK (role IN ('admin', 'moderador', 'visualizador', 'equipe_externa', 'bem_estar', 'supers'));
```

**RLS para coordenadores criarem convites:**
```sql
-- Coordenadores podem criar convites somente para o seu próprio papel base (sem is_coord)
CREATE POLICY coord_create_invites ON admin_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.auth_user_id = auth.uid()
      AND au.role IN ('equipe_externa', 'bem_estar', 'supers')
      AND au.is_coord = true
      AND au.ativo = true
      AND au.role = role        -- só pode convidar para o mesmo papel
    )
    AND is_coord = false        -- coordenadores não podem criar outros coordenadores
  );
```

### 2. `src/services/adminUsers.js`

- Adicionar novos papéis ao `ROLE_PERMISSIONS` com flags de permissão por área:
  - `canViewCRM`, `canEditCRM`
  - `canViewGrupos`, `canEditGrupos`
  - `canViewCheckin`, `canEditCheckin`
  - `canViewEquipe`
  - `canCreateInvites` (derivado de is_coord para papéis de equipe)
- Atualizar `ROLE_DESCRIPTIONS` com os novos papéis
- Atualizar `criarConviteAdmin` para validar que coordenadores só convidem para o seu papel e incluir `is_coord` no convite
- Atualizar `aceitarConvite` para propagar `is_coord` do convite para o novo registro em `admin_users`

### 3. `src/components/AdminUsersManager.jsx`

- No formulário de convite, filtrar os papéis disponíveis com base em quem está logado:
  - Admin: vê todos os papéis + opção de marcar is_coord
  - Coordenador: vê apenas o seu papel base, sem is_coord
- Mostrar badge de "Coordenador" ao lado do nome do usuário quando `is_coord: true`
- Ao exibir/editar role, incluir is_coord como campo separado (visível apenas para admin)

### 4. Proteção de rotas (`src/components/ProtectedRoute.jsx`)

Atualmente o `ProtectedRoute` só verifica autenticação. Adicionar verificação de acesso por área:

- `/admin/crm` → requer `canViewCRM`
- `/admin/grupos` → requer `canViewGrupos`
- `/admin/checkin` → requer `canViewCheckin`
- `/admin/formulario` → requer admin
- `/admin/equipe` → requer admin ou papel de equipe com `canViewEquipe`

### 5. Sidebar/navegação (`src/components/AdminLayout.jsx`)

- Exibir apenas os links de menu que o usuário tem permissão para acessar
- Mostrar nome do papel com label amigável (ex: "Equipe Externa" em vez de `equipe_externa`)
- Exibir badge "Coordenador" quando `is_coord: true`

## Fora do Escopo

- Notificações por e-mail ao ser convidado (comportamento atual mantido)
- Auditoria de ações por equipe
- Permissões por encontro específico (futuro)
