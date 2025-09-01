// src/pages/CostosImportacion.jsx
import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Ship,
  DollarSign,
  TrendingUp,
  FileText,
  Save,
  AlertCircle,
  Package,
  Download,
  Eye
} from 'lucide-react';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function CostosImportacion() {
  const [embarques, setEmbarques] = useState([]);
  const [costos, setCostos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmbarque, setSelectedEmbarque] = useState(null);
  const [selectedCosto, setSelectedCosto] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // Formulario de costos uruguayos
  const [formCostos, setFormCostos] = useState({
    // Configuración
    porcentaje_iva: '22',
    tipo_cambio: '',
    
    // USD CON IVA INCLUIDO
    gastos_dua: '',
    honorarios_despachante: '',
    
    // USD SIN IVA
    importe_fob: '',
    costo_deposito_portuario: '',
    anp_puerto: '',
    factura_agente_total: '',
    factura_agente_gravado: '', // Parte gravada con IVA
    
    // UYU CON IVA
    flete_interno_uyu: '',
    otros_gastos_uyu: '',
    
    // DESPACHO UYU (13 items)
    irae_anticipo: '',
    servicios_vuce: '',
    tasa_escaner: '',
    extraordinario: '',
    guia_transito: '',
    imaduni: '',
    iva_despacho: '',
    iva_anticipo: '',
    recargo: '',
    tasa_consular: '',
    timbre_profesional: '',
    servicio_aduanero: '',
    otros_despacho: '',
    
    notas: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar embarques recibidos
      const { data: embarquesData, error: embarquesError } = await supabase
        .from('embarques')
        .select('*')
        .in('estado', ['preparacion', 'en_transito', 'en_aduana', 'recibido'])
        .order('created_at', { ascending: false });
      
      if (embarquesError) throw embarquesError;
      
      // Cargar costos existentes
      const { data: costosData, error: costosError } = await supabase
        .from('costos_importacion')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (costosError) throw costosError;
      
      setEmbarques(embarquesData || []);
      setCostos(costosData || []);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Obtener productos del embarque
  const obtenerProductosEmbarque = async (embarqueId) => {
    if (!embarqueId) return [];

    try {
      const embarque = embarques.find(e => e.id === embarqueId);
      if (!embarque?.ordenes_ids) return [];

      const { data: ordenesData, error } = await supabase
        .from('ordenes_compra')
        .select('*')
        .in('id', embarque.ordenes_ids);

      if (error) throw error;

      // Extraer todos los productos
      const todosLosProductos = [];
      ordenesData?.forEach(orden => {
        orden.productos?.forEach(producto => {
          todosLosProductos.push({
            ...producto,
            orden_numero: orden.numero
          });
        });
      });

      return todosLosProductos;
    } catch (error) {
      console.error('Error:', error);
      return [];
    }
  };

  // Calcular totales del embarque
  const calcularTotalesEmbarque = async (embarqueId) => {
    const productos = await obtenerProductosEmbarque(embarqueId);
    
    const totalFOB = productos.reduce((sum, p) => sum + (p.total_fob || 0), 0);
    const totalProductos = productos.length;
    const totalUnidades = productos.reduce((sum, p) => sum + (p.cantidad || 0), 0);
    
    return { totalFOB, totalProductos, totalUnidades, productos };
  };

  // Calcular coeficiente real según fórmula uruguaya
  const calcularCoeficienteReal = () => {
    const tipoCambio = parseFloat(formCostos.tipo_cambio || 1);
    const ivaPorc = parseFloat(formCostos.porcentaje_iva || 22) / 100;
    
    // FOB (base del cálculo)
    const importeFOB = parseFloat(formCostos.importe_fob || 0);
    
    if (importeFOB === 0) return 0;
    
    // USD SIN IVA
    const depositoPortuario = parseFloat(formCostos.costo_deposito_portuario || 0);
    const anpPuerto = parseFloat(formCostos.anp_puerto || 0);
    
    // Agente de cargas (parte no gravada)
    const agenteTotal = parseFloat(formCostos.factura_agente_total || 0);
    const agenteGravado = parseFloat(formCostos.factura_agente_gravado || 0);
    const agenteSinIva = agenteTotal - agenteGravado;
    
    // USD CON IVA (convertir a sin IVA)
    const gastosDUA = parseFloat(formCostos.gastos_dua || 0) / (1 + ivaPorc);
    const honorariosDespachante = parseFloat(formCostos.honorarios_despachante || 0) / (1 + ivaPorc);
    
    // DESPACHO UYU (solo gastos reales, SIN impuestos que retornan) convertir a USD
    const gastosDespacho = (
      parseFloat(formCostos.servicios_vuce || 0) +
      parseFloat(formCostos.tasa_escaner || 0) +
      parseFloat(formCostos.extraordinario || 0) +
      parseFloat(formCostos.guia_transito || 0) +
      parseFloat(formCostos.imaduni || 0) +
      parseFloat(formCostos.recargo || 0) +
      parseFloat(formCostos.tasa_consular || 0) +
      parseFloat(formCostos.timbre_profesional || 0) +
      parseFloat(formCostos.servicio_aduanero || 0) +
      parseFloat(formCostos.otros_despacho || 0)
      // NO se incluyen: IRAE_ANTICIPO, IVA_DESPACHO, IVA_ANTICIPO (retornan a la empresa)
    ) / tipoCambio;
    
    // FLETE Y OTROS USD (con IVA incluido) - convertir a sin IVA
    const fleteInterno = parseFloat(formCostos.flete_interno_uyu || 0) / (1 + ivaPorc);
    const otrosGastos = parseFloat(formCostos.otros_gastos_uyu || 0) / (1 + ivaPorc);
    
    // COSTOS ADICIONALES (sin incluir FOB)
    const costosAdicionalesUSD = agenteSinIva + depositoPortuario + anpPuerto + gastosDUA + 
                                honorariosDespachante + gastosDespacho + fleteInterno + otrosGastos;
    
    // COSTO TOTAL COMPLETO (FOB + COSTOS ADICIONALES)
    const costoTotalUSD = importeFOB + costosAdicionalesUSD;
    
    // COEFICIENTE CORRECTO: (FOB + COSTOS) / FOB
    const coeficiente = costoTotalUSD / importeFOB;
    
    return {
      importeFOB,
      costosAdicionalesUSD,
      costoTotalUSD,
      coeficiente: coeficiente,
      coeficientePorc: coeficiente * 100,
      desglose: {
        agenteSinIva,
        depositoPortuario,
        anpPuerto,
        gastosDUA,
        honorariosDespachante,
        gastosDespacho,
        fleteInterno,
        otrosGastos
      }
    };
  };

  // Guardar costos
  const guardarCostos = async () => {
    if (!selectedEmbarque) {
      alert('Selecciona un embarque');
      return;
    }

    if (!formCostos.tipo_cambio) {
      alert('Ingresa el tipo de cambio UYU/USD');
      return;
    }

    try {
      const calculoCoeficiente = calcularCoeficienteReal();
      
      // Obtener productos del embarque
      const { productos } = await calcularTotalesEmbarque(selectedEmbarque.id);

      // Función helper para convertir campos numéricos
      const toNumber = (value, defaultValue = 0) => {
        const num = parseFloat(value || defaultValue);
        return isNaN(num) ? defaultValue : num;
      };

      const datosGuardar = {
        embarque_id: selectedEmbarque.id,
        notas: formCostos.notas || '',
        
        // Configuración
        porcentaje_iva: toNumber(formCostos.porcentaje_iva, 22),
        tipo_cambio: toNumber(formCostos.tipo_cambio, 1),
        
        // USD SIN IVA
        importe_fob: toNumber(formCostos.importe_fob),
        costo_deposito_portuario: toNumber(formCostos.costo_deposito_portuario),
        anp_puerto: toNumber(formCostos.anp_puerto),
        factura_agente_total: toNumber(formCostos.factura_agente_total),
        factura_agente_gravado: toNumber(formCostos.factura_agente_gravado),
        
        // USD CON IVA
        gastos_dua: toNumber(formCostos.gastos_dua),
        honorarios_despachante: toNumber(formCostos.honorarios_despachante),
        
        // UYU CON IVA
        flete_interno_uyu: toNumber(formCostos.flete_interno_uyu),
        otros_gastos_uyu: toNumber(formCostos.otros_gastos_uyu),
        
        // DESPACHO UYU
        irae_anticipo: toNumber(formCostos.irae_anticipo),
        servicios_vuce: toNumber(formCostos.servicios_vuce),
        tasa_escaner: toNumber(formCostos.tasa_escaner),
        extraordinario: toNumber(formCostos.extraordinario),
        guia_transito: toNumber(formCostos.guia_transito),
        imaduni: toNumber(formCostos.imaduni),
        iva_despacho: toNumber(formCostos.iva_despacho),
        iva_anticipo: toNumber(formCostos.iva_anticipo),
        recargo: toNumber(formCostos.recargo),
        tasa_consular: toNumber(formCostos.tasa_consular),
        timbre_profesional: toNumber(formCostos.timbre_profesional),
        servicio_aduanero: toNumber(formCostos.servicio_aduanero),
        otros_despacho: toNumber(formCostos.otros_despacho),
        
        // Campos originales (compatibilidad)
        flete_internacional: 0,
        seguro: 0,
        impuestos_aduana: 0,
        gastos_despacho: 0,
        transporte_local: 0,
        otros_gastos: 0,
        comisiones: 0,
        
        // Campos calculados
        importe_fob_calculado: calculoCoeficiente.importeFOB,
        costos_adicionales_usd: calculoCoeficiente.costosAdicionalesUSD,
        costo_total_usd: calculoCoeficiente.costoTotalUSD,
        coeficiente_decimal: calculoCoeficiente.coeficiente,
        coeficiente_porcentaje: calculoCoeficiente.coeficientePorc,
        desglose_costos: calculoCoeficiente.desglose,
        productos_embarque: productos
      };

      if (selectedCosto?.id) {
        // Actualizar
        const { error } = await supabase
          .from('costos_importacion')
          .update(datosGuardar)
          .eq('id', selectedCosto.id);
        
        if (error) throw error;
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('costos_importacion')
          .insert([datosGuardar]);
        
        if (error) throw error;
      }

      alert(`Costos guardados. Coeficiente: ${calculoCoeficiente.coeficientePorc.toFixed(2)}%`);
      cargarDatos();
      setShowForm(false);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar costos: ' + error.message);
    }
  };

  // Cargar costos existentes
  const cargarCostosExistentes = (embarqueId) => {
    const costoExistente = costos.find(c => c.embarque_id === embarqueId);
    if (costoExistente) {
      setSelectedCosto(costoExistente);
      setFormCostos({
        // Configuración
        porcentaje_iva: costoExistente.porcentaje_iva || '22',
        tipo_cambio: costoExistente.tipo_cambio || '',
        
        // USD SIN IVA
        importe_fob: costoExistente.importe_fob || '',
        costo_deposito_portuario: costoExistente.costo_deposito_portuario || '',
        anp_puerto: costoExistente.anp_puerto || '',
        factura_agente_total: costoExistente.factura_agente_total || '',
        factura_agente_gravado: costoExistente.factura_agente_gravado || '',
        
        // USD CON IVA
        gastos_dua: costoExistente.gastos_dua || '',
        honorarios_despachante: costoExistente.honorarios_despachante || '',
        
        // UYU CON IVA
        flete_interno_uyu: costoExistente.flete_interno_uyu || '',
        otros_gastos_uyu: costoExistente.otros_gastos_uyu || '',
        
        // DESPACHO UYU
        irae_anticipo: costoExistente.irae_anticipo || '',
        servicios_vuce: costoExistente.servicios_vuce || '',
        tasa_escaner: costoExistente.tasa_escaner || '',
        extraordinario: costoExistente.extraordinario || '',
        guia_transito: costoExistente.guia_transito || '',
        imaduni: costoExistente.imaduni || '',
        iva_despacho: costoExistente.iva_despacho || '',
        iva_anticipo: costoExistente.iva_anticipo || '',
        recargo: costoExistente.recargo || '',
        tasa_consular: costoExistente.tasa_consular || '',
        timbre_profesional: costoExistente.timbre_profesional || '',
        servicio_aduanero: costoExistente.servicio_aduanero || '',
        otros_despacho: costoExistente.otros_despacho || '',
        
        notas: costoExistente.notas || ''
      });
    } else {
      setSelectedCosto(null);
      setFormCostos({
        // Configuración
        porcentaje_iva: '22',
        tipo_cambio: '',
        
        // USD SIN IVA
        importe_fob: '',
        costo_deposito_portuario: '',
        anp_puerto: '',
        factura_agente_total: '',
        factura_agente_gravado: '',
        
        // USD CON IVA
        gastos_dua: '',
        honorarios_despachante: '',
        
        // UYU CON IVA
        flete_interno_uyu: '',
        otros_gastos_uyu: '',
        
        // DESPACHO UYU
        irae_anticipo: '',
        servicios_vuce: '',
        tasa_escaner: '',
        extraordinario: '',
        guia_transito: '',
        imaduni: '',
        iva_despacho: '',
        iva_anticipo: '',
        recargo: '',
        tasa_consular: '',
        timbre_profesional: '',
        servicio_aduanero: '',
        otros_despacho: '',
        
        notas: ''
      });
    }
  };

  // Exportar análisis de costos
  // Función exportable para usar en ZIP de embarque
  const generarExcelCostos = (embarqueId) => {
    const costoData = costos.find(c => c.embarque_id === embarqueId);
    const embarqueData = embarques.find(e => e.id === embarqueId);
    
    if (!costoData || !costoData.productos_embarque || !embarqueData) {
      return null; // No hay datos de costos
    }
    
    return generarExcelCompleto(costoData, embarqueData);
  };

  const generarExcelCompleto = (costosData, embarqueData) => {
    const wb = XLSX.utils.book_new();
    
    // Hoja 1: Resumen General
    const resumen = [{
      'Embarque': embarqueData?.codigo || '',
      'Fecha Análisis': new Date().toLocaleDateString('es-UY'),
      'Tipo Cambio UYU/USD': costosData.tipo_cambio,
      'IVA (%)': costosData.porcentaje_iva,
      'Importe FOB USD': costosData.importe_fob,
      'Costos Adicionales USD': costosData.costos_adicionales_usd,
      'Costo Total USD': costosData.costo_total_usd,
      'Coeficiente Decimal': costosData.coeficiente_decimal?.toFixed(4),
      'Coeficiente Porcentaje': costosData.coeficiente_porcentaje?.toFixed(2) + '%',
      'Notas': costosData.notas || ''
    }];
    
    const wsResumen = XLSX.utils.json_to_sheet(resumen);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
    
    // Hoja 2: Desglose de Costos
    const desglose = [
      // USD SIN IVA
      { Concepto: 'COSTOS USD SIN IVA', Tipo: '===', 'Monto USD': '===', 'Observaciones': '===' },
      { Concepto: 'Importe FOB', Tipo: 'Base', 'Monto USD': costosData.importe_fob, 'Observaciones': 'Valor de mercancía' },
      { Concepto: 'Depósito Portuario', Tipo: 'Sin IVA', 'Monto USD': costosData.costo_deposito_portuario || 0, 'Observaciones': '' },
      { Concepto: 'ANP Puerto', Tipo: 'Sin IVA', 'Monto USD': costosData.anp_puerto || 0, 'Observaciones': '' },
      { Concepto: 'Agente (sin IVA)', Tipo: 'Sin IVA', 'Monto USD': (costosData.factura_agente_total || 0) - (costosData.factura_agente_gravado || 0), 'Observaciones': 'Parte sin IVA' },
      
      // USD CON IVA 
      { Concepto: '', Tipo: '', 'Monto USD': '', 'Observaciones': '' },
      { Concepto: 'COSTOS USD CON IVA', Tipo: '===', 'Monto USD': '===', 'Observaciones': '===' },
      { Concepto: 'Gastos DUA', Tipo: 'Con IVA', 'Monto USD': (costosData.gastos_dua || 0) / (1 + (costosData.porcentaje_iva || 22)/100), 'Observaciones': `Bruto: ${costosData.gastos_dua || 0}` },
      { Concepto: 'Honorarios Despachante', Tipo: 'Con IVA', 'Monto USD': (costosData.honorarios_despachante || 0) / (1 + (costosData.porcentaje_iva || 22)/100), 'Observaciones': `Bruto: ${costosData.honorarios_despachante || 0}` },
      { Concepto: 'Agente Gravado', Tipo: 'Con IVA', 'Monto USD': (costosData.factura_agente_gravado || 0) / (1 + (costosData.porcentaje_iva || 22)/100), 'Observaciones': `Bruto: ${costosData.factura_agente_gravado || 0}` },
      { Concepto: 'Flete Interno', Tipo: 'Con IVA', 'Monto USD': ((costosData.flete_interno_uyu || 0) / (costosData.tipo_cambio || 1)) / (1 + (costosData.porcentaje_iva || 22)/100), 'Observaciones': `UYU: ${costosData.flete_interno_uyu || 0}` },
      { Concepto: 'Otros Gastos', Tipo: 'Con IVA', 'Monto USD': ((costosData.otros_gastos_uyu || 0) / (costosData.tipo_cambio || 1)) / (1 + (costosData.porcentaje_iva || 22)/100), 'Observaciones': `UYU: ${costosData.otros_gastos_uyu || 0}` },
      
      // DESPACHO UYU
      { Concepto: '', Tipo: '', 'Monto USD': '', 'Observaciones': '' },
      { Concepto: 'GASTOS DESPACHO UYU', Tipo: '===', 'Monto USD': '===', 'Observaciones': '===' },
      { Concepto: 'Servicios VUCE', Tipo: 'Despacho', 'Monto USD': (costosData.servicios_vuce || 0) / (costosData.tipo_cambio || 1), 'Observaciones': `UYU: ${costosData.servicios_vuce || 0}` },
      { Concepto: 'Tasa Escáner', Tipo: 'Despacho', 'Monto USD': (costosData.tasa_escaner || 0) / (costosData.tipo_cambio || 1), 'Observaciones': `UYU: ${costosData.tasa_escaner || 0}` },
      { Concepto: 'Extraordinario', Tipo: 'Despacho', 'Monto USD': (costosData.extraordinario || 0) / (costosData.tipo_cambio || 1), 'Observaciones': `UYU: ${costosData.extraordinario || 0}` },
      { Concepto: 'Guía Tránsito', Tipo: 'Despacho', 'Monto USD': (costosData.guia_transito || 0) / (costosData.tipo_cambio || 1), 'Observaciones': `UYU: ${costosData.guia_transito || 0}` },
      { Concepto: 'IMADUNI', Tipo: 'Despacho', 'Monto USD': (costosData.imaduni || 0) / (costosData.tipo_cambio || 1), 'Observaciones': `UYU: ${costosData.imaduni || 0}` },
      { Concepto: 'Otros Despacho', Tipo: 'Despacho', 'Monto USD': (costosData.otros_despacho || 0) / (costosData.tipo_cambio || 1), 'Observaciones': `UYU: ${costosData.otros_despacho || 0}` }
    ];
    
    const wsDesglose = XLSX.utils.json_to_sheet(desglose);
    XLSX.utils.book_append_sheet(wb, wsDesglose, 'Desglose Costos');
    
    // Hoja 3: Productos
    const productos = costosData.productos_embarque.map(prod => ({
      'Código': prod.codigo_producto || '',
      'Producto': prod.nombre,
      'Cantidad': prod.cantidad,
      'Precio FOB Unit.': prod.precio_fob,
      'Total FOB': prod.total_fob || (prod.precio_fob * prod.cantidad),
      'Costo Adic. Unit.': ((costosData.costo_total_usd - costosData.importe_fob) / costosData.productos_embarque.reduce((sum, p) => sum + p.cantidad, 0)).toFixed(2) || 0,
      'Costo Total Unit.': (prod.precio_fob + parseFloat(((costosData.costo_total_usd - costosData.importe_fob) / costosData.productos_embarque.reduce((sum, p) => sum + p.cantidad, 0)).toFixed(2) || 0)).toFixed(2)
    }));
    
    const wsProductos = XLSX.utils.json_to_sheet(productos);
    XLSX.utils.book_append_sheet(wb, wsProductos, 'Productos');
    
    return wb;
  };

  const exportarAnalisis = () => {
    if (!selectedCosto || !selectedCosto.productos_embarque) {
      alert('No hay datos de costos para exportar');
      return;
    }
    
    const workbook = generarExcelCompleto(selectedCosto, selectedEmbarque);
    
    const fecha = new Date().toISOString().split('T')[0];
    const coeficiente = selectedCosto.coeficiente_porcentaje?.toFixed(2) || '0';
    const nombreArchivo = `COSTOS_${selectedEmbarque.codigo}_Coeficiente-${coeficiente}%_${fecha}.xlsx`;
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, nombreArchivo);
  };

  // Calcular total de costos
  const calcularTotalCostos = () => {
    return parseFloat(formCostos.flete_internacional || 0) +
           parseFloat(formCostos.seguro || 0) +
           parseFloat(formCostos.impuestos_aduana || 0) +
           parseFloat(formCostos.gastos_despacho || 0) +
           parseFloat(formCostos.transporte_local || 0) +
           parseFloat(formCostos.otros_gastos || 0) +
           parseFloat(formCostos.comisiones || 0);
  };

  const [totalesEmbarque, setTotalesEmbarque] = useState({ 
    totalFOB: 0, 
    totalProductos: 0, 
    totalUnidades: 0 
  });

  useEffect(() => {
    if (selectedEmbarque) {
      calcularTotalesEmbarque(selectedEmbarque.id).then(setTotalesEmbarque);
      cargarCostosExistentes(selectedEmbarque.id);
    }
  }, [selectedEmbarque]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Lista de embarques */}
      <div className="lg:col-span-1">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-playfair">Embarques</h2>
        </div>

        {embarques.length === 0 ? (
          <div className="card-mare p-4" style={{ backgroundColor: 'var(--nude-suave)' }}>
            <AlertCircle size={20} className="mb-2" style={{ color: 'var(--marron-oscuro)' }} />
            <p className="text-sm">
              No hay embarques en aduana o recibidos para calcular costos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {embarques.map(embarque => {
              const tieneCostos = costos.some(c => c.embarque_id === embarque.id);
              return (
                <div
                  key={embarque.id}
                  onClick={() => setSelectedEmbarque(embarque)}
                  className={`card-mare cursor-pointer transition-all ${
                    selectedEmbarque?.id === embarque.id ? 'ring-2' : ''
                  }`}
                  style={{
                    ringColor: selectedEmbarque?.id === embarque.id ? 'var(--marron-oscuro)' : ''
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-lg">{embarque.codigo}</h3>
                      <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>
                        {embarque.ordenes_ids?.length || 0} órdenes
                      </p>
                    </div>
                    {tieneCostos && (
                      <span className="estado estado-exito">
                        <Calculator size={14} />
                        Calculado
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm">
                    <span className={`estado ${
                      embarque.estado === 'recibido' ? 'estado-exito' : 'estado-warning'
                    }`}>
                      {embarque.estado.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detalle y formulario de costos */}
      <div className="lg:col-span-2">
        {selectedEmbarque ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-playfair">
                  Costos de {selectedEmbarque.codigo}
                </h2>
                <p style={{ color: 'var(--texto-secundario)' }}>
                  {totalesEmbarque.totalProductos} productos • 
                  {totalesEmbarque.totalUnidades} unidades • 
                  FOB: ${totalesEmbarque.totalFOB.toFixed(2)}
                </p>
              </div>
              <div className="flex gap-3">
                {selectedCosto && (
                  <button 
                    onClick={exportarAnalisis}
                    className="btn-mare-secondary"
                  >
                    <Download size={20} />
                    Exportar
                  </button>
                )}
                <button 
                  onClick={() => setShowForm(!showForm)}
                  className="btn-mare"
                >
                  <Calculator size={20} />
                  {showForm ? 'Ver Resumen' : 'Calcular Costos'}
                </button>
              </div>
            </div>

            {showForm ? (
              /* Formulario de costos uruguayos */
              <div className="card-mare">
                <h3 className="text-lg font-medium mb-4">Costos de Importación - Uruguay</h3>
                
                {/* CONFIGURACIÓN */}
                <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--nude-suave)' }}>
                  <h4 className="font-medium mb-3">⚙️ Configuración</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        % IVA
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formCostos.porcentaje_iva}
                        onChange={(e) => setFormCostos({...formCostos, porcentaje_iva: e.target.value})}
                        className="input-mare"
                        placeholder="22"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Tipo Cambio UYU/USD *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.tipo_cambio}
                        onChange={(e) => setFormCostos({...formCostos, tipo_cambio: e.target.value})}
                        className="input-mare"
                        placeholder="40.50"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* USD SIN IVA */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">💵 Costos USD (Sin IVA)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Importe FOB (Invoice Proveedor) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.importe_fob}
                        onChange={(e) => setFormCostos({...formCostos, importe_fob: e.target.value})}
                        className="input-mare"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Costo Depósito Portuario
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.costo_deposito_portuario}
                        onChange={(e) => setFormCostos({...formCostos, costo_deposito_portuario: e.target.value})}
                        className="input-mare"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        ANP Puerto
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.anp_puerto}
                        onChange={(e) => setFormCostos({...formCostos, anp_puerto: e.target.value})}
                        className="input-mare"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  {/* Agente de Cargas */}
                  <div className="mt-4 p-3 rounded border" style={{ borderColor: 'var(--arena-claro)', backgroundColor: '#fafafa' }}>
                    <h5 className="font-medium mb-2">Factura Agente de Cargas</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm mb-1">Total Factura</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formCostos.factura_agente_total}
                          onChange={(e) => setFormCostos({...formCostos, factura_agente_total: e.target.value})}
                          className="input-mare"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Parte Gravada (con IVA)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formCostos.factura_agente_gravado}
                          onChange={(e) => setFormCostos({...formCostos, factura_agente_gravado: e.target.value})}
                          className="input-mare"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* USD CON IVA */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">💰 Costos USD (Con IVA Incluido)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Gastos DUA
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.gastos_dua}
                        onChange={(e) => setFormCostos({...formCostos, gastos_dua: e.target.value})}
                        className="input-mare"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Honorarios Despachante
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.honorarios_despachante}
                        onChange={(e) => setFormCostos({...formCostos, honorarios_despachante: e.target.value})}
                        className="input-mare"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* USD CON IVA (LOCALES) */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">💰 Costos Locales USD (Con IVA Incluido)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Flete Interno a Depósito (USD con IVA)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.flete_interno_uyu}
                        onChange={(e) => setFormCostos({...formCostos, flete_interno_uyu: e.target.value})}
                        className="input-mare"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Otros Gastos USD (Peones, etc. con IVA)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.otros_gastos_uyu}
                        onChange={(e) => setFormCostos({...formCostos, otros_gastos_uyu: e.target.value})}
                        className="input-mare"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* DESPACHO UYU */}
                <div className="mb-6">
                  <h4 className="font-medium mb-3">📋 Pago Despacho (UYU)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs mb-1">IRAE Anticipo</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.irae_anticipo}
                        onChange={(e) => setFormCostos({...formCostos, irae_anticipo: e.target.value})}
                        className="input-mare text-sm"
                        placeholder="0.00"
                        style={{ backgroundColor: '#fff3cd', borderColor: '#ffc107' }}
                        title="IRAE Anticipo - Retorna a la empresa, no afecta coeficiente"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Servicios VUCE</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.servicios_vuce}
                        onChange={(e) => setFormCostos({...formCostos, servicios_vuce: e.target.value})}
                        className="input-mare text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Tasa Escáner</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.tasa_escaner}
                        onChange={(e) => setFormCostos({...formCostos, tasa_escaner: e.target.value})}
                        className="input-mare text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Extraordinario</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.extraordinario}
                        onChange={(e) => setFormCostos({...formCostos, extraordinario: e.target.value})}
                        className="input-mare text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Guía Tránsito</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.guia_transito}
                        onChange={(e) => setFormCostos({...formCostos, guia_transito: e.target.value})}
                        className="input-mare text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">IMADUNI</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.imaduni}
                        onChange={(e) => setFormCostos({...formCostos, imaduni: e.target.value})}
                        className="input-mare text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">IVA</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.iva_despacho}
                        onChange={(e) => setFormCostos({...formCostos, iva_despacho: e.target.value})}
                        className="input-mare text-sm"
                        placeholder="0.00"
                        style={{ backgroundColor: '#fff3cd', borderColor: '#ffc107' }}
                        title="IVA - Retorna a la empresa, no afecta coeficiente"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">IVA Anticipo</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.iva_anticipo}
                        onChange={(e) => setFormCostos({...formCostos, iva_anticipo: e.target.value})}
                        className="input-mare text-sm"
                        placeholder="0.00"
                        style={{ backgroundColor: '#fff3cd', borderColor: '#ffc107' }}
                        title="IVA Anticipo - Retorna a la empresa, no afecta coeficiente"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Recargo</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.recargo}
                        onChange={(e) => setFormCostos({...formCostos, recargo: e.target.value})}
                        className="input-mare text-sm"
                        placeholder="0.00"
                        title="Recargo - SÍ se incluye en cálculo de coeficiente"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Tasa Consular</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.tasa_consular}
                        onChange={(e) => setFormCostos({...formCostos, tasa_consular: e.target.value})}
                        className="input-mare text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Timbre Profesional</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.timbre_profesional}
                        onChange={(e) => setFormCostos({...formCostos, timbre_profesional: e.target.value})}
                        className="input-mare text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Servicio Aduanero</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.servicio_aduanero}
                        onChange={(e) => setFormCostos({...formCostos, servicio_aduanero: e.target.value})}
                        className="input-mare text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1">Otros Despacho</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formCostos.otros_despacho}
                        onChange={(e) => setFormCostos({...formCostos, otros_despacho: e.target.value})}
                        className="input-mare text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  <div className="text-xs mt-2 p-2 rounded" style={{ backgroundColor: '#fff3cd', color: '#856404' }}>
                    ⚠️ Los campos en amarillo (IRAE Anticipo, IVA, IVA Anticipo) son impuestos que retornan a la empresa, por lo que NO se incluyen en el cálculo del coeficiente
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Notas / Observaciones
                  </label>
                  <textarea
                    value={formCostos.notas}
                    onChange={(e) => setFormCostos({...formCostos, notas: e.target.value})}
                    className="input-mare"
                    rows="3"
                    placeholder="Detalles adicionales..."
                  />
                </div>

                {/* Cálculo preliminar en tiempo real */}
                <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--nude-suave)' }}>
                  <h4 className="font-medium mb-3">🧮 Cálculo Preliminar</h4>
                  
                  {(() => {
                    const calculo = calcularCoeficienteReal();
                    const tipoCambio = parseFloat(formCostos.tipo_cambio || 1);
                    
                    if (!calculo || calculo.importeFOB === 0) {
                      return (
                        <p className="text-sm text-center" style={{ color: 'var(--texto-secundario)' }}>
                          Ingresa el Importe FOB y Tipo de Cambio para ver el cálculo
                        </p>
                      );
                    }
                    
                    return (
                      <div className="space-y-3">
                        {/* Resumen principal */}
                        <div className="grid grid-cols-4 gap-4 text-center">
                          <div>
                            <div className="text-lg font-bold" style={{ color: 'var(--marron-intermedio)' }}>
                              ${calculo.importeFOB.toFixed(2)}
                            </div>
                            <div className="text-xs" style={{ color: 'var(--texto-secundario)' }}>
                              FOB Base
                            </div>
                          </div>
                          <div>
                            <div className="text-lg font-bold" style={{ color: 'var(--marron-intermedio)' }}>
                              ${calculo.costosAdicionalesUSD.toFixed(2)}
                            </div>
                            <div className="text-xs" style={{ color: 'var(--texto-secundario)' }}>
                              Costos Import.
                            </div>
                          </div>
                          <div>
                            <div className="text-lg font-bold" style={{ color: 'var(--marron-intermedio)' }}>
                              ${calculo.costoTotalUSD.toFixed(2)}
                            </div>
                            <div className="text-xs" style={{ color: 'var(--texto-secundario)' }}>
                              Costo Total
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold" style={{ color: 'var(--marron-oscuro)' }}>
                              {calculo.coeficientePorc.toFixed(2)}%
                            </div>
                            <div className="text-xs" style={{ color: 'var(--texto-secundario)' }}>
                              Coeficiente Real
                            </div>
                          </div>
                        </div>
                        
                        {/* Desglose detallado */}
                        <div className="text-xs space-y-1 pt-3 border-t" style={{ borderColor: 'var(--arena-claro)' }}>
                          <div className="font-medium mb-2">Desglose de Costos (en USD):</div>
                          {calculo.desglose.agenteSinIva > 0 && (
                            <div className="flex justify-between">
                              <span>• Agente Cargas (sin IVA):</span>
                              <span>${calculo.desglose.agenteSinIva.toFixed(2)}</span>
                            </div>
                          )}
                          {calculo.desglose.depositoPortuario > 0 && (
                            <div className="flex justify-between">
                              <span>• Depósito Portuario:</span>
                              <span>${calculo.desglose.depositoPortuario.toFixed(2)}</span>
                            </div>
                          )}
                          {calculo.desglose.anpPuerto > 0 && (
                            <div className="flex justify-between">
                              <span>• ANP Puerto:</span>
                              <span>${calculo.desglose.anpPuerto.toFixed(2)}</span>
                            </div>
                          )}
                          {calculo.desglose.gastosDUA > 0 && (
                            <div className="flex justify-between">
                              <span>• Gastos DUA (sin IVA):</span>
                              <span>${calculo.desglose.gastosDUA.toFixed(2)}</span>
                            </div>
                          )}
                          {calculo.desglose.honorariosDespachante > 0 && (
                            <div className="flex justify-between">
                              <span>• Honorarios (sin IVA):</span>
                              <span>${calculo.desglose.honorariosDespachante.toFixed(2)}</span>
                            </div>
                          )}
                          {calculo.desglose.gastosDespacho > 0 && (
                            <div className="flex justify-between">
                              <span>• Gastos Despacho:</span>
                              <span>${calculo.desglose.gastosDespacho.toFixed(2)} (${(calculo.desglose.gastosDespacho * tipoCambio).toFixed(0)} UYU)</span>
                            </div>
                          )}
                          {calculo.desglose.fleteInterno > 0 && (
                            <div className="flex justify-between">
                              <span>• Flete Interno:</span>
                              <span>${calculo.desglose.fleteInterno.toFixed(2)} (${(calculo.desglose.fleteInterno * tipoCambio * 1.22).toFixed(0)} UYU)</span>
                            </div>
                          )}
                          {calculo.desglose.otrosGastos > 0 && (
                            <div className="flex justify-between">
                              <span>• Otros Gastos:</span>
                              <span>${calculo.desglose.otrosGastos.toFixed(2)} (${(calculo.desglose.otrosGastos * tipoCambio * 1.22).toFixed(0)} UYU)</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs mt-2 p-2 rounded" style={{ backgroundColor: '#f0f9ff', color: '#0c4a6e' }}>
                          💡 Tipo cambio: {tipoCambio} UYU/USD • IVA: {formCostos.porcentaje_iva}%
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    onClick={() => setShowForm(false)}
                    className="btn-mare-secondary"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={guardarCostos}
                    className="btn-mare"
                  >
                    <Save size={20} />
                    Guardar Costos
                  </button>
                </div>
              </div>
            ) : (
              /* Resumen de costos */
              selectedCosto ? (
                <div>
                  {/* Tarjetas de resumen */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card-mare text-center">
                      <DollarSign size={24} className="mx-auto mb-2" style={{ color: 'var(--marron-intermedio)' }} />
                      <p className="text-2xl font-bold">${(selectedCosto.importe_fob_calculado || 0).toFixed(0)}</p>
                      <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>Total FOB</p>
                    </div>
                    <div className="card-mare text-center">
                      <TrendingUp size={24} className="mx-auto mb-2" style={{ color: 'var(--marron-intermedio)' }} />
                      <p className="text-2xl font-bold">${(selectedCosto.costos_adicionales_usd || 0).toFixed(0)}</p>
                      <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>Costos Import.</p>
                    </div>
                    <div className="card-mare text-center">
                      <Package size={24} className="mx-auto mb-2" style={{ color: 'var(--marron-intermedio)' }} />
                      <p className="text-2xl font-bold">${(selectedCosto.costo_total_usd || 0).toFixed(0)}</p>
                      <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>Costo Total</p>
                    </div>
                    <div className="card-mare text-center">
                      <Calculator size={24} className="mx-auto mb-2" style={{ color: 'var(--verde-suave)' }} />
                      <p className="text-3xl font-bold" style={{ color: 'var(--marron-oscuro)' }}>
                        {(selectedCosto.coeficiente_porcentaje || 0).toFixed(2)}%
                      </p>
                      <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>Coeficiente</p>
                    </div>
                  </div>

                  {/* Desglose de costos */}
                  <div className="card-mare">
                    <h3 className="text-lg font-medium mb-4">Desglose de Costos de Importación (USD)</h3>
                    
                    {selectedCosto.desglose_costos ? (
                      <div className="space-y-2">
                        {/* USD Sin IVA */}
                        <div className="mb-3">
                          <h5 className="font-medium mb-2" style={{ color: 'var(--marron-intermedio)' }}>USD Sin IVA:</h5>
                          {selectedCosto.desglose_costos.agenteSinIva > 0 && (
                            <div className="flex justify-between py-1 text-sm">
                              <span>• Agente Cargas (sin IVA):</span>
                              <span>${selectedCosto.desglose_costos.agenteSinIva.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedCosto.desglose_costos.depositoPortuario > 0 && (
                            <div className="flex justify-between py-1 text-sm">
                              <span>• Depósito Portuario:</span>
                              <span>${selectedCosto.desglose_costos.depositoPortuario.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedCosto.desglose_costos.anpPuerto > 0 && (
                            <div className="flex justify-between py-1 text-sm">
                              <span>• ANP Puerto:</span>
                              <span>${selectedCosto.desglose_costos.anpPuerto.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* USD Con IVA (convertidos) */}
                        <div className="mb-3">
                          <h5 className="font-medium mb-2" style={{ color: 'var(--marron-intermedio)' }}>USD Con IVA (convertidos a sin IVA):</h5>
                          {selectedCosto.desglose_costos.gastosDUA > 0 && (
                            <div className="flex justify-between py-1 text-sm">
                              <span>• Gastos DUA:</span>
                              <span>${selectedCosto.desglose_costos.gastosDUA.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedCosto.desglose_costos.honorariosDespachante > 0 && (
                            <div className="flex justify-between py-1 text-sm">
                              <span>• Honorarios Despachante:</span>
                              <span>${selectedCosto.desglose_costos.honorariosDespachante.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* UYU convertidos a USD */}
                        <div className="mb-3">
                          <h5 className="font-medium mb-2" style={{ color: 'var(--marron-intermedio)' }}>Costos Locales:</h5>
                          {selectedCosto.desglose_costos.gastosDespacho > 0 && (
                            <div className="flex justify-between py-1 text-sm">
                              <span>• Gastos Despacho (UYU→USD):</span>
                              <span>${selectedCosto.desglose_costos.gastosDespacho.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedCosto.desglose_costos.fleteInterno > 0 && (
                            <div className="flex justify-between py-1 text-sm">
                              <span>• Flete Interno (USD sin IVA):</span>
                              <span>${selectedCosto.desglose_costos.fleteInterno.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedCosto.desglose_costos.otrosGastos > 0 && (
                            <div className="flex justify-between py-1 text-sm">
                              <span>• Otros Gastos (USD sin IVA):</span>
                              <span>${selectedCosto.desglose_costos.otrosGastos.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-between pt-3 border-t" style={{ borderColor: 'var(--arena-claro)' }}>
                          <span className="font-bold">Total Costos Adicionales (USD)</span>
                          <span className="font-bold text-lg" style={{ color: 'var(--marron-oscuro)' }}>
                            ${(selectedCosto.costos_adicionales_usd || 0).toFixed(2)}
                          </span>
                        </div>
                        
                        {/* Cálculo del coeficiente */}
                        <div className="flex justify-between pt-2 border-t-2" style={{ borderColor: 'var(--marron-oscuro)' }}>
                          <span className="font-bold text-lg">Coeficiente: ({(selectedCosto.importe_fob_calculado || 0).toFixed(0)} + {(selectedCosto.costos_adicionales_usd || 0).toFixed(0)}) / {(selectedCosto.importe_fob_calculado || 0).toFixed(0)}</span>
                          <span className="font-bold text-xl" style={{ color: 'var(--marron-oscuro)' }}>
                            {(selectedCosto.coeficiente_porcentaje || 0).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-center" style={{ color: 'var(--texto-secundario)' }}>
                        No hay desglose de costos disponible
                      </p>
                    )}
                    
                    <div className="mt-4 p-3 rounded" style={{ backgroundColor: 'var(--nude-suave)' }}>
                      <div className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span>Tipo Cambio:</span>
                          <span>{selectedCosto.tipo_cambio || 'N/A'} UYU/USD</span>
                        </div>
                        <div className="flex justify-between">
                          <span>IVA Aplicado:</span>
                          <span>{selectedCosto.porcentaje_iva || 22}%</span>
                        </div>
                      </div>
                    </div>
                    
                    {selectedCosto.notas && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>
                          <strong>Notas:</strong> {selectedCosto.notas}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="card-mare text-center py-12">
                  <Calculator size={48} className="mx-auto mb-4" style={{ color: 'var(--arena-claro)' }} />
                  <p style={{ color: 'var(--texto-secundario)' }}>
                    No hay costos calculados para este embarque.
                    Haz clic en "Calcular Costos" para comenzar.
                  </p>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="card-mare text-center py-12">
            <Calculator size={48} className="mx-auto mb-4" style={{ color: 'var(--arena-claro)' }} />
            <p style={{ color: 'var(--texto-secundario)' }}>
              Selecciona un embarque para calcular los costos de importación
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Función exportable exacta para usar desde otros módulos (igual que el botón Exportar)
export const generarExcelCostosParaEmbarque = async (embarqueId) => {
  try {
    // Obtener TODOS los costos (igual que el módulo original)
    const { data: todosCostos, error: costosError } = await supabase
      .from('costos_importacion')
      .select('*')
      .order('created_at', { ascending: false });

    if (costosError) {
      console.error('Error obteniendo costos:', costosError);
      return null;
    }

    // Filtrar por embarque (igual que cargarCostosExistentes)
    const costosData = todosCostos?.find(c => c.embarque_id === embarqueId);
    
    if (!costosData || !costosData.productos_embarque) {
      return null; // No hay datos de costos para este embarque
    }

    const { data: embarqueData, error: embarqueError } = await supabase
      .from('embarques')
      .select('*')
      .eq('id', embarqueId)
      .single();

    if (embarqueError || !embarqueData) {
      return null; // No hay datos del embarque
    }

    // Crear Excel exactamente igual que la función interna del módulo
    const wb = XLSX.utils.book_new();
    
    // Hoja 1: Resumen General
    const resumen = [{
      'Embarque': embarqueData?.codigo || '',
      'Fecha Análisis': new Date().toLocaleDateString('es-UY'),
      'Tipo Cambio UYU/USD': costosData.tipo_cambio,
      'IVA (%)': costosData.porcentaje_iva,
      'Importe FOB USD': costosData.importe_fob,
      'Costos Adicionales USD': costosData.costos_adicionales_usd,
      'Costo Total USD': costosData.costo_total_usd,
      'Coeficiente Decimal': costosData.coeficiente_decimal?.toFixed(4),
      'Coeficiente Porcentaje': costosData.coeficiente_porcentaje?.toFixed(2) + '%',
      'Notas': costosData.notas || ''
    }];
    
    const wsResumen = XLSX.utils.json_to_sheet(resumen);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');
    
    // Hoja 2: Desglose de Costos
    const desglose = [
      // USD SIN IVA
      { Concepto: 'COSTOS USD SIN IVA', Tipo: '===', 'Monto USD': '===', 'Observaciones': '===' },
      { Concepto: 'Importe FOB', Tipo: 'Base', 'Monto USD': costosData.importe_fob, 'Observaciones': 'Valor de mercancía' },
      { Concepto: 'Depósito Portuario', Tipo: 'Sin IVA', 'Monto USD': costosData.costo_deposito_portuario || 0, 'Observaciones': '' },
      { Concepto: 'ANP Puerto', Tipo: 'Sin IVA', 'Monto USD': costosData.anp_puerto || 0, 'Observaciones': '' },
      { Concepto: 'Agente (sin IVA)', Tipo: 'Sin IVA', 'Monto USD': (costosData.factura_agente_total || 0) - (costosData.factura_agente_gravado || 0), 'Observaciones': 'Parte sin IVA' },
      
      // USD CON IVA 
      { Concepto: '', Tipo: '', 'Monto USD': '', 'Observaciones': '' },
      { Concepto: 'COSTOS USD CON IVA', Tipo: '===', 'Monto USD': '===', 'Observaciones': '===' },
      { Concepto: 'Gastos DUA', Tipo: 'Con IVA', 'Monto USD': (costosData.gastos_dua || 0) / (1 + (costosData.porcentaje_iva || 22)/100), 'Observaciones': `Bruto: ${costosData.gastos_dua || 0}` },
      { Concepto: 'Honorarios Despachante', Tipo: 'Con IVA', 'Monto USD': (costosData.honorarios_despachante || 0) / (1 + (costosData.porcentaje_iva || 22)/100), 'Observaciones': `Bruto: ${costosData.honorarios_despachante || 0}` },
      { Concepto: 'Agente Gravado', Tipo: 'Con IVA', 'Monto USD': (costosData.factura_agente_gravado || 0) / (1 + (costosData.porcentaje_iva || 22)/100), 'Observaciones': `Bruto: ${costosData.factura_agente_gravado || 0}` },
      { Concepto: 'Flete Interno', Tipo: 'Con IVA', 'Monto USD': ((costosData.flete_interno_uyu || 0) / (costosData.tipo_cambio || 1)) / (1 + (costosData.porcentaje_iva || 22)/100), 'Observaciones': `UYU: ${costosData.flete_interno_uyu || 0}` },
      { Concepto: 'Otros Gastos', Tipo: 'Con IVA', 'Monto USD': ((costosData.otros_gastos_uyu || 0) / (costosData.tipo_cambio || 1)) / (1 + (costosData.porcentaje_iva || 22)/100), 'Observaciones': `UYU: ${costosData.otros_gastos_uyu || 0}` },
      
      // DESPACHO UYU
      { Concepto: '', Tipo: '', 'Monto USD': '', 'Observaciones': '' },
      { Concepto: 'GASTOS DESPACHO UYU', Tipo: '===', 'Monto USD': '===', 'Observaciones': '===' },
      { Concepto: 'Servicios VUCE', Tipo: 'Despacho', 'Monto USD': (costosData.servicios_vuce || 0) / (costosData.tipo_cambio || 1), 'Observaciones': `UYU: ${costosData.servicios_vuce || 0}` },
      { Concepto: 'Tasa Escáner', Tipo: 'Despacho', 'Monto USD': (costosData.tasa_escaner || 0) / (costosData.tipo_cambio || 1), 'Observaciones': `UYU: ${costosData.tasa_escaner || 0}` },
      { Concepto: 'Extraordinario', Tipo: 'Despacho', 'Monto USD': (costosData.extraordinario || 0) / (costosData.tipo_cambio || 1), 'Observaciones': `UYU: ${costosData.extraordinario || 0}` },
      { Concepto: 'Guía Tránsito', Tipo: 'Despacho', 'Monto USD': (costosData.guia_transito || 0) / (costosData.tipo_cambio || 1), 'Observaciones': `UYU: ${costosData.guia_transito || 0}` },
      { Concepto: 'IMADUNI', Tipo: 'Despacho', 'Monto USD': (costosData.imaduni || 0) / (costosData.tipo_cambio || 1), 'Observaciones': `UYU: ${costosData.imaduni || 0}` },
      { Concepto: 'Otros Despacho', Tipo: 'Despacho', 'Monto USD': (costosData.otros_despacho || 0) / (costosData.tipo_cambio || 1), 'Observaciones': `UYU: ${costosData.otros_despacho || 0}` }
    ];
    
    const wsDesglose = XLSX.utils.json_to_sheet(desglose);
    XLSX.utils.book_append_sheet(wb, wsDesglose, 'Desglose Costos');
    
    // Hoja 3: Productos
    const productos = costosData.productos_embarque.map(prod => ({
      'Código': prod.codigo_producto || '',
      'Producto': prod.nombre,
      'Cantidad': prod.cantidad,
      'Precio FOB Unit.': prod.precio_fob,
      'Total FOB': prod.total_fob || (prod.precio_fob * prod.cantidad),
      'Costo Adic. Unit.': ((costosData.costo_total_usd - costosData.importe_fob) / costosData.productos_embarque.reduce((sum, p) => sum + p.cantidad, 0)).toFixed(2) || 0,
      'Costo Total Unit.': (prod.precio_fob + parseFloat(((costosData.costo_total_usd - costosData.importe_fob) / costosData.productos_embarque.reduce((sum, p) => sum + p.cantidad, 0)).toFixed(2) || 0)).toFixed(2)
    }));
    
    const wsProductos = XLSX.utils.json_to_sheet(productos);
    XLSX.utils.book_append_sheet(wb, wsProductos, 'Productos');
    
    return wb;
    
  } catch (error) {
    console.error('Error generando Excel de Costos:', error);
    return null;
  }
};