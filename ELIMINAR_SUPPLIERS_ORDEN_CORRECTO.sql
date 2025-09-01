-- ELIMINACIÓN COMPLETA DEL SISTEMA DE SUPPLIERS
-- ORDEN CORRECTO PARA EVITAR ERRORES DE FOREIGN KEYS

-- =============================================================================
-- BASADO EN EL ANÁLISIS DE FOREIGN KEYS RECIBIDO
-- =============================================================================

/*
ESTRUCTURA IDENTIFICADA:
- supplier_users (tabla base de usuarios)
- supplier_quotes (tabla base de cotizaciones) 
- supplier_files (archivos subidos por suppliers)
- supplier_messages (mensajes del chat)
- supplier_notifications (notificaciones)
- supplier_requests (solicitudes)
- ordenes_compra tiene referencia a supplier_quotes
*/

-- =============================================================================
-- PASO 1: REMOVER FOREIGN KEY DE TABLA PRINCIPAL (OPCIONAL)
-- =============================================================================

-- Si quieres mantener la columna pero sin la restricción FK:
-- ALTER TABLE ordenes_compra DROP CONSTRAINT IF EXISTS ordenes_compra_quote_origen_id_fkey;

-- O si quieres eliminar la columna completamente:
ALTER TABLE ordenes_compra DROP COLUMN IF EXISTS quote_origen_id CASCADE;

-- =============================================================================
-- PASO 2: ELIMINAR TABLAS EN ORDEN CORRECTO (DE DEPENDIENTE A INDEPENDIENTE)
-- =============================================================================

-- 1. Eliminar notificaciones (depende de messages y quotes)
DROP TABLE IF EXISTS supplier_notifications CASCADE;

-- 2. Eliminar messages (depende de files, quotes y users)
DROP TABLE IF EXISTS supplier_messages CASCADE;

-- 3. Eliminar files (depende de quotes y users)
DROP TABLE IF EXISTS supplier_files CASCADE;

-- 4. Eliminar requests (depende de quotes)
DROP TABLE IF EXISTS supplier_requests CASCADE;

-- 5. Eliminar quotes (tabla central, muchas dependen de ella)
DROP TABLE IF EXISTS supplier_quotes CASCADE;

-- 6. Eliminar users (tabla base)
DROP TABLE IF EXISTS supplier_users CASCADE;

-- 7. Eliminar cotizaciones (ya sabemos que está vacía)
DROP TABLE IF EXISTS cotizaciones CASCADE;

-- =============================================================================
-- PASO 3: VERIFICACIÓN POST-ELIMINACIÓN
-- =============================================================================

-- Ver qué tablas quedan
SELECT 
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_name = t.table_name AND table_schema = 'public'
    ) as columnas
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verificar que no hay foreign keys rotos
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Contar registros finales
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

-- Verificar columnas de ordenes_compra después de la limpieza
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'ordenes_compra'
ORDER BY ordinal_position;

-- =============================================================================
-- RESULTADO ESPERADO
-- =============================================================================

/*
DESPUÉS DE EJECUTAR ESTE SCRIPT DEBERÍAS TENER:

✅ TABLAS QUE QUEDAN (6 tablas principales):
- embarques
- ordenes_compra (sin columna quote_origen_id)
- productos  
- proveedores
- costos_importacion
- investigaciones

❌ TABLAS ELIMINADAS (7+ tablas de suppliers):
- supplier_notifications
- supplier_messages
- supplier_files
- supplier_requests
- supplier_quotes
- supplier_users
- cotizaciones

✅ CERO FOREIGN KEYS ROTOS
✅ BASE DE DATOS LIMPIA Y OPTIMIZADA
*/