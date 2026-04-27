-- Tabela de categorias financeiras por encontro
CREATE TABLE fin_categorias (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  encontro_id uuid       NOT NULL REFERENCES encontros(id) ON DELETE CASCADE,
  nome       text        NOT NULL,
  ordem      integer     NOT NULL DEFAULT 0,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

-- Catálogo de itens por encontro
CREATE TABLE fin_itens (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  encontro_id uuid        NOT NULL REFERENCES encontros(id) ON DELETE CASCADE,
  categoria_id uuid       NOT NULL REFERENCES fin_categorias(id) ON DELETE RESTRICT,
  nome        text        NOT NULL,
  unidade     text        NOT NULL DEFAULT 'unid',
  criado_em   timestamptz NOT NULL DEFAULT now()
);

-- Lançamentos de despesa (um registro por item comprado)
CREATE TABLE fin_despesas (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  encontro_id   uuid        NOT NULL REFERENCES encontros(id) ON DELETE CASCADE,
  item_id       uuid        NOT NULL REFERENCES fin_itens(id) ON DELETE RESTRICT,
  quantidade    numeric     NOT NULL CHECK (quantidade > 0),
  valor_unitario numeric    NOT NULL CHECK (valor_unitario >= 0),
  data          date        NOT NULL DEFAULT CURRENT_DATE,
  observacao    text,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- Lançamentos de doação (dinheiro ou item)
CREATE TABLE fin_doacoes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  encontro_id uuid        NOT NULL REFERENCES encontros(id) ON DELETE CASCADE,
  tipo        text        NOT NULL CHECK (tipo IN ('dinheiro', 'item')),
  valor       numeric,
  item_id     uuid        REFERENCES fin_itens(id) ON DELETE RESTRICT,
  quantidade  numeric,
  doador      text,
  data        date        NOT NULL DEFAULT CURRENT_DATE,
  observacao  text,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fin_doacoes_dinheiro_check CHECK (
    tipo != 'dinheiro' OR (valor IS NOT NULL AND valor >= 0)
  ),
  CONSTRAINT fin_doacoes_item_check CHECK (
    tipo != 'item' OR (item_id IS NOT NULL AND quantidade IS NOT NULL AND quantidade > 0)
  )
);

-- Habilitar RLS
ALTER TABLE fin_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_itens      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_despesas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin_doacoes    ENABLE ROW LEVEL SECURITY;

-- Políticas: somente admin
CREATE POLICY "admin_fin_categorias" ON fin_categorias
  FOR ALL USING (current_admin_role() = 'admin');

CREATE POLICY "admin_fin_itens" ON fin_itens
  FOR ALL USING (current_admin_role() = 'admin');

CREATE POLICY "admin_fin_despesas" ON fin_despesas
  FOR ALL USING (current_admin_role() = 'admin');

CREATE POLICY "admin_fin_doacoes" ON fin_doacoes
  FOR ALL USING (current_admin_role() = 'admin');

-- Índices para queries por encontro
CREATE INDEX fin_categorias_encontro_idx ON fin_categorias(encontro_id);
CREATE INDEX fin_itens_encontro_idx      ON fin_itens(encontro_id);
CREATE INDEX fin_itens_categoria_idx     ON fin_itens(categoria_id);
CREATE INDEX fin_despesas_encontro_idx   ON fin_despesas(encontro_id);
CREATE INDEX fin_doacoes_encontro_idx    ON fin_doacoes(encontro_id);
