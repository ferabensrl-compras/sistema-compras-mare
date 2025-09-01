-- SQL PARA ACTUALIZAR TABLA costos_importacion

-- Agregar nuevas columnas de costos uruguayos
ALTER TABLE costos_importacion 
ADD COLUMN porcentaje_iva decimal(5,2) DEFAULT 22,
ADD COLUMN tipo_cambio decimal(8,4),
ADD COLUMN importe_fob decimal(12,2),
ADD COLUMN costo_deposito_portuario decimal(12,2) DEFAULT 0,
ADD COLUMN anp_puerto decimal(12,2) DEFAULT 0,
ADD COLUMN factura_agente_total decimal(12,2) DEFAULT 0,
ADD COLUMN factura_agente_gravado decimal(12,2) DEFAULT 0,
ADD COLUMN gastos_dua decimal(12,2) DEFAULT 0,
ADD COLUMN honorarios_despachante decimal(12,2) DEFAULT 0,
ADD COLUMN flete_interno_uyu decimal(12,2) DEFAULT 0,
ADD COLUMN otros_gastos_uyu decimal(12,2) DEFAULT 0,
ADD COLUMN irae_anticipo decimal(12,2) DEFAULT 0,
ADD COLUMN servicios_vuce decimal(12,2) DEFAULT 0,
ADD COLUMN tasa_escaner decimal(12,2) DEFAULT 0,
ADD COLUMN extraordinario decimal(12,2) DEFAULT 0,
ADD COLUMN guia_transito decimal(12,2) DEFAULT 0,
ADD COLUMN imaduni decimal(12,2) DEFAULT 0,
ADD COLUMN iva_despacho decimal(12,2) DEFAULT 0,
ADD COLUMN iva_anticipo decimal(12,2) DEFAULT 0,
ADD COLUMN recargo decimal(12,2) DEFAULT 0,
ADD COLUMN tasa_consular decimal(12,2) DEFAULT 0,
ADD COLUMN timbre_profesional decimal(12,2) DEFAULT 0,
ADD COLUMN servicio_aduanero decimal(12,2) DEFAULT 0,
ADD COLUMN otros_despacho decimal(12,2) DEFAULT 0,
ADD COLUMN importe_fob_calculado decimal(12,2),
ADD COLUMN costo_total_usd decimal(12,2),
ADD COLUMN coeficiente_decimal decimal(8,4),
ADD COLUMN coeficiente_porcentaje decimal(8,2),
ADD COLUMN desglose_costos jsonb,
ADD COLUMN productos_embarque jsonb;

-- Comentario sobre campos que no afectan coeficiente
COMMENT ON COLUMN costos_importacion.irae_anticipo IS 'IRAE Anticipo - Retorna a empresa, no afecta coeficiente';
COMMENT ON COLUMN costos_importacion.iva_despacho IS 'IVA Despacho - Retorna a empresa, no afecta coeficiente';  
COMMENT ON COLUMN costos_importacion.iva_anticipo IS 'IVA Anticipo - Retorna a empresa, no afecta coeficiente';
