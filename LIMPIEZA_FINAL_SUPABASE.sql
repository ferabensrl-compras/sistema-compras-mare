-- LIMPIEZA FINAL DE SUPABASE - SISTEMA MARÉ
-- Basado en análisis de resultados

-- =============================================================================
-- ELIMINACIÓN SEGURA DE TABLA VACÍA
-- =============================================================================

-- 1. ELIMINAR COTIZACIONES (0 registros - SEGURO)
DROP TABLE IF EXISTS cotizaciones CASCADE;

-- =============================================================================
-- OPCIONAL: ELIMINAR supplier_users SI NO NECESITAS AUTENTICACIÓN
-- =============================================================================

-- Si decides que NO necesitas ningún sistema de usuarios:
-- (La app funciona perfectamente sin autenticación)

/*
-- Ver qué usuario quieres mantener (si alguno)
SELECT id, email, role, created_at FROM supplier_users;

-- Eliminar usuario proveedor (ya no se usa)
DELETE FROM supplier_users WHERE email = 'dean_honesty@vip.163.com';

-- OPCIONAL: Eliminar tu usuario admin también (si no lo necesitas)
-- DELETE FROM supplier_users WHERE email = 'ferabensrl@gmail.com';

-- OPCIONAL: Eliminar tabla completa si no necesitas usuarios
-- DROP TABLE IF EXISTS supplier_users CASCADE;
*/

-- =============================================================================
-- LIMPIEZA DE INVESTIGACIONES VIEJAS (OPCIONAL)
-- =============================================================================

-- Ver cuántas investigaciones viejas hay
SELECT 
    COUNT(*) as total_investigaciones,
    COUNT(CASE WHEN created_at < NOW() - INTERVAL '30 days' THEN 1 END) as viejas_30_dias,
    COUNT(CASE WHEN created_at < NOW() - INTERVAL '60 days' THEN 1 END) as viejas_60_dias
FROM investigaciones;

-- Eliminar investigaciones de más de 60 días (mantener las recientes)
-- DELETE FROM investigaciones WHERE created_at < NOW() - INTERVAL '60 days';

-- =============================================================================
-- VERIFICACIÓN POST-LIMPIEZA
-- =============================================================================

-- Ver todas las tablas que quedan
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as columnas
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Ver cuántos registros tiene cada tabla importante
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
PASO 1: Ejecutar eliminación de cotizaciones (SEGURO):
    DROP TABLE IF EXISTS cotizaciones CASCADE;

PASO 2: Decidir sobre supplier_users:
    - Si NO necesitas usuarios: Eliminar tabla completa
    - Si quieres mantener tu admin: Solo eliminar el proveedor
    - Si no estás seguro: Déjala por ahora

PASO 3: Opcional - Limpiar investigaciones viejas:
    - Solo si tienes muchas y ocupan espacio

PASO 4: Ejecutar verificación para confirmar limpieza
*/