# Design: Máscaras de Input e Expansão do Construtor de Campos

**Data:** 2026-04-26
**Status:** Aprovado

---

## Contexto

O sistema possui campos de telefone sem formatação e um construtor de formulários customizáveis incompleto (o tipo `select` não tem UI para configurar opções, e não existem tipos como CPF, CNPJ, CEP, textarea, checkbox). Este spec cobre:

1. Utilitário de máscaras puras sem dependências externas
2. Aplicação de máscaras nos campos de telefone já existentes no sistema
3. Expansão dos tipos de campo no construtor de formulários

---

## Parte 1 — Utilitário de Máscaras

### Arquivo: `src/utils/masks.js`

Funções puras exportadas, sem dependências externas, totalmente testáveis.

#### `applyMask(value, type)`

Recebe um valor (string, possivelmente com máscara já aplicada), normaliza para só dígitos, e retorna o valor formatado.

| `type` | Formato | Exemplo |
|--------|---------|---------|
| `phone` | `(XX) XXXXX-XXXX` (11 dígitos) / `(XX) XXXX-XXXX` (10 dígitos) | `(11) 99999-0000` |
| `cpf` | `XXX.XXX.XXX-XX` | `123.456.789-09` |
| `cnpj` | `XX.XXX.XXX/XXXX-XX` | `12.345.678/0001-90` |
| `cep` | `XXXXX-XXX` | `01310-100` |
| `rg` | `XX.XXX.XXX-X` | `12.345.678-9` |
| `currency` | `R$ X.XXX,XX` | `R$ 1.200,50` |

Comportamento:
- Se `type` não reconhecido, retorna o valor sem alteração.
- Aplica máscara progressiva conforme o usuário digita (nunca trunca dígitos já digitados).
- `phone` detecta automaticamente 10 ou 11 dígitos para escolher o formato.

#### `stripMask(value)`

Remove tudo que não é dígito. Para `currency`, remove `R$`, espaços, pontos e converte vírgula em ponto para obter o número decimal como string (`"1200.50"`).

#### `MASKED_TYPES`

Constante: array com os tipos que usam máscara — `['phone', 'cpf', 'cnpj', 'cep', 'rg', 'currency']`. Usado no DynamicForm para decidir se aplica máscara.

### Hook: `src/hooks/useMaskInput.js`

```js
useMaskInput(type, initialValue = '')
// retorna: { inputValue, handleChange, rawValue }
```

- `inputValue` — valor formatado para exibir no input
- `handleChange(e)` — handler para `onChange`; aplica `applyMask` a cada keystroke
- `rawValue` — valor sem máscara para salvar no banco

Internamente mantém `rawValue` como estado e deriva `inputValue` via `applyMask`.

### Testes: `tests/utils/masks.test.js`

Cobre `applyMask` e `stripMask` para todos os tipos, incluindo entradas parciais e edge cases (vazio, só dígitos, já formatado).

---

## Parte 2 — Máscaras em Campos Existentes

### 2.1 Telefone no pré-cadastro público — `src/pages/public/Inscricao.jsx`

Campo `telefone` usa `useMaskInput('phone')`. Antes de chamar a função de salvar, passa `rawValue` (só dígitos).

### 2.2 Telefone no modal do CRM — `src/pages/admin/CRM.jsx`

Campo `novoTelefone` no modal "Novo encontrista" usa `useMaskInput('phone')`. Salva `rawValue`.

### 2.3 Tipo `phone` no DynamicForm — `src/components/DynamicForm.jsx`

Quando `campo.tipo === 'phone'` (ou qualquer tipo em `MASKED_TYPES`), o componente usa `useMaskInput(campo.tipo)` no lugar de input simples.

O valor salvo em `dados_extras` é sempre o `rawValue` (sem máscara).

### 2.4 Exibição de telefone em outros locais

