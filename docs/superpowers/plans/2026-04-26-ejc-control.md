# EJC Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um app React + Supabase para gestão completa de Encontros de Jovens com Cristo — pré-cadastro via QR code, CRM interno, montagem de grupos por cor e check-in no evento.

**Architecture:** SPA React (Vite) com rotas públicas (encontrista) e protegidas (equipe via Supabase Auth). Backend Supabase com PostgreSQL, RLS e Auth. Campos dinâmicos da ficha armazenados como JSONB. Múltiplos encontros suportados por design.

**Tech Stack:** React 18, Vite, React Router 6, Supabase JS v2, @hello-pangea/dnd (drag-and-drop), qrcode.react, Vitest, @testing-library/react

---

## File Map

```
ejc_control/
├── src/
│   ├── main.jsx
│   ├── App.jsx                        # Router + ProtectedRoute
│   ├── lib/
│   │   └── supabase.js                # Supabase client singleton
│   ├── hooks/
│   │   ├── useAuth.js                 # Supabase Auth state
│   │   └── useEncontro.js             # Encontro ativo via localStorage
│   ├── services/
│   │   ├── encontristas.js            # CRUD encontristas
│   │   ├── grupos.js                  # CRUD grupos + atribuição
│   │   ├── campos.js                  # CRUD campos_formulario
│   │   └── encontros.js               # CRUD encontros
│   ├── utils/
│   │   └── whatsapp.js                # Gerador de URL WhatsApp
│   ├── components/
│   │   ├── ProtectedRoute.jsx         # Redirect → /admin/login se sem sessão
│   │   └── DynamicForm.jsx            # Renderiza campos dinâmicos do encontro
│   └── pages/
│       ├── public/
│       │   ├── Inscricao.jsx          # /inscricao/:encontroId
│       │   ├── Ficha.jsx              # /ficha/:token
│       │   └── Checkin.jsx            # /checkin/:token
│       └── admin/
│           ├── Login.jsx              # /admin/login
│           ├── SeletorEncontro.jsx    # /admin
│           ├── CRM.jsx                # /admin/crm
│           ├── EncontristaDetalhe.jsx # /admin/crm/:id
│           ├── Grupos.jsx             # /admin/grupos
│           ├── CheckinAdmin.jsx       # /admin/checkin
│           └── Configuracoes.jsx      # /admin/configuracoes
├── supabase/
│   └── migrations/
│       └── 001_initial.sql
├── tests/
│   ├── utils/whatsapp.test.js
│   ├── services/encontristas.test.js
│   └── services/grupos.test.js
├── .env.example
├── vite.config.js
└── package.json
```

---

## Task 1: Setup do projeto

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `.env.example`
- Create: `index.html`
- Create: `src/main.jsx`

- [ ] **Step 1: Inicializar projeto Vite**

```bash
cd /Users/kanjos/t4e/ejc_control
npm create vite@latest . -- --template react
```

Quando perguntar sobre arquivos existentes, responder `y` para sobrescrever `package.json` e `index.html`.

- [ ] **Step 2: Instalar dependências**

```bash
npm install @supabase/supabase-js react-router-dom @hello-pangea/dnd qrcode.react
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 3: Configurar Vitest em `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.js',
  },
})
```

- [ ] **Step 4: Criar `tests/setup.js`**

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Criar `.env.example`**

```
VITE_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- [ ] **Step 6: Criar `.env` local (não commitar)**

Copiar `.env.example` para `.env` e preencher com as credenciais do projeto Supabase criado em app.supabase.com.

```bash
cp .env.example .env
```

- [ ] **Step 7: Criar `src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 8: Substituir `src/index.css` com reset mínimo**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #0f0f0f; color: #e0e0e0; }
a { color: inherit; text-decoration: none; }
```

- [ ] **Step 9: Verificar que o projeto inicia**

```bash
npm run dev
```

Esperado: servidor em `http://localhost:5173` sem erros no terminal.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: project setup — vite + react + supabase + testing"
```

---

## Task 2: Schema Supabase (migrations)

**Files:**
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Step 1: Criar pasta e arquivo de migração**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Escrever `supabase/migrations/001_initial.sql`**

```sql
-- Tabela de encontros
create table encontros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_inicio date,
  data_fim date,
  whatsapp_numero text not null default '',
  whatsapp_mensagem text not null default 'Olá! Me chamo {nome} e tenho interesse no EJC. Meu contato é {telefone}.',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Tabela de grupos
create table grupos (
  id uuid primary key default gen_random_uuid(),
  encontro_id uuid not null references encontros(id) on delete cascade,
  nome text not null,
  cor text not null default '#6b7280',
  criterio_idade_min int,
  criterio_idade_max int,
  ordem int not null default 0
);

-- Tabela de encontristas
create table encontristas (
  id uuid primary key default gen_random_uuid(),
  encontro_id uuid not null references encontros(id) on delete cascade,
  nome text not null,
  telefone text not null,
  grupo_id uuid references grupos(id) on delete set null,
  checkin_at timestamptz,
  dados_extras jsonb not null default '{}',
  token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  unique(token)
);

-- Tabela de campos do formulário
create table campos_formulario (
  id uuid primary key default gen_random_uuid(),
  encontro_id uuid not null references encontros(id) on delete cascade,
  label text not null,
  chave text not null,
  tipo text not null check (tipo in ('text', 'date', 'select', 'phone', 'number')),
  opcoes jsonb,
  obrigatorio boolean not null default false,
  visivel_encontrista boolean not null default true,
  visivel_equipe boolean not null default true,
  ordem int not null default 0
);

-- RLS: habilitar em todas as tabelas
alter table encontros enable row level security;
alter table grupos enable row level security;
alter table encontristas enable row level security;
alter table campos_formulario enable row level security;

-- Políticas para equipe autenticada: acesso total
create policy "equipe_full_encontros" on encontros
  for all to authenticated using (true) with check (true);

create policy "equipe_full_grupos" on grupos
  for all to authenticated using (true) with check (true);

create policy "equipe_full_encontristas" on encontristas
  for all to authenticated using (true) with check (true);

create policy "equipe_full_campos" on campos_formulario
  for all to authenticated using (true) with check (true);

-- Políticas públicas (anon): encontristas podem ver seu próprio registro via token
create policy "publico_read_encontro" on encontros
  for select to anon using (true);

create policy "publico_insert_encontrista" on encontristas
  for insert to anon with check (true);

create policy "publico_read_encontrista_by_token" on encontristas
  for select to anon using (true);

create policy "publico_update_encontrista_dados_extras" on encontristas
  for update to anon using (true) with check (true);

create policy "publico_read_grupos" on grupos
  for select to anon using (true);

create policy "publico_read_campos" on campos_formulario
  for select to anon using (true);
```

> Nota: as políticas anon são permissivas nesta versão. Para produção, a política de update do encontrista deveria validar o token — isso pode ser reforçado via Supabase Function se necessário.

- [ ] **Step 3: Aplicar a migration no Supabase**

Acesse o SQL Editor em `app.supabase.com` → seu projeto → SQL Editor, cole o conteúdo do arquivo e execute. Verifique que as 4 tabelas aparecem em Table Editor.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/001_initial.sql
git commit -m "feat: supabase schema — encontros, grupos, encontristas, campos_formulario + RLS"
```

---

## Task 3: Supabase client + Auth + Router

**Files:**
- Create: `src/lib/supabase.js`
- Create: `src/hooks/useAuth.js`
- Create: `src/hooks/useEncontro.js`
- Create: `src/components/ProtectedRoute.jsx`
- Create: `src/App.jsx`

- [ ] **Step 1: Criar `src/lib/supabase.js`**

```js
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key)
```

- [ ] **Step 2: Criar `src/hooks/useAuth.js`**

```js
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { session, loading }
}
```

- [ ] **Step 3: Criar `src/hooks/useEncontro.js`**

```js
import { useState, useCallback } from 'react'

const STORAGE_KEY = 'ejc_encontro_ativo'

export function useEncontro() {
  const [encontroId, setEncontroIdState] = useState(
    () => localStorage.getItem(STORAGE_KEY)
  )

  const setEncontroId = useCallback((id) => {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    setEncontroIdState(id)
  }, [])

  return { encontroId, setEncontroId }
}
```

- [ ] **Step 4: Criar `src/components/ProtectedRoute.jsx`**

