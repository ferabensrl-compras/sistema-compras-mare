-- IDENTIFICAR TODAS LAS TABLAS RELACIONADAS CON SUPPLIERS
-- Para eliminar completamente el sistema de autenticación

-- 1. VER TODAS LAS TABLAS EXISTENTES
SELECT 
    table_name,
    table_type,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as columnas
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. BUSCAR TABLAS QUE CONTENGAN 'SUPPLIER' EN EL NOMBRE
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as columnas
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name ILIKE '%supplier%'
ORDER BY table_name;

-- 3. BUSCAR TABLAS QUE CONTENGAN 'USER' EN EL NOMBRE  
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as columnas
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name ILIKE '%user%'
ORDER BY table_name;

-- 4. BUSCAR TABLAS QUE CONTENGAN 'QUOTE' EN EL NOMBRE
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as columnas
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name ILIKE '%quote%'
ORDER BY table_name;

-- 5. BUSCAR TABLAS QUE CONTENGAN 'REQUEST' EN EL NOMBRE
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as columnas
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name ILIKE '%request%'
ORDER BY table_name;

-- 6. VERIFICAR FOREIGN KEYS QUE PODRÍAN APUNTAR A TABLAS DE SUPPLIER
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
AND (ccu.table_name ILIKE '%supplier%' OR ccu.table_name ILIKE '%user%' OR ccu.table_name ILIKE '%quote%')
ORDER BY tc.table_name, kcu.column_name;