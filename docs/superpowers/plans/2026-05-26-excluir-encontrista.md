# Excluir Encontrista (admin only) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que usuários com role `admin` excluam encontristas permanentemente, via card do kanban CRM e via página de detalhe.

**Architecture:** RLS granular no banco restringe DELETE a admins; service layer expõe `excluirEncontrista(id)`; UI consome `useAdminRole()` para mostrar/ocultar botões e abre modal de confirmação antes de executar.

**Tech Stack:** React, Supabase (PostgreSQL + RLS), Vitest, lucide-react

---

## Files

| Arquivo | Ação |
|---|---|
| `supabase/migrations/009_admin_delete_encontrista.sql` | Criar |
| `src/services/encontristas.js` | Modificar — adicionar `excluirEncontrista` |
| `tests/services/encontristas.test.js` | Criar |
| `src/pages/admin/CRM.jsx` | Modificar — role check, lixeira no card, modal |
| `src/pages/admin/CRM.css` | Modificar — `.delete-btn`, ajuste `.card-footer`/`.copy-btn`, `.crm-modal-text` |
| `src/pages/admin/EncontristaDetalhe.jsx` | Modificar — role check, botão excluir, modal |
| `src/pages/admin/EncontristaDetalhe.css` | Modificar — estilos do modal de confirmação |

---

## Task 1: Migration 009 — RLS granular para encontristas

**Files:**
- Criar: `supabase/migrations/009_admin_delete_encontrista.sql`

A policy `equipe_full_encontristas` atual libera `FOR ALL` para todos os autenticados. Substituir por políticas separadas onde DELETE é exclusivo do admin.

- [ ] **Criar o arquivo de migration**

```sql
-- supabase/migrations/009_admin_delete_encontrista.sql
-- Substitui a policy genérica por políticas granulares.
-- DELETE passa a ser exclusivo do role 'admin'.

-- Remove policy que permite tudo para todos os autenticados
DROP POLICY IF EXISTS "equipe_full_encontristas" ON encontristas;

-- SELECT: todos os autenticados (comportamento anterior mantido)
CREATE POLICY "encontristas_select" ON encontristas
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: todos os autenticados (comportamento anterior mantido)
CREATE POLICY "encontristas_insert" ON encontristas
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: todos os autenticados (comportamento anterior mantido)
CREATE POLICY "encontristas_update" ON encontristas
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- DELETE: somente admin
-- current_admin_role() é SECURITY DEFINER criada na migration 004
CREATE POLICY "encontristas_delete" ON encontristas
  FOR DELETE TO authenticated
  USING (current_admin_role() = 'admin');
```

- [ ] **Aplicar no banco via SQL Editor do Supabase**

Cole e execute o SQL acima no painel → SQL Editor → New query.
Resultado esperado: `Success. No rows returned`

- [ ] **Verificar no painel**

Dashboard → Database → Policies → tabela `encontristas`. Devem aparecer 4 policies:
`encontristas_select`, `encontristas_insert`, `encontristas_update`, `encontristas_delete`
(e as policies anon `publico_*` permanecem intactas)

- [ ] **Commit**

```bash
git add supabase/migrations/009_admin_delete_encontrista.sql
git commit -m "feat(db): restrict encontristas DELETE to admin role via RLS"
```

---

## Task 2: Service — `excluirEncontrista` + testes

**Files:**
- Modificar: `src/services/encontristas.js`
- Criar: `tests/services/encontristas.test.js`

- [ ] **Escrever o teste falhando**

Criar `tests/services/encontristas.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do supabase antes de importar o service
const mockEq = vi.fn()
const mockDelete = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ delete: mockDelete }))

vi.mock('../../src/lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

import { excluirEncontrista } from '../../src/services/encontristas'

describe('excluirEncontrista', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('chama delete na tabela encontristas com o id correto', async () => {
    mockEq.mockResolvedValue({ error: null })
    await excluirEncontrista('abc-123')
    expect(mockFrom).toHaveBeenCalledWith('encontristas')
    expect(mockEq).toHaveBeenCalledWith('id', 'abc-123')
  })

  it('não lança erro quando a operação tem sucesso', async () => {
    mockEq.mockResolvedValue({ error: null })
    await expect(excluirEncontrista('abc-123')).resolves.toBeUndefined()
  })

  it('lança o erro retornado pelo Supabase', async () => {
    const err = new Error('RLS negado')
    mockEq.mockResolvedValue({ error: err })
    await expect(excluirEncontrista('abc-123')).rejects.toThrow('RLS negado')
  })
})
```

