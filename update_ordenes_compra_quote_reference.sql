-- Agregar campo de referencia para trazabilidad Quote → OC
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columnas necesarias a ordenes_compra
ALTER TABLE ordenes_compra 
ADD COLUMN IF NOT EXISTS quote_origen_id uuid REFERENCES supplier_quotes(id),
ADD COLUMN IF NOT EXISTS fecha_enviada_portal timestamp;

-- 2. Agregar columna quote_number a supplier_quotes para numeración
ALTER TABLE supplier_quotes 
ADD COLUMN IF NOT EXISTS quote_number text UNIQUE;

-- 3. Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_quote_origen 
ON ordenes_compra(quote_origen_id);

-- 4. Crear función para generar números de quote automáticamente
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
    supplier_name text;
    next_number integer;
    new_quote_number text;
BEGIN
    -- Obtener nombre del proveedor
    SELECT su.company_name INTO supplier_name
    FROM supplier_users su
    WHERE su.id = NEW.supplier_user_id;
    
    -- Si no hay nombre, usar 'SUPPLIER'
    IF supplier_name IS NULL THEN
        supplier_name := 'SUPPLIER';
    END IF;
    
    -- Generar prefijo (primeras 7 letras en mayúsculas)
    supplier_name := UPPER(LEFT(REGEXP_REPLACE(supplier_name, '[^A-Za-z]', '', 'g'), 7));
    
    -- Obtener siguiente número para este proveedor
    SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(quote_number, '^' || supplier_name || '-Q(\d+)$', '\1') AS integer)), 0) + 1
    INTO next_number
    FROM supplier_quotes sq
    WHERE sq.supplier_user_id = NEW.supplier_user_id
    AND sq.quote_number LIKE supplier_name || '-Q%';
    
    -- Si no se encontró patrón válido, empezar con 1
    IF next_number IS NULL THEN
        next_number := 1;
    END IF;
    
    -- Crear número de quote
    new_quote_number := supplier_name || '-Q' || LPAD(next_number::text, 3, '0');
    
    -- Asignar al registro
    NEW.quote_number := new_quote_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear trigger para generar números automáticamente
DROP TRIGGER IF EXISTS trigger_generate_quote_number ON supplier_quotes;
CREATE TRIGGER trigger_generate_quote_number
    BEFORE INSERT ON supplier_quotes
    FOR EACH ROW
    WHEN (NEW.quote_number IS NULL)
    EXECUTE FUNCTION generate_quote_number();

-- 6. Verificar que las tablas existen y tienen los datos correctos
DO $$
BEGIN
    -- Verificar si las tablas existen
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_quotes') THEN
        RAISE NOTICE 'ADVERTENCIA: La tabla supplier_quotes no existe';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ordenes_compra') THEN
        RAISE NOTICE 'ADVERTENCIA: La tabla ordenes_compra no existe';
    END IF;
    
    RAISE NOTICE 'Actualización completada exitosamente';
    RAISE NOTICE 'Campos agregados:';
    RAISE NOTICE '- ordenes_compra.quote_origen_id (referencia a supplier_quotes)';
    RAISE NOTICE '- supplier_quotes.quote_number (numeración automática)';
END $$;