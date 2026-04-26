# EJC Control — Design Spec

**Data:** 2026-04-26  
**Stack:** React (Vite) + Supabase (PostgreSQL, Auth, Storage)  
**Tipo:** SPA única com rotas públicas e protegidas

---

## 1. Visão Geral

Sistema de gestão de Encontros de Jovens com Cristo (EJC). Permite controlar múltiplos encontros ao longo do tempo, com fluxo de pré-cadastro via QR code para encontristas, CRM interno para a equipe, montagem de grupos por cor e check-in no dia do evento.

---

## 2. Usuários e Contextos

### Encontrista (público, sem login)
- Acessa via QR code ou link direto
- Preenche pré-ficha (nome + telefone)
- Recebe link único por WhatsApp para completar a ficha depois
- Faz check-in no evento escaneando QR code em totem/tablet

### Equipe Interna (autenticada via Supabase Auth)
- Login com email e senha individual
- Acessa painel completo de gestão
- Gerencia encontristas, grupos, configurações e check-in

---

## 3. Arquitetura

### Frontend
- **React + Vite** — SPA única
- **React Router** — separação de rotas públicas e protegidas
- **Supabase JS Client** — comunicação com backend
- Rotas públicas: sem autenticação, acessíveis por qualquer pessoa
- Rotas `/admin/*`: protegidas por Supabase Auth, redirecionam para login se não autenticado

### Backend (Supabase)
- **PostgreSQL** — banco relacional com Row Level Security (RLS)
- **Supabase Auth** — autenticação da equipe interna (email/senha)
- **Storage** — fotos de perfil (opcional, fase futura)

### Deploy
- Frontend: Vercel ou Netlify (static hosting)
- Backend: Supabase cloud

---

## 4. Modelo de Dados

### `encontros`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| nome | text | Ex: "EJC Outubro 2026" |
| data_inicio | date | |
| data_fim | date | |
| whatsapp_numero | text | Número configurável (ex: 5511999990000) |
| whatsapp_mensagem | text | Template da mensagem pré-preenchida |
| ativo | boolean | Soft-delete / arquivado (false = encerrado) |
| created_at | timestamp | |

### `encontristas`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| encontro_id | uuid FK | → encontros |
| nome | text | |
| telefone | text | |
| grupo_id | uuid FK | → grupos (nullable) |
| checkin_at | timestamp | Null = não fez check-in |
| dados_extras | jsonb | Campos dinâmicos da ficha |
| token | uuid | Token único para link da ficha completa |
| created_at | timestamp | |

### `grupos`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| encontro_id | uuid FK | → encontros |
| nome | text | Ex: "Equipe Azul" |
| cor | text | Hex da cor (ex: "#3a86ff") |
| criterio_idade_min | int | Nullable — critério base |
| criterio_idade_max | int | Nullable — critério base |
| ordem | int | Ordem de exibição |

### `campos_formulario`
| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| encontro_id | uuid FK | → encontros |
| label | text | Ex: "Data de Nascimento" |
| chave | text | Chave usada em dados_extras (ex: "data_nascimento") |
| tipo | text | `text`, `date`, `select`, `phone`, `number` |
| opcoes | jsonb | Para tipo `select`: array de opções |
| obrigatorio | boolean | |
| visivel_encontrista | boolean | Se aparece no link da ficha completa |
| visivel_equipe | boolean | Se aparece somente no painel interno |
| ordem | int | Ordem no formulário |

---

## 5. Telas e Rotas

### Rotas Públicas

#### `GET /inscricao/:encontro_id`
Pré-ficha do encontrista via QR code.
- Campos: nome (text), telefone (phone)
- Ao submeter: cria registro em `encontristas`, redireciona para tela de sucesso
- Tela de sucesso: abre `wa.me/{numero}?text={mensagem_preenchida}` com nome e telefone interpolados
- Mensagem configurável no painel: ex. "Olá! Me chamo {nome} e tenho interesse no EJC. Meu contato é {telefone}."

#### `GET /ficha/:token`
Ficha completa — link enviado pelo time via WhatsApp.
- Carrega encontrista pelo token único
- Exibe campos com `visivel_encontrista = true` que ainda não foram preenchidos
- Permite editar e salvar dados em `dados_extras`

