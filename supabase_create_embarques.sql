-- Crear tabla embarques completa (si no existe) o agregar columnas faltantes
CREATE TABLE IF NOT EXISTS embarques (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo text NOT NULL UNIQUE,
    ordenes_ids uuid[] DEFAULT '{}',
    fecha_estimada_salida date,
    fecha_llegada date,
    fecha_entrega date,
    estado text DEFAULT 'preparacion' CHECK (estado IN ('preparacion', 'en_transito', 'en_aduana', 'recibido')),
    documentos jsonb DEFAULT '[]',
    tracking text,
    contenedor text,
    forwarder text,
    comentarios text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Agregar columnas faltantes si la tabla ya existe
ALTER TABLE embarques 
ADD COLUMN IF NOT EXISTS codigo text,
ADD COLUMN IF NOT EXISTS ordenes_ids uuid[],
ADD COLUMN IF NOT EXISTS fecha_estimada_salida date,
ADD COLUMN IF NOT EXISTS fecha_llegada date,
ADD COLUMN IF NOT EXISTS fecha_entrega date,
ADD COLUMN IF NOT EXISTS estado text DEFAULT 'preparacion',
ADD COLUMN IF NOT EXISTS documentos jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS tracking text,
ADD COLUMN IF NOT EXISTS contenedor text,
ADD COLUMN IF NOT EXISTS forwarder text,
ADD COLUMN IF NOT EXISTS comentarios text;

-- Agregar restricción de estado si no existe
ALTER TABLE embarques DROP CONSTRAINT IF EXISTS embarques_estado_check;
ALTER TABLE embarques ADD CONSTRAINT embarques_estado_check 
CHECK (estado IN ('preparacion', 'en_transito', 'en_aduana', 'recibido'));

-- Agregar restricción de código único si no existe
ALTER TABLE embarques DROP CONSTRAINT IF EXISTS embarques_codigo_key;
ALTER TABLE embarques ADD CONSTRAINT embarques_codigo_key UNIQUE (codigo);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_embarques_estado ON embarques(estado);
CREATE INDEX IF NOT EXISTS idx_embarques_codigo ON embarques(codigo);
CREATE INDEX IF NOT EXISTS idx_embarques_created_at ON embarques(created_at);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_embarques_updated_at ON embarques;
CREATE TRIGGER update_embarques_updated_at
    BEFORE UPDATE ON embarques
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios explicativos
COMMENT ON TABLE embarques IS 'Tabla para gestionar embarques/envíos de múltiples órdenes de compra';
COMMENT ON COLUMN embarques.codigo IS 'Código único del embarque (ej: MARZO-2025, CNT-001)';
COMMENT ON COLUMN embarques.ordenes_ids IS 'Array de IDs de órdenes de compra incluidas en este embarque';
COMMENT ON COLUMN embarques.estado IS 'Estado del embarque: preparacion, en_transito, en_aduana, recibido';
COMMENT ON COLUMN embarques.documentos IS 'Array JSON con documentos del embarque (BL, facturas, etc.)';
COMMENT ON COLUMN embarques.tracking IS 'Número de seguimiento del envío';
COMMENT ON COLUMN embarques.contenedor IS 'Número de contenedor';
COMMENT ON COLUMN embarques.forwarder IS 'Empresa de transporte/forwarder';