- [ ] **Rodar o teste e confirmar falha**

```bash
cd /Users/kanjos/t4e/ejc_control
npx vitest run tests/services/encontristas.test.js
```

Esperado: falha com `excluirEncontrista is not a function` ou similar

- [ ] **Adicionar `excluirEncontrista` em `src/services/encontristas.js`**

Adicionar ao final do arquivo:

```js
export async function excluirEncontrista(id) {
  const { error } = await supabase
    .from('encontristas')
    .delete()
    .eq('id', id)
  if (error) throw error
}
```

- [ ] **Rodar os testes e confirmar aprovação**

```bash
npx vitest run tests/services/encontristas.test.js
```

Esperado:
```
✓ chama delete na tabela encontristas com o id correto
✓ não lança erro quando a operação tem sucesso
✓ lança o erro retornado pelo Supabase
Test Files  1 passed (1)
```

- [ ] **Rodar toda a suite para garantir que nada quebrou**

```bash
npx vitest run
```

Esperado: todos passando

- [ ] **Commit**

```bash
git add src/services/encontristas.js tests/services/encontristas.test.js
git commit -m "feat: add excluirEncontrista service + tests"
```

---

## Task 3: CRM — lixeira no card + modal de confirmação

**Files:**
- Modificar: `src/pages/admin/CRM.jsx`
- Modificar: `src/pages/admin/CRM.css`

### 3a — CSS

- [ ] **Atualizar `.card-footer` e `.copy-btn` em `src/pages/admin/CRM.css`**

Localizar o bloco atual:
```css
.card-footer {
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-light);
}

.copy-btn {
  width: 100%;
  padding: var(--space-1) var(--space-2);
  ...
}
```

Substituir por (mantendo todas as propriedades do `.copy-btn`, só mudando `width: 100%` para `flex: 1`):

```css
.card-footer {
  padding-top: var(--space-2);
  border-top: 1px solid var(--border-light);
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.copy-btn {
  flex: 1;
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
  font-family: 'Plus Jakarta Sans', sans-serif;
}
```

- [ ] **Adicionar `.delete-btn` e `.crm-modal-text` ao final de `src/pages/admin/CRM.css`** (antes do bloco `@media (max-width: 1200px)`)

```css
.delete-btn {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--danger-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--danger);
  font-size: 0.75rem;
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  flex-shrink: 0;
}

.delete-btn:hover {
  background: var(--danger);
  color: #ffffff;
  border-color: var(--danger);
}

.crm-modal-text {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: var(--space-4);
}
```

### 3b — Componente

- [ ] **Atualizar imports em `src/pages/admin/CRM.jsx`**

Linha 4 — adicionar `Trash2` aos ícones importados:
```js
import { UserX, Clock, FileText, CheckCircle, Check, Link, Users, UserPlus, X, Trash2 } from 'lucide-react'
```

Linha 7 — adicionar `excluirEncontrista` ao import do service:
```js
import { listarEncontristas, criarEncontrista, excluirEncontrista } from '../../services/encontristas'
```

Adicionar import do hook (após linha 10, antes de `import './CRM.css'`):
```js
import { useAdminRole } from '../../hooks/useAdminRole'
```

- [ ] **Adicionar estado e hook no componente `CRM`**

Após a linha `const navigate = useNavigate()`:
```js
const { role } = useAdminRole()
const [confirmandoExclusao, setConfirmandoExclusao] = useState(null) // null | { id, nome }
const [excluindo, setExcluindo] = useState(false)
```

- [ ] **Adicionar handler `handleExcluirEncontrista`**