`EncontristaDetalhe.jsx` e o card do CRM exibem o telefone com `applyMask(telefone, 'phone')` onde antes exibiam o valor bruto. Compatível com dados antigos (sem máscara) pois `applyMask` normaliza os dígitos primeiro.

---

## Parte 3 — Construtor de Campos Expandido

### 3.1 Migration — `supabase/migrations/007_campos_tipos.sql`

Estende o CHECK constraint de `campos_formulario.tipo`:

```sql
ALTER TABLE campos_formulario
  DROP CONSTRAINT IF EXISTS campos_formulario_tipo_check;

ALTER TABLE campos_formulario
  ADD CONSTRAINT campos_formulario_tipo_check
  CHECK (tipo IN (
    'text', 'date', 'select', 'phone', 'number',
    'cpf', 'cnpj', 'cep', 'rg', 'currency', 'textarea', 'checkbox'
  ));
```

Nenhuma coluna nova é necessária. Os tipos de documento usam `opcoes` como `null`. `checkbox` armazena `true`/`false` em `dados_extras`. `currency` armazena o número como string decimal (ex: `"1200.50"`).

### 3.2 Admin — `src/pages/admin/Formulario.jsx`

**Dropdown de tipos** expandido com todos os tipos novos:

| Valor | Label |
|-------|-------|
| `text` | Texto |
| `textarea` | Texto longo |
| `number` | Número |
| `phone` | Telefone |
| `cpf` | CPF |
| `cnpj` | CNPJ |
| `cep` | CEP |
| `rg` | RG |
| `date` | Data |
| `currency` | Valor (R$) |
| `select` | Seleção |
| `checkbox` | Sim / Não |

**UI de opções para `select`:** quando `tipo === 'select'` no formulário de novo campo, aparece uma seção inline "Opções":
- Lista as opções já adicionadas com botão de remover (×) em cada uma
- Input + botão "Adicionar" para inserir nova opção
- Enter no input confirma a adição
- `opcoes` salvo como array de strings: `["Solteiro", "Casado", "Outro"]`
- Validação: não permite salvar um campo `select` sem ao menos uma opção

A mesma UI aparece ao editar um campo existente do tipo `select`.

### 3.3 Renderização pública — `src/components/DynamicForm.jsx`

| `campo.tipo` | Renderiza |
|-------------|-----------|
| `text` | `<input type="text">` |
| `textarea` | `<textarea rows={3}>` |
| `number` | `<input type="number">` |
| `phone` / `cpf` / `cnpj` / `cep` / `rg` / `currency` | `<input type="text">` com `useMaskInput(campo.tipo)` |
| `date` | `<input type="date">` |
| `select` | `<select>` com opções de `campo.opcoes` |
| `checkbox` | `<input type="checkbox">` com label clicável |

**Salvamento:** `DynamicForm` expõe `getValues()` que retorna `{ [campo.chave]: rawValue }` — sempre o valor sem máscara.

Para `checkbox`, o valor em `dados_extras` é booleano: `true` ou `false`.

---

## Arquivos Alterados / Criados

| Arquivo | Ação |
|---------|------|
| `src/utils/masks.js` | Criar |
| `src/hooks/useMaskInput.js` | Criar |
| `tests/utils/masks.test.js` | Criar |
| `src/components/DynamicForm.jsx` | Modificar — novos tipos + máscara |
| `src/pages/admin/Formulario.jsx` | Modificar — novos tipos + UI de opções do select |
| `src/pages/public/Inscricao.jsx` | Modificar — máscara no telefone |
| `src/pages/admin/CRM.jsx` | Modificar — máscara no telefone |
| `src/pages/admin/EncontristaDetalhe.jsx` | Modificar — exibição de telefone formatado |
| `supabase/migrations/007_campos_tipos.sql` | Criar |

---

## O que está fora do escopo

- Validação de CPF/CNPJ por algoritmo (dígito verificador) — só máscara visual
- Máscara nos inputs de valor do módulo Financeiro (já funcionam como `type="number"`)
- Internacionalização (todos os formatos são BR)
