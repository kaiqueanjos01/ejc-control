# Gestão Financeira do Encontro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar módulo de gestão financeira por encontro (despesas por categoria/item e doações em dinheiro ou itens), acessível somente ao role `admin`.

**Architecture:** Quatro novas tabelas Supabase (`fin_categorias`, `fin_itens`, `fin_despesas`, `fin_doacoes`) com RLS restrita a admin. Service layer com funções CRUD + helpers puros para cálculo de totais. Página React em `/admin/financeiro` com 3 abas (Resumo, Despesas, Doações) e modal de configuração de categorias/itens.

**Tech Stack:** React 19, Supabase JS v2, Vite, Vitest, lucide-react, React Router v7.

---

## File Map

| Ação | Arquivo | Responsabilidade |
|---|---|---|
| Create | `supabase/migrations/006_financeiro.sql` | Tabelas fin_* + RLS + índices |
| Create | `src/services/financeiro.js` | CRUD Supabase + helpers puros de cálculo |
| Create | `tests/services/financeiro.test.js` | Testes dos helpers puros |
| Create | `src/pages/admin/Financeiro.jsx` | Página completa com 3 abas |
| Create | `src/components/FinanceiroConfig.jsx` | Modal de gerenciamento de categorias e itens |
| Create | `src/pages/admin/Financeiro.css` | Estilos do módulo |
| Modify | `src/services/adminUsers.js` | Adicionar canViewFinanceiro + canEditFinanceiro |
| Modify | `tests/services/adminUsers.test.js` | Testes das novas permissões |
| Modify | `src/App.jsx` | Nova rota /admin/financeiro |
| Modify | `src/components/AdminLayout.jsx` | Item "Financeiro" no menu lateral |

---

## Task 1: Permissões — adminUsers.js

**Files:**
- Modify: `src/services/adminUsers.js`
- Modify: `tests/services/adminUsers.test.js`

- [ ] **Step 1: Escrever os testes que vão falhar**

Adicionar ao final de `tests/services/adminUsers.test.js`:

```javascript
describe('canViewFinanceiro e canEditFinanceiro', () => {
  it('admin pode ver e editar financeiro', () => {
    expect(ROLE_PERMISSIONS.admin.canViewFinanceiro).toBe(true)
    expect(ROLE_PERMISSIONS.admin.canEditFinanceiro).toBe(true)
  })

  it('nenhum outro role pode ver financeiro', () => {
    const outrosRoles = ['moderador', 'visualizador', 'equipe_externa', 'bem_estar', 'supers']
    outrosRoles.forEach(role => {
      expect(ROLE_PERMISSIONS[role].canViewFinanceiro).toBe(false)
      expect(ROLE_PERMISSIONS[role].canEditFinanceiro).toBe(false)
    })
  })

  it('verificarPermissao admin retorna true para financeiro', () => {
    expect(verificarPermissao({ role: 'admin', is_coord: false }, 'canViewFinanceiro')).toBe(true)
    expect(verificarPermissao({ role: 'admin', is_coord: false }, 'canEditFinanceiro')).toBe(true)
  })

  it('verificarPermissao moderador retorna false para financeiro', () => {
    expect(verificarPermissao({ role: 'moderador', is_coord: false }, 'canViewFinanceiro')).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar testes para confirmar falha**

```bash
cd /Users/kanjos/t4e/ejc_control && npx vitest run tests/services/adminUsers.test.js
```

Esperado: 4 testes novos FAIL com `Cannot read properties of undefined`.

- [ ] **Step 3: Adicionar as permissões em ROLE_PERMISSIONS**

Em `src/services/adminUsers.js`, adicionar `canViewFinanceiro` e `canEditFinanceiro` a cada role. O resultado final de cada objeto de role deve incluir estas chaves:

```javascript
export const ROLE_PERMISSIONS = {
  admin: {
    canViewUsers: true, canCreateUsers: true, canEditUsers: true, canDeleteUsers: true,
    canViewInvites: true, canCreateInvites: true, canDeleteInvites: true,
    canViewCRM: true, canEditCRM: true,
    canViewGrupos: true, canEditGrupos: true,
    canViewCheckin: true, canEditCheckin: true,
    canViewFormulario: true,
    canViewEquipe: true,
    canViewFinanceiro: true, canEditFinanceiro: true,
  },
  moderador: {
    canViewUsers: true, canCreateUsers: false, canEditUsers: false, canDeleteUsers: false,
    canViewInvites: false, canCreateInvites: false, canDeleteInvites: false,
    canViewCRM: true, canEditCRM: false,
    canViewGrupos: true, canEditGrupos: false,
    canViewCheckin: true, canEditCheckin: false,
    canViewFormulario: false,
    canViewEquipe: false,
    canViewFinanceiro: false, canEditFinanceiro: false,
  },
  visualizador: {
    canViewUsers: false, canCreateUsers: false, canEditUsers: false, canDeleteUsers: false,
    canViewInvites: false, canCreateInvites: false, canDeleteInvites: false,
    canViewCRM: true, canEditCRM: false,
    canViewGrupos: true, canEditGrupos: false,
    canViewCheckin: true, canEditCheckin: false,
    canViewFormulario: false,
    canViewEquipe: false,
    canViewFinanceiro: false, canEditFinanceiro: false,
  },
  equipe_externa: {
    canViewUsers: false, canCreateUsers: false, canEditUsers: false, canDeleteUsers: false,
    canViewInvites: false, canCreateInvites: false, canDeleteInvites: false,
    canViewCRM: true, canEditCRM: true,
    canViewGrupos: true, canEditGrupos: false,
    canViewCheckin: true, canEditCheckin: false,
    canViewFormulario: false,
    canViewEquipe: true,
    canViewFinanceiro: false, canEditFinanceiro: false,
  },
  bem_estar: {
    canViewUsers: false, canCreateUsers: false, canEditUsers: false, canDeleteUsers: false,
    canViewInvites: false, canCreateInvites: false, canDeleteInvites: false,
    canViewCRM: true, canEditCRM: false,
    canViewGrupos: true, canEditGrupos: false,
    canViewCheckin: true, canEditCheckin: true,
    canViewFormulario: false,
    canViewEquipe: true,
    canViewFinanceiro: false, canEditFinanceiro: false,
  },
  supers: {
    canViewUsers: false, canCreateUsers: false, canEditUsers: false, canDeleteUsers: false,
    canViewInvites: false, canCreateInvites: false, canDeleteInvites: false,
    canViewCRM: true, canEditCRM: false,
    canViewGrupos: true, canEditGrupos: true,
    canViewCheckin: true, canEditCheckin: false,
    canViewFormulario: false,
    canViewEquipe: true,
    canViewFinanceiro: false, canEditFinanceiro: false,
  },
}
```

- [ ] **Step 4: Rodar testes para confirmar que passam**

```bash
cd /Users/kanjos/t4e/ejc_control && npx vitest run tests/services/adminUsers.test.js
```

Esperado: todos os testes PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/kanjos/t4e/ejc_control
git add src/services/adminUsers.js tests/services/adminUsers.test.js
git commit -m "feat: add canViewFinanceiro and canEditFinanceiro permissions"
```

---

## Task 2: Migration SQL

**Files:**
- Create: `supabase/migrations/006_financeiro.sql`

