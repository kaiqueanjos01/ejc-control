# Input Masks and Form Field Builder Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add BR input masks (phone, CPF, CNPJ, CEP, RG, currency) to existing fields and expand the custom form builder with 7 new field types.

**Architecture:** A pure `masks.js` utility (no deps) + a `useMaskInput` hook provide the masking layer. `DynamicForm` consumes `masks.js` directly (controlled-component pattern: display masked, store raw). Form builder (`Formulario.jsx`) gains new field types and a select-options UI. Existing phone inputs (Inscricao, CRM, EncontristaDetalhe) use the hook or util directly.

**Tech Stack:** React 19, Vitest (tests), vanilla JS regex for masks — zero new dependencies.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/masks.js` | Create | Pure mask functions: `applyMask`, `stripMask`, `MASKED_TYPES` |
| `src/hooks/useMaskInput.js` | Create | React hook wrapping masks.js for local-state inputs |
| `tests/utils/masks.test.js` | Create | Unit tests for all mask patterns |
| `src/components/DynamicForm.jsx` | Modify | Render new field types + apply masks |
| `src/pages/admin/Formulario.jsx` | Modify | New types in dropdown + select options UI |
| `src/pages/admin/Formulario.css` | Modify | Styles for the select-options area |
| `src/pages/public/Inscricao.jsx` | Modify | Phone mask on telefone input |
| `src/pages/admin/CRM.jsx` | Modify | Phone mask on modal input + formatted display in kanban card |
| `src/pages/admin/EncontristaDetalhe.jsx` | Modify | Phone mask on editable input + formatted display in header |
| `supabase/migrations/007_campos_tipos.sql` | Create | Extend CHECK constraint with 7 new tipos |

---

## Task 1: Pure mask utility (TDD)

**Files:**
- Create: `tests/utils/masks.test.js`
- Create: `src/utils/masks.js`

- [ ] **Step 1: Write failing tests**

Create `tests/utils/masks.test.js`:

```javascript
import { describe, it, expect } from 'vitest'
import { applyMask, stripMask, MASKED_TYPES } from '../../src/utils/masks'

describe('MASKED_TYPES', () => {
  it('contains all masked types', () => {
    expect(MASKED_TYPES).toEqual(
      expect.arrayContaining(['phone', 'cpf', 'cnpj', 'cep', 'rg', 'currency'])
    )
  })
})

describe('stripMask', () => {
  it('removes all non-digit characters', () => {
    expect(stripMask('(11) 99999-0000')).toBe('11999990000')
    expect(stripMask('123.456.789-09')).toBe('12345678909')
    expect(stripMask('12.345.678/0001-90')).toBe('12345678000190')
    expect(stripMask('01310-100')).toBe('01310100')
  })

  it('returns empty string for falsy values', () => {
    expect(stripMask('')).toBe('')
    expect(stripMask(null)).toBe('')
    expect(stripMask(undefined)).toBe('')
  })
})

describe('applyMask - phone', () => {
  it('formats 11 digits as (XX) XXXXX-XXXX', () => {
    expect(applyMask('11999990000', 'phone')).toBe('(11) 99999-0000')
  })
  it('formats 10 digits as (XX) XXXX-XXXX', () => {
    expect(applyMask('1133334444', 'phone')).toBe('(11) 3333-4444')
  })
  it('formats partially during typing', () => {
    expect(applyMask('11', 'phone')).toBe('(11')
    expect(applyMask('119', 'phone')).toBe('(11) 9')
    expect(applyMask('11999', 'phone')).toBe('(11) 999')
  })
  it('is idempotent on already-masked value', () => {
    expect(applyMask('(11) 99999-0000', 'phone')).toBe('(11) 99999-0000')
  })
  it('returns empty string for empty input', () => {
    expect(applyMask('', 'phone')).toBe('')
  })
})

describe('applyMask - cpf', () => {
  it('formats full CPF', () => {
    expect(applyMask('12345678909', 'cpf')).toBe('123.456.789-09')
  })
  it('formats partially', () => {
    expect(applyMask('123', 'cpf')).toBe('123')
    expect(applyMask('1234', 'cpf')).toBe('123.4')
    expect(applyMask('123456', 'cpf')).toBe('123.456')
    expect(applyMask('1234567', 'cpf')).toBe('123.456.7')
  })
  it('is idempotent on already-masked value', () => {
    expect(applyMask('123.456.789-09', 'cpf')).toBe('123.456.789-09')
  })
})

