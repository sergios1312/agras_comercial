-- Ejecuta esto en el SQL Editor de Supabase:
ALTER TABLE casos ADD COLUMN IF NOT EXISTS descripcion_tecnica TEXT;
ALTER TABLE casos ADD COLUMN IF NOT EXISTS descripcion_salida TEXT;
