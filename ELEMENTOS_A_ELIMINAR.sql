-- ELEMENTOS A ELIMINAR - SISTEMA MARÉ
-- Ejecutar estos queries para verificar qué se puede limpiar

-- 1. VERIFICAR CONTENIDO DE TABLAS POTENCIALMENTE INNECESARIAS
-- Verificar supplier_users (probablemente vacía)
SELECT 
    'supplier_users' as tabla, 
    COUNT(*) as registros,
    COALESCE(array_to_string(array_agg(DISTINCT email), ', '), 'N/A') as info_adicional
FROM supplier_users
UNION ALL
-- Verificar cotizaciones (puede tener datos históricos)
SELECT 
    'cotizaciones' as tabla, 
    COUNT(*) as registros,
    CASE WHEN COUNT(*) > 0 THEN 'CON DATOS - REVISAR' ELSE 'VACÍA - ELIMINAR' END as info_adicional
FROM cotizaciones;

-- 2. INVESTIGACIONES VIEJAS (más de 30 días)
SELECT 
    COUNT(*) as investigaciones_viejas,
    MIN(created_at)::date as fecha_mas_antigua,
    MAX(created_at)::date as fecha_mas_reciente
FROM investigaciones 
WHERE created_at < NOW() - INTERVAL '30 days';

-- 3. VERIFICAR RELACIONES ANTES DE ELIMINAR
-- Ver si cotizaciones tiene FK references
SELECT 
    COUNT(*) as ordenes_con_cotizacion_id
FROM ordenes_compra 
WHERE quote_reference IS NOT NULL;

-- 4. MOSTRAR ESTRUCTURA DE TABLAS PARA CONFIRMAR
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name IN ('supplier_users', 'cotizaciones')
ORDER BY table_name, ordinal_position;

-- 5. VER POLICIES DE TABLAS (deberían estar desactivadas)
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('supplier_users', 'cotizaciones');


-- SCRIPTS DE ELIMINACIÓN (EJECUTAR DESPUÉS DE VERIFICAR)
-- ⚠️ SOLO EJECUTAR SI LAS TABLAS ESTÁN VACÍAS O NO SON NECESARIAS

/*
-- Eliminar supplier_users (seguro de eliminar)
DROP TABLE IF EXISTS supplier_users CASCADE;

-- Eliminar cotizaciones (SOLO SI NO TIENE DATOS IMPORTANTES)
-- DROP TABLE IF EXISTS cotizaciones CASCADE;

-- inventario ya no existe - ✅ ELIMINADO

-- Limpiar investigaciones viejas (mantener últimos 30 días)
DELETE FROM investigaciones 
WHERE created_at < NOW() - INTERVAL '30 days';
*/