describe('applyMask - cnpj', () => {
  it('formats full CNPJ', () => {
    expect(applyMask('12345678000190', 'cnpj')).toBe('12.345.678/0001-90')
  })
  it('formats partially', () => {
    expect(applyMask('12', 'cnpj')).toBe('12')
    expect(applyMask('123', 'cnpj')).toBe('12.3')
    expect(applyMask('12345678', 'cnpj')).toBe('12.345.678')
    expect(applyMask('123456780001', 'cnpj')).toBe('12.345.678/0001')
  })
})

describe('applyMask - cep', () => {
  it('formats full CEP', () => {
    expect(applyMask('01310100', 'cep')).toBe('01310-100')
  })
  it('formats partially', () => {
    expect(applyMask('01310', 'cep')).toBe('01310')
    expect(applyMask('013101', 'cep')).toBe('01310-1')
  })
})

describe('applyMask - rg', () => {
  it('formats full RG', () => {
    expect(applyMask('123456789', 'rg')).toBe('12.345.678-9')
  })
  it('formats partially', () => {
    expect(applyMask('12', 'rg')).toBe('12')
    expect(applyMask('123', 'rg')).toBe('12.3')
  })
})

describe('applyMask - currency', () => {
  it('formats digits as BRL cents', () => {
    expect(applyMask('120050', 'currency')).toBe('R$ 1.200,50')
    expect(applyMask('100', 'currency')).toBe('R$ 1,00')
    expect(applyMask('1', 'currency')).toBe('R$ 0,01')
  })
  it('returns empty string for empty input', () => {
    expect(applyMask('', 'currency')).toBe('')
    expect(applyMask('0', 'currency')).toBe('R$ 0,00')
  })
})