- [ ] **Step 1: Criar o arquivo de migration**

Criar `supabase/migrations/006_financeiro.sql` com o conteúdo abaixo. A função `current_admin_role()` já existe (criada em 004_team_roles.sql).

```sql
-- Tabela de categorias financeiras por encontro
CREATE TABLE fin_categorias (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  encontro_id uuid       NOT NULL REFERENCES encontros(id) ON DELETE CASCADE,
  nome       text        NOT NULL,
  ordem      integer     NOT NULL DEFAULT 0,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

-- Catálogo de itens por encontro
CREATE TABLE fin_itens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  encontro_id uuid        NOT NULL REFERENCES encontros(id) ON DELETE CASCADE,
  categoria_id uuid       NOT NULL REFERENCES fin_categorias(id) ON DELETE RESTRICT,
  nome        text        NOT NULL,
  unidade     text        NOT NULL DEFAULT 'unid',
  criado_em   timestamptz NOT NULL DEFAULT now()
);

-- Lançamentos de despesa (um registro por item comprado)
CREATE TABLE fin_despesas (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  encontro_id   uuid        NOT NULL REFERENCES encontros(id) ON DELETE CASCADE,
  item_id       uuid        NOT NULL REFERENCES fin_itens(id) ON DELETE RESTRICT,
  quantidade    numeric     NOT NULL CHECK (quantidade > 0),
  valor_unitario numeric    NOT NULL CHECK (valor_unitario >= 0),
  data          date        NOT NULL DEFAULT CURRENT_DATE,
  observacao    text,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- Lançamentos de doação (dinheiro ou item)
CREATE TABLE fin_doacoes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  encontro_id uuid        NOT NULL REFERENCES encontros(id) ON DELETE CASCADE,
  tipo        text        NOT NULL CHECK (tipo IN ('dinheiro', 'item')),
  valor       numeric,
  item_id     uuid        REFERENCES fin_itens(id) ON DELETE RESTRICT,
  quantidade  numeric,
  doador      text,
  data        date        NOT NULL DEFAULT CURRENT_DATE,
  observacao  text,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fin_doacoes_dinheiro_check CHECK (
    tipo != 'dinheiro' OR (valor IS NOT NULL AND valor >= 0)
  ),
  CONSTRAINT fin_doacoes_item_check CHECK (
    tipo != 'item' OR (item_id IS NOT NULL AND quantidade IS NOT NULL AND quantidade > 0)
  )
);

-- Habilitar RLS
ALTER TABLE fin_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_itens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_despesas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_doacoes    ENABLE ROW LEVEL SECURITY;

-- Políticas: somente admin
CREATE POLICY "admin_fin_categorias" ON fin_categorias
  FOR ALL USING (current_admin_role() = 'admin');

CREATE POLICY "admin_fin_itens" ON fin_itens
  FOR ALL USING (current_admin_role() = 'admin');

CREATE POLICY "admin_fin_despesas" ON fin_despesas
  FOR ALL USING (current_admin_role() = 'admin');

CREATE POLICY "admin_fin_doacoes" ON fin_doacoes
  FOR ALL USING (current_admin_role() = 'admin');

-- Índices para queries por encontro
CREATE INDEX fin_categorias_encontro_idx ON fin_categorias(encontro_id);
CREATE INDEX fin_itens_encontro_idx      ON fin_itens(encontro_id);
CREATE INDEX fin_itens_categoria_idx     ON fin_itens(categoria_id);
CREATE INDEX fin_despesas_encontro_idx   ON fin_despesas(encontro_id);
CREATE INDEX fin_doacoes_encontro_idx    ON fin_doacoes(encontro_id);
```

- [ ] **Step 2: Aplicar migration no Supabase**

Rodar via Supabase CLI ou Dashboard SQL editor. Se usar CLI:

```bash
cd /Users/kanjos/t4e/ejc_control && supabase db push
```

Confirmar que as 4 tabelas foram criadas sem erros.

- [ ] **Step 3: Commit**

```bash
cd /Users/kanjos/t4e/ejc_control
git add supabase/migrations/006_financeiro.sql
git commit -m "feat: add fin_categorias, fin_itens, fin_despesas, fin_doacoes tables with RLS"
```

---

## Task 3: Service — helpers puros + testes

**Files:**
- Create: `src/services/financeiro.js` (apenas os helpers puros por agora)
- Create: `tests/services/financeiro.test.js`

- [ ] **Step 1: Escrever os testes**

Criar `tests/services/financeiro.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import {
  calcularTotalPorCategoria,
  calcularTotalDespesas,
  calcularTotalDoacoesDinheiro,
} from '../../src/services/financeiro'

const categorias = [
  { id: 'cat-1', nome: 'Cozinha', ordem: 0 },
  { id: 'cat-2', nome: 'Limpeza', ordem: 1 },
]

const itens = [
  { id: 'item-1', categoria_id: 'cat-1', nome: 'Arroz', unidade: 'kg' },
  { id: 'item-2', categoria_id: 'cat-1', nome: 'Feijão', unidade: 'kg' },
  { id: 'item-3', categoria_id: 'cat-2', nome: 'Detergente', unidade: 'unid' },
]

const despesas = [
  { id: 'd-1', item_id: 'item-1', quantidade: 10, valor_unitario: 5 },   // 50
  { id: 'd-2', item_id: 'item-2', quantidade: 5,  valor_unitario: 8 },   // 40
  { id: 'd-3', item_id: 'item-3', quantidade: 3,  valor_unitario: 2.5 }, // 7.5
]

describe('calcularTotalPorCategoria', () => {
  it('soma corretamente os totais de cada categoria', () => {
    const resultado = calcularTotalPorCategoria(categorias, itens, despesas)
    expect(resultado).toHaveLength(2)

    const cozinha = resultado.find(r => r.id === 'cat-1')
    expect(cozinha.total).toBeCloseTo(90) // 50 + 40

    const limpeza = resultado.find(r => r.id === 'cat-2')
    expect(limpeza.total).toBeCloseTo(7.5)
  })

  it('retorna total zero para categoria sem despesas', () => {
    const resultado = calcularTotalPorCategoria(
      [{ id: 'cat-vazia', nome: 'Vazia', ordem: 0 }],
      [],
      []
    )
    expect(resultado[0].total).toBe(0)
  })

  it('inclui lista de itens da categoria no resultado', () => {
    const resultado = calcularTotalPorCategoria(categorias, itens, despesas)
    const cozinha = resultado.find(r => r.id === 'cat-1')
    expect(cozinha.itens).toHaveLength(2)
    expect(cozinha.itens.map(i => i.id)).toContain('item-1')
    expect(cozinha.itens.map(i => i.id)).toContain('item-2')
  })
})

describe('calcularTotalDespesas', () => {
  it('soma quantidade * valor_unitario de todas as despesas', () => {
    expect(calcularTotalDespesas(despesas)).toBeCloseTo(97.5)
  })

  it('retorna 0 para lista vazia', () => {
    expect(calcularTotalDespesas([])).toBe(0)
  })
})

describe('calcularTotalDoacoesDinheiro', () => {
  const doacoes = [
    { id: 'do-1', tipo: 'dinheiro', valor: 100 },
    { id: 'do-2', tipo: 'item',     valor: null, item_id: 'item-1', quantidade: 2 },
    { id: 'do-3', tipo: 'dinheiro', valor: 50 },
  ]

  it('soma apenas as doações do tipo dinheiro', () => {
    expect(calcularTotalDoacoesDinheiro(doacoes)).toBe(150)
  })

  it('retorna 0 para lista vazia', () => {
    expect(calcularTotalDoacoesDinheiro([])).toBe(0)
  })

  it('retorna 0 quando não há doações em dinheiro', () => {
    const soDoacoesItem = [
      { id: 'do-1', tipo: 'item', valor: null, item_id: 'item-1', quantidade: 2 },
    ]
    expect(calcularTotalDoacoesDinheiro(soDoacoesItem)).toBe(0)
  })
})
```

