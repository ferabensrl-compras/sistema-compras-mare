-- VER LA ESTRUCTURA EXACTA DE LA TABLA PROVEEDORES
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'proveedores' 
ORDER BY ordinal_position;