Adicionar após a função `handleDragEnd`:
```js
async function handleExcluirEncontrista() {
  if (!confirmandoExclusao) return
  setExcluindo(true)
  const idParaExcluir = confirmandoExclusao.id
  setConfirmandoExclusao(null)
  setEncontristas(prev => prev.filter(e => e.id !== idParaExcluir))
  try {
    await excluirEncontrista(idParaExcluir)
  } catch (err) {
    // Reverte se falhou
    listarEncontristas(encontroId).then(setEncontristas)
    alert('Erro ao excluir encontrista: ' + err.message)
  } finally {
    setExcluindo(false)
  }
}
```

- [ ] **Adicionar botão de lixeira no `card-footer`**

Localizar o trecho atual do `card-footer`:
```jsx
<div className="card-footer">
  <button
    className="copy-btn"
    onClick={(e) => {
      e.stopPropagation()
      copiarLinkFicha(encontrista.token)
    }}
    title="Copiar link"
  >
    <Link size={11} /> Copiar link
  </button>
</div>
```

Substituir por:
```jsx
<div className="card-footer">
  <button
    className="copy-btn"
    onClick={(e) => {
      e.stopPropagation()
      copiarLinkFicha(encontrista.token)
    }}
    title="Copiar link"
  >
    <Link size={11} /> Copiar link
  </button>
  {role === 'admin' && (
    <button
      className="delete-btn"
      onClick={(e) => {
        e.stopPropagation()
        setConfirmandoExclusao({ id: encontrista.id, nome: encontrista.nome })
      }}
      title="Excluir encontrista"
    >
      <Trash2 size={11} />
    </button>
  )}
</div>
```

- [ ] **Adicionar modal de confirmação de exclusão**

Adicionar logo após o bloco `{showNovoModal && (...)}` (em torno da linha 120 após as alterações):
```jsx
{confirmandoExclusao && (
  <div className="crm-modal-overlay" onClick={() => !excluindo && setConfirmandoExclusao(null)}>
    <div className="crm-modal" onClick={e => e.stopPropagation()}>
      <div className="crm-modal-header">
        <h3>Excluir encontrista</h3>
        <button
          className="crm-modal-close"
          onClick={() => setConfirmandoExclusao(null)}
          disabled={excluindo}
        >
          <X size={16} />
        </button>
      </div>
      <p className="crm-modal-text">
        Tem certeza que deseja excluir <strong>{confirmandoExclusao.nome}</strong>?{' '}
        Essa ação não pode ser desfeita.
      </p>
      <div className="crm-modal-actions">
        <button
          className="btn btn-danger"
          onClick={handleExcluirEncontrista}
          disabled={excluindo}
        >
          {excluindo ? 'Excluindo...' : 'Excluir'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setConfirmandoExclusao(null)}
          disabled={excluindo}
        >
          Cancelar
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Commit**

```bash
git add src/pages/admin/CRM.jsx src/pages/admin/CRM.css
git commit -m "feat: add admin-only delete button to CRM kanban cards"
```

---

## Task 4: EncontristaDetalhe — botão excluir + modal

**Files:**
- Modificar: `src/pages/admin/EncontristaDetalhe.jsx`
- Modificar: `src/pages/admin/EncontristaDetalhe.css`

### 4a — CSS

- [ ] **Adicionar estilos do modal ao final de `src/pages/admin/EncontristaDetalhe.css`**

```css
/* Modal de confirmação de exclusão */
.detalhe-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
}

.detalhe-modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  width: 100%;
  max-width: 420px;
  box-shadow: var(--shadow-lg);
}

.detalhe-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.detalhe-modal-header h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.detalhe-modal-close {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  line-height: 0;
  transition: color var(--transition-base);
}

.detalhe-modal-close:hover { color: var(--text-primary); }

.detalhe-modal-text {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: var(--space-4);
}

.detalhe-modal-actions {
  display: flex;
  gap: var(--space-2);
  padding-top: var(--space-2);
}