- [ ] **Step 2: Rodar testes para confirmar falha**

```bash
cd /Users/kanjos/t4e/ejc_control && npx vitest run tests/services/financeiro.test.js
```

Esperado: FAIL com `Cannot find module`.

- [ ] **Step 3: Criar financeiro.js com os helpers puros**

Criar `src/services/financeiro.js`:

```javascript
import { supabase } from '../lib/supabase'

// ─── Helpers puros (testáveis sem Supabase) ───────────────────────────────────

export function calcularTotalPorCategoria(categorias, itens, despesas) {
  return categorias.map(cat => {
    const itensDaCategoria = itens.filter(i => i.categoria_id === cat.id)
    const itemIds = new Set(itensDaCategoria.map(i => i.id))
    const total = despesas
      .filter(d => itemIds.has(d.item_id))
      .reduce((sum, d) => sum + d.quantidade * d.valor_unitario, 0)
    return { ...cat, total, itens: itensDaCategoria }
  })
}

export function calcularTotalDespesas(despesas) {
  return despesas.reduce((sum, d) => sum + d.quantidade * d.valor_unitario, 0)
}

export function calcularTotalDoacoesDinheiro(doacoes) {
  return doacoes
    .filter(d => d.tipo === 'dinheiro')
    .reduce((sum, d) => sum + (d.valor || 0), 0)
}

// ─── Categorias ───────────────────────────────────────────────────────────────

export async function listarCategorias(encontroId) {
  const { data, error } = await supabase
    .from('fin_categorias')
    .select('*')
    .eq('encontro_id', encontroId)
    .order('ordem', { ascending: true })
  if (error) throw error
  return data || []
}

export async function criarCategoria(encontroId, nome) {
  const { data, error } = await supabase
    .from('fin_categorias')
    .insert([{ encontro_id: encontroId, nome }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarCategoria(id, nome) {
  const { data, error } = await supabase
    .from('fin_categorias')
    .update({ nome })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletarCategoria(id) {
  const { error } = await supabase
    .from('fin_categorias')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Itens ────────────────────────────────────────────────────────────────────

export async function listarItens(encontroId) {
  const { data, error } = await supabase
    .from('fin_itens')
    .select('*, fin_categorias(id, nome)')
    .eq('encontro_id', encontroId)
    .order('nome', { ascending: true })
  if (error) throw error
  return data || []
}

export async function criarItem(encontroId, categoriaId, nome, unidade) {
  const { data, error } = await supabase
    .from('fin_itens')
    .insert([{ encontro_id: encontroId, categoria_id: categoriaId, nome, unidade }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarItem(id, { nome, unidade, categoria_id }) {
  const { data, error } = await supabase
    .from('fin_itens')
    .update({ nome, unidade, categoria_id })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletarItem(id) {
  const { error } = await supabase
    .from('fin_itens')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Despesas ─────────────────────────────────────────────────────────────────

export async function listarDespesas(encontroId) {
  const { data, error } = await supabase
    .from('fin_despesas')
    .select('*, fin_itens(id, nome, unidade, categoria_id, fin_categorias(id, nome))')
    .eq('encontro_id', encontroId)
    .order('data', { ascending: false })
  if (error) throw error
  return data || []
}

export async function criarDespesa(encontroId, itemId, quantidade, valorUnitario, data, observacao) {
  const { data: row, error } = await supabase
    .from('fin_despesas')
    .insert([{
      encontro_id: encontroId,
      item_id: itemId,
      quantidade,
      valor_unitario: valorUnitario,
      data,
      observacao: observacao || null,
    }])
    .select()
    .single()
  if (error) throw error
  return row
}

export async function deletarDespesa(id) {
  const { error } = await supabase
    .from('fin_despesas')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ─── Doações ──────────────────────────────────────────────────────────────────

export async function listarDoacoes(encontroId) {
  const { data, error } = await supabase
    .from('fin_doacoes')
    .select('*, fin_itens(id, nome, unidade)')
    .eq('encontro_id', encontroId)
    .order('data', { ascending: false })
  if (error) throw error
  return data || []
}

export async function criarDoacao(encontroId, tipo, { valor, itemId, quantidade, doador, data, observacao }) {
  const { data: row, error } = await supabase
    .from('fin_doacoes')
    .insert([{
      encontro_id: encontroId,
      tipo,
      valor: tipo === 'dinheiro' ? valor : null,
      item_id: tipo === 'item' ? itemId : null,
      quantidade: tipo === 'item' ? quantidade : null,
      doador: doador || null,
      data,
      observacao: observacao || null,
    }])
    .select()
    .single()
  if (error) throw error
  return row
}

export async function deletarDoacao(id) {
  const { error } = await supabase
    .from('fin_doacoes')
    .delete()
    .eq('id', id)
  if (error) throw error
}
```

- [ ] **Step 4: Rodar testes para confirmar que passam**

```bash
cd /Users/kanjos/t4e/ejc_control && npx vitest run tests/services/financeiro.test.js
```

Esperado: todos os testes PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/kanjos/t4e/ejc_control
git add src/services/financeiro.js tests/services/financeiro.test.js
git commit -m "feat: add financeiro service with CRUD and pure calculation helpers"
```

---

## Task 4: Rota e menu lateral

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/AdminLayout.jsx`

- [ ] **Step 1: Adicionar rota em App.jsx**

Adicionar o import e a rota. O arquivo deve ficar assim (adicionando as linhas marcadas):