#### `GET /checkin/:token`
Check-in via QR code no totem do evento.
- QR code individual por encontrista gerado no painel (contém o token único)
- Ao acessar: marca `checkin_at`, exibe nome e cor do grupo do encontrista
- Se já fez check-in: exibe confirmação sem remarcar

### Rotas Protegidas (`/admin/*`)

#### `GET /admin/login`
Login com email/senha via Supabase Auth.

#### `GET /admin`
Seletor de encontro. Lista todos os encontros (ativos), permite criar novo ou selecionar existente. A seleção é armazenada em `localStorage` — cada membro da equipe tem sua própria sessão de trabalho sem afetar outros.

#### `GET /admin/crm`
Lista de encontristas do encontro ativo.
- Busca por nome
- Filtros: sem grupo, sem check-in, sem ficha completa
- Clique abre perfil completo do encontrista
- Botão para copiar link da ficha completa (para enviar pelo WhatsApp)

#### `GET /admin/crm/:id`
Perfil individual do encontrista.
- Exibe e permite editar todos os campos (incluindo `dados_extras`)
- Mostra status de check-in
- Permite atribuir/alterar grupo manualmente

#### `GET /admin/grupos`
Montagem de grupos.
- Colunas por grupo com drag-and-drop de encontristas entre elas
- Coluna "Sem grupo" para encontristas não atribuídos
- Sugestão automática baseada nos critérios de idade (aplicada com 1 clique, sobrescrevível)
- Criar, editar e remover grupos (nome, cor, critérios)

#### `GET /admin/checkin`
Check-in manual pela equipe.
- Campo de busca por nome
- Resultado exibe encontrista com grupo/cor
- Botão de confirmar check-in
- Indicador de status (já fez check-in ou não)

#### `GET /admin/configuracoes`
Configurações do encontro ativo.
- Editar número e mensagem do WhatsApp
- Construtor de campos do formulário (criar, reordenar, remover, definir tipo/label/obrigatoriedade)
- Gerenciar membros da equipe (convidar por email via Supabase Auth)
- Gerar QR code da pré-ficha do encontro (para impressão/exibição)
- QR codes individuais de check-in são gerados na página do encontrista em `/admin/crm/:id`

---

## 6. Fluxos Principais

### Fluxo do Encontrista
1. Escaneia QR code → `/inscricao/:encontro_id`
2. Preenche nome + telefone → submete
3. Sistema abre WhatsApp com mensagem pré-preenchida para o número da equipe
4. (Depois) Equipe envia link `/ficha/:token` pelo WhatsApp
5. Encontrista acessa e completa a ficha
6. No dia do evento: escaneia QR code no totem → `/checkin/:token` → confirmação com cor do grupo

### Fluxo da Equipe
1. Login em `/admin/login`
2. Seleciona encontro ativo
3. Acompanha pré-cadastros no CRM em tempo real
4. Complementa fichas e envia link para encontristas completarem
5. Monta grupos em `/admin/grupos` com drag-and-drop
6. No dia: gerencia check-ins em `/admin/checkin`

---

## 7. Segurança

- **Row Level Security (RLS)** no Supabase:
  - Encontristas podem ler/escrever apenas seu próprio registro (via token)
  - Equipe autenticada tem acesso total ao encontro ativo
- **Token único** por encontrista para acesso à ficha completa e check-in (UUID não guessable)
- Painel `/admin/*` completamente bloqueado sem sessão Supabase Auth válida

---

## 8. Fora de Escopo (v1)

- Notificações push ou SMS
- Impressão de crachás no sistema (crachás são pré-impressos)
- Relatórios/exportação de dados (pode ser via Supabase direto no v1)
- App mobile nativo
- Pagamento de inscrição

---

## 9. Decisões de Design

| Decisão | Escolha | Motivo |
|---|---|---|
| Frontend | React + Vite (SPA) | Simplicidade, sem SSR necessário |
| Backend | Supabase | Auth + DB + RLS integrados, sem servidor próprio |
| Campos extras | JSONB em `dados_extras` | Flexibilidade sem migrações a cada novo campo |
| Check-in offline | Não (v1) | Supabase requer conexão; evento tem Wi-Fi |
| Auth encontrista | Sem login, por token | Menor fricção para o encontrista |