describe('applyMask - unknown type', () => {
  it('returns value unchanged', () => {
    expect(applyMask('hello', 'text')).toBe('hello')
    expect(applyMask('42', 'number')).toBe('42')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/utils/masks.test.js
```

Expected: FAIL — "Cannot find module '../../src/utils/masks'"

- [ ] **Step 3: Implement `src/utils/masks.js`**

Create `src/utils/masks.js`:

```javascript
export const MASKED_TYPES = ['phone', 'cpf', 'cnpj', 'cep', 'rg', 'currency']

/**
 * Remove all non-digit characters from a value.
 * Returns '' for falsy input.
 */
export function stripMask(value) {
  if (!value && value !== 0) return ''
  return String(value).replace(/\D/g, '')
}

/**
 * Apply a BR input mask to a value.
 * Accepts raw digits or already-masked strings (idempotent).
 * Returns the formatted string for display.
 */
export function applyMask(value, type) {
  const digits = String(value || '').replace(/\D/g, '')

  switch (type) {
    case 'phone': {
      const d = digits.slice(0, 11)
      if (d.length === 0) return ''
      if (d.length <= 2) return `(${d}`
      if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
      if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
      return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    }
    case 'cpf': {
      const d = digits.slice(0, 11)
      if (d.length <= 3) return d
      if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
      if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
      return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
    }
    case 'cnpj': {
      const d = digits.slice(0, 14)
      if (d.length <= 2) return d
      if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
      if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
      if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
      return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
    }
    case 'cep': {
      const d = digits.slice(0, 8)
      if (d.length <= 5) return d
      return `${d.slice(0, 5)}-${d.slice(5)}`
    }
    case 'rg': {
      const d = digits.slice(0, 9)
      if (d.length <= 2) return d
      if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
      if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
      return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8)}`
    }
    case 'currency': {
      if (!digits) return ''
      const num = parseInt(digits, 10) || 0
      const reais = Math.floor(num / 100)
      const centavos = String(num % 100).padStart(2, '0')
      const reaisStr = reais.toLocaleString('pt-BR')
      return `R$ ${reaisStr},${centavos}`
    }
    default:
      return String(value || '')
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/utils/masks.test.js
```

Expected: all tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/utils/masks.js tests/utils/masks.test.js
git commit -m "feat: add pure BR input mask utility (phone, CPF, CNPJ, CEP, RG, currency)"
```

---

## Task 2: useMaskInput hook

**Files:**
- Create: `src/hooks/useMaskInput.js`

No separate test file — the hook is a thin wrapper around masks.js which is already tested.

- [ ] **Step 1: Implement `src/hooks/useMaskInput.js`**

```javascript
import { useState } from 'react'
import { applyMask, stripMask } from '../utils/masks'

/**
 * Hook for masked text inputs with local state.
 * - inputValue: formatted string for <input value={...}>
 * - handleChange: onChange handler
 * - rawValue: digits-only string to save to the database
 * - reset: clears the input
 */
export function useMaskInput(type, initialValue = '') {
  const [rawValue, setRawValue] = useState(stripMask(String(initialValue || '')))

  function handleChange(e) {
    setRawValue(stripMask(e.target.value))
  }

  function reset() {
    setRawValue('')
  }

  return {
    inputValue: applyMask(rawValue, type),
    handleChange,
    rawValue,
    reset,
  }
}
```

- [ ] **Step 2: Verify build passes**

```bash
npx vite build 2>&1 | grep -E "error|built"
```

Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useMaskInput.js
git commit -m "feat: add useMaskInput hook for controlled masked inputs"
```

---

## Task 3: Database migration — new field types

**Files:**
- Create: `supabase/migrations/007_campos_tipos.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/007_campos_tipos.sql`:

```sql
-- Extend campos_formulario.tipo to support new field types.
-- New types: cpf, cnpj, cep, rg, currency, textarea, checkbox

ALTER TABLE campos_formulario
  DROP CONSTRAINT IF EXISTS campos_formulario_tipo_check;

ALTER TABLE campos_formulario
  ADD CONSTRAINT campos_formulario_tipo_check
  CHECK (tipo IN (
    'text', 'date', 'select', 'phone', 'number',
    'cpf', 'cnpj', 'cep', 'rg', 'currency', 'textarea', 'checkbox'
  ));
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/007_campos_tipos.sql
git commit -m "feat: migration to extend campos_formulario type constraint with 7 new field types"
```

> **Note:** Apply this migration manually to Supabase before testing the form builder in production.

---

## Task 4: DynamicForm — new field types and masks

**Files:**
- Modify: `src/components/DynamicForm.jsx`

The component stays fully controlled (parent owns `valores`). For masked types, we display `applyMask(valores[campo.chave], tipo)` and call `onChange` with `stripMask(e.target.value)`. Currency uses `type="number"` to avoid the complex cents-shifting UX.

- [ ] **Step 1: Replace `src/components/DynamicForm.jsx` with**

```javascript
import { applyMask, stripMask, MASKED_TYPES } from '../utils/masks'

export function DynamicForm({ campos, valores, onChange }) {
  function handleChange(chave, eventValue, tipo) {
    let stored = eventValue
    if (MASKED_TYPES.includes(tipo)) {
      stored = stripMask(eventValue)
    }
    onChange({ ...valores, [chave]: stored })
  }

  return (
    <div className="dynamic-form">
      {campos.map(campo => (
        <div key={campo.id} className={`form-group ${campo.tipo === 'checkbox' ? 'form-group--checkbox' : ''}`}>
          {campo.tipo !== 'checkbox' && (
            <label className={`form-label ${campo.obrigatorio ? 'required' : ''}`}>
              {campo.label}
            </label>
          )}

          {campo.tipo === 'select' ? (
            <select
              value={valores[campo.chave] ?? ''}
              onChange={e => handleChange(campo.chave, e.target.value, campo.tipo)}
              required={campo.obrigatorio}
              className="form-select"
            >
              <option value="">Selecionar...</option>
              {(campo.opcoes ?? []).map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>

          ) : campo.tipo === 'textarea' ? (
            <textarea
              value={valores[campo.chave] ?? ''}
              onChange={e => handleChange(campo.chave, e.target.value, campo.tipo)}
              required={campo.obrigatorio}
              className="form-input"
              rows={3}
            />

          ) : campo.tipo === 'checkbox' ? (
            <label className="config-checkbox-label">
              <input
                type="checkbox"
                checked={!!valores[campo.chave]}
                onChange={e => handleChange(campo.chave, e.target.checked, campo.tipo)}
              />
              {campo.label}
            </label>

          ) : campo.tipo === 'currency' ? (
            <input
              type="number"
              step="0.01"
              min="0"
              value={valores[campo.chave] ?? ''}
              onChange={e => handleChange(campo.chave, e.target.value, campo.tipo)}
              required={campo.obrigatorio}
              className="form-input"
              placeholder="0,00"
            />

          ) : MASKED_TYPES.includes(campo.tipo) ? (
            <input
              type="text"
              inputMode={campo.tipo === 'phone' ? 'tel' : 'numeric'}
              value={applyMask(valores[campo.chave] ?? '', campo.tipo)}
              onChange={e => handleChange(campo.chave, e.target.value, campo.tipo)}
              required={campo.obrigatorio}
              className="form-input"
            />

          ) : (
            <input
              type={campo.tipo === 'date' ? 'date' : campo.tipo === 'number' ? 'number' : 'text'}
              value={valores[campo.chave] ?? ''}
              onChange={e => handleChange(campo.chave, e.target.value, campo.tipo)}
              required={campo.obrigatorio}
              className="form-input"
            />
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npx vite build 2>&1 | grep -E "error|built"
```

Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add src/components/DynamicForm.jsx
git commit -m "feat: expand DynamicForm with 7 new field types and input masks"
```

---

## Task 5: Formulario — new types dropdown and select options UI

**Files:**
- Modify: `src/pages/admin/Formulario.jsx`
- Modify: `src/pages/admin/Formulario.css`

- [ ] **Step 1: Add CSS classes to `src/pages/admin/Formulario.css`**

Append to the end of the file:

```css
/* Select field options builder */
.formulario-opcoes {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-light);
}

.formulario-opcao-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-light);
  font-size: 0.875rem;
  color: var(--text-primary);
}

.formulario-opcao-item span {
  flex: 1;
}

.formulario-opcao-add {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-3);
}
```

- [ ] **Step 2: Update `Formulario.jsx`**

Three changes: (a) add `novaOpcao` state, (b) add `adicionarOpcao` helper, (c) expand novoCampo initial state, (d) expand the tipo dropdown, (e) add options UI when tipo==='select', (f) pass opcoes to criarCampo, (g) validate select has options.

The full updated file:

```javascript
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronUp, ChevronDown, X, Plus, Layers } from 'lucide-react'
import { AdminLayout } from '../../components/AdminLayout'
import { useEncontro } from '../../hooks/useEncontro'
import { listarCampos, criarCampo, removerCampo, reordenarCampos } from '../../services/campos'
import './Formulario.css'

