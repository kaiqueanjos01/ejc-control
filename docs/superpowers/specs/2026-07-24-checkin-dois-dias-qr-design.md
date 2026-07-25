# Check-in de dois dias + auto-check-in por QR — Design

**Data:** 2026-07-24
**Status:** Aprovado para planejamento

## Contexto

O retiro passou a ter **dois dias**. Hoje o check-in é um valor único
(`encontristas.checkin_at`) registrado de duas formas:

- **Manual pelo admin** em [CheckinAdmin.jsx](../../../src/pages/admin/CheckinAdmin.jsx) (busca + botão por linha).
- **Auto-check-in por token** na rota pública `/checkin/:token`
  ([Checkin.jsx](../../../src/pages/public/Checkin.jsx)), que hoje faz check-in
  **automaticamente ao abrir o link, sem confirmação**.

A lib `qrcode.react` já está instalada (usada em Configuracoes para o link de
pré-ficha). Cada encontrista tem `token uuid` único.

## Objetivos

1. Check-in passa a ser de **dois dias** (Dia 1 e Dia 2), registráveis
   independentemente.
2. **Auto-check-in por QR do evento**: a pessoa escaneia um QR único, informa o
   **telefone**, o sistema a identifica (sem expor a lista geral), mostra o
   **grupo** e registra a presença no **dia ativo**.
3. Tela para **gerar e imprimir o QR** dentro da página de Check-in.

## Não-objetivos (YAGNI)

- Mais de dois dias (o retiro é fixo em dois).
- Login/senha do encontrista (identificação é só por telefone).
- Histórico/auditoria de horários além do timestamp de cada dia.

## Decisões (confirmadas com o usuário)

- **QR único do evento**, sem lista de encontristas — identificação por telefone
  que retorna o grupo e faz o check-in.
- **Admin define o dia ativo** (Dia 1 / Dia 2) na tela de Check-in; o
  auto-check-in grava no dia ativo.
- Tela de gerar/imprimir QR **dentro da página de Check-in**.
- O **check-in manual na listagem é mantido** exatamente como hoje, apenas
  passando a agir sobre o dia selecionado.
- Check-ins já existentes (`checkin_at`) migram para o **Dia 1**.

## Modelo de dados (migração `009_checkin_dois_dias.sql`)

```sql
-- encontristas: dois dias de check-in
alter table encontristas add column checkin_dia1_at timestamptz;
alter table encontristas add column checkin_dia2_at timestamptz;

-- preserva check-ins existentes como Dia 1
update encontristas set checkin_dia1_at = checkin_at where checkin_at is not null;

alter table encontristas drop column checkin_at;

-- encontros: dia ativo para o auto-check-in (1 ou 2)
alter table encontros add column checkin_dia_ativo smallint not null default 1;
```

RLS: **sem alterações**. As políticas existentes já cobrem o fluxo:
- `publico_read_encontro` (anon lê `encontros`, inclui `checkin_dia_ativo`).
- `publico_read_encontrista_by_token` — `for select to anon using (true)` permite
  a busca por telefone.
- `publico_update_encontrista_dados_extras` — `for update to anon using(true)
  with check(true)` permite gravar as colunas de check-in.
- `equipe_full_encontros` / `equipe_full_encontristas` cobrem o admin.

## Componentes

### 1. Serviço `services/encontristas.js`

- `buscarEncontristasPorTelefone(encontroId, telefoneDigitos)` — busca
  encontristas do encontro cujo telefone (só dígitos) casa com o informado.
  Retorna a lista de matches (0, 1 ou vários). **Não** faz o check-in nesta
  etapa — apenas identifica.
- `confirmarCheckin(encontristaId, dia)` — grava `checkin_diaN_at = now()` se
  ainda nulo; retorna o encontrista atualizado (com grupo).
- `definirDiaAtivo(encontroId, dia)` — atualiza `encontros.checkin_dia_ativo`.
- `buscarDiaAtivo(encontroId)` — lê `checkin_dia_ativo` (usado no fluxo público).
- Remover/ajustar `fazerCheckin(token)` para o modelo de dois dias
  (ver rota por token abaixo).

A comparação de telefone usa `stripMask` (de [utils/masks.js](../../../src/utils/masks.js))
nos dois lados (input e valor salvo) para casar independente de formatação.

### 2. Util de check-in `utils/checkin.js` (novo)

Pequeno helper puro e testável:
- `colunaDoDia(dia)` → `'checkin_dia1_at'` | `'checkin_dia2_at'`.
- `estaPresente(encontrista)` → `!!(checkin_dia1_at || checkin_dia2_at)`.
- `fezCheckinNoDia(encontrista, dia)` → boolean.

Usado pelo admin, pelos badges e pelo fluxo público para evitar strings soltas.

### 3. Auto-check-in público — `pages/public/CheckinEvento.jsx` (novo)

