# Check-in de dois dias + auto-check-in por QR — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o check-in em dois dias registráveis independentemente e adicionar auto-check-in por QR do evento (identificação por telefone), com tela de gerar/imprimir o QR no admin.

**Architecture:** Duas colunas de timestamp por dia em `encontristas` e um `checkin_dia_ativo` em `encontros`. Um util puro centraliza a lógica de dia/presença. O admin escolhe o dia (que também vira o dia ativo do QR). Uma página pública nova identifica o encontrista por telefone e grava a presença no dia ativo, retornando o grupo.

**Tech Stack:** React 18 + Vite, react-router-dom, Supabase JS, `qrcode.react` (QRCodeSVG), Vitest.

## Global Constraints

- Projeto é **JavaScript/JSX** (sem TypeScript). Não introduzir `.ts`/`.tsx`.
- Testes com **Vitest**, em `tests/` espelhando `src/`. Rodar com `npx vitest run`.
- Comparação de telefone usa `stripMask` de [src/utils/masks.js](../../../src/utils/masks.js) nos dois lados.
- Datas gravadas como `new Date().toISOString()` (padrão atual do projeto).
- Seguir o visual/CSS existente das telas de check-in (`Checkin.css`, `CheckinAdmin.css`).
- Dia é sempre o número `1` ou `2`.
- Commits em português seguindo o padrão do repo (`feat(...)`, `fix(...)`), terminando com a linha `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## File Structure

**Novos:**
- `supabase/migrations/009_checkin_dois_dias.sql` — migração de schema.
- `src/utils/checkin.js` — helpers puros de dia/presença.
- `tests/utils/checkin.test.js` — testes do util.
- `src/pages/public/CheckinEvento.jsx` — página pública de auto-check-in por telefone.
- `tests/services/encontristas.checkin.test.js` — testes do helper de telefone e serviços.

**Alterados:**
- `src/services/encontristas.js` — helper de telefone + funções de check-in/dia.
- `src/pages/admin/CheckinAdmin.jsx` (+ `.css`) — seletor de dia + dia ativo + QR.
- `src/pages/public/Checkin.jsx` — confirmação + dia ativo (rota por token).
- `src/pages/admin/Grupos.jsx` — badge de presença.
- `src/pages/admin/CRM.jsx` — filtros de status.
- `src/pages/admin/EncontristaDetalhe.jsx` — exibição por dia.
- `src/App.jsx` — nova rota pública.

---

## Task 1: Migração de banco (dois dias + dia ativo)

> Nota: numerada como `010` (o `009` já era usado por `009_admin_delete_encontrista.sql`).

**Files:**
- Create: `supabase/migrations/010_checkin_dois_dias.sql`

**Interfaces:**
- Produces: colunas `encontristas.checkin_dia1_at`, `encontristas.checkin_dia2_at` (timestamptz, nullable); coluna `encontros.checkin_dia_ativo` (smallint, not null, default 1). Remove `encontristas.checkin_at`.

- [ ] **Step 1: Criar o arquivo de migração**

Create `supabase/migrations/009_checkin_dois_dias.sql`:

```sql
-- Check-in de dois dias de retiro
alter table encontristas add column checkin_dia1_at timestamptz;
alter table encontristas add column checkin_dia2_at timestamptz;

-- Preserva check-ins existentes como Dia 1
update encontristas set checkin_dia1_at = checkin_at where checkin_at is not null;

alter table encontristas drop column checkin_at;

-- Dia ativo para o auto-check-in por QR (1 ou 2)
alter table encontros add column checkin_dia_ativo smallint not null default 1;
```

- [ ] **Step 2: Aplicar a migração no Supabase**

Aplicar via um dos caminhos (depende do acesso ao projeto):
- CLI: `supabase db push` (se o CLI estiver configurado), ou
- Painel Supabase → SQL Editor → colar e executar o conteúdo do arquivo.

Expected: as três colunas passam a existir; nenhum erro. Como o restante do
código ainda referencia `checkin_at`, **não recarregue o app até a Task 8**
(ou aplique a migração e siga as tasks; o build só depende do código, não do DB).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/009_checkin_dois_dias.sql
git commit -m "feat(checkin): migração de dois dias e dia ativo

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Util de check-in (puro, testável)

**Files:**
- Create: `src/utils/checkin.js`
- Test: `tests/utils/checkin.test.js`

**Interfaces:**
- Produces:
  - `colunaDoDia(dia: 1|2) => 'checkin_dia1_at' | 'checkin_dia2_at'`
  - `estaPresente(encontrista) => boolean` (true se qualquer dia preenchido)
  - `fezCheckinNoDia(encontrista, dia: 1|2) => boolean`

- [ ] **Step 1: Escrever o teste que falha**

Create `tests/utils/checkin.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { colunaDoDia, estaPresente, fezCheckinNoDia } from '../../src/utils/checkin'

