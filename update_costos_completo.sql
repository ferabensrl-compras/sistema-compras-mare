-- SQL COMPLETO PARA ACTUALIZAR TABLA costos_importacion
-- (Agregar todas las columnas que faltan según el error)

ALTER TABLE costos_importacion 
-- Columnas originales que pueden faltar
ADD COLUMN IF NOT EXISTS flete_internacional decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS seguro decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS impuestos_aduana decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gastos_despacho decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS transporte_local decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS otros_gastos decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS comisiones decimal(12,2) DEFAULT 0,

-- Nuevas columnas uruguayas
ADD COLUMN IF NOT EXISTS porcentaje_iva decimal(5,2) DEFAULT 22,
ADD COLUMN IF NOT EXISTS tipo_cambio decimal(8,4),
ADD COLUMN IF NOT EXISTS importe_fob decimal(12,2),
ADD COLUMN IF NOT EXISTS costo_deposito_portuario decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS anp_puerto decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS factura_agente_total decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS factura_agente_gravado decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gastos_dua decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS honorarios_despachante decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS flete_interno_uyu decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS otros_gastos_uyu decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS irae_anticipo decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS servicios_vuce decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tasa_escaner decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS extraordinario decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS guia_transito decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS imaduni decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS iva_despacho decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS iva_anticipo decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS recargo decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tasa_consular decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS timbre_profesional decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS servicio_aduanero decimal(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS otros_despacho decimal(12,2) DEFAULT 0,

-- Columnas calculadas
ADD COLUMN IF NOT EXISTS importe_fob_calculado decimal(12,2),
ADD COLUMN IF NOT EXISTS costos_adicionales_usd decimal(12,2),
ADD COLUMN IF NOT EXISTS costo_total_usd decimal(12,2),
ADD COLUMN IF NOT EXISTS coeficiente_decimal decimal(8,4),
ADD COLUMN IF NOT EXISTS coeficiente_porcentaje decimal(8,2),
ADD COLUMN IF NOT EXISTS desglose_costos jsonb,
ADD COLUMN IF NOT EXISTS productos_embarque jsonb;
