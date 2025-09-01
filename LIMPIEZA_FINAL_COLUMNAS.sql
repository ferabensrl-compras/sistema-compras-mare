-- LIMPIEZA FINAL DE COLUMNAS INNECESARIAS
-- Remover rastros del sistema de suppliers en ordenes_compra

-- =============================================================================
-- ELIMINAR COLUMNAS QUE YA NO SE NECESITAN
-- =============================================================================

-- Columna relacionada con el portal de proveedores (ya eliminado)
ALTER TABLE ordenes_compra DROP COLUMN IF EXISTS fecha_enviada_portal CASCADE;

-- =============================================================================
-- VERIFICACIÓN FINAL DE LA ESTRUCTURA
-- =============================================================================

-- Ver estructura final de ordenes_compra
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'ordenes_compra'
ORDER BY ordinal_position;

-- Ver todas las tablas finales del sistema
SELECT 
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_name = t.table_name AND table_schema = 'public'
    ) as columnas,
    (SELECT COUNT(*) 
     FROM information_schema.table_constraints 
     WHERE table_name = t.table_name AND constraint_type = 'FOREIGN KEY'
    ) as foreign_keys
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verificar que no quedan foreign keys relacionados con suppliers
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Contar registros en todas las tablas finales
SELECT 'embarques' as tabla, COUNT(*) as registros FROM embarques
UNION ALL
SELECT 'ordenes_compra', COUNT(*) FROM ordenes_compra  
UNION ALL
SELECT 'productos', COUNT(*) FROM productos
UNION ALL
SELECT 'proveedores', COUNT(*) FROM proveedores
UNION ALL  
SELECT 'costos_importacion', COUNT(*) FROM costos_importacion
UNION ALL
SELECT 'investigaciones', COUNT(*) FROM investigaciones
ORDER BY tabla;

-- =============================================================================
-- ESTRUCTURA FINAL ESPERADA DE ORDENES_COMPRA
-- =============================================================================

/*
COLUMNAS QUE DEBEN QUEDAR EN ordenes_compra (13 columnas):

✅ id                   - Primary key
✅ numero               - OC-0001, OC-0002, etc.
✅ proveedor_id         - FK a proveedores
✅ fecha                - Fecha de la OC
✅ estado               - borrador/enviada/confirmada
✅ productos            - JSON con productos e imágenes
✅ total_fob            - Total en dólares
✅ comentarios          - Notas
✅ archivo_pdf          - Nombre del PDF generado
✅ archivo_excel        - Nombre del Excel generado
✅ created_at           - Timestamp creación
✅ updated_at           - Timestamp actualización  
✅ embarque_id          - FK a embarques

❌ fecha_enviada_portal - ELIMINADA (era del sistema suppliers)
*/