describe('colunaDoDia', () => {
  it('mapeia dia 1 e dia 2 para as colunas corretas', () => {
    expect(colunaDoDia(1)).toBe('checkin_dia1_at')
    expect(colunaDoDia(2)).toBe('checkin_dia2_at')
  })

  it('trata qualquer valor diferente de 2 como dia 1', () => {
    expect(colunaDoDia(undefined)).toBe('checkin_dia1_at')
  })
})

describe('estaPresente', () => {
  it('é true quando qualquer dia está preenchido', () => {
    expect(estaPresente({ checkin_dia1_at: '2026-07-24T10:00:00Z', checkin_dia2_at: null })).toBe(true)
    expect(estaPresente({ checkin_dia1_at: null, checkin_dia2_at: '2026-07-25T10:00:00Z' })).toBe(true)
  })

  it('é false quando nenhum dia está preenchido', () => {
    expect(estaPresente({ checkin_dia1_at: null, checkin_dia2_at: null })).toBe(false)
    expect(estaPresente(null)).toBe(false)
  })
})

describe('fezCheckinNoDia', () => {
  it('reflete só o dia consultado', () => {
    const e = { checkin_dia1_at: '2026-07-24T10:00:00Z', checkin_dia2_at: null }
    expect(fezCheckinNoDia(e, 1)).toBe(true)
    expect(fezCheckinNoDia(e, 2)).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npx vitest run tests/utils/checkin.test.js`
Expected: FAIL — "Failed to resolve import ../../src/utils/checkin".

- [ ] **Step 3: Implementar o util**

Create `src/utils/checkin.js`:

```js
/** Nome da coluna de check-in para o dia (1 ou 2). */
export function colunaDoDia(dia) {
  return dia === 2 ? 'checkin_dia2_at' : 'checkin_dia1_at'
}

/** True se o encontrista fez check-in em qualquer um dos dois dias. */
export function estaPresente(encontrista) {
  return !!(encontrista?.checkin_dia1_at || encontrista?.checkin_dia2_at)
}

/** True se o encontrista fez check-in no dia informado. */
export function fezCheckinNoDia(encontrista, dia) {
  return !!encontrista?.[colunaDoDia(dia)]
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npx vitest run tests/utils/checkin.test.js`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add src/utils/checkin.js tests/utils/checkin.test.js
git commit -m "feat(checkin): util puro de dia e presença

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Serviços de check-in (telefone, confirmação, dia ativo)

**Files:**
- Modify: `src/services/encontristas.js`
- Test: `tests/services/encontristas.checkin.test.js`

**Interfaces:**
- Consumes: `colunaDoDia` (Task 2), `stripMask` de `src/utils/masks.js`.
- Produces:
  - `filtrarPorTelefone(encontristas, telefone) => Encontrista[]` (puro)
  - `buscarEncontristasPorTelefone(encontroId, telefone) => Promise<Encontrista[]>`
  - `confirmarCheckin(encontristaId, dia) => Promise<Encontrista>` (grava `colunaDoDia(dia) = now()`, retorna com `grupos`)
  - `definirDiaAtivo(encontroId, dia) => Promise<void>`
  - `buscarDiaAtivo(encontroId) => Promise<number>`

- [ ] **Step 1: Escrever o teste do helper puro (falha)**

Create `tests/services/encontristas.checkin.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { filtrarPorTelefone } from '../../src/services/encontristas'

describe('filtrarPorTelefone', () => {
  const lista = [
    { id: 'a', nome: 'Ana', telefone: '(11) 98888-7777' },
    { id: 'b', nome: 'Bruno', telefone: '11988887777' },
    { id: 'c', nome: 'Carla', telefone: '(21) 90000-0000' },
  ]

  it('casa ignorando máscara (compara só dígitos)', () => {
    const r = filtrarPorTelefone(lista, '11 98888-7777')
    expect(r.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('retorna vazio quando nada casa', () => {
    expect(filtrarPorTelefone(lista, '31999999999')).toEqual([])
  })

  it('retorna vazio para telefone sem dígitos', () => {
    expect(filtrarPorTelefone(lista, '')).toEqual([])
    expect(filtrarPorTelefone(lista, '  ')).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/services/encontristas.checkin.test.js`
Expected: FAIL — `filtrarPorTelefone` não exportado.

- [ ] **Step 3: Implementar helper + serviços**

Edit `src/services/encontristas.js`. Adicionar o import no topo (após o import existente do supabase):

```js
import { supabase } from '../lib/supabase'
import { stripMask } from '../utils/masks'
import { colunaDoDia } from '../utils/checkin'
```

Adicionar as novas funções abaixo (após a função existente `buscarEncontristasPorNome`). **Manter `fazerCheckin` por enquanto** — ela ainda é importada por `Checkin.jsx` e só será removida na Task 7, para não quebrar o build intermediário:

```js
/** Filtra encontristas cujo telefone (só dígitos) casa com o informado. Puro. */
export function filtrarPorTelefone(encontristas, telefone) {
  const alvo = stripMask(telefone)
  if (!alvo) return []
  return encontristas.filter((e) => stripMask(e.telefone) === alvo)
}

/** Busca encontristas do encontro que casam com o telefone informado. */
export async function buscarEncontristasPorTelefone(encontroId, telefone) {
  const { data, error } = await supabase
    .from('encontristas')
    .select('*, grupos(id, nome, cor)')
    .eq('encontro_id', encontroId)
  if (error) throw error
  return filtrarPorTelefone(data, telefone)
}

/** Grava o check-in do dia (1 ou 2) e retorna o encontrista com o grupo. */
export async function confirmarCheckin(encontristaId, dia) {
  const coluna = colunaDoDia(dia)
  const { data, error } = await supabase
    .from('encontristas')
    .update({ [coluna]: new Date().toISOString() })
    .eq('id', encontristaId)
    .select('*, grupos(id, nome, cor)')
    .single()
  if (error) throw error
  return data
}

/** Define qual dia (1 ou 2) o auto-check-in por QR registra. */
export async function definirDiaAtivo(encontroId, dia) {
  const { error } = await supabase
    .from('encontros')
    .update({ checkin_dia_ativo: dia })
    .eq('id', encontroId)
  if (error) throw error
}

/** Lê o dia ativo do encontro (default 1). */
export async function buscarDiaAtivo(encontroId) {
  const { data, error } = await supabase
    .from('encontros')
    .select('checkin_dia_ativo')
    .eq('id', encontroId)
    .single()
  if (error) throw error
  return data.checkin_dia_ativo ?? 1
}
```

Nota: o guard "só grava se ainda nulo" fica no chamador (que checa `fezCheckinNoDia` antes de chamar `confirmarCheckin`), preservando o timestamp original.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/services/encontristas.checkin.test.js`
Expected: PASS (3 testes).

- [ ] **Step 5: Rodar a suíte toda (garantir que nada quebrou no serviço)**

Run: `npx vitest run`
Expected: todos passam (o teste antigo `excluirEncontrista` continua verde).

- [ ] **Step 6: Commit**

```bash
git add src/services/encontristas.js tests/services/encontristas.checkin.test.js
git commit -m "feat(checkin): serviços de telefone, confirmação e dia ativo

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Admin — seletor de dia + dia ativo + check-in manual por dia

**Files:**
- Modify: `src/pages/admin/CheckinAdmin.jsx`
- Modify: `src/pages/admin/CheckinAdmin.css`

**Interfaces:**
- Consumes: `fezCheckinNoDia`, `colunaDoDia` (Task 2); `atualizarEncontrista`, `definirDiaAtivo`, `buscarDiaAtivo` (Task 3, serviço existente `atualizarEncontrista`).
- Produces: página com estado `dia` (1|2) que persiste em `checkin_dia_ativo`.

- [ ] **Step 1: Atualizar imports e estado**

Edit `src/pages/admin/CheckinAdmin.jsx`. Trocar o import de serviço e o de ícones, e adicionar imports do util/serviço:

```js
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Search } from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { listarEncontristas, atualizarEncontrista, definirDiaAtivo, buscarDiaAtivo } from '../../services/encontristas'
import { fezCheckinNoDia, colunaDoDia } from '../../utils/checkin'
import './CheckinAdmin.css'
```

Dentro do componente, adicionar o estado do dia (após `const [processando, setProcessando] = useState(null)`):

```js
  const [dia, setDia] = useState(1)
```

- [ ] **Step 2: Carregar o dia ativo ao montar**

Substituir o `useEffect` de carregamento por:

```js
  useEffect(() => {
    if (!encontroId) { navigate('/admin'); return }
    Promise.all([listarEncontristas(encontroId), buscarDiaAtivo(encontroId)])
      .then(([lista, diaAtivo]) => {
        setEncontristas(lista)
        setDia(diaAtivo)
      })
      .finally(() => setLoading(false))
  }, [encontroId, navigate])
```

- [ ] **Step 3: Ajustar contador e handler para o dia selecionado**

Substituir `totalFeito` e `handleCheckin`:

```js
  const totalFeito = encontristas.filter((e) => fezCheckinNoDia(e, dia)).length

  async function trocarDia(novoDia) {
    setDia(novoDia)
    await definirDiaAtivo(encontroId, novoDia)
  }

  async function handleCheckin(encontrista) {
    if (fezCheckinNoDia(encontrista, dia)) return
    setProcessando(encontrista.id)
    const coluna = colunaDoDia(dia)
    const agora = new Date().toISOString()
    await atualizarEncontrista(encontrista.id, { [coluna]: agora })
    setEncontristas((prev) =>
      prev.map((e) => (e.id === encontrista.id ? { ...e, [coluna]: agora } : e))
    )
    setProcessando(null)
  }
```

- [ ] **Step 4: Adicionar o seletor de dia no cabeçalho**

No JSX, logo após o fechamento de `<div className="checkin-page-header">...</div>` e antes de `<div className="checkin-search-wrapper">`, inserir:

```jsx
      <div className="checkin-day-selector">
        <div className="checkin-day-tabs" role="tablist">
          <button
            className={`checkin-day-tab ${dia === 1 ? 'active' : ''}`}
            onClick={() => trocarDia(1)}
          >
            Dia 1
          </button>
          <button
            className={`checkin-day-tab ${dia === 2 ? 'active' : ''}`}
            onClick={() => trocarDia(2)}
          >
            Dia 2
          </button>
        </div>
        <span className="checkin-day-hint">QR registrando: <strong>Dia {dia}</strong></span>
      </div>
```

- [ ] **Step 5: Refletir o dia na tabela**

Na renderização das linhas, trocar `const feito = !!e.checkin_at` por:

```js
                  const feito = fezCheckinNoDia(e, dia)
```

O restante (badge Confirmado/Pendente e botão) já usa `feito`, então não muda.

- [ ] **Step 6: Estilos do seletor**

Edit `src/pages/admin/CheckinAdmin.css` — adicionar ao final:

```css
.checkin-day-selector {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}

.checkin-day-tabs {
  display: inline-flex;
  gap: var(--space-1);
  padding: 4px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.checkin-day-tab {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.8125rem;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-base), color var(--transition-base);
}

.checkin-day-tab.active {
  background: var(--primary);
  color: white;
}

.checkin-day-hint {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}
```

- [ ] **Step 7: Verificar build**

Run: `npx vite build`
Expected: build sem erros.

- [ ] **Step 8: Commit**

```bash
git add src/pages/admin/CheckinAdmin.jsx src/pages/admin/CheckinAdmin.css
git commit -m "feat(checkin): seletor de dia e check-in manual por dia no admin

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Admin — seção de QR imprimível

**Files:**
- Modify: `src/pages/admin/CheckinAdmin.jsx`
- Modify: `src/pages/admin/CheckinAdmin.css`

**Interfaces:**
- Consumes: `QRCodeSVG` de `qrcode.react`; `encontroId`.
- Produces: seção com QR do evento (`/checkin-evento/:encontroId`) e botão de imprimir.

- [ ] **Step 1: Importar QRCodeSVG e ícones**

Edit `src/pages/admin/CheckinAdmin.jsx`. Atualizar imports:

```js
import { Check, Search, QrCode, Printer } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
```

Adicionar estado (após `const [dia, setDia] = useState(1)`):

```js
  const [mostrarQr, setMostrarQr] = useState(false)
```

E o valor da URL (dentro do componente, antes do return):

```js
  const urlAutoCheckin = `${window.location.origin}/checkin-evento/${encontroId}`
```

- [ ] **Step 2: Adicionar botão e painel do QR**

No JSX, dentro de `<div className="checkin-day-selector">`, após o `<span className="checkin-day-hint">...`, adicionar o botão (encostado à direita):

```jsx
        <button className="btn btn-secondary btn-sm checkin-qr-toggle" onClick={() => setMostrarQr((v) => !v)}>
          <QrCode size={14} /> {mostrarQr ? 'Ocultar QR' : 'QR de auto-check-in'}
        </button>
```

E logo abaixo do seletor (após fechar `.checkin-day-selector`), adicionar o painel:

```jsx
      {mostrarQr && (
        <div className="checkin-qr-panel" id="checkin-qr-print">
          <div className="checkin-qr-card">
            <h3>Auto-check-in do encontro</h3>
            <p className="checkin-qr-instru">Aponte a câmera do celular para o QR e informe seu telefone.</p>
            <QRCodeSVG value={urlAutoCheckin} size={220} />
            <p className="checkin-qr-url">{urlAutoCheckin}</p>
            <button className="btn btn-primary btn-sm checkin-qr-print-btn" onClick={() => window.print()}>
              <Printer size={14} /> Imprimir
            </button>
          </div>
        </div>
      )}
```

- [ ] **Step 3: Estilos + CSS de impressão**

Edit `src/pages/admin/CheckinAdmin.css` — adicionar ao final:

```css
.checkin-qr-toggle {
  margin-left: auto;
}

.checkin-qr-panel {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-6);
}

.checkin-qr-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  text-align: center;
}

.checkin-qr-card h3 { margin: 0; font-size: 1rem; color: var(--text-primary); }
.checkin-qr-instru { margin: 0; font-size: 0.8125rem; color: var(--text-secondary); max-width: 280px; }
.checkin-qr-url { margin: 0; font-size: 0.75rem; color: var(--text-muted); word-break: break-all; max-width: 280px; }

/* Impressão: mostrar só o QR */
@media print {
  body * { visibility: hidden; }
  #checkin-qr-print, #checkin-qr-print * { visibility: visible; }
  #checkin-qr-print {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .checkin-qr-print-btn { display: none; }
}
```

- [ ] **Step 4: Verificar build**

Run: `npx vite build`
Expected: build sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/CheckinAdmin.jsx src/pages/admin/CheckinAdmin.css
git commit -m "feat(checkin): seção de QR imprimível na tela de check-in

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Página pública de auto-check-in por telefone

**Files:**
- Create: `src/pages/public/CheckinEvento.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `buscarEncontristasPorTelefone`, `confirmarCheckin`, `buscarDiaAtivo` (Task 3); `fezCheckinNoDia` (Task 2). Reaproveita `./Checkin.css`.
- Produces: rota `/checkin-evento/:encontroId`.

- [ ] **Step 1: Criar a página**

Create `src/pages/public/CheckinEvento.jsx`:

```jsx
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, PartyPopper } from 'lucide-react'
import { buscarEncontristasPorTelefone, confirmarCheckin, buscarDiaAtivo } from '../../services/encontristas'
import { fezCheckinNoDia } from '../../utils/checkin'
import './Checkin.css'

export function CheckinEvento() {
  const { encontroId } = useParams()
  const [dia, setDia] = useState(1)
  const [telefone, setTelefone] = useState('')
  const [etapa, setEtapa] = useState('telefone') // telefone | escolher | confirmar | sucesso
  const [matches, setMatches] = useState([])
  const [selecionado, setSelecionado] = useState(null)
  const [erro, setErro] = useState(null)
  const [processando, setProcessando] = useState(false)

  useEffect(() => {
    buscarDiaAtivo(encontroId).then(setDia).catch(() => setDia(1))
  }, [encontroId])

  async function handleBuscar(e) {
    e.preventDefault()
    setErro(null)
    setProcessando(true)
    try {
      const encontrados = await buscarEncontristasPorTelefone(encontroId, telefone)
      if (encontrados.length === 0) {
        setErro('Não encontramos esse telefone. Confira e tente de novo.')
      } else if (encontrados.length === 1) {
        setSelecionado(encontrados[0])
        setEtapa('confirmar')
      } else {
        setMatches(encontrados)
        setEtapa('escolher')
      }
    } catch {
      setErro('Não foi possível consultar agora. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  function escolher(encontrista) {
    setSelecionado(encontrista)
    setEtapa('confirmar')
  }

  async function handleConfirmar() {
    setErro(null)
    setProcessando(true)
    try {
      if (fezCheckinNoDia(selecionado, dia)) {
        setEtapa('sucesso')
        return
      }
      const atualizado = await confirmarCheckin(selecionado.id, dia)
      setSelecionado(atualizado)
      setEtapa('sucesso')
    } catch {
      setErro('Não foi possível confirmar agora. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }

  const jaFeito = selecionado && fezCheckinNoDia(selecionado, dia)

  return (
    <div className="checkin-container">
      <div className="checkin-content">
        {etapa === 'telefone' && (
          <form className="checkin-form" onSubmit={handleBuscar}>
            <h1 className="checkin-title">Confirmar presença</h1>
            <p className="text-muted">Dia {dia} — informe seu telefone</p>
            <input
              className="checkin-input"
              type="tel"
              inputMode="numeric"
              placeholder="(11) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              autoFocus
            />
            {erro && <p className="checkin-error-message" role="alert">{erro}</p>}
            <button className="btn btn-primary" type="submit" disabled={processando}>
              {processando ? 'Buscando...' : 'Continuar'}
            </button>
          </form>
        )}

        {etapa === 'escolher' && (
          <div className="checkin-form">
            <h1 className="checkin-title">Quem é você?</h1>
            <p className="text-muted">Encontramos mais de uma pessoa com esse telefone.</p>
            <div className="checkin-escolha-lista">
              {matches.map((m) => (
                <button key={m.id} className="btn btn-secondary" onClick={() => escolher(m)}>
                  {m.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {etapa === 'confirmar' && selecionado && (
          <div className="checkin-form">
            <h1 className="checkin-title">{selecionado.nome}</h1>
            {selecionado.grupos && (
              <p className="checkin-grupo" style={{ '--gc': selecionado.grupos.cor }}>
                Grupo: <strong>{selecionado.grupos.nome}</strong>
              </p>
            )}
            {jaFeito ? (
              <p className="text-muted">Você já confirmou presença no Dia {dia}.</p>
            ) : (
              <p className="text-muted">Confirmar sua presença no Dia {dia}?</p>
            )}
            {erro && <p className="checkin-error-message" role="alert">{erro}</p>}
            <button className="btn btn-primary" onClick={handleConfirmar} disabled={processando}>
              {processando ? 'Confirmando...' : jaFeito ? 'Ver confirmação' : 'Confirmar presença'}
            </button>
          </div>
        )}

        {etapa === 'sucesso' && selecionado && (
          <div className="checkin-success">
            <div className="checkin-success-icon" aria-hidden="true">
              {jaFeito ? <CheckCircle2 size={64} strokeWidth={1.5} /> : <PartyPopper size={64} strokeWidth={1.5} />}
            </div>
            <h1 className="checkin-title">{selecionado.nome}</h1>
            <p className="checkin-success-message">Presença do Dia {dia} confirmada!</p>
            {selecionado.grupos && (
              <p className="checkin-grupo" style={{ '--gc': selecionado.grupos.cor }}>
                Seu grupo: <strong>{selecionado.grupos.nome}</strong>
              </p>
            )}
          </div>
        )}

        {etapa !== 'telefone' && etapa !== 'sucesso' && (
          <button className="checkin-voltar" onClick={() => { setEtapa('telefone'); setErro(null) }}>
            ← Voltar
          </button>
        )}
      </div>
    </div>
  )
}
```

Nota: se alguma das classes CSS usadas (`checkin-form`, `checkin-input`,
`checkin-grupo`, `checkin-escolha-lista`, `checkin-voltar`, `checkin-title`)
não existir em `Checkin.css`, adicione-as no Step 3.

- [ ] **Step 2: Registrar a rota**

Edit `src/App.jsx`. Adicionar o import junto aos outros públicos:

```js
import { CheckinEvento } from './pages/public/CheckinEvento'
```

E a rota, logo após a linha `<Route path="/checkin/:token" element={<Checkin />} />`:

```jsx
        <Route path="/checkin-evento/:encontroId" element={<CheckinEvento />} />
```

- [ ] **Step 3: Garantir as classes CSS usadas**

Abrir `src/pages/public/Checkin.css` e conferir se existem: `checkin-container`,
`checkin-content`, `checkin-title`, `checkin-success`, `checkin-success-icon`,
`checkin-success-message`, `checkin-error-message`, `text-muted`. Adicionar ao
final de `Checkin.css` apenas as que faltarem, incluindo as novas:

```css
.checkin-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: stretch;
  text-align: center;
}

.checkin-input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--border, #e5e7eb);
  border-radius: 10px;
  font-size: 1rem;
  outline: none;
}

.checkin-input:focus { border-color: var(--primary, #7c3aed); }

.checkin-escolha-lista {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkin-grupo {
  font-size: 0.95rem;
  color: var(--text-secondary, #6b7280);
  border-left: 4px solid var(--gc, #7c3aed);
  padding-left: 10px;
  text-align: left;
}

.checkin-voltar {
  margin-top: 1rem;
  background: none;
  border: none;
  color: var(--text-secondary, #6b7280);
  cursor: pointer;
  font-size: 0.875rem;
}
```

- [ ] **Step 4: Verificar build**

Run: `npx vite build`
Expected: build sem erros.

- [ ] **Step 5: Verificação manual (com a migração já aplicada)**

Run: `npm run dev` e abrir `/checkin-evento/<um-encontroId-válido>`.
Conferir: digitar um telefone existente → confirma → mostra grupo e sucesso;
telefone inexistente → mensagem de erro; reabrir e confirmar de novo → "já
confirmou presença no Dia X".

- [ ] **Step 6: Commit**

```bash
git add src/pages/public/CheckinEvento.jsx src/pages/public/Checkin.css src/App.jsx
git commit -m "feat(checkin): auto-check-in público por telefone com QR do evento

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Rota por token — confirmação + dia ativo

**Files:**
- Modify: `src/pages/public/Checkin.jsx`

**Interfaces:**
- Consumes: `buscarEncontristaPorToken` (serviço existente), `confirmarCheckin`, `buscarDiaAtivo` (Task 3), `fezCheckinNoDia` (Task 2).
- Produces: `/checkin/:token` passa a exigir confirmação e gravar no dia ativo.

- [ ] **Step 1: Reescrever a lógica para confirmação**

Edit `src/pages/public/Checkin.jsx`. Trocar o import de serviço:

```js
import { buscarEncontristaPorToken, confirmarCheckin, buscarDiaAtivo } from '../../services/encontristas'
import { fezCheckinNoDia } from '../../utils/checkin'
```

Substituir o `useEffect` que fazia check-in automático por um que só **carrega**
o encontrista e o dia ativo (sem gravar):

```js
  const [dia, setDia] = useState(1)

  useEffect(() => {
    async function carregar() {
      try {
        const e = await buscarEncontristaPorToken(token)
        const diaAtivo = await buscarDiaAtivo(e.encontro_id)
        setDia(diaAtivo)
        setEncontrista(e)
        setJaFeito(fezCheckinNoDia(e, diaAtivo))
      } catch {
        setErro('QR code inválido ou encontrista não encontrado.')
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [token])
```

Adicionar o handler de confirmação:

```js
  const [processando, setProcessando] = useState(false)

  async function handleConfirmar() {
    setProcessando(true)
    try {
      const atualizado = await confirmarCheckin(encontrista.id, dia)
      setEncontrista(atualizado)
      setJaFeito(true)
    } catch {
      setErro('Não foi possível confirmar agora. Tente novamente.')
    } finally {
      setProcessando(false)
    }
  }
```

- [ ] **Step 2: Adicionar o botão de confirmação na tela**

Na parte do JSX que hoje mostra o sucesso/`jaFeito`, garantir que:
- Se `!jaFeito`: mostrar nome + grupo + botão "Confirmar presença no Dia {dia}"
  que chama `handleConfirmar` (desabilitado enquanto `processando`).
- Se `jaFeito`: mostrar a mensagem de presença já confirmada no Dia {dia} + grupo.

Exemplo do bloco (adaptar aos elementos já existentes no arquivo):

```jsx
        {!jaFeito ? (
          <div className="checkin-form">
            <h1 className="checkin-title">{encontrista.nome}</h1>
            {encontrista.grupos && (
              <p className="checkin-grupo" style={{ '--gc': encontrista.grupos.cor }}>
                Grupo: <strong>{encontrista.grupos.nome}</strong>
              </p>
            )}
            <button className="btn btn-primary" onClick={handleConfirmar} disabled={processando}>
              {processando ? 'Confirmando...' : `Confirmar presença no Dia ${dia}`}
            </button>
          </div>
        ) : (
          <div className="checkin-success">
            <div className="checkin-success-icon" aria-hidden="true"><CheckCircle2 size={64} strokeWidth={1.5} /></div>
            <h1 className="checkin-title">{encontrista.nome}</h1>
            <p className="checkin-success-message">Presença do Dia {dia} confirmada!</p>
            {encontrista.grupos && (
              <p className="checkin-grupo" style={{ '--gc': encontrista.grupos.cor }}>
                Seu grupo: <strong>{encontrista.grupos.nome}</strong>
              </p>
            )}
          </div>
        )}
```

Garantir que `CheckCircle2` está importado de `lucide-react` (já está no arquivo).

- [ ] **Step 3: Remover a `fazerCheckin` agora sem uso**

Edit `src/services/encontristas.js`. Remover a função `fazerCheckin` (a que
usava `checkin_at`), já que `Checkin.jsx` não a importa mais. Conferir que o
import em `Checkin.jsx` (Step 1) não a referencia.

Run: `grep -rn "fazerCheckin\b" src/`
Expected: nenhum resultado (só `buscarEncontristasPorTelefone`/`confirmarCheckin` permanecem, que têm outro nome).

- [ ] **Step 4: Verificar build**

Run: `npx vite build`
Expected: build sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/pages/public/Checkin.jsx src/services/encontristas.js
git commit -m "feat(checkin): rota por token com confirmação e dia ativo

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Consistência — leituras de presença (remove `checkin_at`)

**Files:**
- Modify: `src/pages/admin/Grupos.jsx`
- Modify: `src/pages/admin/CRM.jsx`
- Modify: `src/pages/admin/EncontristaDetalhe.jsx`

**Interfaces:**
- Consumes: `estaPresente`, `fezCheckinNoDia` (Task 2).

- [ ] **Step 1: Grupos — badge de presença**

Edit `src/pages/admin/Grupos.jsx`. Adicionar o import:

```js
import { estaPresente } from '../../utils/checkin'
```

Trocar (por volta da linha 284) `{e.checkin_at && (` por:

```jsx
                                    {estaPresente(e) && (
```

- [ ] **Step 2: CRM — filtros de status e badge**

Edit `src/pages/admin/CRM.jsx`. Adicionar o import:

```js
import { estaPresente } from '../../utils/checkin'
```

Trocar as três condições de status (linhas ~43-45):

```js
      if (status === 'sem_checkin') return e.grupo_id && !estaPresente(e)
      if (status === 'incompleto') return e.grupo_id && estaPresente(e) && Object.keys(e.dados_extras ?? {}).length === 0
      if (status === 'completo') return e.grupo_id && estaPresente(e) && Object.keys(e.dados_extras ?? {}).length > 0
```

E o badge (linha ~280) `{encontrista.checkin_at && (` por:

```jsx
                                    {estaPresente(encontrista) && (
```

- [ ] **Step 3: EncontristaDetalhe — exibir por dia**

Edit `src/pages/admin/EncontristaDetalhe.jsx`. Substituir o bloco (linhas ~94-97)
que mostrava `encontrista.checkin_at` por um que mostra os dois dias:

```jsx
          {encontrista.checkin_dia1_at && (
            <p className="detalhe-checkin">
              <Check size={11} /> Dia 1: {new Date(encontrista.checkin_dia1_at).toLocaleString('pt-BR')}
            </p>
          )}
          {encontrista.checkin_dia2_at && (
            <p className="detalhe-checkin">
              <Check size={11} /> Dia 2: {new Date(encontrista.checkin_dia2_at).toLocaleString('pt-BR')}
            </p>
          )}
```

(Manter a classe/estrutura original do elemento — apenas duplicar por dia. Se o
elemento original não tinha classe, replicar o markup existente.)

- [ ] **Step 4: Garantir que não sobrou `checkin_at`**

Run: `grep -rn "checkin_at" src/`
Expected: **nenhum resultado** (todas as referências migraram).

- [ ] **Step 5: Rodar suíte + build**

Run: `npx vitest run && npx vite build`
Expected: testes passam, build sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/Grupos.jsx src/pages/admin/CRM.jsx src/pages/admin/EncontristaDetalhe.jsx
git commit -m "refactor(checkin): leituras de presença usam util de dois dias

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Verificação final

- [ ] `npx vitest run` — toda a suíte verde.
- [ ] `npx vite build` — sem erros.
- [ ] `grep -rn "checkin_at" src/` — vazio.
- [ ] Migração `009` aplicada no Supabase.
- [ ] Fluxo manual: admin troca Dia 1/Dia 2, faz check-in manual, contadores por dia corretos.
- [ ] Fluxo QR: escanear/abrir `/checkin-evento/:encontroId`, telefone → grupo → confirma; repetir → "já confirmou".
- [ ] QR imprimível abre e imprime só o QR.
