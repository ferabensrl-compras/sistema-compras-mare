-- ELIMINACIÓN COMPLETA DEL SISTEMA DE SUPPLIERS Y USUARIOS
-- SISTEMA MARÉ - LIMPIEZA FINAL

-- =============================================================================
-- IMPORTANTE: EJECUTAR PASO A PASO Y VERIFICAR CADA RESULTADO
-- =============================================================================

-- PASO 1: EJECUTAR PRIMERO EL ARCHIVO "IDENTIFICAR_TABLAS_SUPPLIER.sql"
-- Para ver exactamente qué tablas existen relacionadas con suppliers

-- =============================================================================
-- ELIMINACIONES SEGURAS (BASADO EN ANÁLISIS PREVIO)
-- =============================================================================

-- 1. ELIMINAR COTIZACIONES (YA CONFIRMADO QUE ESTÁ VACÍA)
DROP TABLE IF EXISTS cotizaciones CASCADE;

-- 2. ELIMINAR SUPPLIER_USERS (CONFIRMADO QUE NO SE USA)
DROP TABLE IF EXISTS supplier_users CASCADE;

-- =============================================================================
-- ELIMINACIONES PROBABLES (VERIFICAR PRIMERO CON EL SCRIPT DE IDENTIFICACIÓN)
-- =============================================================================

-- Estas son tablas que probablemente existan basado en el desarrollo anterior
-- SOLO DESCOMENTA LAS LÍNEAS SI APARECEN EN EL RESULTADO DEL SCRIPT DE IDENTIFICACIÓN

-- Posibles tablas de supplier requests/quotes:
-- DROP TABLE IF EXISTS supplier_requests CASCADE;
-- DROP TABLE IF EXISTS supplier_quotes CASCADE;
-- DROP TABLE IF EXISTS supplier_quote_items CASCADE;
-- DROP TABLE IF EXISTS supplier_messages CASCADE;
-- DROP TABLE IF EXISTS supplier_notifications CASCADE;

-- Posibles tablas de portal de proveedores:
-- DROP TABLE IF EXISTS supplier_portal_access CASCADE;
-- DROP TABLE IF EXISTS supplier_sessions CASCADE;
-- DROP TABLE IF EXISTS supplier_permissions CASCADE;

-- Posibles tablas de comunicación:
-- DROP TABLE IF EXISTS quote_requests CASCADE;
-- DROP TABLE IF EXISTS quote_responses CASCADE;
-- DROP TABLE IF EXISTS supplier_chats CASCADE;
-- DROP TABLE IF EXISTS supplier_chat_messages CASCADE;

-- =============================================================================
-- LIMPIEZA DE COLUMNAS EN TABLAS EXISTENTES
-- =============================================================================

-- Si las tablas principales tienen columnas relacionadas con suppliers que ya no se usan:

-- Verificar si ordenes_compra tiene columnas de supplier que no necesitas:
-- ALTER TABLE ordenes_compra DROP COLUMN IF EXISTS supplier_user_id CASCADE;
-- ALTER TABLE ordenes_compra DROP COLUMN IF EXISTS supplier_approved CASCADE;
-- ALTER TABLE ordenes_compra DROP COLUMN IF EXISTS quote_reference CASCADE;

-- Verificar si productos tiene columnas de supplier:
-- ALTER TABLE productos DROP COLUMN IF EXISTS supplier_confirmed CASCADE;
-- ALTER TABLE productos DROP COLUMN IF EXISTS supplier_notes CASCADE;

-- =============================================================================
-- VERIFICACIÓN POST-ELIMINACIÓN
-- =============================================================================

-- Ver todas las tablas que quedan después de la limpieza
SELECT 
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_name = t.table_name AND table_schema = 'public'
    ) as columnas,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as tamaño
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verificar que no queden foreign keys rotos
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

-- Contar registros en tablas finales
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
-- INSTRUCCIONES DE EJECUCIÓN
-- =============================================================================

/*
PASO 1: Ejecutar "IDENTIFICAR_TABLAS_SUPPLIER.sql" completo
        → Me pasas TODOS los resultados

PASO 2: Basado en los resultados, descomentar las líneas necesarias arriba

PASO 3: Ejecutar las eliminaciones confirmadas:
        → DROP TABLE IF EXISTS cotizaciones CASCADE;
        → DROP TABLE IF EXISTS supplier_users CASCADE;

PASO 4: Ejecutar otras eliminaciones según lo que aparezca

PASO 5: Ejecutar verificaciones finales

RESULTADO ESPERADO:
- Solo tablas del sistema principal: embarques, ordenes_compra, productos, proveedores, costos_importacion, investigaciones
- Cero tablas relacionadas con suppliers/users/quotes
- Base de datos limpia y optimizada
*/