# Excluir Encontrista (admin only)

**Data:** 2026-05-26  
**Status:** aprovado

## Contexto

O sistema não possui forma de excluir encontristas cadastrados. A funcionalidade deve ser exclusiva do role `admin`.

## Escopo

- Exclusão permanente (hard delete) de um encontrista
- Acesso restrito a `role === 'admin'`
- Ponto de entrada: kanban do CRM e página de detalhe do encontrista
- Confirmação obrigatória via modal antes de executar

## Fora do escopo

- Soft delete / inativação
- Auditoria / log de exclusões
- Exclusão em lote

---

## 1. Banco de dados

### Migration 009

A policy existente `equipe_full_encontristas` concede `FOR ALL` a todos os usuários autenticados, incluindo DELETE. Ela será substituída por políticas granulares para restringir DELETE ao admin.

```sql
-- Remover policy genérica
DROP POLICY IF EXISTS "equipe_full_encontristas" ON encontristas;

-- Recriar com granularidade
CREATE POLICY "encontristas_select" ON encontristas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "encontristas_insert" ON encontristas
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "encontristas_update" ON encontristas
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- DELETE: somente admin
CREATE POLICY "encontristas_delete" ON encontristas
  FOR DELETE TO authenticated
  USING (current_admin_role() = 'admin');
```

> `current_admin_role()` já existe (criada na migration 004, SECURITY DEFINER).

---

## 2. Service layer

**Arquivo:** `src/services/encontristas.js`

Adicionar ao final:

```js
export async function excluirEncontrista(id) {
  const { error } = await supabase
    .from('encontristas')
    .delete()
    .eq('id', id)
  if (error) throw error
}
```

Sem verificação de role no service — a RLS já protege no banco; a UI controla visibilidade.

---

## 3. UI — CRM kanban card

**Arquivo:** `src/pages/admin/CRM.jsx`

### Mudanças

1. Importar `useAdminRole` e `excluirEncontrista`
2. Importar ícone `Trash2` do lucide-react
3. Adicionar estado: `confirmandoExclusao: { id, nome } | null`
4. Renderizar ícone `<Trash2>` no card, visível apenas quando `role === 'admin'`
   - Posicionado no rodapé do card, separado do link de navegação
   - `stopPropagation` para não navegar ao detalhe ao clicar
5. Modal de confirmação reutilizando classes CSS existentes (`.crm-modal-overlay`, `.crm-modal`)
6. Ao confirmar:
   - Fechar modal
   - Remover encontrista do estado local (atualizar `encontristas`)
   - Chamar `excluirEncontrista(id)` — se falhar, recarregar lista e mostrar erro

### Estado de loading

Botão "Excluir" no modal fica desabilitado/loading enquanto a operação executa.

---

## 4. UI — EncontristaDetalhe

**Arquivo:** `src/pages/admin/EncontristaDetalhe.jsx`

### Mudanças

1. Importar `useAdminRole` e `excluirEncontrista`
2. Importar ícone `Trash2`
3. Adicionar estado: `confirmandoExclusao: boolean`
4. Botão "Excluir encontrista" com estilo danger no rodapé da página, visível apenas quando `role === 'admin'`
5. Modal de confirmação (mesmo padrão visual do CRM — criar CSS inline ou reutilizar `.crm-modal-overlay`)
6. Ao confirmar:
   - Chamar `excluirEncontrista(id)`
   - Navegar para `/admin/crm`

---

## 5. Fluxo completo

```
Admin clica em lixeira (card ou detalhe)
  → abre modal "Tem certeza? Essa ação não pode ser desfeita."
  → [Cancelar] fecha modal sem ação
  → [Excluir] desabilita botão, chama excluirEncontrista(id)
     → sucesso: remove do estado / navega para CRM
     → erro: exibe mensagem de erro, mantém encontrista
```

---

## 6. Arquivos alterados

| Arquivo | Tipo de mudança |
|---|---|
| `supabase/migrations/009_admin_delete_encontrista.sql` | novo |
| `src/services/encontristas.js` | adição |
| `src/pages/admin/CRM.jsx` | modificação |
| `src/pages/admin/EncontristaDetalhe.jsx` | modificação |
