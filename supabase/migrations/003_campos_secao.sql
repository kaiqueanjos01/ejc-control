-- Add section support to campos_formulario
ALTER TABLE campos_formulario ADD COLUMN IF NOT EXISTS secao TEXT DEFAULT NULL;
