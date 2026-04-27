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