const TIPO_LABELS = {
  text: 'Texto',
  textarea: 'Texto longo',
  number: 'Número',
  phone: 'Telefone',
  cpf: 'CPF',
  cnpj: 'CNPJ',
  cep: 'CEP',
  rg: 'RG',
  date: 'Data',
  currency: 'Valor (R$)',
  select: 'Seleção',
  checkbox: 'Sim / Não',
}

export function Formulario() {
  const { encontroId } = useEncontro()
  const navigate = useNavigate()
  const [campos, setCampos] = useState([])
  const [secoes, setSecoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [adicionandoEmSecao, setAdicionandoEmSecao] = useState(null)
  const [novoCampo, setNovoCampo] = useState({
    label: '', tipo: 'text', obrigatorio: false, visivel_encontrista: true, opcoes: [],
  })
  const [novaOpcao, setNovaOpcao] = useState('')
  const [novaSecaoNome, setNovaSecaoNome] = useState('')
  const [criandoSecao, setCriandoSecao] = useState(false)

  useEffect(() => {
    if (!encontroId) { navigate('/admin'); return }
    listarCampos(encontroId).then(data => {
      setCampos(data)
      const ordemVista = []
      for (const c of data) {
        const s = c.secao || 'Geral'
        if (!ordemVista.includes(s)) ordemVista.push(s)
      }
      setSecoes(ordemVista)
    }).finally(() => setLoading(false))
  }, [encontroId, navigate])

  function camposDaSecao(secao) {
    return campos.filter(c => (c.secao || 'Geral') === secao)
  }

  function indexGlobal(campo) {
    return campos.findIndex(c => c.id === campo.id)
  }

  function adicionarOpcao() {
    const op = novaOpcao.trim()
    if (!op || novoCampo.opcoes.includes(op)) return
    setNovoCampo(p => ({ ...p, opcoes: [...p.opcoes, op] }))
    setNovaOpcao('')
  }

  function removerOpcao(index) {
    setNovoCampo(p => ({ ...p, opcoes: p.opcoes.filter((_, i) => i !== index) }))
  }

  async function handleAdicionarSecao(e) {
    e.preventDefault()
    const nome = novaSecaoNome.trim()
    if (!nome || secoes.includes(nome)) return
    setSecoes(prev => [...prev, nome])
    setNovaSecaoNome('')
    setCriandoSecao(false)
    setAdicionandoEmSecao(nome)
  }

  async function handleRemoverSecao(secao) {
    const camposSecao = camposDaSecao(secao)
    if (camposSecao.length > 0) {
      if (!confirm(`Remover a seção "${secao}" e seus ${camposSecao.length} campo(s)?`)) return
      await Promise.all(camposSecao.map(c => removerCampo(c.id)))
      setCampos(prev => prev.filter(c => (c.secao || 'Geral') !== secao))
    }
    setSecoes(prev => prev.filter(s => s !== secao))
  }

  async function handleAdicionarCampo(e) {
    e.preventDefault()
    if (novoCampo.tipo === 'select' && novoCampo.opcoes.length === 0) {
      alert('Adicione ao menos uma opção para o campo de seleção.')
      return
    }
    const chave = novoCampo.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const campo = await criarCampo({
      encontro_id: encontroId,
      label: novoCampo.label,
      chave,
      tipo: novoCampo.tipo,
      opcoes: novoCampo.tipo === 'select' ? novoCampo.opcoes : null,
      obrigatorio: novoCampo.obrigatorio,
      visivel_encontrista: novoCampo.visivel_encontrista,
      visivel_equipe: true,
      secao: adicionandoEmSecao === 'Geral' ? null : adicionandoEmSecao,
      ordem: campos.length,
    })
    setCampos(prev => [...prev, campo])
    setNovoCampo({ label: '', tipo: 'text', obrigatorio: false, visivel_encontrista: true, opcoes: [] })
    setNovaOpcao('')
    setAdicionandoEmSecao(null)
  }

  async function handleRemoverCampo(id) {
    if (!confirm('Remover este campo?')) return
    await removerCampo(id)
    setCampos(prev => prev.filter(c => c.id !== id))
  }

  async function handleMover(index, direcao) {
    const novo = [...campos]
    const alvo = index + direcao
    if (alvo < 0 || alvo >= novo.length) return
    ;[novo[index], novo[alvo]] = [novo[alvo], novo[index]]
    const comOrdem = novo.map((c, i) => ({ ...c, ordem: i }))
    setCampos(comOrdem)
    await reordenarCampos(comOrdem.map(c => ({ id: c.id, ordem: c.ordem })))
  }

  function cancelarForm() {
    setAdicionandoEmSecao(null)
    setNovoCampo({ label: '', tipo: 'text', obrigatorio: false, visivel_encontrista: true, opcoes: [] })
    setNovaOpcao('')
  }

  if (loading) return <AdminLayout><p>Carregando...</p></AdminLayout>

  return (
    <AdminLayout>
      <div className="formulario-header">
        <div>
          <h2 className="formulario-title">Campos do Formulário</h2>
          <p className="formulario-subtitle">Organize o formulário em seções e adicione campos a cada uma</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setCriandoSecao(true)}
          disabled={criandoSecao}
        >
          <Layers size={14} /> Nova seção
        </button>
      </div>

      {criandoSecao && (
        <form onSubmit={handleAdicionarSecao} className="formulario-nova-secao-form">
          <input
            className="form-input"
            placeholder="Nome da seção (ex: Dados Pessoais)"
            value={novaSecaoNome}
            onChange={e => setNovaSecaoNome(e.target.value)}
            required
            autoFocus
          />
          <button type="submit" className="btn btn-primary">Criar</button>
          <button type="button" className="btn btn-secondary" onClick={() => setCriandoSecao(false)}>Cancelar</button>
        </form>
      )}

      {secoes.length === 0 && !criandoSecao && (
        <div className="formulario-empty">
          <Layers size={32} strokeWidth={1.5} />
          <p>Nenhuma seção criada. Clique em "+ Nova seção" para começar.</p>
        </div>
      )}

      <div className="formulario-secoes">
        {secoes.map(secao => {
          const camposSecao = camposDaSecao(secao)
          const aberta = adicionandoEmSecao === secao
          return (
            <div key={secao} className="formulario-secao">
              <div className="formulario-secao-header">
                <div className="formulario-secao-header-left">
                  <span className="formulario-secao-title">{secao}</span>
                  <span className="formulario-secao-count">{camposSecao.length} campo{camposSecao.length !== 1 ? 's' : ''}</span>
                </div>
                <button
                  className="config-icon-btn config-icon-btn--danger"
                  onClick={() => handleRemoverSecao(secao)}
                  title="Remover seção"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="formulario-secao-body">
                {camposSecao.length === 0 && !aberta && (
                  <p className="formulario-secao-empty">Nenhum campo. Adicione um abaixo.</p>
                )}

                {camposSecao.map(campo => {
                  const gi = indexGlobal(campo)
                  return (
                    <div key={campo.id} className="config-field-item">
                      <div className="config-field-info">
                        <span className="config-field-label">{campo.label}</span>
                        <span className="config-field-type">{TIPO_LABELS[campo.tipo] ?? campo.tipo}</span>
                        {campo.obrigatorio && <span className="config-field-required">*obrigatório</span>}
                        {campo.visivel_encontrista && <span className="config-field-visibility">encontrista</span>}
                      </div>
                      <div className="config-field-actions">
                        <button onClick={() => handleMover(gi, -1)} disabled={gi === 0} className="config-icon-btn" aria-label="Mover para cima">
                          <ChevronUp size={14} />
                        </button>
                        <button onClick={() => handleMover(gi, 1)} disabled={gi === campos.length - 1} className="config-icon-btn" aria-label="Mover para baixo">
                          <ChevronDown size={14} />
                        </button>
                        <button onClick={() => handleRemoverCampo(campo.id)} className="config-icon-btn config-icon-btn--danger" aria-label="Remover">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {aberta && (
                  <form onSubmit={handleAdicionarCampo} className="formulario-campo-inline">
                    <div className="formulario-campo-inline-row">
                      <div className="form-group" style={{ margin: 0, flex: 2 }}>
                        <label className="form-label">Label</label>
                        <input
                          placeholder="ex: Data de Nascimento"
                          value={novoCampo.label}
                          onChange={e => setNovoCampo(p => ({ ...p, label: e.target.value }))}
                          required
                          autoFocus
                          className="form-input"
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0, flex: 1 }}>
                        <label className="form-label">Tipo</label>
                        <select
                          value={novoCampo.tipo}
                          onChange={e => {
                            const tipo = e.target.value
                            setNovoCampo(p => ({ ...p, tipo, opcoes: tipo === 'select' ? p.opcoes : [] }))
                            if (e.target.value !== 'select') setNovaOpcao('')
                          }}
                          className="form-select"
                        >
                          <option value="text">Texto</option>
                          <option value="textarea">Texto longo</option>
                          <option value="number">Número</option>
                          <option value="phone">Telefone</option>
                          <option value="cpf">CPF</option>
                          <option value="cnpj">CNPJ</option>
                          <option value="cep">CEP</option>
                          <option value="rg">RG</option>
                          <option value="date">Data</option>
                          <option value="currency">Valor (R$)</option>
                          <option value="select">Seleção</option>
                          <option value="checkbox">Sim / Não</option>
                        </select>
                      </div>
                    </div>

                    {novoCampo.tipo === 'select' && (
                      <div className="formulario-opcoes">
                        <label className="form-label">Opções *</label>
                        {novoCampo.opcoes.map((op, i) => (
                          <div key={i} className="formulario-opcao-item">
                            <span>{op}</span>
                            <button
                              type="button"
                              className="config-icon-btn config-icon-btn--danger"
                              onClick={() => removerOpcao(i)}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        <div className="formulario-opcao-add">
                          <input
                            className="form-input"
                            placeholder="Nova opção..."
                            value={novaOpcao}
                            onChange={e => setNovaOpcao(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarOpcao() } }}
                          />
                          <button type="button" className="btn btn-secondary btn-sm" onClick={adicionarOpcao}>
                            Adicionar
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="config-field-checkboxes">
                      <label className="config-checkbox-label">
                        <input
                          type="checkbox"
                          checked={novoCampo.obrigatorio}
                          onChange={e => setNovoCampo(p => ({ ...p, obrigatorio: e.target.checked }))}
                        />
                        Obrigatório
                      </label>
                      <label className="config-checkbox-label">
                        <input
                          type="checkbox"
                          checked={novoCampo.visivel_encontrista}
                          onChange={e => setNovoCampo(p => ({ ...p, visivel_encontrista: e.target.checked }))}
                        />
                        Visível ao encontrista
                      </label>
                    </div>
                    <div className="config-form-actions">
                      <button type="submit" className="btn btn-primary">Adicionar campo</button>
                      <button type="button" className="btn btn-secondary" onClick={cancelarForm}>Cancelar</button>
                    </div>
                  </form>
                )}

                {!aberta && (
                  <button
                    className="formulario-add-campo-btn"
                    onClick={() => { setAdicionandoEmSecao(secao); setNovoCampo({ label: '', tipo: 'text', obrigatorio: false, visivel_encontrista: true, opcoes: [] }) }}
                  >
                    <Plus size={13} /> Adicionar campo
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </AdminLayout>
  )
}
```

- [ ] **Step 3: Verify build passes**

```bash
npx vite build 2>&1 | grep -E "error|built"
```

Expected: `✓ built in ...ms`

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/Formulario.jsx src/pages/admin/Formulario.css
git commit -m "feat: expand form builder with 12 field types and select options UI"
```

---

## Task 6: Phone mask in Inscricao.jsx

**Files:**
- Modify: `src/pages/public/Inscricao.jsx`

The `telefone` state currently holds whatever the user types. After this change it holds raw digits. The submit handler already uses `telefone.trim()` which still works.

- [ ] **Step 1: Update `src/pages/public/Inscricao.jsx`**

Add import and replace the `telefone` state + phone input:

```javascript
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { buscarEncontro } from '../../services/encontros'
import { criarEncontrista } from '../../services/encontristas'
import { buildWhatsAppUrl } from '../../utils/whatsapp'
import { useMaskInput } from '../../hooks/useMaskInput'
import './Inscricao.css'

export function Inscricao() {
  const { encontroId } = useParams()
  const [encontro, setEncontro] = useState(null)
  const [nome, setNome] = useState('')
  const { inputValue: telDisplay, handleChange: handleTelChange, rawValue: telefone } = useMaskInput('phone')
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
      await criarEncontrista({ encontroId, nome: nome.trim(), telefone })
      setSucesso(true)
      const url = buildWhatsAppUrl({
        numero: encontro.whatsapp_numero,
        template: encontro.whatsapp_mensagem,
        nome: nome.trim(),
        telefone,
      })
      window.location.href = url
    } catch {
      setErro('Erro ao enviar. Tente novamente.')
      setEnviando(false)
    }
  }

  if (loading) return <Tela><p>Carregando...</p></Tela>
  if (erro && !encontro) return <Tela><p className="text-danger">{erro}</p></Tela>

  if (sucesso) {
    return (
      <Tela>
        <h2 className="text-success"><CheckCircle2 size={32} /> Enviado!</h2>
        <p>Redirecionando para o WhatsApp...</p>
      </Tela>
    )
  }

  return (
    <Tela>
      <div className="card inscricao-card">
        <h1 className="inscricao-title">{encontro.nome}</h1>
        <p className="inscricao-subtitle">Preencha seus dados para participar</p>

        <form onSubmit={handleSubmit} className="inscricao-form">
          <div className="form-group">
            <input
              className="form-input"
              placeholder="Seu nome completo"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <input
              className="form-input"
              placeholder="WhatsApp com DDD (ex: 11 99999-0000)"
              value={telDisplay}
              onChange={handleTelChange}
              inputMode="tel"
              required
            />
          </div>

          {erro && <p className="form-error">{erro}</p>}

          <button type="submit" disabled={enviando} className="btn btn-primary btn-full inscricao-btn">
            {enviando ? 'Enviando...' : 'Quero participar →'}
          </button>
        </form>

        <p className="inscricao-footer">
          Após enviar, você receberá um contato pelo WhatsApp.
        </p>
      </div>
    </Tela>
  )
}

function Tela({ children }) {
  return (
    <div className="inscricao-container">
      <div className="inscricao-content">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

```bash
npx vite build 2>&1 | grep -E "error|built"
```

Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add src/pages/public/Inscricao.jsx
git commit -m "feat: add phone mask to Inscricao registration form"
```

---

## Task 7: Phone mask in CRM and EncontristaDetalhe

**Files:**
- Modify: `src/pages/admin/CRM.jsx`
- Modify: `src/pages/admin/EncontristaDetalhe.jsx`

**CRM changes:**
1. Modal input: use `useMaskInput('phone')` for `novoTelefone`
2. Kanban card: format `encontrista.telefone` with `applyMask`

**EncontristaDetalhe changes:**
1. Header display: `applyMask(encontrista.telefone, 'phone')`
2. Editable input: display masked, store raw digits on change

- [ ] **Step 1: Update `src/pages/admin/CRM.jsx`**

Add imports at the top:

```javascript
import { useMaskInput } from '../../hooks/useMaskInput'
import { applyMask } from '../../utils/masks'
```

Replace the `novoTelefone` state declaration (line ~20):

```javascript
// Remove:
const [novoTelefone, setNovoTelefone] = useState('')

// Add:
const { inputValue: telDisplay, handleChange: handleTelChange, rawValue: novoTelefone, reset: resetTel } = useMaskInput('phone')
```

In `handleCriarEncontrista`, replace `setNovoTelefone('')` with `resetTel()`:

```javascript
async function handleCriarEncontrista(e) {
  e.preventDefault()
  setSalvando(true)
  try {
    const novo = await criarEncontrista({ encontroId, nome: novoNome, telefone: novoTelefone })
    setEncontristas(prev => [novo, ...prev])
    setNovoNome('')
    resetTel()
    setShowNovoModal(false)
  } finally {
    setSalvando(false)
  }
}
```

In the modal form, update the telefone input:

```jsx
<div className="form-group">
  <label className="form-label">Telefone</label>
  <input
    className="form-input"
    placeholder="(11) 99999-9999"
    value={telDisplay}
    onChange={handleTelChange}
    inputMode="tel"
    required
  />
</div>
```

In the kanban card, update phone display (line ~217):

```jsx
// Before:
<p className="card-phone">{encontrista.telefone}</p>

// After:
<p className="card-phone">{applyMask(encontrista.telefone ?? '', 'phone')}</p>
```

- [ ] **Step 2: Update `src/pages/admin/EncontristaDetalhe.jsx`**

Add imports at the top:

```javascript
import { applyMask, stripMask } from '../../utils/masks'
```

Update header display (line ~76):

```jsx
// Before:
<p className="header-phone">{encontrista.telefone}</p>

// After:
<p className="header-phone">{applyMask(encontrista.telefone ?? '', 'phone')}</p>
```

Update the editable telefone input (lines ~121-128):

```jsx
<div className="form-group">
  <label className="form-label">Telefone</label>
  <input
    type="tel"
    className="form-input"
    value={applyMask(encontrista.telefone ?? '', 'phone')}
    onChange={e => setEncontrista(prev => ({ ...prev, telefone: stripMask(e.target.value) }))}
  />
</div>
```

- [ ] **Step 3: Verify build and tests pass**

```bash
npx vitest run && npx vite build 2>&1 | grep -E "error|built"
```

Expected: all tests pass, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/CRM.jsx src/pages/admin/EncontristaDetalhe.jsx
git commit -m "feat: apply phone mask to CRM modal, kanban cards, and EncontristaDetalhe"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ `src/utils/masks.js` — Task 1
- ✅ `src/hooks/useMaskInput.js` — Task 2
- ✅ `tests/utils/masks.test.js` — Task 1
- ✅ Phone mask in Inscricao — Task 6
- ✅ Phone mask in CRM modal — Task 7
- ✅ Phone mask in DynamicForm (tipo=phone) — Task 4
- ✅ Phone display in CRM kanban — Task 7
- ✅ Phone display + edit in EncontristaDetalhe — Task 7
- ✅ New field types (cpf, cnpj, cep, rg, currency, textarea, checkbox) in DynamicForm — Task 4
- ✅ New field types in Formulario dropdown — Task 5
- ✅ Select options UI in Formulario — Task 5
- ✅ DB migration — Task 3

**Type consistency:** `applyMask(value, type)` and `stripMask(value)` used consistently across Tasks 4, 6, 7. `useMaskInput` returns `{ inputValue, handleChange, rawValue, reset }` — same shape used in Tasks 2, 6, 7.

**Note on currency in DynamicForm:** Spec said `type="text"` with `useMaskInput('currency')`, but the cents-based mask creates poor UX with backspace. Task 4 uses `type="number"` instead for currency fields — same practical outcome (stores decimal value), better UX.
