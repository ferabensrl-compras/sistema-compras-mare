-- Script de verificación y creación de todas las tablas necesarias

-- 1. VERIFICAR Y CREAR TABLA PROVEEDORES
CREATE TABLE IF NOT EXISTS proveedores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL,
    contacto jsonb DEFAULT '{}',
    pais text,
    ciudad text,
    direccion text,
    telefono text,
    email text,
    notas text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. VERIFICAR Y CREAR TABLA INVESTIGACIONES  
CREATE TABLE IF NOT EXISTS investigaciones (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo text NOT NULL,
    categoria text,
    productos jsonb DEFAULT '[]',
    urls jsonb DEFAULT '[]',
    imagenes jsonb DEFAULT '[]',
    notas text,
    estado text DEFAULT 'activa',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. VERIFICAR Y CREAR TABLA COTIZACIONES
CREATE TABLE IF NOT EXISTS cotizaciones (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    proveedor_id uuid REFERENCES proveedores(id),
    investigacion_id uuid REFERENCES investigaciones(id),
    productos jsonb DEFAULT '[]',
    estado text DEFAULT 'pendiente',
    notas text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. VERIFICAR Y CREAR TABLA ORDENES_COMPRA (ya actualizada con embarque_id)
CREATE TABLE IF NOT EXISTS ordenes_compra (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    numero text NOT NULL UNIQUE,
    proveedor_id uuid REFERENCES proveedores(id),
    embarque_id uuid REFERENCES embarques(id) ON DELETE SET NULL,
    fecha date NOT NULL,
    estado text DEFAULT 'borrador' CHECK (estado IN ('borrador', 'enviada', 'en_proceso', 'confirmada')),
    productos jsonb DEFAULT '[]',
    total_fob decimal(10,2) DEFAULT 0,
    comentarios text,
    archivo_pdf text,
    archivo_excel text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. VERIFICAR Y CREAR TABLA PRODUCTOS (ya actualizada con embarque_id)
CREATE TABLE IF NOT EXISTS productos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo text NOT NULL UNIQUE,
    nombre text NOT NULL,
    descripcion text,
    categoria text,
    subcategoria text,
    precio_fob decimal(10,2),
    coeficiente decimal(5,2) DEFAULT 1.0,
    precio_sugerido decimal(10,2),
    colores jsonb DEFAULT '[]',
    medidas jsonb DEFAULT '{}',
    imagen_principal text,
    codigo_barras text,
    stock_inicial integer DEFAULT 0,
    stock_actual integer DEFAULT 0,
    embarque_id uuid REFERENCES embarques(id) ON DELETE SET NULL,
    estado text DEFAULT 'activo' CHECK (estado IN ('activo', 'archivado')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ÍNDICES PARA OPTIMIZACIÓN
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_numero ON ordenes_compra(numero);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_estado ON ordenes_compra(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_proveedor ON ordenes_compra(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_compra_embarque ON ordenes_compra(embarque_id);

CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_estado ON productos(estado);
CREATE INDEX IF NOT EXISTS idx_productos_embarque ON productos(embarque_id);

CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON proveedores(nombre);

-- VERIFICAR DATOS DE EJEMPLO SI LAS TABLAS ESTÁN VACÍAS
INSERT INTO proveedores (nombre, contacto, pais) 
VALUES ('Proveedor Test', '{"email": "test@test.com"}', 'China')
ON CONFLICT (id) DO NOTHING;