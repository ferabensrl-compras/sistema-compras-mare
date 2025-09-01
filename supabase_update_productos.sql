-- =====================================================
-- ACTUALIZACIÓN TABLA PRODUCTOS - SISTEMA COMPRAS MARÉ
-- Agregar campos de stock para integración con ERP
-- =====================================================

-- 1. Agregar columnas de stock a la tabla productos
ALTER TABLE productos 
ADD COLUMN IF NOT EXISTS stock_inicial integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS stock_actual integer DEFAULT 0;

-- 2. Agregar comentarios para documentar los campos
COMMENT ON COLUMN productos.stock_inicial IS 'Stock inicial del producto al ingresar al catálogo desde OC confirmada';
COMMENT ON COLUMN productos.stock_actual IS 'Stock actual disponible (se reduce con ventas)';

-- 3. Crear índices para optimizar consultas de stock
CREATE INDEX IF NOT EXISTS idx_productos_stock_actual ON productos(stock_actual);
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);

-- 4. Actualizar productos existentes (si los hay) con stock 0
UPDATE productos 
SET stock_inicial = 0, stock_actual = 0 
WHERE stock_inicial IS NULL OR stock_actual IS NULL;

-- 5. Configurar RLS (Row Level Security) para los nuevos campos si es necesario
-- Las políticas existentes deberían cubrir estos campos automáticamente

-- 6. Verificar la estructura actualizada
-- Puedes ejecutar esto para confirmar:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'productos' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- =====================================================
-- RESULTADO ESPERADO:
-- ✅ Campo stock_inicial agregado (integer, default 0)
-- ✅ Campo stock_actual agregado (integer, default 0)
-- ✅ Índices creados para optimización
-- ✅ Productos existentes actualizados con stock 0
-- =====================================================