```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()

  if (loading) return <div style={{ padding: 24 }}>Carregando...</div>
  if (!session) return <Navigate to="/admin/login" replace />

  return children
}
```

- [ ] **Step 5: Criar `src/App.jsx` com todas as rotas**

```jsx
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
        <Route path="/admin" element={<ProtectedRoute><SeletorEncontro /></ProtectedRoute>} />
        <Route path="/admin/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
        <Route path="/admin/crm/:id" element={<ProtectedRoute><EncontristaDetalhe /></ProtectedRoute>} />
        <Route path="/admin/grupos" element={<ProtectedRoute><Grupos /></ProtectedRoute>} />
        <Route path="/admin/checkin" element={<ProtectedRoute><CheckinAdmin /></ProtectedRoute>} />
        <Route path="/admin/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 6: Criar stubs para todas as páginas (para o router não quebrar)**

Criar cada arquivo com um componente mínimo:

`src/pages/public/Inscricao.jsx`:
```jsx
export function Inscricao() { return <div>Inscrição</div> }
```

`src/pages/public/Ficha.jsx`:
```jsx
export function Ficha() { return <div>Ficha</div> }
```

`src/pages/public/Checkin.jsx`:
```jsx
export function Checkin() { return <div>Check-in</div> }
```

`src/pages/admin/Login.jsx`:
```jsx
export function Login() { return <div>Login</div> }
```

`src/pages/admin/SeletorEncontro.jsx`:
```jsx
export function SeletorEncontro() { return <div>Seletor</div> }
```

`src/pages/admin/CRM.jsx`:
```jsx
export function CRM() { return <div>CRM</div> }
```

`src/pages/admin/EncontristaDetalhe.jsx`:
```jsx
export function EncontristaDetalhe() { return <div>Detalhe</div> }
```

`src/pages/admin/Grupos.jsx`:
```jsx
export function Grupos() { return <div>Grupos</div> }
```

`src/pages/admin/CheckinAdmin.jsx`:
```jsx
export function CheckinAdmin() { return <div>Check-in Admin</div> }
```

`src/pages/admin/Configuracoes.jsx`:
```jsx
export function Configuracoes() { return <div>Configurações</div> }
```

- [ ] **Step 7: Verificar que o app inicia sem erros**

```bash
npm run dev
```

Navegar para `http://localhost:5173/admin` — deve redirecionar para `/admin/login` e mostrar "Login".

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: supabase client, auth hook, encontro hook, router + page stubs"
```

---

## Task 4: Utilitário WhatsApp + testes

**Files:**
- Create: `src/utils/whatsapp.js`
- Create: `tests/utils/whatsapp.test.js`

- [ ] **Step 1: Escrever testes em `tests/utils/whatsapp.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { buildWhatsAppUrl } from '../../src/utils/whatsapp'

describe('buildWhatsAppUrl', () => {
  it('substitui {nome} e {telefone} na mensagem', () => {
    const url = buildWhatsAppUrl({
      numero: '5511999990000',
      template: 'Olá! Me chamo {nome}, tel: {telefone}.',
      nome: 'João Silva',
      telefone: '11 99999-0001',
    })
    expect(url).toBe(
      'https://wa.me/5511999990000?text=Ol%C3%A1!%20Me%20chamo%20Jo%C3%A3o%20Silva%2C%20tel%3A%2011%2099999-0001.'
    )
  })

  it('funciona sem variáveis no template', () => {
    const url = buildWhatsAppUrl({
      numero: '5511999990000',
      template: 'Interesse no EJC.',
      nome: 'João',
      telefone: '11 99999-0001',
    })
    expect(url).toContain('wa.me/5511999990000')
    expect(url).toContain('Interesse%20no%20EJC.')
  })

  it('remove espaços e traços do número', () => {
    const url = buildWhatsAppUrl({
      numero: '55 11 9999-0000',
      template: 'teste',
      nome: 'X',
      telefone: 'Y',
    })
    expect(url).toContain('wa.me/55119999000')
  })
})
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
npx vitest run tests/utils/whatsapp.test.js
```

Esperado: FAIL — `buildWhatsAppUrl` not found.

- [ ] **Step 3: Criar `src/utils/whatsapp.js`**

```js
export function buildWhatsAppUrl({ numero, template, nome, telefone }) {
  const numeroLimpo = numero.replace(/[\s\-\(\)]/g, '')
  const mensagem = template
    .replace('{nome}', nome)
    .replace('{telefone}', telefone)
  return `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`
}
```

- [ ] **Step 4: Rodar e confirmar passar**

```bash
npx vitest run tests/utils/whatsapp.test.js
```

Esperado: PASS — 3 testes.

- [ ] **Step 5: Commit**

```bash
git add src/utils/whatsapp.js tests/utils/whatsapp.test.js
git commit -m "feat: whatsapp url builder + tests"
```

---

## Task 5: Services — encontros, encontristas, grupos, campos

**Files:**
- Create: `src/services/encontros.js`
- Create: `src/services/encontristas.js`
- Create: `src/services/grupos.js`
- Create: `src/services/campos.js`
- Create: `tests/services/encontristas.test.js`
- Create: `tests/services/grupos.test.js`

- [ ] **Step 1: Criar `src/services/encontros.js`**

```js
import { supabase } from '../lib/supabase'