```javascript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Inscricao } from './pages/public/Inscricao'
import { Ficha } from './pages/public/Ficha'
import { Checkin } from './pages/public/Checkin'
import { Login } from './pages/admin/Login'
import { SeletorEncontro } from './pages/admin/SeletorEncontro'
import { CRM } from './pages/admin/CRM'
import { EncontristaDetalhe } from './pages/admin/EncontristaDetalhe'
import { Grupos } from './pages/admin/Grupos'
import { CheckinAdmin } from './pages/admin/CheckinAdmin'
import { Configuracoes } from './pages/admin/Configuracoes'
import { Formulario } from './pages/admin/Formulario'
import { Equipe } from './pages/admin/Equipe'
import { AceitarConvite } from './pages/admin/AceitarConvite'
import { Financeiro } from './pages/admin/Financeiro'   // ← ADICIONAR

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/inscricao/:encontroId" element={<Inscricao />} />
        <Route path="/ficha/:token" element={<Ficha />} />
        <Route path="/checkin/:token" element={<Checkin />} />

        {/* Admin */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin/convite/:token" element={<AceitarConvite />} />
        <Route path="/admin" element={<ProtectedRoute><SeletorEncontro /></ProtectedRoute>} />
        <Route path="/admin/crm" element={<ProtectedRoute requiredPermission="canViewCRM"><CRM /></ProtectedRoute>} />
        <Route path="/admin/crm/:id" element={<ProtectedRoute requiredPermission="canViewCRM"><EncontristaDetalhe /></ProtectedRoute>} />
        <Route path="/admin/grupos" element={<ProtectedRoute requiredPermission="canViewGrupos"><Grupos /></ProtectedRoute>} />
        <Route path="/admin/checkin" element={<ProtectedRoute requiredPermission="canViewCheckin"><CheckinAdmin /></ProtectedRoute>} />
        <Route path="/admin/formulario" element={<ProtectedRoute requiredPermission="canViewFormulario"><Formulario /></ProtectedRoute>} />
        <Route path="/admin/equipe" element={<ProtectedRoute requiredPermission="canViewEquipe"><Equipe /></ProtectedRoute>} />
        <Route path="/admin/configuracoes" element={<ProtectedRoute requiredPermission="canViewFormulario"><Configuracoes /></ProtectedRoute>} />
        <Route path="/admin/financeiro" element={<ProtectedRoute requiredPermission="canViewFinanceiro"><Financeiro /></ProtectedRoute>} />  {/* ← ADICIONAR */}

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: Adicionar item no menu de AdminLayout.jsx**

Adicionar `DollarSign` ao import do lucide-react e o item de nav. As linhas a modificar em `src/components/AdminLayout.jsx`:

**Import do lucide-react** — trocar a linha existente por:
```javascript
import {
  BarChart2, Users, CheckSquare, Settings,
  Moon, Sun, Menu, LogOut, FileText, UsersRound, DollarSign
} from 'lucide-react'
```

**Array allNavItems** — adicionar o item de financeiro após o de equipe:
```javascript
const allNavItems = [
  { to: '/admin/crm',          label: 'CRM',          icon: <BarChart2 size={16} />,    permission: 'canViewCRM' },
  { to: '/admin/grupos',       label: 'Grupos',        icon: <Users size={16} />,         permission: 'canViewGrupos' },
  { to: '/admin/checkin',      label: 'Check-in',      icon: <CheckSquare size={16} />,   permission: 'canViewCheckin' },
  { to: '/admin/formulario',   label: 'Formulário',    icon: <FileText size={16} />,      permission: 'canViewFormulario' },
  { to: '/admin/equipe',       label: 'Equipe',        icon: <UsersRound size={16} />,    permission: 'canViewEquipe' },
  { to: '/admin/financeiro',   label: 'Financeiro',    icon: <DollarSign size={16} />,    permission: 'canViewFinanceiro' },  // ← ADICIONAR
  { to: '/admin/configuracoes',label: 'Configurações', icon: <Settings size={16} />,      permission: 'canViewFormulario' },
]
```

- [ ] **Step 3: Confirmar que o app compila sem erros**

```bash
cd /Users/kanjos/t4e/ejc_control && npx vite build 2>&1 | tail -5
```

Esperado: `built in Xs` sem erros. (Vai falhar se Financeiro.jsx não existir ainda — se sim, criar um stub temporário: `export function Financeiro() { return null }` em `src/pages/admin/Financeiro.jsx`.)

- [ ] **Step 4: Commit**

```bash
cd /Users/kanjos/t4e/ejc_control
git add src/App.jsx src/components/AdminLayout.jsx src/pages/admin/Financeiro.jsx
git commit -m "feat: add /admin/financeiro route and nav item"
```

---

## Task 5: Página Financeiro — estrutura base + aba Resumo

**Files:**
- Create/Modify: `src/pages/admin/Financeiro.jsx`
- Create: `src/pages/admin/Financeiro.css`

- [ ] **Step 1: Criar o CSS base**

Criar `src/pages/admin/Financeiro.css`:

```css
.financeiro-container {
  padding: 24px;
  max-width: 960px;
}

.financeiro-container h2 {
  margin-bottom: 4px;
}

.financeiro-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;
  flex-wrap: wrap;
}

.financeiro-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 2px solid var(--color-border);
  margin-bottom: 24px;
}

.financeiro-tab {
  padding: 8px 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--color-text-muted);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.15s;
}

.financeiro-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 600;
}

/* Resumo */
.resumo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.resumo-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
}

.resumo-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.resumo-card-nome {
  font-weight: 600;
  font-size: 1rem;
}

.resumo-card-total {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-primary);
}