.delete-section {
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-light);
}
```

### 4b — Componente

- [ ] **Atualizar imports em `src/pages/admin/EncontristaDetalhe.jsx`**

Linha 3 — adicionar `Trash2` e `X` aos ícones:
```js
import { ChevronLeft, Check, Trash2, X } from 'lucide-react'
```

Linha 6 — adicionar `excluirEncontrista`:
```js
import { buscarEncontristaPorId, atualizarEncontrista, excluirEncontrista } from '../../services/encontristas'
```

Após linha 10 (antes de `import './EncontristaDetalhe.css'`):
```js
import { useAdminRole } from '../../hooks/useAdminRole'
```

- [ ] **Adicionar estado e hook no componente `EncontristaDetalhe`**

Após a linha `const { encontroId } = useEncontro()`:
```js
const { role } = useAdminRole()
const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
const [excluindo, setExcluindo] = useState(false)
```

- [ ] **Adicionar handler `handleExcluirEncontrista`**

Adicionar após a função `copiarLinkCheckin`:
```js
async function handleExcluirEncontrista() {
  setExcluindo(true)
  try {
    await excluirEncontrista(id)
    navigate('/admin/crm')
  } catch (err) {
    setMensagem('Erro ao excluir: ' + err.message)
    setExcluindo(false)
    setConfirmandoExclusao(false)
  }
}
```

- [ ] **Adicionar botão excluir e modal ao final do JSX**

Localizar o fechamento da `<form>`:
```jsx
        <button type="submit" disabled={salvando} className="btn btn-primary btn-full">
          {salvando ? 'Salvando...' : 'Salvar Encontrista'}
        </button>
      </form>
    </AdminLayout>
  )
```

Substituir por:
```jsx
        <button type="submit" disabled={salvando} className="btn btn-primary btn-full">
          {salvando ? 'Salvando...' : 'Salvar Encontrista'}
        </button>
      </form>

      {role === 'admin' && (
        <div className="delete-section">
          <button
            type="button"
            className="btn btn-danger btn-full"
            onClick={() => setConfirmandoExclusao(true)}
          >
            <Trash2 size={14} /> Excluir encontrista
          </button>
        </div>
      )}

      {confirmandoExclusao && (
        <div className="detalhe-modal-overlay" onClick={() => !excluindo && setConfirmandoExclusao(false)}>
          <div className="detalhe-modal" onClick={e => e.stopPropagation()}>
            <div className="detalhe-modal-header">
              <h3>Excluir encontrista</h3>
              <button
                className="detalhe-modal-close"
                onClick={() => setConfirmandoExclusao(false)}
                disabled={excluindo}
              >
                <X size={16} />
              </button>
            </div>
            <p className="detalhe-modal-text">
              Tem certeza que deseja excluir <strong>{encontrista?.nome}</strong>?{' '}
              Essa ação não pode ser desfeita.
            </p>
            <div className="detalhe-modal-actions">
              <button
                className="btn btn-danger"
                onClick={handleExcluirEncontrista}
                disabled={excluindo}
              >
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmandoExclusao(false)}
                disabled={excluindo}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
```

- [ ] **Commit**

```bash
git add src/pages/admin/EncontristaDetalhe.jsx src/pages/admin/EncontristaDetalhe.css
git commit -m "feat: add admin-only delete button to EncontristaDetalhe"
```

---

## Task 5: Verificação final

- [ ] **Rodar toda a suite de testes**

```bash
npx vitest run
```

Esperado: todos passando, incluindo os novos em `tests/services/encontristas.test.js`

- [ ] **Testar manualmente como admin**
  1. Logar com usuário `admin`
  2. Acessar CRM — confirmar que lixeira aparece nos cards
  3. Clicar na lixeira de um encontrista de teste — modal abre com nome correto
  4. Clicar "Cancelar" — modal fecha sem deletar
  5. Clicar na lixeira novamente → "Excluir" — card some do kanban, sem erro
  6. Acessar detalhe de outro encontrista — confirmar botão "Excluir encontrista" no rodapé
  7. Clicar "Excluir encontrista" → confirmar → redireciona para `/admin/crm`

- [ ] **Testar como non-admin (moderador ou equipe_externa)**
  1. Logar com usuário não-admin
  2. Confirmar que lixeira NÃO aparece nos cards do CRM
  3. Confirmar que botão "Excluir encontrista" NÃO aparece no detalhe
