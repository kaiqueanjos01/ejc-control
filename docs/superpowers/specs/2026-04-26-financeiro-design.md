# Design: Gestão Financeira do Encontro

**Data:** 2026-04-26  
**Status:** Aprovado

---

## Contexto

Módulo para registrar e acompanhar as finanças de cada encontro. Controla despesas por categoria (com detalhamento de itens comprados) e doações recebidas (em dinheiro ou em itens). Acesso restrito ao role `admin`.

---

## Modelo de Dados

Quatro tabelas, todas com `encontro_id` (FK → `encontros`).

### `fin_categorias`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `encontro_id` | uuid FK | |
| `nome` | text | Ex: Cozinha, Limpeza, Secretaria |
| `ordem` | integer | Para ordenação na UI |
| `criado_em` | timestamptz | |

Categorias padrão criadas junto com o encontro: **Cozinha**, **Limpeza**, **Secretaria**.  
O admin pode adicionar, renomear ou excluir categorias sem despesas associadas.

### `fin_itens`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `encontro_id` | uuid FK | |
| `categoria_id` | uuid FK → fin_categorias | |
| `nome` | text | Ex: Arroz, Pano de prato, Papel A4 |
| `unidade` | text | Ex: kg, unid, resma, litro, pct |
| `criado_em` | timestamptz | |

Catálogo de itens por encontro. Itens podem ser criados inline no formulário de despesas.

### `fin_despesas`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `encontro_id` | uuid FK | |
| `item_id` | uuid FK → fin_itens | |
| `quantidade` | numeric | |
| `valor_unitario` | numeric | Valor por unidade em R$ |
| `data` | date | Data da compra |
| `observacao` | text nullable | |
| `criado_em` | timestamptz | |

Custo total da linha = `quantidade * valor_unitario`.  
Custo total por categoria = SUM das despesas cujos itens pertencem àquela categoria.

### `fin_doacoes`
| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | |
| `encontro_id` | uuid FK | |
| `tipo` | text | `dinheiro` ou `item` |
| `valor` | numeric nullable | Preenchido quando `tipo = dinheiro` |
| `item_id` | uuid FK nullable | Preenchido quando `tipo = item` |
| `quantidade` | numeric nullable | Preenchido quando `tipo = item` |
| `doador` | text nullable | Nome do doador (opcional) |
| `data` | date | |
| `observacao` | text nullable | |
| `criado_em` | timestamptz | |

Doações de itens são para controle de inventário — não abate do custo das despesas.

---

## Permissões

Dois novos campos em `ROLE_PERMISSIONS` em `src/services/adminUsers.js`:

| Role | canViewFinanceiro | canEditFinanceiro |
|---|---|---|
| `admin` | true | true |
| todos os outros | false | false |

RLS no banco: todas as tabelas `fin_*` com policy de SELECT/INSERT/UPDATE/DELETE restrita a `current_admin_role() = 'admin'`.

---

## Estrutura de Telas

### Página `/admin/financeiro`

Rota protegida com `requiredPermission="canViewFinanceiro"`. Usa `useEncontro()` para contexto do encontro ativo.

#### Aba "Resumo"
- Um card por categoria com:
  - Nome da categoria
  - Total gasto (R$) calculado no frontend a partir dos dados carregados
  - Lista colapsável dos itens: nome, qtd total comprada, valor total
- Rodapé fora dos cards: total geral de despesas (R$) + total de doações em dinheiro (R$)

#### Aba "Despesas"
- Tabela com colunas: Data | Item | Categoria | Qtd | Valor unit. | Total | Ações
- Ordenada por data descendente
- Botão "+ Despesa" exibe formulário inline acima da tabela:
  - Seletor de item (dropdown com opção "+ Criar novo item")
  - Se criar novo item: campos nome, categoria, unidade aparecem inline
  - Campos: quantidade, valor unitário, data (default hoje), observação (opcional)
  - Botões: Salvar / Cancelar
- Cada linha tem botão de excluir (com confirmação)

#### Aba "Doações"
- Tabela com colunas: Data | Doador | Tipo | Valor/Item | Ações
- Botão "+ Doação" exibe formulário com seletor de tipo:
  - **Dinheiro:** campo valor (R$), doador (opcional), data, observação
  - **Item:** seletor de item do catálogo, quantidade, doador (opcional), data, observação
- Cada linha tem botão de excluir (com confirmação)

#### Configurações (modal)
- Acessível por botão de engrenagem em qualquer aba
- Gerenciar categorias: listar, adicionar, renomear, excluir (somente sem itens associados)
- Gerenciar itens: listar por categoria, editar nome/unidade, excluir (somente sem despesas/doações)

---

## Arquitetura de Código

### Arquivos novos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/006_financeiro.sql` | Tabelas + RLS para as 4 tabelas fin_* |
| `src/services/financeiro.js` | CRUD: categorias, itens, despesas, doações |
| `src/pages/admin/Financeiro.jsx` | Página com 3 abas + modal de config |
| `src/pages/admin/Financeiro.css` | Estilos específicos da página |

### Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/services/adminUsers.js` | Adicionar `canViewFinanceiro` e `canEditFinanceiro` em `ROLE_PERMISSIONS` |
| `src/App.jsx` | Nova rota `/admin/financeiro` com `<ProtectedRoute requiredPermission="canViewFinanceiro">` |
| `src/components/AdminLayout.jsx` | Item "Financeiro" no menu lateral, visível apenas para role `admin` |

### Padrão do serviço (`src/services/financeiro.js`)

Funções exportadas:
- `listarCategorias(encontroId)`
- `criarCategoria(encontroId, nome)`
- `atualizarCategoria(id, nome)`
- `deletarCategoria(id)`
- `listarItens(encontroId)` — retorna com join em categoria
- `criarItem(encontroId, categoriaId, nome, unidade)`
- `atualizarItem(id, dados)`
- `deletarItem(id)`
- `listarDespesas(encontroId)` — retorna com join em item + categoria
- `criarDespesa(encontroId, itemId, quantidade, valorUnitario, data, observacao)`
- `deletarDespesa(id)`
- `listarDoacoes(encontroId)` — retorna com join em item quando tipo=item
- `criarDoacao(encontroId, tipo, dados)`
- `deletarDoacao(id)`

---

## Fluxo de Criação de Despesa com Item Novo

1. Admin clica "+ Despesa"
2. No seletor de item, escolhe "+ Criar novo item"
3. Campos nome, categoria e unidade aparecem inline
4. Ao salvar: (a) cria o item via `criarItem()`, (b) usa o id retornado para criar a despesa via `criarDespesa()`
5. Recarrega dados e fecha formulário

---

## O que está fora do escopo

- Relatórios exportáveis (PDF/CSV)
- Histórico de edições
- Múltiplos encontros comparados
- Controle de orçamento vs. realizado