- Rota: `/checkin-evento/:encontroId` (o QR do evento aponta pra cá).
- Estado da tela (máquina simples):
  1. **Input de telefone** → botão "Confirmar".
  2. Chama `fazerCheckinPorTelefone`:
     - **0 matches** → erro "Não encontramos esse telefone. Confira e tente de novo."
     - **1 match** → tela de confirmação mostrando **nome + grupo** e botão
       "Confirmar presença".
     - **>1 matches** (mesmo telefone, ex. família) → lista apenas os **nomes
       desses matches** para escolher (nunca a lista geral).
  3. Ao confirmar, chama `confirmarCheckin(id, diaAtivo)`:
     - Sucesso → tela de sucesso com nome, **grupo** e "Presença do Dia X
       confirmada".
     - Já tinha check-in no dia ativo → mensagem "Você já confirmou presença no
       Dia X" + grupo (não é erro).
- O `diaAtivo` vem de `buscarDiaAtivo(encontroId)` ao carregar a página.
- Reaproveita o visual de [Checkin.css](../../../src/pages/public/Checkin.css).

### 4. Rota por token `pages/public/Checkin.jsx` (ajuste)

Para não quebrar links já distribuídos, `/checkin/:token` passa a:
- Carregar o encontrista e o **dia ativo** do encontro.
- Exigir **confirmação** ("Confirmar presença") em vez de check-in automático.
- Gravar no dia ativo via `confirmarCheckin`.
- Mostrar o grupo e o estado "já confirmado no Dia X".

### 5. Admin — `pages/admin/CheckinAdmin.jsx`

- **Seletor Dia 1 / Dia 2** no topo. Selecionar um dia:
  - Filtra status/contadores e a ação de check-in para esse dia.
  - Persiste o dia como **dia ativo** (`definirDiaAtivo`) e exibe indicador
    "QR registrando: Dia X".
  - Ao carregar, o dia selecionado inicial = `checkin_dia_ativo` do encontro.
- Tabela: coluna Status e botão de check-in refletem o **dia selecionado**
  (usa `fezCheckinNoDia`). Check-in manual grava `checkin_diaN_at`.
- Contadores "Confirmados" passam a ser do dia selecionado (Total permanece).
- **Seção "QR de auto-check-in"**: botão que exibe/expande o `QRCodeSVG` com a
  URL `${origin}/checkin-evento/${encontroId}`, com botão **Imprimir**
  (`window.print()` + CSS de impressão que mostra só o QR + instruções).

### 6. Ajustes de consistência (leitura de presença)

Trocar leituras de `checkin_at` por `estaPresente(e)` (ou por dia quando fizer
sentido):
- [Grupos.jsx](../../../src/pages/admin/Grupos.jsx) — badge "Check-in" no card.
- [CRM.jsx](../../../src/pages/admin/CRM.jsx) — filtros de status
  (`sem_checkin`/`incompleto`/`completo`) e badge da lista.
- [EncontristaDetalhe.jsx](../../../src/pages/admin/EncontristaDetalhe.jsx) —
  exibição do horário: mostrar Dia 1 e Dia 2 separadamente quando houver.

### 7. Rotas — `App.jsx`

- Adicionar `<Route path="/checkin-evento/:encontroId" element={<CheckinEvento />} />`.

## Fluxo de dados

```
QR do evento  ─► /checkin-evento/:encontroId
                    │  buscarDiaAtivo(encontroId)
                    ▼
             [digita telefone] ─► buscarEncontristasPorTelefone(encontroId, digitos)
                    │
        ┌───────────┼─────────────────┐
        ▼           ▼                 ▼
      0 match    1 match           >1 match
      (erro)   [confirma]     [escolhe nome] ─► [confirma]
                    │                              │
                    ▼                              ▼
             confirmarCheckin(id, diaAtivo) ─► sucesso (nome + grupo)
```

## Tratamento de erros

- Telefone não encontrado → mensagem amigável, permite tentar de novo.
- Encontro inexistente/inválido → tela de erro.
- Já confirmado no dia → estado informativo (não erro), mostra o grupo.
- Falha de rede no `confirmarCheckin` → mensagem de erro com opção de tentar
  novamente; nada é gravado.
- Telefone sem dígitos suficientes → validação simples antes de consultar.

## Testes

- `utils/checkin.js`: `colunaDoDia`, `estaPresente`, `fezCheckinNoDia`
  (dia 1 só, dia 2 só, ambos, nenhum).
- Matching de telefone: casar com/sem máscara (usa `stripMask`); 0/1/vários
  matches (teste da função de filtro, isolando a query se necessário).
- Regressão: telas que liam `checkin_at` continuam corretas com o novo modelo.

## Arquivos afetados

**Novos:** `supabase/migrations/009_checkin_dois_dias.sql`,
`src/pages/public/CheckinEvento.jsx`, `src/utils/checkin.js`,
`tests/utils/checkin.test.js` (e CSS de impressão no CheckinAdmin.css).

**Alterados:** `src/services/encontristas.js`, `src/pages/admin/CheckinAdmin.jsx`
(+ `.css`), `src/pages/public/Checkin.jsx`, `src/pages/admin/Grupos.jsx`,
`src/pages/admin/CRM.jsx`, `src/pages/admin/EncontristaDetalhe.jsx`,
`src/App.jsx`.