export async function listarEncontros() {
  const { data, error } = await supabase
    .from('encontros')
    .select('*')
    .eq('ativo', true)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function criarEncontro(encontro) {
  const { data, error } = await supabase
    .from('encontros')
    .insert(encontro)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function buscarEncontro(id) {
  const { data, error } = await supabase
    .from('encontros')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function atualizarEncontro(id, updates) {
  const { data, error } = await supabase
    .from('encontros')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
```

- [ ] **Step 2: Criar `src/services/encontristas.js`**

```js
import { supabase } from '../lib/supabase'

export async function criarEncontrista({ encontroId, nome, telefone }) {
  const { data, error } = await supabase
    .from('encontristas')
    .insert({ encontro_id: encontroId, nome, telefone })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function listarEncontristas(encontroId) {
  const { data, error } = await supabase
    .from('encontristas')
    .select('*, grupos(id, nome, cor)')
    .eq('encontro_id', encontroId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function buscarEncontristaPorToken(token) {
  const { data, error } = await supabase
    .from('encontristas')
    .select('*, grupos(id, nome, cor)')
    .eq('token', token)
    .single()
  if (error) throw error
  return data
}

export async function buscarEncontristaPorId(id) {
  const { data, error } = await supabase
    .from('encontristas')
    .select('*, grupos(id, nome, cor)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function atualizarEncontrista(id, updates) {
  const { data, error } = await supabase
    .from('encontristas')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fazerCheckin(token) {
  const { data, error } = await supabase
    .from('encontristas')
    .update({ checkin_at: new Date().toISOString() })
    .eq('token', token)
    .is('checkin_at', null)
    .select('*, grupos(id, nome, cor)')
    .single()
  if (error) throw error
  return data
}

export async function buscarEncontristasPorNome(encontroId, nome) {
  const { data, error } = await supabase
    .from('encontristas')
    .select('*, grupos(id, nome, cor)')
    .eq('encontro_id', encontroId)
    .ilike('nome', `%${nome}%`)
    .order('nome')
    .limit(10)
  if (error) throw error
  return data
}
```

- [ ] **Step 3: Criar `src/services/grupos.js`**

```js
import { supabase } from '../lib/supabase'

export async function listarGrupos(encontroId) {
  const { data, error } = await supabase
    .from('grupos')
    .select('*')
    .eq('encontro_id', encontroId)
    .order('ordem')
  if (error) throw error
  return data
}

export async function criarGrupo({ encontroId, nome, cor, criterioIdadeMin, criterioIdadeMax, ordem }) {
  const { data, error } = await supabase
    .from('grupos')
    .insert({
      encontro_id: encontroId,
      nome,
      cor,
      criterio_idade_min: criterioIdadeMin ?? null,
      criterio_idade_max: criterioIdadeMax ?? null,
      ordem: ordem ?? 0,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarGrupo(id, updates) {
  const { data, error } = await supabase
    .from('grupos')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removerGrupo(id) {
  const { error } = await supabase.from('grupos').delete().eq('id', id)
  if (error) throw error
}

export async function atribuirGrupo(encontristaId, grupoId) {
  const { error } = await supabase
    .from('encontristas')
    .update({ grupo_id: grupoId })
    .eq('id', encontristaId)
  if (error) throw error
}

export function sugerirGrupos(encontristas, grupos) {
  // Retorna map encontristaId → grupoId baseado na data_nascimento (dados_extras)
  // Se não tiver data_nascimento ou critérios, retorna vazio
  const hoje = new Date()
  const result = {}

  for (const e of encontristas) {
    const nascimento = e.dados_extras?.data_nascimento
    if (!nascimento) continue

    const idade = hoje.getFullYear() - new Date(nascimento).getFullYear()
    const grupo = grupos.find(g =>
      (g.criterio_idade_min == null || idade >= g.criterio_idade_min) &&
      (g.criterio_idade_max == null || idade <= g.criterio_idade_max)
    )
    if (grupo) result[e.id] = grupo.id
  }

  return result
}
```

- [ ] **Step 4: Criar `src/services/campos.js`**

```js
import { supabase } from '../lib/supabase'

export async function listarCampos(encontroId) {
  const { data, error } = await supabase
    .from('campos_formulario')
    .select('*')
    .eq('encontro_id', encontroId)
    .order('ordem')
  if (error) throw error
  return data
}

export async function criarCampo(campo) {
  const { data, error } = await supabase
    .from('campos_formulario')
    .insert(campo)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarCampo(id, updates) {
  const { data, error } = await supabase
    .from('campos_formulario')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removerCampo(id) {
  const { error } = await supabase.from('campos_formulario').delete().eq('id', id)
  if (error) throw error
}

export async function reordenarCampos(campos) {
  // campos: array de { id, ordem }
  const updates = campos.map(({ id, ordem }) =>
    supabase.from('campos_formulario').update({ ordem }).eq('id', id)
  )
  await Promise.all(updates)
}
```

- [ ] **Step 5: Escrever `tests/services/grupos.test.js` (testa `sugerirGrupos` — função pura)**

```js
import { describe, it, expect } from 'vitest'
import { sugerirGrupos } from '../../src/services/grupos'

describe('sugerirGrupos', () => {
  const grupos = [
    { id: 'g1', nome: 'Azul', criterio_idade_min: 14, criterio_idade_max: 16 },
    { id: 'g2', nome: 'Verde', criterio_idade_min: 17, criterio_idade_max: 19 },
    { id: 'g3', nome: 'Vermelho', criterio_idade_min: 20, criterio_idade_max: null },
  ]

  const anoAtual = new Date().getFullYear()

  it('atribui encontrista de 15 anos ao grupo Azul', () => {
    const encontristas = [{
      id: 'e1',
      dados_extras: { data_nascimento: `${anoAtual - 15}-01-01` }
    }]
    expect(sugerirGrupos(encontristas, grupos)).toEqual({ e1: 'g1' })
  })

  it('atribui encontrista de 18 anos ao grupo Verde', () => {
    const encontristas = [{
      id: 'e2',
      dados_extras: { data_nascimento: `${anoAtual - 18}-01-01` }
    }]
    expect(sugerirGrupos(encontristas, grupos)).toEqual({ e2: 'g2' })
  })

  it('ignora encontrista sem data_nascimento', () => {
    const encontristas = [{ id: 'e3', dados_extras: {} }]
    expect(sugerirGrupos(encontristas, grupos)).toEqual({})
  })

  it('ignora encontrista sem dados_extras', () => {
    const encontristas = [{ id: 'e4', dados_extras: null }]
    expect(sugerirGrupos(encontristas, grupos)).toEqual({})
  })

  it('atribui encontrista de 25 anos ao grupo Vermelho (sem max)', () => {
    const encontristas = [{
      id: 'e5',
      dados_extras: { data_nascimento: `${anoAtual - 25}-01-01` }
    }]
    expect(sugerirGrupos(encontristas, grupos)).toEqual({ e5: 'g3' })
  })
})
```

- [ ] **Step 6: Rodar testes**

```bash
npx vitest run tests/services/grupos.test.js
```

Esperado: PASS — 5 testes.

- [ ] **Step 7: Commit**

```bash
git add src/services/ tests/services/ tests/utils/
git commit -m "feat: services — encontros, encontristas, grupos, campos + sugerirGrupos tests"
```

---

## Task 6: Componente DynamicForm

**Files:**
- Create: `src/components/DynamicForm.jsx`

- [ ] **Step 1: Criar `src/components/DynamicForm.jsx`**

Renderiza campos dinâmicos a partir da lista de `campos_formulario`. Recebe valores atuais e chama `onChange` a cada mudança.

```jsx
export function DynamicForm({ campos, valores, onChange }) {
  function handleChange(chave, value) {
    onChange({ ...valores, [chave]: value })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {campos.map(campo => (
        <div key={campo.id}>
          <label style={{ display: 'block', fontSize: 12, color: '#aaa', marginBottom: 4 }}>
            {campo.label}{campo.obrigatorio && ' *'}
          </label>
          {campo.tipo === 'select' ? (
            <select
              value={valores[campo.chave] ?? ''}
              onChange={e => handleChange(campo.chave, e.target.value)}
              required={campo.obrigatorio}
              style={inputStyle}
            >
              <option value="">Selecionar...</option>
              {(campo.opcoes ?? []).map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          ) : (
            <input
              type={campo.tipo === 'date' ? 'date' : campo.tipo === 'number' ? 'number' : 'text'}
              inputMode={campo.tipo === 'phone' ? 'tel' : undefined}
              value={valores[campo.chave] ?? ''}
              onChange={e => handleChange(campo.chave, e.target.value)}
              required={campo.obrigatorio}
              style={inputStyle}
            />
          )}
        </div>
      ))}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #333',
  background: '#1a1a1a',
  color: '#e0e0e0',
  fontSize: 14,
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/DynamicForm.jsx
git commit -m "feat: DynamicForm component for dynamic field rendering"
```

---

## Task 7: Página Pré-ficha pública (`/inscricao/:encontroId`)

**Files:**
- Modify: `src/pages/public/Inscricao.jsx`

- [ ] **Step 1: Implementar `src/pages/public/Inscricao.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { buscarEncontro } from '../../services/encontros'
import { criarEncontrista } from '../../services/encontristas'
import { buildWhatsAppUrl } from '../../utils/whatsapp'

export function Inscricao() {
  const { encontroId } = useParams()
  const [encontro, setEncontro] = useState(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    buscarEncontro(encontroId)
      .then(setEncontro)
      .catch(() => setErro('Encontro não encontrado.'))
      .finally(() => setLoading(false))
  }, [encontroId])

  async function handleSubmit(e) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    try {
      await criarEncontrista({ encontroId, nome: nome.trim(), telefone: telefone.trim() })
      setSucesso(true)
      const url = buildWhatsAppUrl({
        numero: encontro.whatsapp_numero,
        template: encontro.whatsapp_mensagem,
        nome: nome.trim(),
        telefone: telefone.trim(),
      })
      window.location.href = url
    } catch {
      setErro('Erro ao enviar. Tente novamente.')
      setEnviando(false)
    }
  }

  if (loading) return <Tela><p>Carregando...</p></Tela>
  if (erro && !encontro) return <Tela><p style={{ color: '#f87171' }}>{erro}</p></Tela>

  if (sucesso) {
    return (
      <Tela>
        <h2 style={{ color: '#52b788' }}>Enviado! ✓</h2>
        <p>Redirecionando para o WhatsApp...</p>
      </Tela>
    )
  }

  return (
    <Tela>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{encontro.nome}</h1>
      <p style={{ color: '#aaa', fontSize: 14, marginBottom: 24 }}>Preencha seus dados para participar</p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          placeholder="Seu nome completo"
          value={nome}
          onChange={e => setNome(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          placeholder="WhatsApp com DDD (ex: 11 99999-0000)"
          value={telefone}
          onChange={e => setTelefone(e.target.value)}
          inputMode="tel"
          required
          style={inputStyle}
        />
        {erro && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}
        <button type="submit" disabled={enviando} style={btnStyle}>
          {enviando ? 'Enviando...' : 'Quero participar →'}
        </button>
      </form>
      <p style={{ fontSize: 11, color: '#555', marginTop: 16, textAlign: 'center' }}>
        Após enviar, você receberá um contato pelo WhatsApp.
      </p>
    </Tela>
  )
}

function Tela({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>{children}</div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 8,
  border: '1px solid #333', background: '#1a1a1a', color: '#e0e0e0', fontSize: 15,
}

const btnStyle = {
  width: '100%', padding: '13px 0', borderRadius: 8, border: 'none',
  background: '#2d6a4f', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
}
```

- [ ] **Step 2: Testar manualmente**

1. Criar um encontro no Supabase Table Editor (inserir linha em `encontros` com nome, whatsapp_numero e whatsapp_mensagem)
2. Navegar para `http://localhost:5173/inscricao/<id-do-encontro>`
3. Preencher nome e telefone, submeter
4. Verificar que redireciona para WhatsApp com mensagem pré-preenchida
5. Verificar que o encontrista aparece na tabela `encontristas` no Supabase

- [ ] **Step 3: Commit**

```bash
git add src/pages/public/Inscricao.jsx
git commit -m "feat: public pre-registration form (/inscricao/:encontroId)"
```

---

## Task 8: Página Ficha Completa (`/ficha/:token`)

**Files:**
- Modify: `src/pages/public/Ficha.jsx`

- [ ] **Step 1: Implementar `src/pages/public/Ficha.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { buscarEncontristaPorToken, atualizarEncontrista } from '../../services/encontristas'
import { listarCampos } from '../../services/campos'
import { DynamicForm } from '../../components/DynamicForm'

export function Ficha() {
  const { token } = useParams()
  const [encontrista, setEncontrista] = useState(null)
  const [campos, setCampos] = useState([])
  const [valores, setValores] = useState({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    async function carregar() {
      try {
        const e = await buscarEncontristaPorToken(token)
        const c = await listarCampos(e.encontro_id)
        setEncontrista(e)
        setCampos(c.filter(campo => campo.visivel_encontrista))
        setValores(e.dados_extras ?? {})
      } catch {
        setErro('Link inválido ou expirado.')
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    try {
      await atualizarEncontrista(encontrista.id, { dados_extras: valores })
      setSalvo(true)
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <Tela><p>Carregando...</p></Tela>
  if (erro && !encontrista) return <Tela><p style={{ color: '#f87171' }}>{erro}</p></Tela>

  if (salvo) {
    return (
      <Tela>
        <h2 style={{ color: '#52b788' }}>Ficha salva! ✓</h2>
        <p>Obrigado, {encontrista.nome}. Até o encontro!</p>
      </Tela>
    )
  }

  return (
    <Tela>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Olá, {encontrista.nome}!</h2>
      <p style={{ color: '#aaa', fontSize: 13, marginBottom: 24 }}>Complete sua ficha de inscrição.</p>
      {campos.length === 0 ? (
        <p style={{ color: '#aaa' }}>Nenhum campo adicional por enquanto.</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <DynamicForm campos={campos} valores={valores} onChange={setValores} />
          {erro && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}
          <button type="submit" disabled={salvando} style={btnStyle}>
            {salvando ? 'Salvando...' : 'Salvar ficha'}
          </button>
        </form>
      )}
    </Tela>
  )
}

function Tela({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>{children}</div>
    </div>
  )
}

const btnStyle = {
  width: '100%', padding: '13px 0', borderRadius: 8, border: 'none',
  background: '#2d6a4f', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
}
```

- [ ] **Step 2: Testar manualmente**

1. Buscar o token de um encontrista na tabela `encontristas` no Supabase
2. Navegar para `http://localhost:5173/ficha/<token>`
3. Verificar que o nome do encontrista aparece
4. (Opcional) Criar campos em `campos_formulario` para o encontro e verificar que aparecem
5. Preencher e salvar — verificar `dados_extras` atualizado no Supabase

- [ ] **Step 3: Commit**

```bash
git add src/pages/public/Ficha.jsx
git commit -m "feat: public full registration form (/ficha/:token)"
```

---

## Task 9: Página Check-in Público (`/checkin/:token`)

**Files:**
- Modify: `src/pages/public/Checkin.jsx`

- [ ] **Step 1: Implementar `src/pages/public/Checkin.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { buscarEncontristaPorToken, fazerCheckin } from '../../services/encontristas'

export function Checkin() {
  const { token } = useParams()
  const [encontrista, setEncontrista] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [jaFeito, setJaFeito] = useState(false)

  useEffect(() => {
    async function processar() {
      try {
        const e = await buscarEncontristaPorToken(token)
        if (e.checkin_at) {
          setEncontrista(e)
          setJaFeito(true)
          setLoading(false)
          return
        }
        const atualizado = await fazerCheckin(token)
        setEncontrista(atualizado)
      } catch {
        setErro('QR code inválido ou encontrista não encontrado.')
      } finally {
        setLoading(false)
      }
    }
    processar()
  }, [token])

  if (loading) {
    return (
      <Tela>
        <div style={{ fontSize: 48 }}>⏳</div>
        <p>Processando check-in...</p>
      </Tela>
    )
  }

  if (erro) {
    return (
      <Tela>
        <div style={{ fontSize: 48 }}>❌</div>
        <p style={{ color: '#f87171' }}>{erro}</p>
      </Tela>
    )
  }

  const grupo = encontrista?.grupos
  const corGrupo = grupo?.cor ?? '#6b7280'

  return (
    <Tela>
      <div style={{ fontSize: 56, marginBottom: 8 }}>{jaFeito ? '✅' : '🎉'}</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
        {jaFeito ? 'Check-in já realizado' : 'Check-in confirmado!'}
      </h1>
      <p style={{ fontSize: 18, color: '#ccc', marginBottom: 20 }}>{encontrista?.nome}</p>
      {grupo && (
        <div style={{
          background: corGrupo + '22',
          border: `2px solid ${corGrupo}`,
          borderRadius: 12,
          padding: '12px 24px',
          display: 'inline-block',
          color: corGrupo,
          fontWeight: 700,
          fontSize: 16,
        }}>
          {grupo.nome}
        </div>
      )}
      {!grupo && (
        <p style={{ color: '#aaa', fontSize: 14 }}>Grupo ainda não atribuído</p>
      )}
    </Tela>
  )
}

function Tela({ children }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center'
    }}>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Testar manualmente**

1. Navegar para `http://localhost:5173/checkin/<token-de-um-encontrista>`
2. Verificar que exibe nome e cor do grupo (se atribuído)
3. Verificar que `checkin_at` foi preenchido no Supabase
4. Navegar para a mesma URL novamente — deve mostrar "Check-in já realizado"

- [ ] **Step 3: Commit**

```bash
git add src/pages/public/Checkin.jsx
git commit -m "feat: public check-in page (/checkin/:token)"
```

---

## Task 10: Admin Login + Seletor de Encontro

**Files:**
- Modify: `src/pages/admin/Login.jsx`
- Modify: `src/pages/admin/SeletorEncontro.jsx`

- [ ] **Step 1: Implementar `src/pages/admin/Login.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErro(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('Email ou senha incorretos.')
      setLoading(false)
    } else {
      navigate('/admin')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>EJC Control</h1>
        <p style={{ color: '#aaa', fontSize: 13, marginBottom: 28 }}>Acesso da equipe</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            required
            style={inputStyle}
          />
          {erro && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 8,
  border: '1px solid #333', background: '#1a1a1a', color: '#e0e0e0', fontSize: 15,
}
const btnStyle = {
  width: '100%', padding: '13px 0', borderRadius: 8, border: 'none',
  background: '#3a86ff', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
}
```

- [ ] **Step 2: Criar primeiro usuário da equipe no Supabase**

Acesse `app.supabase.com` → Authentication → Users → Invite user. Inserir email da equipe. O usuário receberá um email para definir senha.

Alternativa via SQL Editor:
```sql
-- Apenas para desenvolvimento local com supabase CLI
select auth.create_user('email@exemplo.com', 'senha123');
```

- [ ] **Step 3: Implementar `src/pages/admin/SeletorEncontro.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { listarEncontros, criarEncontro } from '../../services/encontros'
import { useEncontro } from '../../hooks/useEncontro'

export function SeletorEncontro() {
  const navigate = useNavigate()
  const { setEncontroId } = useEncontro()
  const [encontros, setEncontros] = useState([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [novoNome, setNovoNome] = useState('')

  useEffect(() => {
    listarEncontros().then(setEncontros).finally(() => setLoading(false))
  }, [])

  function selecionar(id) {
    setEncontroId(id)
    navigate('/admin/crm')
  }

  async function handleCriar(e) {
    e.preventDefault()
    if (!novoNome.trim()) return
    const novo = await criarEncontro({ nome: novoNome.trim() })
    setEncontroId(novo.id)
    navigate('/admin/crm')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <div style={{ minHeight: '100vh', padding: 24, maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Selecionar Encontro</h1>
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 13 }}>
          Sair
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {encontros.map(e => (
            <button key={e.id} onClick={() => selecionar(e.id)} style={cardStyle}>
              <div style={{ fontWeight: 600 }}>{e.nome}</div>
              {e.data_inicio && (
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
                  {new Date(e.data_inicio).toLocaleDateString('pt-BR')}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        {criando ? (
          <form onSubmit={handleCriar} style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Nome do encontro"
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              autoFocus
              style={{ ...inputStyle, flex: 1 }}
            />
            <button type="submit" style={btnStyle}>Criar</button>
            <button type="button" onClick={() => setCriando(false)} style={{ ...btnStyle, background: '#333' }}>✕</button>
          </form>
        ) : (
          <button onClick={() => setCriando(true)} style={{ ...btnStyle, width: '100%' }}>
            + Novo Encontro
          </button>
        )}
      </div>
    </div>
  )
}

const cardStyle = {
  width: '100%', padding: '14px 16px', borderRadius: 8, border: '1px solid #333',
  background: '#1a1a1a', color: '#e0e0e0', cursor: 'pointer', textAlign: 'left',
}
const inputStyle = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid #333',
  background: '#1a1a1a', color: '#e0e0e0', fontSize: 14,
}
const btnStyle = {
  padding: '10px 16px', borderRadius: 8, border: 'none',
  background: '#3a86ff', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
```

- [ ] **Step 4: Testar manualmente**

1. Navegar para `http://localhost:5173/admin/login`
2. Entrar com as credenciais criadas no Step 2
3. Verificar que vai para `/admin` e lista encontros
4. Criar um novo encontro e verificar que vai para `/admin/crm`
5. Clicar em Sair e verificar que volta para `/admin/login`

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/Login.jsx src/pages/admin/SeletorEncontro.jsx
git commit -m "feat: admin login + encontro selector"
```

---

## Task 11: Admin Layout + NavBar

**Files:**
- Create: `src/components/AdminLayout.jsx`

Os layouts protegidos precisam de uma nav comum com links e botão de sair.

- [ ] **Step 1: Criar `src/components/AdminLayout.jsx`**

```jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useEncontro } from '../hooks/useEncontro'

export function AdminLayout({ children }) {
  const navigate = useNavigate()
  const { encontroId, setEncontroId } = useEncontro()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  function trocarEncontro() {
    setEncontroId(null)
    navigate('/admin')
  }

  const navItems = [
    { to: '/admin/crm', label: 'CRM' },
    { to: '/admin/grupos', label: 'Grupos' },
    { to: '/admin/checkin', label: 'Check-in' },
    { to: '/admin/configuracoes', label: 'Config' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        background: '#111', borderBottom: '1px solid #222',
        padding: '0 16px', display: 'flex', alignItems: 'center', gap: 4, height: 48,
      }}>
        <button onClick={trocarEncontro} style={{ background: 'none', border: 'none', color: '#52b788', fontWeight: 700, cursor: 'pointer', fontSize: 14, marginRight: 12 }}>
          EJC
        </button>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              padding: '6px 10px', borderRadius: 6, fontSize: 13, color: isActive ? '#fff' : '#888',
              background: isActive ? '#222' : 'transparent', textDecoration: 'none',
            })}
          >
            {item.label}
          </NavLink>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, cursor: 'pointer' }}>
          Sair
        </button>
      </nav>
      <main style={{ flex: 1, padding: 20, maxWidth: 900, width: '100%', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AdminLayout.jsx
git commit -m "feat: admin layout with navigation"
```

---

## Task 12: Admin CRM — Lista

**Files:**
- Modify: `src/pages/admin/CRM.jsx`

- [ ] **Step 1: Implementar `src/pages/admin/CRM.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { listarEncontristas } from '../../services/encontristas'

export function CRM() {
  const { encontroId } = useEncontro()
  const navigate = useNavigate()
  const [encontristas, setEncontristas] = useState([])
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!encontroId) { navigate('/admin'); return }
    listarEncontristas(encontroId)
      .then(setEncontristas)
      .finally(() => setLoading(false))
  }, [encontroId, navigate])

  const filtrados = encontristas.filter(e => {
    const matchBusca = e.nome.toLowerCase().includes(busca.toLowerCase())
    if (filtro === 'sem_grupo') return matchBusca && !e.grupo_id
    if (filtro === 'sem_checkin') return matchBusca && !e.checkin_at
    if (filtro === 'sem_ficha') return matchBusca && Object.keys(e.dados_extras ?? {}).length === 0
    return matchBusca
  })

  function copiarLinkFicha(token) {
    const url = `${window.location.origin}/ficha/${token}`
    navigator.clipboard.writeText(url)
  }

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>CRM — {encontristas.length} encontristas</h2>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          placeholder="Buscar por nome..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 180 }}
        />
        <select value={filtro} onChange={e => setFiltro(e.target.value)} style={inputStyle}>
          <option value="todos">Todos</option>
          <option value="sem_grupo">Sem grupo</option>
          <option value="sem_checkin">Sem check-in</option>
          <option value="sem_ficha">Sem ficha completa</option>
        </select>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : filtrados.length === 0 ? (
        <p style={{ color: '#555' }}>Nenhum encontrista encontrado.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtrados.map(e => (
            <div key={e.id} style={rowStyle}>
              <div onClick={() => navigate(`/admin/crm/${e.id}`)} style={{ flex: 1, cursor: 'pointer' }}>
                <span style={{ fontWeight: 500 }}>{e.nome}</span>
                <span style={{ fontSize: 12, color: '#777', marginLeft: 10 }}>{e.telefone}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {e.grupos && (
                  <span style={{ fontSize: 11, color: e.grupos.cor, fontWeight: 600 }}>
                    ● {e.grupos.nome}
                  </span>
                )}
                {e.checkin_at && <span style={{ fontSize: 11, color: '#52b788' }}>✓ Check-in</span>}
                <button
                  onClick={() => copiarLinkFicha(e.token)}
                  style={{ background: 'none', border: '1px solid #333', color: '#aaa', borderRadius: 4, padding: '2px 6px', fontSize: 11, cursor: 'pointer' }}
                >
                  📋 Link
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  )
}

const inputStyle = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #333',
  background: '#1a1a1a', color: '#e0e0e0', fontSize: 13,
}
const rowStyle = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
  borderRadius: 8, border: '1px solid #222', background: '#111',
}
```

- [ ] **Step 2: Testar manualmente**

1. Navegar para `/admin/crm`
2. Verificar lista de encontristas
3. Testar busca por nome
4. Testar filtros
5. Clicar em "📋 Link" e verificar que o link da ficha vai para o clipboard

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/CRM.jsx
git commit -m "feat: admin CRM list with search and filters"
```

---

## Task 13: Admin CRM — Detalhe do Encontrista

**Files:**
- Modify: `src/pages/admin/EncontristaDetalhe.jsx`

- [ ] **Step 1: Implementar `src/pages/admin/EncontristaDetalhe.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { buscarEncontristaPorId, atualizarEncontrista } from '../../services/encontristas'
import { listarCampos } from '../../services/campos'
import { listarGrupos, atribuirGrupo } from '../../services/grupos'
import { DynamicForm } from '../../components/DynamicForm'

export function EncontristaDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { encontroId } = useEncontro()
  const [encontrista, setEncontrista] = useState(null)
  const [campos, setCampos] = useState([])
  const [grupos, setGrupos] = useState([])
  const [valores, setValores] = useState({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState(null)

  useEffect(() => {
    async function carregar() {
      const [e, c, g] = await Promise.all([
        buscarEncontristaPorId(id),
        listarCampos(encontroId),
        listarGrupos(encontroId),
      ])
      setEncontrista(e)
      setCampos(c)
      setGrupos(g)
      setValores(e.dados_extras ?? {})
      setLoading(false)
    }
    carregar()
  }, [id, encontroId])

  async function handleSalvar(e) {
    e.preventDefault()
    setSalvando(true)
    await atualizarEncontrista(id, {
      nome: encontrista.nome,
      telefone: encontrista.telefone,
      dados_extras: valores,
    })
    setMensagem('Salvo!')
    setTimeout(() => setMensagem(null), 2000)
    setSalvando(false)
  }

  async function handleGrupo(grupoId) {
    await atribuirGrupo(id, grupoId || null)
    const atualizado = await buscarEncontristaPorId(id)
    setEncontrista(atualizado)
  }

  function copiarLinkCheckin() {
    navigator.clipboard.writeText(`${window.location.origin}/checkin/${encontrista.token}`)
    setMensagem('Link de check-in copiado!')
    setTimeout(() => setMensagem(null), 2000)
  }

  if (loading) return <AdminLayout><p>Carregando...</p></AdminLayout>

  return (
    <AdminLayout>
      <button onClick={() => navigate('/admin/crm')} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', marginBottom: 16, fontSize: 13 }}>
        ← Voltar ao CRM
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>{encontrista.nome}</h2>
          <p style={{ color: '#aaa', fontSize: 13, marginTop: 2 }}>{encontrista.telefone}</p>
          {encontrista.checkin_at && (
            <p style={{ color: '#52b788', fontSize: 12, marginTop: 4 }}>
              ✓ Check-in: {new Date(encontrista.checkin_at).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        <button onClick={copiarLinkCheckin} style={btnSecStyle}>QR Check-in</button>
      </div>

      {/* Atribuição de grupo */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 6 }}>Grupo</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => handleGrupo(null)}
            style={{ ...grupoBtn, borderColor: !encontrista.grupo_id ? '#fff' : '#333' }}
          >
            Sem grupo
          </button>
          {grupos.map(g => (
            <button
              key={g.id}
              onClick={() => handleGrupo(g.id)}
              style={{ ...grupoBtn, borderColor: encontrista.grupo_id === g.id ? g.cor : '#333', color: g.cor }}
            >
              ● {g.nome}
            </button>
          ))}
        </div>
      </div>

      {/* Campos dinâmicos */}
      <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>Nome</label>
          <input
            value={encontrista.nome}
            onChange={e => setEncontrista(prev => ({ ...prev, nome: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>Telefone</label>
          <input
            value={encontrista.telefone}
            onChange={e => setEncontrista(prev => ({ ...prev, telefone: e.target.value }))}
            style={inputStyle}
          />
        </div>
        {campos.length > 0 && (
          <DynamicForm campos={campos} valores={valores} onChange={setValores} />
        )}
        {mensagem && <p style={{ color: '#52b788', fontSize: 13 }}>{mensagem}</p>}
        <button type="submit" disabled={salvando} style={btnStyle}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </AdminLayout>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid #333', background: '#1a1a1a', color: '#e0e0e0', fontSize: 14,
}
const btnStyle = {
  padding: '11px 0', borderRadius: 8, border: 'none',
  background: '#2d6a4f', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
const btnSecStyle = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #333',
  background: 'none', color: '#aaa', fontSize: 12, cursor: 'pointer',
}
const grupoBtn = {
  padding: '6px 12px', borderRadius: 6, border: '1px solid',
  background: 'none', fontSize: 13, cursor: 'pointer', color: '#e0e0e0',
}
```

- [ ] **Step 2: Testar manualmente**

1. Clicar em um encontrista no CRM
2. Editar nome, telefone e campos extras — salvar e verificar no Supabase
3. Atribuir um grupo e verificar que a cor muda
4. Copiar link de check-in e verificar que aponta para `/checkin/<token>`

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/EncontristaDetalhe.jsx
git commit -m "feat: admin encontrista detail — edit fields, assign group, copy checkin link"
```

---

## Task 14: Admin Grupos (Drag-and-Drop)

**Files:**
- Modify: `src/pages/admin/Grupos.jsx`

- [ ] **Step 1: Implementar `src/pages/admin/Grupos.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { listarEncontristas } from '../../services/encontristas'
import { listarGrupos, criarGrupo, removerGrupo, atribuirGrupo, sugerirGrupos } from '../../services/grupos'

export function Grupos() {
  const { encontroId } = useEncontro()
  const navigate = useNavigate()
  const [encontristas, setEncontristas] = useState([])
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [novoGrupo, setNovoGrupo] = useState({ nome: '', cor: '#3a86ff' })
  const [criandoGrupo, setCriandoGrupo] = useState(false)

  useEffect(() => {
    if (!encontroId) { navigate('/admin'); return }
    Promise.all([listarEncontristas(encontroId), listarGrupos(encontroId)])
      .then(([e, g]) => { setEncontristas(e); setGrupos(g) })
      .finally(() => setLoading(false))
  }, [encontroId, navigate])

  // Agrupa encontristas por grupo
  function getEncontristasDaColuna(grupoId) {
    return encontristas.filter(e => e.grupo_id === (grupoId ?? null))
  }

  async function handleDragEnd(result) {
    if (!result.destination) return
    const encontristaId = result.draggableId
    const destGrupoId = result.destination.droppableId === 'sem_grupo' ? null : result.destination.droppableId

    // Atualiza otimisticamente
    setEncontristas(prev =>
      prev.map(e => e.id === encontristaId ? { ...e, grupo_id: destGrupoId } : e)
    )
    await atribuirGrupo(encontristaId, destGrupoId)
  }

  async function handleSugerir() {
    const sugestoes = sugerirGrupos(encontristas, grupos)
    if (Object.keys(sugestoes).length === 0) {
      alert('Nenhuma sugestão disponível. Verifique se os encontristas têm "data_nascimento" preenchida e os grupos têm critérios de idade.')
      return
    }
    await Promise.all(
      Object.entries(sugestoes).map(([eid, gid]) => atribuirGrupo(eid, gid))
    )
    setEncontristas(prev =>
      prev.map(e => sugestoes[e.id] ? { ...e, grupo_id: sugestoes[e.id] } : e)
    )
  }

  async function handleCriarGrupo(e) {
    e.preventDefault()
    const novo = await criarGrupo({
      encontroId,
      nome: novoGrupo.nome,
      cor: novoGrupo.cor,
      ordem: grupos.length,
    })
    setGrupos(prev => [...prev, novo])
    setNovoGrupo({ nome: '', cor: '#3a86ff' })
    setCriandoGrupo(false)
  }

  async function handleRemoverGrupo(grupoId) {
    if (!confirm('Remover este grupo? Os encontristas voltarão para "Sem grupo".')) return
    await removerGrupo(grupoId)
    setGrupos(prev => prev.filter(g => g.id !== grupoId))
    setEncontristas(prev => prev.map(e => e.grupo_id === grupoId ? { ...e, grupo_id: null } : e))
  }

  if (loading) return <AdminLayout><p>Carregando...</p></AdminLayout>

  const colunas = [
    { id: 'sem_grupo', nome: 'Sem grupo', cor: '#6b7280' },
    ...grupos.map(g => ({ id: g.id, nome: g.nome, cor: g.cor })),
  ]

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Grupos</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSugerir} style={btnSecStyle}>✨ Sugerir por idade</button>
          <button onClick={() => setCriandoGrupo(true)} style={btnStyle}>+ Grupo</button>
        </div>
      </div>

      {criandoGrupo && (
        <form onSubmit={handleCriarGrupo} style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <input
            placeholder="Nome do grupo"
            value={novoGrupo.nome}
            onChange={e => setNovoGrupo(p => ({ ...p, nome: e.target.value }))}
            required
            autoFocus
            style={{ ...inputStyle, flex: 1 }}
          />
          <input
            type="color"
            value={novoGrupo.cor}
            onChange={e => setNovoGrupo(p => ({ ...p, cor: e.target.value }))}
            style={{ width: 36, height: 36, borderRadius: 4, border: 'none', cursor: 'pointer', background: 'none' }}
          />
          <button type="submit" style={btnStyle}>Criar</button>
          <button type="button" onClick={() => setCriandoGrupo(false)} style={btnSecStyle}>✕</button>
        </form>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
          {colunas.map(col => (
            <div key={col.id} style={{ minWidth: 200, flex: '0 0 200px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: col.cor }}>
                  ● {col.nome} ({getEncontristasDaColuna(col.id === 'sem_grupo' ? null : col.id).length})
                </span>
                {col.id !== 'sem_grupo' && (
                  <button onClick={() => handleRemoverGrupo(col.id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 12 }}>✕</button>
                )}
              </div>
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{
                      minHeight: 120, borderRadius: 8, padding: 8,
                      background: snapshot.isDraggingOver ? '#1a2a1a' : '#111',
                      border: `1px solid ${snapshot.isDraggingOver ? col.cor : '#222'}`,
                      transition: 'background 0.15s',
                    }}
                  >
                    {getEncontristasDaColuna(col.id === 'sem_grupo' ? null : col.id).map((e, index) => (
                      <Draggable key={e.id} draggableId={e.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              padding: '8px 10px', borderRadius: 6, marginBottom: 6,
                              background: snapshot.isDragging ? '#2a2a2a' : '#1a1a1a',
                              border: '1px solid #2a2a2a', fontSize: 13, cursor: 'grab',
                              ...provided.draggableProps.style,
                            }}
                          >
                            {e.nome}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </AdminLayout>
  )
}

const inputStyle = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #333',
  background: '#1a1a1a', color: '#e0e0e0', fontSize: 13,
}
const btnStyle = {
  padding: '8px 14px', borderRadius: 8, border: 'none',
  background: '#3a86ff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const btnSecStyle = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #333',
  background: 'none', color: '#aaa', fontSize: 13, cursor: 'pointer',
}
```

- [ ] **Step 2: Testar manualmente**

1. Navegar para `/admin/grupos`
2. Criar 2 grupos (ex: Azul, Verde)
3. Arrastar encontristas entre colunas e verificar que persiste no Supabase
4. Clicar em "✨ Sugerir por idade" (com encontristas que têm `data_nascimento` preenchida)
5. Remover um grupo e verificar que os encontristas voltam para "Sem grupo"

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/Grupos.jsx
git commit -m "feat: admin groups — drag-and-drop + auto-suggest by age"
```

---

## Task 15: Admin Check-in Manual

**Files:**
- Modify: `src/pages/admin/CheckinAdmin.jsx`

- [ ] **Step 1: Implementar `src/pages/admin/CheckinAdmin.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { buscarEncontristasPorNome, atualizarEncontrista } from '../../services/encontristas'

export function CheckinAdmin() {
  const { encontroId } = useEncontro()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [processando, setProcessando] = useState(null)
  const [mensagem, setMensagem] = useState(null)

  async function handleBusca(e) {
    const valor = e.target.value
    setBusca(valor)
    if (valor.length < 2) { setResultados([]); return }
    if (!encontroId) { navigate('/admin'); return }
    setBuscando(true)
    const res = await buscarEncontristasPorNome(encontroId, valor)
    setResultados(res)
    setBuscando(false)
  }

  async function handleCheckin(encontrista) {
    if (encontrista.checkin_at) return
    setProcessando(encontrista.id)
    await atualizarEncontrista(encontrista.id, { checkin_at: new Date().toISOString() })
    setResultados(prev =>
      prev.map(e => e.id === encontrista.id ? { ...e, checkin_at: new Date().toISOString() } : e)
    )
    setMensagem(`Check-in de ${encontrista.nome} confirmado!`)
    setTimeout(() => setMensagem(null), 3000)
    setProcessando(null)
  }

  return (
    <AdminLayout>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Check-in Manual</h2>

      <input
        placeholder="Buscar encontrista pelo nome..."
        value={busca}
        onChange={handleBusca}
        autoFocus
        style={{ ...inputStyle, width: '100%', marginBottom: 16 }}
      />

      {mensagem && (
        <div style={{ background: '#1a3a2a', border: '1px solid #52b788', borderRadius: 8, padding: '10px 14px', marginBottom: 12, color: '#52b788', fontSize: 13 }}>
          ✓ {mensagem}
        </div>
      )}

      {buscando && <p style={{ color: '#aaa', fontSize: 13 }}>Buscando...</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {resultados.map(e => {
          const grupo = e.grupos
          return (
            <div key={e.id} style={rowStyle}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{e.nome}</div>
                <div style={{ fontSize: 12, color: '#777' }}>{e.telefone}</div>
                {grupo && (
                  <div style={{ fontSize: 12, color: grupo.cor, marginTop: 2 }}>● {grupo.nome}</div>
                )}
              </div>
              <div>
                {e.checkin_at ? (
                  <span style={{ fontSize: 12, color: '#52b788', fontWeight: 600 }}>✓ Feito</span>
                ) : (
                  <button
                    onClick={() => handleCheckin(e)}
                    disabled={processando === e.id}
                    style={btnStyle}
                  >
                    {processando === e.id ? '...' : 'Check-in'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {busca.length >= 2 && !buscando && resultados.length === 0 && (
        <p style={{ color: '#555', fontSize: 13 }}>Nenhum encontrista encontrado para "{busca}".</p>
      )}
    </AdminLayout>
  )
}

const inputStyle = {
  padding: '10px 14px', borderRadius: 8, border: '1px solid #333',
  background: '#1a1a1a', color: '#e0e0e0', fontSize: 14,
}
const rowStyle = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
  borderRadius: 8, border: '1px solid #222', background: '#111',
}
const btnStyle = {
  padding: '7px 14px', borderRadius: 6, border: 'none',
  background: '#2d6a4f', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
```

- [ ] **Step 2: Testar manualmente**

1. Navegar para `/admin/checkin`
2. Digitar 2+ letras e verificar resultados
3. Clicar em "Check-in" e verificar que muda para "✓ Feito"
4. Verificar `checkin_at` preenchido no Supabase

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/CheckinAdmin.jsx
git commit -m "feat: admin manual check-in with live search"
```

---

## Task 16: Admin Configurações

**Files:**
- Modify: `src/pages/admin/Configuracoes.jsx`

- [ ] **Step 1: Implementar `src/pages/admin/Configuracoes.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { buscarEncontro, atualizarEncontro } from '../../services/encontros'
import { listarCampos, criarCampo, removerCampo, reordenarCampos } from '../../services/campos'

export function Configuracoes() {
  const { encontroId } = useEncontro()
  const navigate = useNavigate()
  const [encontro, setEncontro] = useState(null)
  const [campos, setCampos] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvandoEncontro, setSalvandoEncontro] = useState(false)
  const [mensagem, setMensagem] = useState(null)
  const [novoCampo, setNovoCampo] = useState({ label: '', chave: '', tipo: 'text', obrigatorio: false, visivel_encontrista: true, visivel_equipe: true })
  const [adicionandoCampo, setAdicionandoCampo] = useState(false)

  useEffect(() => {
    if (!encontroId) { navigate('/admin'); return }
    Promise.all([buscarEncontro(encontroId), listarCampos(encontroId)])
      .then(([e, c]) => { setEncontro(e); setCampos(c) })
      .finally(() => setLoading(false))
  }, [encontroId, navigate])

  async function handleSalvarEncontro(e) {
    e.preventDefault()
    setSalvandoEncontro(true)
    await atualizarEncontro(encontroId, {
      nome: encontro.nome,
      data_inicio: encontro.data_inicio || null,
      data_fim: encontro.data_fim || null,
      whatsapp_numero: encontro.whatsapp_numero,
      whatsapp_mensagem: encontro.whatsapp_mensagem,
    })
    setMensagem('Salvo!')
    setTimeout(() => setMensagem(null), 2000)
    setSalvandoEncontro(false)
  }

  async function handleAdicionarCampo(e) {
    e.preventDefault()
    const chave = novoCampo.chave || novoCampo.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const campo = await criarCampo({
      encontro_id: encontroId,
      label: novoCampo.label,
      chave,
      tipo: novoCampo.tipo,
      obrigatorio: novoCampo.obrigatorio,
      visivel_encontrista: novoCampo.visivel_encontrista,
      visivel_equipe: novoCampo.visivel_equipe,
      ordem: campos.length,
    })
    setCampos(prev => [...prev, campo])
    setNovoCampo({ label: '', chave: '', tipo: 'text', obrigatorio: false, visivel_encontrista: true, visivel_equipe: true })
    setAdicionandoCampo(false)
  }

  async function handleRemoverCampo(id) {
    if (!confirm('Remover este campo? Os dados já preenchidos em dados_extras não serão apagados.')) return
    await removerCampo(id)
    setCampos(prev => prev.filter(c => c.id !== id))
  }

  async function handleMoverCampo(index, direcao) {
    const novo = [...campos]
    const alvo = index + direcao
    if (alvo < 0 || alvo >= novo.length) return
    ;[novo[index], novo[alvo]] = [novo[alvo], novo[index]]
    const comOrdem = novo.map((c, i) => ({ ...c, ordem: i }))
    setCampos(comOrdem)
    await reordenarCampos(comOrdem.map(c => ({ id: c.id, ordem: c.ordem })))
  }

  const urlPreFicha = `${window.location.origin}/inscricao/${encontroId}`

  if (loading) return <AdminLayout><p>Carregando...</p></AdminLayout>

  return (
    <AdminLayout>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Configurações do Encontro</h2>

      {/* Dados do encontro */}
      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, color: '#aaa', marginBottom: 12, fontWeight: 600 }}>DADOS DO ENCONTRO</h3>
        <form onSubmit={handleSalvarEncontro} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Campo label="Nome">
            <input value={encontro.nome} onChange={e => setEncontro(p => ({ ...p, nome: e.target.value }))} style={inputStyle} />
          </Campo>
          <div style={{ display: 'flex', gap: 10 }}>
            <Campo label="Data início" style={{ flex: 1 }}>
              <input type="date" value={encontro.data_inicio ?? ''} onChange={e => setEncontro(p => ({ ...p, data_inicio: e.target.value }))} style={inputStyle} />
            </Campo>
            <Campo label="Data fim" style={{ flex: 1 }}>
              <input type="date" value={encontro.data_fim ?? ''} onChange={e => setEncontro(p => ({ ...p, data_fim: e.target.value }))} style={inputStyle} />
            </Campo>
          </div>
          <Campo label="Número WhatsApp (com código do país, sem espaços)">
            <input placeholder="5511999990000" value={encontro.whatsapp_numero} onChange={e => setEncontro(p => ({ ...p, whatsapp_numero: e.target.value }))} style={inputStyle} />
          </Campo>
          <Campo label="Mensagem — use {nome} e {telefone}">
            <textarea value={encontro.whatsapp_mensagem} onChange={e => setEncontro(p => ({ ...p, whatsapp_mensagem: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </Campo>
          {mensagem && <p style={{ color: '#52b788', fontSize: 13 }}>{mensagem}</p>}
          <button type="submit" disabled={salvandoEncontro} style={btnStyle}>
            {salvandoEncontro ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      </section>

      {/* QR Code da pré-ficha */}
      <section style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 14, color: '#aaa', marginBottom: 12, fontWeight: 600 }}>QR CODE — PRÉ-FICHA</h3>
        <p style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>{urlPreFicha}</p>
        <div style={{ background: '#fff', display: 'inline-block', padding: 12, borderRadius: 8 }}>
          <QRCodeSVG value={urlPreFicha} size={160} />
        </div>
        <div style={{ marginTop: 8 }}>
          <button onClick={() => navigator.clipboard.writeText(urlPreFicha)} style={btnSecStyle}>
            Copiar link
          </button>
        </div>
      </section>

      {/* Construtor de formulário */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, color: '#aaa', fontWeight: 600 }}>CAMPOS DO FORMULÁRIO</h3>
          <button onClick={() => setAdicionandoCampo(true)} style={btnStyle}>+ Campo</button>
        </div>

        {adicionandoCampo && (
          <form onSubmit={handleAdicionarCampo} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: 14, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Label (ex: Data de Nascimento)" value={novoCampo.label} onChange={e => setNovoCampo(p => ({ ...p, label: e.target.value }))} required style={{ ...inputStyle, flex: 2 }} />
              <select value={novoCampo.tipo} onChange={e => setNovoCampo(p => ({ ...p, tipo: e.target.value }))} style={{ ...inputStyle, flex: 1 }}>
                <option value="text">Texto</option>
                <option value="date">Data</option>
                <option value="phone">Telefone</option>
                <option value="number">Número</option>
                <option value="select">Seleção</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
              <label><input type="checkbox" checked={novoCampo.obrigatorio} onChange={e => setNovoCampo(p => ({ ...p, obrigatorio: e.target.checked }))} /> Obrigatório</label>
              <label><input type="checkbox" checked={novoCampo.visivel_encontrista} onChange={e => setNovoCampo(p => ({ ...p, visivel_encontrista: e.target.checked }))} /> Visível ao encontrista</label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={btnStyle}>Adicionar</button>
              <button type="button" onClick={() => setAdicionandoCampo(false)} style={btnSecStyle}>Cancelar</button>
            </div>
          </form>
        )}

        {campos.length === 0 && !adicionandoCampo && (
          <p style={{ color: '#555', fontSize: 13 }}>Nenhum campo adicional. Clique em "+ Campo" para adicionar.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {campos.map((campo, i) => (
            <div key={campo.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid #222', background: '#111' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{campo.label}</span>
                <span style={{ fontSize: 11, color: '#555', marginLeft: 8 }}>{campo.tipo}</span>
                {campo.obrigatorio && <span style={{ fontSize: 11, color: '#f87171', marginLeft: 8 }}>*obrigatório</span>}
                {campo.visivel_encontrista && <span style={{ fontSize: 11, color: '#52b788', marginLeft: 8 }}>encontrista</span>}
              </div>
              <button onClick={() => handleMoverCampo(i, -1)} disabled={i === 0} style={iconBtn}>↑</button>
              <button onClick={() => handleMoverCampo(i, 1)} disabled={i === campos.length - 1} style={iconBtn}>↓</button>
              <button onClick={() => handleRemoverCampo(campo.id)} style={{ ...iconBtn, color: '#f87171' }}>✕</button>
            </div>
          ))}
        </div>
      </section>
    </AdminLayout>
  )
}

function Campo({ label, children, style }) {
  return (
    <div style={style}>
      <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid #333', background: '#0f0f0f', color: '#e0e0e0', fontSize: 13,
}
const btnStyle = {
  padding: '8px 16px', borderRadius: 8, border: 'none',
  background: '#3a86ff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
const btnSecStyle = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #333',
  background: 'none', color: '#aaa', fontSize: 13, cursor: 'pointer',
}
const iconBtn = {
  background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 14, padding: '2px 6px',
}
```

- [ ] **Step 2: Testar manualmente**

1. Navegar para `/admin/configuracoes`
2. Editar nome do encontro, WhatsApp e mensagem — salvar
3. Verificar QR code gerado para a pré-ficha
4. Adicionar um campo (ex: "Data de Nascimento", tipo date, visível ao encontrista)
5. Reordenar campos com ↑ ↓
6. Remover um campo
7. Acessar `/ficha/<token>` e verificar que o campo novo aparece

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/Configuracoes.jsx
git commit -m "feat: admin config — WhatsApp settings, form builder, QR code"
```

---

## Task 17: Rodar todos os testes e verificação final

- [ ] **Step 1: Rodar todos os testes**

```bash
npx vitest run
```

Esperado: PASS em todos os testes (whatsapp.test.js, grupos.test.js).

- [ ] **Step 2: Build de produção**

```bash
npm run build
```

Esperado: sem erros. Pasta `dist/` gerada.

- [ ] **Step 3: Verificar build**

```bash
npm run preview
```

Navegar por todas as rotas e confirmar funcionamento no build de produção.

- [ ] **Step 4: Adicionar `.gitignore`**

```
node_modules/
dist/
.env
.superpowers/
```

- [ ] **Step 5: Commit final**

```bash
git add .gitignore
git commit -m "chore: add gitignore"
```

---

## Checklist de cobertura da spec

| Requisito | Task |
|---|---|
| Pré-ficha pública via QR | Task 7 |
| WhatsApp pré-preenchido | Task 4 + 7 |
| Ficha completa via link/token | Task 8 |
| CRM interno — lista + busca + filtros | Task 12 |
| CRM — detalhe + edição | Task 13 |
| Montagem de grupos drag-and-drop | Task 14 |
| Sugestão automática por idade | Task 5 + 14 |
| Check-in via QR (público) | Task 9 |
| Check-in manual (equipe) | Task 15 |
| Campos dinâmicos (construtor) | Task 6 + 16 |
| WhatsApp configurável | Task 16 |
| QR code da pré-ficha | Task 16 |
| Auth equipe (email/senha) | Task 3 + 10 |
| Múltiplos encontros | Task 3 + 10 |
| RLS Supabase | Task 2 |
