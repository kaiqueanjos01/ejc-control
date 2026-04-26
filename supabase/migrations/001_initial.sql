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
