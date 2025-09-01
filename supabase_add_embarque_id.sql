-- Agregar campo embarque_id a ordenes_compra para auto-asociación
ALTER TABLE ordenes_compra 
ADD COLUMN IF NOT EXISTS embarque_id uuid REFERENCES embarques(id) ON DELETE SET NULL;

-- Agregar campo embarque_id a productos para catálogo por embarque  
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS embarque_id uuid REFERENCES embarques(id) ON DELETE SET NULL;

-- Índices para optimizar consultas por embarque
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_embarque_id ON ordenes_compra(embarque_id);
CREATE INDEX IF NOT EXISTS idx_productos_embarque_id ON productos(embarque_id);

-- Comentarios explicativos
COMMENT ON COLUMN ordenes_compra.embarque_id IS 'Referencia al embarque al que pertenece esta OC (auto-asignado al embarque activo al crear)';
COMMENT ON COLUMN productos.embarque_id IS 'Referencia al embarque del que proviene este producto (asignado desde Control Invoice)';