.resumo-card-itens {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.resumo-card-itens li {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  border-top: 1px solid var(--color-border);
}

.resumo-rodape {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.resumo-rodape-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.resumo-rodape-label {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.resumo-rodape-valor {
  font-size: 1.2rem;
  font-weight: 700;
}

.resumo-rodape-valor.negativo {
  color: #e74c3c;
}

.resumo-rodape-valor.positivo {
  color: #27ae60;
}

/* Tabelas de despesas e doações */
.financeiro-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.financeiro-form {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.financeiro-form h3 {
  margin-bottom: 16px;
  font-size: 1rem;
}

.financeiro-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.financeiro-form-actions {
  display: flex;
  gap: 8px;
}

.financeiro-table-wrapper {
  overflow-x: auto;
}

.fin-empty {
  text-align: center;
  padding: 32px;
  color: var(--color-text-muted);
  font-size: 0.95rem;
}

/* Config modal */
.fin-config-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.fin-config-modal {
  background: var(--color-background);
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  overflow-y: auto;
}

.fin-config-modal h3 {
  margin-bottom: 20px;
}

.fin-config-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
}

.fin-config-tab {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
}

.fin-config-tab.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.fin-config-list {
  list-style: none;
  padding: 0;
  margin: 0 0 16px 0;
}

.fin-config-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  gap: 8px;
}

.fin-config-add {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
```

- [ ] **Step 2: Criar Financeiro.jsx com estrutura base + aba Resumo**

Criar `src/pages/admin/Financeiro.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react'
import { Settings } from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import {
  listarCategorias,
  listarItens,
  listarDespesas,
  listarDoacoes,
  criarDespesa,
  deletarDespesa,
  criarDoacao,
  deletarDoacao,
  criarItem,
  calcularTotalPorCategoria,
  calcularTotalDespesas,
  calcularTotalDoacoesDinheiro,
} from '../../services/financeiro'
import { FinanceiroConfig } from '../../components/FinanceiroConfig'
import './Financeiro.css'

function formatBRL(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function hoje() {
  return new Date().toISOString().split('T')[0]
}

export function Financeiro() {
  const { encontroId } = useEncontro()

  const [aba, setAba] = useState('resumo')
  const [categorias, setCategorias] = useState([])
  const [itens, setItens] = useState([])
  const [despesas, setDespesas] = useState([])
  const [doacoes, setDoacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showConfig, setShowConfig] = useState(false)

  // Estado do formulário de despesa
  const [showFormDespesa, setShowFormDespesa] = useState(false)
  const [fdItemId, setFdItemId] = useState('')
  const [fdCriarItem, setFdCriarItem] = useState(false)
  const [fdNovoItemNome, setFdNovoItemNome] = useState('')
  const [fdNovoItemCategoria, setFdNovoItemCategoria] = useState('')
  const [fdNovoItemUnidade, setFdNovoItemUnidade] = useState('unid')
  const [fdQtd, setFdQtd] = useState('')
  const [fdValor, setFdValor] = useState('')
  const [fdData, setFdData] = useState(hoje())
  const [fdObs, setFdObs] = useState('')
  const [fdSaving, setFdSaving] = useState(false)

  // Estado do formulário de doação
  const [showFormDoacao, setShowFormDoacao] = useState(false)
  const [doTipo, setDoTipo] = useState('dinheiro')
  const [doValor, setDoValor] = useState('')
  const [doItemId, setDoItemId] = useState('')
  const [doQtd, setDoQtd] = useState('')
  const [doDoador, setDoDoador] = useState('')
  const [doData, setDoData] = useState(hoje())
  const [doObs, setDoObs] = useState('')
  const [doSaving, setDoSaving] = useState(false)

  const [confirmandoId, setConfirmandoId] = useState(null)
  const [confirmandoTipo, setConfirmandoTipo] = useState(null)

  const carregar = useCallback(async () => {
    if (!encontroId) return
    try {
      setLoading(true)
      const [cats, its, desps, doas] = await Promise.all([
        listarCategorias(encontroId),
        listarItens(encontroId),
        listarDespesas(encontroId),
        listarDoacoes(encontroId),
      ])
      setCategorias(cats)
      setItens(its)
      setDespesas(desps)
      setDoacoes(doas)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [encontroId])

  useEffect(() => { carregar() }, [carregar])

  // ── handlers despesa ──────────────────────────────────────────────────────

  async function handleSalvarDespesa() {
    try {
      setFdSaving(true)
      let itemId = fdItemId
      if (fdCriarItem) {
        if (!fdNovoItemNome.trim() || !fdNovoItemCategoria) {
          setError('Nome e categoria do item são obrigatórios')
          return
        }
        const novoItem = await criarItem(encontroId, fdNovoItemCategoria, fdNovoItemNome.trim(), fdNovoItemUnidade)
        itemId = novoItem.id
      }
      if (!itemId) { setError('Selecione um item'); return }
      if (!fdQtd || !fdValor) { setError('Quantidade e valor são obrigatórios'); return }
      await criarDespesa(encontroId, itemId, parseFloat(fdQtd), parseFloat(fdValor), fdData, fdObs)
      resetFormDespesa()
      await carregar()
    } catch (e) {
      setError(e.message)
    } finally {
      setFdSaving(false)
    }
  }

  function resetFormDespesa() {
    setShowFormDespesa(false)
    setFdItemId(''); setFdCriarItem(false)
    setFdNovoItemNome(''); setFdNovoItemCategoria(''); setFdNovoItemUnidade('unid')
    setFdQtd(''); setFdValor(''); setFdData(hoje()); setFdObs('')
  }

  // ── handlers doação ───────────────────────────────────────────────────────

  async function handleSalvarDoacao() {
    try {
      setDoSaving(true)
      if (doTipo === 'dinheiro' && !doValor) { setError('Valor é obrigatório'); return }
      if (doTipo === 'item' && (!doItemId || !doQtd)) { setError('Item e quantidade são obrigatórios'); return }
      await criarDoacao(encontroId, doTipo, {
        valor: doTipo === 'dinheiro' ? parseFloat(doValor) : null,
        itemId: doTipo === 'item' ? doItemId : null,
        quantidade: doTipo === 'item' ? parseFloat(doQtd) : null,
        doador: doDoador || null,
        data: doData,
        observacao: doObs || null,
      })
      resetFormDoacao()
      await carregar()
    } catch (e) {
      setError(e.message)
    } finally {
      setDoSaving(false)
    }
  }

  function resetFormDoacao() {
    setShowFormDoacao(false)
    setDoTipo('dinheiro'); setDoValor(''); setDoItemId('')
    setDoQtd(''); setDoDoador(''); setDoData(hoje()); setDoObs('')
  }

  // ── handler deletar ───────────────────────────────────────────────────────

  async function handleDeletar(id, tipo) {
    try {
      if (tipo === 'despesa') await deletarDespesa(id)
      else await deletarDoacao(id)
      setConfirmandoId(null)
      await carregar()
    } catch (e) {
      setError(e.message)
    }
  }

  // ── cálculos ──────────────────────────────────────────────────────────────

  const resumoPorCategoria = calcularTotalPorCategoria(categorias, itens, despesas)
  const totalDespesas = calcularTotalDespesas(despesas)
  const totalDoacoesDinheiro = calcularTotalDoacoesDinheiro(doacoes)

  // ── render ────────────────────────────────────────────────────────────────

  if (!encontroId) {
    return (
      <AdminLayout>
        <div className="financeiro-container">
          <p className="text-muted">Selecione um encontro para acessar o financeiro.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="financeiro-container">
        <div className="financeiro-header">
          <h2>Financeiro</h2>
          <button className="btn btn-secondary" onClick={() => setShowConfig(true)} title="Gerenciar categorias e itens">
            <Settings size={14} /> Categorias &amp; Itens
          </button>
        </div>

        {error && <div className="admin-error" style={{ marginBottom: 16 }}>{error}<button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button></div>}

        <div className="financeiro-tabs">
          {['resumo', 'despesas', 'doacoes'].map(t => (
            <button
              key={t}
              className={`financeiro-tab ${aba === t ? 'active' : ''}`}
              onClick={() => setAba(t)}
            >
              {t === 'resumo' ? 'Resumo' : t === 'despesas' ? 'Despesas' : 'Doações'}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted">Carregando...</p>
        ) : (
          <>
            {aba === 'resumo' && (
              <AbaResumo
                resumo={resumoPorCategoria}
                despesas={despesas}
                totalDespesas={totalDespesas}
                totalDoacoesDinheiro={totalDoacoesDinheiro}
              />
            )}
            {aba === 'despesas' && (
              <AbaDespesas
                despesas={despesas}
                itens={itens}
                categorias={categorias}
                showForm={showFormDespesa}
                setShowForm={setShowFormDespesa}
                fdItemId={fdItemId} setFdItemId={setFdItemId}
                fdCriarItem={fdCriarItem} setFdCriarItem={setFdCriarItem}
                fdNovoItemNome={fdNovoItemNome} setFdNovoItemNome={setFdNovoItemNome}
                fdNovoItemCategoria={fdNovoItemCategoria} setFdNovoItemCategoria={setFdNovoItemCategoria}
                fdNovoItemUnidade={fdNovoItemUnidade} setFdNovoItemUnidade={setFdNovoItemUnidade}
                fdQtd={fdQtd} setFdQtd={setFdQtd}
                fdValor={fdValor} setFdValor={setFdValor}
                fdData={fdData} setFdData={setFdData}
                fdObs={fdObs} setFdObs={setFdObs}
                fdSaving={fdSaving}
                onSalvar={handleSalvarDespesa}
                onCancelar={resetFormDespesa}
                confirmandoId={confirmandoId} setConfirmandoId={setConfirmandoId}
                confirmandoTipo={confirmandoTipo} setConfirmandoTipo={setConfirmandoTipo}
                onDeletar={handleDeletar}
              />
            )}
            {aba === 'doacoes' && (
              <AbaDoacoes
                doacoes={doacoes}
                itens={itens}
                showForm={showFormDoacao}
                setShowForm={setShowFormDoacao}
                doTipo={doTipo} setDoTipo={setDoTipo}
                doValor={doValor} setDoValor={setDoValor}
                doItemId={doItemId} setDoItemId={setDoItemId}
                doQtd={doQtd} setDoQtd={setDoQtd}
                doDoador={doDoador} setDoDoador={setDoDoador}
                doData={doData} setDoData={setDoData}
                doObs={doObs} setDoObs={setDoObs}
                doSaving={doSaving}
                onSalvar={handleSalvarDoacao}
                onCancelar={resetFormDoacao}
                confirmandoId={confirmandoId} setConfirmandoId={setConfirmandoId}
                confirmandoTipo={confirmandoTipo} setConfirmandoTipo={setConfirmandoTipo}
                onDeletar={handleDeletar}
              />
            )}
          </>
        )}
      </div>

      {showConfig && (
        <FinanceiroConfig
          encontroId={encontroId}
          categorias={categorias}
          itens={itens}
          onClose={() => setShowConfig(false)}
          onUpdate={carregar}
        />
      )}
    </AdminLayout>
  )
}

// ─── Aba Resumo ───────────────────────────────────────────────────────────────

function AbaResumo({ resumo, despesas, totalDespesas, totalDoacoesDinheiro }) {
  if (resumo.length === 0) {
    return <p className="fin-empty">Nenhuma categoria cadastrada. Use "Categorias &amp; Itens" para começar.</p>
  }

  // Para o resumo por item, precisamos dos totais agrupados por item dentro de cada categoria
  function totaisItensPorCategoria(catId, itensDaCategoria, despesas) {
    return itensDaCategoria.map(item => {
      const totalItem = despesas
        .filter(d => d.item_id === item.id)
        .reduce((s, d) => s + d.quantidade * d.valor_unitario, 0)
      const qtdTotal = despesas
        .filter(d => d.item_id === item.id)
        .reduce((s, d) => s + d.quantidade, 0)
      return { ...item, totalItem, qtdTotal }
    }).filter(i => i.qtdTotal > 0)
  }

  return (
    <>
      <div className="resumo-grid">
        {resumo.map(cat => {
          const itensCat = totaisItensPorCategoria(cat.id, cat.itens, despesas)
          return (
            <div key={cat.id} className="resumo-card">
              <div className="resumo-card-header">
                <span className="resumo-card-nome">{cat.nome}</span>
                <span className="resumo-card-total">{formatBRL(cat.total)}</span>
              </div>
              {itensCat.length > 0 ? (
                <ul className="resumo-card-itens">
                  {itensCat.map(item => (
                    <li key={item.id}>
                      <span>{item.nome} ({item.qtdTotal} {item.unidade})</span>
                      <span>{formatBRL(item.totalItem)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>Sem despesas</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="resumo-rodape">
        <div className="resumo-rodape-item">
          <span className="resumo-rodape-label">Total Despesas</span>
          <span className={`resumo-rodape-valor ${totalDespesas > 0 ? 'negativo' : ''}`}>{formatBRL(totalDespesas)}</span>
        </div>
        <div className="resumo-rodape-item">
          <span className="resumo-rodape-label">Total Doações (dinheiro)</span>
          <span className={`resumo-rodape-valor ${totalDoacoesDinheiro > 0 ? 'positivo' : ''}`}>{formatBRL(totalDoacoesDinheiro)}</span>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Verificar que o app ainda compila**

```bash
cd /Users/kanjos/t4e/ejc_control && npx vite build 2>&1 | tail -10
```

Vai falhar com erro de `FinanceiroConfig` não encontrado — isso é esperado, prosseguir para o próximo task.

- [ ] **Step 4: Commit parcial**

```bash
cd /Users/kanjos/t4e/ejc_control
git add src/pages/admin/Financeiro.jsx src/pages/admin/Financeiro.css
git commit -m "feat: add Financeiro page base structure and Resumo tab"
```

---

## Task 6: Aba Despesas + Aba Doações

**Files:**
- Modify: `src/pages/admin/Financeiro.jsx` (adicionar as funções AbaDespesas e AbaDoacoes no mesmo arquivo)

- [ ] **Step 1: Adicionar AbaDespesas ao final de Financeiro.jsx**

Adicionar após a função `AbaResumo`, antes do último `}` do arquivo:

```jsx
// ─── Aba Despesas ─────────────────────────────────────────────────────────────

function AbaDespesas({
  despesas, itens, categorias,
  showForm, setShowForm,
  fdItemId, setFdItemId,
  fdCriarItem, setFdCriarItem,
  fdNovoItemNome, setFdNovoItemNome,
  fdNovoItemCategoria, setFdNovoItemCategoria,
  fdNovoItemUnidade, setFdNovoItemUnidade,
  fdQtd, setFdQtd,
  fdValor, setFdValor,
  fdData, setFdData,
  fdObs, setFdObs,
  fdSaving, onSalvar, onCancelar,
  confirmandoId, setConfirmandoId, confirmandoTipo, setConfirmandoTipo, onDeletar,
}) {
  return (
    <div>
      <div className="financeiro-toolbar">
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Despesa'}
        </button>
      </div>

      {showForm && (
        <div className="financeiro-form">
          <h3>Nova Despesa</h3>
          <div className="financeiro-form-grid">
            <div className="form-group">
              <label>Item *</label>
              <select
                value={fdCriarItem ? '__novo__' : fdItemId}
                onChange={e => {
                  if (e.target.value === '__novo__') {
                    setFdCriarItem(true)
                    setFdItemId('')
                  } else {
                    setFdCriarItem(false)
                    setFdItemId(e.target.value)
                  }
                }}
              >
                <option value="">Selecionar item...</option>
                {itens.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.nome} ({i.unidade}) — {i.fin_categorias?.nome}
                  </option>
                ))}
                <option value="__novo__">+ Criar novo item</option>
              </select>
            </div>

            {fdCriarItem && (
              <>
                <div className="form-group">
                  <label>Nome do item *</label>
                  <input
                    type="text"
                    value={fdNovoItemNome}
                    onChange={e => setFdNovoItemNome(e.target.value)}
                    placeholder="Ex: Arroz"
                  />
                </div>
                <div className="form-group">
                  <label>Categoria *</label>
                  <select value={fdNovoItemCategoria} onChange={e => setFdNovoItemCategoria(e.target.value)}>
                    <option value="">Selecionar...</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Unidade</label>
                  <input
                    type="text"
                    value={fdNovoItemUnidade}
                    onChange={e => setFdNovoItemUnidade(e.target.value)}
                    placeholder="kg, unid, resma..."
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Quantidade *</label>
              <input type="number" min="0.01" step="0.01" value={fdQtd} onChange={e => setFdQtd(e.target.value)} placeholder="0" />
            </div>
            <div className="form-group">
              <label>Valor unitário (R$) *</label>
              <input type="number" min="0" step="0.01" value={fdValor} onChange={e => setFdValor(e.target.value)} placeholder="0,00" />
            </div>
            <div className="form-group">
              <label>Data *</label>
              <input type="date" value={fdData} onChange={e => setFdData(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Observação</label>
              <input type="text" value={fdObs} onChange={e => setFdObs(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <div className="financeiro-form-actions">
            <button className="btn btn-success" onClick={onSalvar} disabled={fdSaving}>
              {fdSaving ? 'Salvando...' : 'Salvar'}
            </button>
            <button className="btn btn-secondary" onClick={onCancelar}>Cancelar</button>
          </div>
        </div>
      )}

      {despesas.length === 0 ? (
        <p className="fin-empty">Nenhuma despesa registrada.</p>
      ) : (
        <div className="financeiro-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Item</th>
                <th>Categoria</th>
                <th>Qtd</th>
                <th>Valor unit.</th>
                <th>Total</th>
                <th>Obs</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {despesas.map(d => (
                <tr key={d.id}>
                  <td>{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td>{d.fin_itens?.nome}</td>
                  <td>{d.fin_itens?.fin_categorias?.nome}</td>
                  <td>{d.quantidade} {d.fin_itens?.unidade}</td>
                  <td>{formatBRL(d.valor_unitario)}</td>
                  <td><strong>{formatBRL(d.quantidade * d.valor_unitario)}</strong></td>
                  <td>{d.observacao || '—'}</td>
                  <td>
                    {confirmandoId === d.id && confirmandoTipo === 'despesa' ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm btn-danger" onClick={() => onDeletar(d.id, 'despesa')}>Confirmar?</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => { setConfirmandoId(null); setConfirmandoTipo(null) }}>Não</button>
                      </div>
                    ) : (
                      <button className="btn btn-sm btn-danger" onClick={() => { setConfirmandoId(d.id); setConfirmandoTipo('despesa') }}>Excluir</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Aba Doações ──────────────────────────────────────────────────────────────

function AbaDoacoes({
  doacoes, itens,
  showForm, setShowForm,
  doTipo, setDoTipo,
  doValor, setDoValor,
  doItemId, setDoItemId,
  doQtd, setDoQtd,
  doDoador, setDoDoador,
  doData, setDoData,
  doObs, setDoObs,
  doSaving, onSalvar, onCancelar,
  confirmandoId, setConfirmandoId, confirmandoTipo, setConfirmandoTipo, onDeletar,
}) {
  return (
    <div>
      <div className="financeiro-toolbar">
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Doação'}
        </button>
      </div>

      {showForm && (
        <div className="financeiro-form">
          <h3>Nova Doação</h3>
          <div className="financeiro-form-grid">
            <div className="form-group">
              <label>Tipo *</label>
              <select value={doTipo} onChange={e => setDoTipo(e.target.value)}>
                <option value="dinheiro">Dinheiro</option>
                <option value="item">Item</option>
              </select>
            </div>

            {doTipo === 'dinheiro' && (
              <div className="form-group">
                <label>Valor (R$) *</label>
                <input type="number" min="0" step="0.01" value={doValor} onChange={e => setDoValor(e.target.value)} placeholder="0,00" />
              </div>
            )}

            {doTipo === 'item' && (
              <>
                <div className="form-group">
                  <label>Item *</label>
                  <select value={doItemId} onChange={e => setDoItemId(e.target.value)}>
                    <option value="">Selecionar item...</option>
                    {itens.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.nome} ({i.unidade}) — {i.fin_categorias?.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantidade *</label>
                  <input type="number" min="0.01" step="0.01" value={doQtd} onChange={e => setDoQtd(e.target.value)} placeholder="0" />
                </div>
              </>
            )}

            <div className="form-group">
              <label>Doador</label>
              <input type="text" value={doDoador} onChange={e => setDoDoador(e.target.value)} placeholder="Nome (opcional)" />
            </div>
            <div className="form-group">
              <label>Data *</label>
              <input type="date" value={doData} onChange={e => setDoData(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Observação</label>
              <input type="text" value={doObs} onChange={e => setDoObs(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          <div className="financeiro-form-actions">
            <button className="btn btn-success" onClick={onSalvar} disabled={doSaving}>
              {doSaving ? 'Salvando...' : 'Salvar'}
            </button>
            <button className="btn btn-secondary" onClick={onCancelar}>Cancelar</button>
          </div>
        </div>
      )}

      {doacoes.length === 0 ? (
        <p className="fin-empty">Nenhuma doação registrada.</p>
      ) : (
        <div className="financeiro-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Doador</th>
                <th>Tipo</th>
                <th>Valor / Item</th>
                <th>Obs</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {doacoes.map(d => (
                <tr key={d.id}>
                  <td>{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                  <td>{d.doador || '—'}</td>
                  <td>
                    <span className={`badge badge-${d.tipo === 'dinheiro' ? 'supers' : 'bem_estar'}`}>
                      {d.tipo === 'dinheiro' ? 'Dinheiro' : 'Item'}
                    </span>
                  </td>
                  <td>
                    {d.tipo === 'dinheiro'
                      ? formatBRL(d.valor)
                      : `${d.quantidade} ${d.fin_itens?.unidade} de ${d.fin_itens?.nome}`}
                  </td>
                  <td>{d.observacao || '—'}</td>
                  <td>
                    {confirmandoId === d.id && confirmandoTipo === 'doacao' ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm btn-danger" onClick={() => onDeletar(d.id, 'doacao')}>Confirmar?</button>
                        <button className="btn btn-sm btn-secondary" onClick={() => { setConfirmandoId(null); setConfirmandoTipo(null) }}>Não</button>
                      </div>
                    ) : (
                      <button className="btn btn-sm btn-danger" onClick={() => { setConfirmandoId(d.id); setConfirmandoTipo('doacao') }}>Excluir</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Rodar todos os testes para garantir que nada quebrou**

```bash
cd /Users/kanjos/t4e/ejc_control && npx vitest run
```

Esperado: todos os testes PASS.

- [ ] **Step 3: Commit**

```bash
cd /Users/kanjos/t4e/ejc_control
git add src/pages/admin/Financeiro.jsx
git commit -m "feat: add Despesas and Doacoes tabs to Financeiro page"
```

---

## Task 7: Modal de Configuração (FinanceiroConfig)

**Files:**
- Create: `src/components/FinanceiroConfig.jsx`

- [ ] **Step 1: Criar FinanceiroConfig.jsx**

Criar `src/components/FinanceiroConfig.jsx`:

```jsx
import { useState } from 'react'
import { X } from 'lucide-react'
import {
  criarCategoria,
  atualizarCategoria,
  deletarCategoria,
  criarItem,
  atualizarItem,
  deletarItem,
} from '../services/financeiro'

export function FinanceiroConfig({ encontroId, categorias, itens, onClose, onUpdate }) {
  const [subAba, setSubAba] = useState('categorias')
  const [error, setError] = useState(null)

  // Categorias
  const [novaCategoria, setNovaCategoria] = useState('')
  const [editandoCatId, setEditandoCatId] = useState(null)
  const [editandoCatNome, setEditandoCatNome] = useState('')

  // Itens
  const [novoItemNome, setNovoItemNome] = useState('')
  const [novoItemCategoria, setNovoItemCategoria] = useState(categorias[0]?.id || '')
  const [novoItemUnidade, setNovoItemUnidade] = useState('unid')
  const [editandoItemId, setEditandoItemId] = useState(null)
  const [editandoItemNome, setEditandoItemNome] = useState('')
  const [editandoItemUnidade, setEditandoItemUnidade] = useState('')
  const [editandoItemCategoria, setEditandoItemCategoria] = useState('')

  async function handleCriarCategoria() {
    if (!novaCategoria.trim()) return
    try {
      await criarCategoria(encontroId, novaCategoria.trim())
      setNovaCategoria('')
      await onUpdate()
    } catch (e) { setError(e.message) }
  }

  async function handleSalvarCategoria(id) {
    if (!editandoCatNome.trim()) return
    try {
      await atualizarCategoria(id, editandoCatNome.trim())
      setEditandoCatId(null)
      await onUpdate()
    } catch (e) { setError(e.message) }
  }

  async function handleDeletarCategoria(id) {
    try {
      await deletarCategoria(id)
      await onUpdate()
    } catch (e) { setError(e.message || 'Não é possível excluir categoria com itens associados') }
  }

  async function handleCriarItem() {
    if (!novoItemNome.trim() || !novoItemCategoria) return
    try {
      await criarItem(encontroId, novoItemCategoria, novoItemNome.trim(), novoItemUnidade || 'unid')
      setNovoItemNome('')
      await onUpdate()
    } catch (e) { setError(e.message) }
  }

  async function handleSalvarItem(id) {
    try {
      await atualizarItem(id, {
        nome: editandoItemNome,
        unidade: editandoItemUnidade,
        categoria_id: editandoItemCategoria,
      })
      setEditandoItemId(null)
      await onUpdate()
    } catch (e) { setError(e.message) }
  }

  async function handleDeletarItem(id) {
    try {
      await deletarItem(id)
      await onUpdate()
    } catch (e) { setError(e.message || 'Não é possível excluir item com registros associados') }
  }

  return (
    <div className="fin-config-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="fin-config-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Categorias &amp; Itens</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="admin-error" style={{ marginBottom: 12 }}>
            {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        <div className="fin-config-tabs">
          <button className={`fin-config-tab ${subAba === 'categorias' ? 'active' : ''}`} onClick={() => setSubAba('categorias')}>
            Categorias
          </button>
          <button className={`fin-config-tab ${subAba === 'itens' ? 'active' : ''}`} onClick={() => setSubAba('itens')}>
            Itens
          </button>
        </div>

        {subAba === 'categorias' && (
          <>
            <ul className="fin-config-list">
              {categorias.map(cat => (
                <li key={cat.id}>
                  {editandoCatId === cat.id ? (
                    <>
                      <input
                        className="form-input"
                        value={editandoCatNome}
                        onChange={e => setEditandoCatNome(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button className="btn btn-sm btn-success" onClick={() => handleSalvarCategoria(cat.id)}>Salvar</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => setEditandoCatId(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1 }}>{cat.nome}</span>
                      <button className="btn btn-sm btn-secondary" onClick={() => { setEditandoCatId(cat.id); setEditandoCatNome(cat.nome) }}>Editar</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeletarCategoria(cat.id)}>Excluir</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div className="fin-config-add">
              <input
                className="form-input"
                value={novaCategoria}
                onChange={e => setNovaCategoria(e.target.value)}
                placeholder="Nova categoria..."
                onKeyDown={e => e.key === 'Enter' && handleCriarCategoria()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={handleCriarCategoria}>Adicionar</button>
            </div>
          </>
        )}

        {subAba === 'itens' && (
          <>
            <ul className="fin-config-list">
              {itens.map(item => (
                <li key={item.id}>
                  {editandoItemId === item.id ? (
                    <>
                      <input
                        className="form-input"
                        value={editandoItemNome}
                        onChange={e => setEditandoItemNome(e.target.value)}
                        style={{ flex: 2, minWidth: 80 }}
                        placeholder="Nome"
                      />
                      <input
                        className="form-input"
                        value={editandoItemUnidade}
                        onChange={e => setEditandoItemUnidade(e.target.value)}
                        style={{ width: 70 }}
                        placeholder="unid"
                      />
                      <select
                        value={editandoItemCategoria}
                        onChange={e => setEditandoItemCategoria(e.target.value)}
                        style={{ flex: 1 }}
                      >
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                      <button className="btn btn-sm btn-success" onClick={() => handleSalvarItem(item.id)}>Salvar</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => setEditandoItemId(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1 }}>{item.nome}</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{item.unidade}</span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{item.fin_categorias?.nome}</span>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          setEditandoItemId(item.id)
                          setEditandoItemNome(item.nome)
                          setEditandoItemUnidade(item.unidade)
                          setEditandoItemCategoria(item.categoria_id)
                        }}
                      >Editar</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeletarItem(item.id)}>Excluir</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div className="fin-config-add" style={{ flexWrap: 'wrap', gap: 8 }}>
              <input
                className="form-input"
                value={novoItemNome}
                onChange={e => setNovoItemNome(e.target.value)}
                placeholder="Nome do item"
                style={{ flex: 2, minWidth: 100 }}
              />
              <select
                value={novoItemCategoria}
                onChange={e => setNovoItemCategoria(e.target.value)}
                style={{ flex: 1 }}
              >
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <input
                className="form-input"
                value={novoItemUnidade}
                onChange={e => setNovoItemUnidade(e.target.value)}
                placeholder="unid"
                style={{ width: 80 }}
              />
              <button className="btn btn-primary" onClick={handleCriarItem}>Adicionar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar que o build passa sem erros**

```bash
cd /Users/kanjos/t4e/ejc_control && npx vite build 2>&1 | tail -5
```

Esperado: `built in Xs` sem erros.

- [ ] **Step 3: Rodar todos os testes**

```bash
cd /Users/kanjos/t4e/ejc_control && npx vitest run
```

Esperado: todos PASS.

- [ ] **Step 4: Commit final**

```bash
cd /Users/kanjos/t4e/ejc_control
git add src/components/FinanceiroConfig.jsx
git commit -m "feat: add FinanceiroConfig modal for categories and items management"
```

---

## Checklist de cobertura da spec

| Requisito | Task |
|---|---|
| Gestão financeira somente admin | Task 1 (permissões) + Task 2 (RLS) |
| Scoped ao encontro | Task 2 (encontro_id FK) + Task 3 (helpers) |
| Categorias por encontro (Cozinha, Limpeza, Secretaria) | Task 2 (tabela), Task 7 (gestão via modal) |
| Cadastro de item: nome, categoria, unidade | Task 3 (criarItem), Task 6 (form inline), Task 7 (config modal) |
| Despesa: item, quantidade, valor unitário | Task 3 (criarDespesa), Task 6 |
| Doação dinheiro: valor | Task 3 (criarDoacao tipo=dinheiro), Task 6 |
| Doação item: item do catálogo + quantidade | Task 3 (criarDoacao tipo=item), Task 6 |
| Resumo por categoria com totais | Task 3 (calcularTotalPorCategoria), Task 5 (AbaResumo) |
| Total geral de despesas + doações em dinheiro | Task 3 (helpers), Task 5 (rodapé) |
| Exclusão com confirmação | Task 6 (handler + confirmandoId) |
| Criação de item inline no form de despesa | Task 6 (AbaDespesas com fdCriarItem) |
| Rota /admin/financeiro protegida | Task 4 |
| Item "Financeiro" no menu lateral | Task 4 |
