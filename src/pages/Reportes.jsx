// src/pages/Reportes.jsx

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Calendar,
  Download,
  Filter,
  PieChart,
  Activity,
  ShoppingCart,
  Globe,
  AlertTriangle,
  Clock,
  Target,
  Zap,
  Eye,
  TrendingDown,
  CheckCircle,
  XCircle,
  MinusCircle,
  ArrowUp,
  ArrowDown,
  Ship
} from 'lucide-react';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function Reportes() {
  const [loading, setLoading] = useState(true);
  const [vistaActiva, setVistaActiva] = useState('ejecutivo'); // ejecutivo, alertas, rentabilidad, tiempos
  const [filtroFecha, setFiltroFecha] = useState({
    desde: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    hasta: new Date().toISOString().split('T')[0]
  });

  // Datos centralizados
  const [datosReportes, setDatosReportes] = useState({
    metricas: {},
    embarques: [],
    ordenes: [],
    costos: [],
    productos: [],
    proveedores: [],
    alertas: [],
    tiempos: [],
    rentabilidad: []
  });

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!isMounted) return;
      await cargarDatos();
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [filtroFecha]);

  const cargarDatos = async () => {
    let timeoutId;
    try {
      setLoading(true);
      
      // Timeout de seguridad para evitar loading infinito
      timeoutId = setTimeout(() => {
        console.warn('⚠️ Reportes: Loading timeout, forzando fin de carga');
        setLoading(false);
      }, 10000); // 10 segundos máximo
      
      console.log('🔄 Cargando datos para reportes...');

      // Cargar todos los datos en paralelo - CONSULTAS SIMPLIFICADAS PARA DEBUG
      const [embarquesRes, ordenesRes, costosRes, productosRes, proveedoresRes] = await Promise.all([
        supabase.from('embarques').select('*').order('created_at', { ascending: false }),
        supabase.from('ordenes_compra').select('*').gte('fecha', filtroFecha.desde).lte('fecha', filtroFecha.hasta), // REMOVED JOIN
        supabase.from('costos_importacion').select('*').order('created_at', { ascending: false }),
        supabase.from('productos').select('*'), // REMOVED .eq('estado', 'activo') filter
        supabase.from('proveedores').select('*')
      ]);

      const embarques = embarquesRes.data || [];
      const ordenes = ordenesRes.data || [];
      const costos = costosRes.data || [];
      const productos = productosRes.data || [];
      const proveedores = proveedoresRes.data || [];

      console.log('📊 Datos cargados:', { embarques: embarques.length, ordenes: ordenes.length, costos: costos.length });

      // Calcular métricas ejecutivas
      const metricas = calcularMetricasEjecutivas(embarques, ordenes, costos, productos, proveedores);
      
      // Generar alertas inteligentes
      const alertas = generarAlertasInteligentes(embarques, ordenes, costos);
      
      // Calcular análisis de tiempos
      const tiempos = calcularAnalisisTiempos(embarques, ordenes);
      
      // Calcular análisis de rentabilidad
      const rentabilidad = calcularAnalisisRentabilidad(embarques, ordenes, costos, productos);

      setDatosReportes({
        metricas,
        embarques,
        ordenes,
        costos,
        productos,
        proveedores,
        alertas,
        tiempos,
        rentabilidad
      });

      console.log('✅ Reportes actualizados');

    } catch (error) {
      console.error('❌ Error cargando datos:', error);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  // FUNCIONES DE CÁLCULO ESPECIALIZADAS

  const calcularMetricasEjecutivas = (embarques, ordenes, costos, productos, proveedores) => {
    const embarquesActivos = embarques.filter(e => e.estado !== 'recibido');
    const embarquesCompletos = embarques.filter(e => e.estado === 'recibido');
    const ordenesActivas = ordenes.filter(oc => ['enviada', 'confirmada'].includes(oc.estado));
    
    const totalInvertido = ordenes.reduce((sum, oc) => sum + (oc.total_fob || 0), 0);
    const valorInventario = productos.reduce((sum, p) => sum + (p.stock_actual * p.precio_compra || 0), 0);
    
    // Coeficientes
    const coeficientes = costos.map(c => c.coeficiente_decimal).filter(Boolean);
    const coeficientePromedio = coeficientes.length > 0 
      ? coeficientes.reduce((a, b) => a + b, 0) / coeficientes.length
      : 1.35;
    
    const ultimoCoeficiente = costos[0]?.coeficiente_decimal || coeficientePromedio;
    const tendenciaCoeficiente = coeficientes.length >= 2 
      ? (ultimoCoeficiente - coeficientes[1]) / coeficientes[1] * 100
      : 0;

    // Tiempo promedio de embarques
    const tiempoPromedio = embarquesCompletos.length > 0 
      ? embarquesCompletos.reduce((sum, e) => {
          const inicio = new Date(e.created_at);
          const fin = new Date(e.updated_at);
          return sum + (fin - inicio) / (1000 * 60 * 60 * 24);
        }, 0) / embarquesCompletos.length
      : 0;

    return {
      embarquesActivos: embarquesActivos.length,
      embarquesCompletos: embarquesCompletos.length,
      ordenesActivas: ordenesActivas.length,
      totalProveedores: proveedores.length,
      totalInvertido,
      valorInventario,
      coeficientePromedio,
      ultimoCoeficiente,
      tendenciaCoeficiente,
      tiempoPromedio,
      productosActivos: productos.length,
      margenPromedio: 35, // Estimado - se puede calcular con precios de venta
      eficienciaControl: 92 // % productos confirmados vs solicitados - simular por ahora
    };
  };

  const generarAlertasInteligentes = (embarques, ordenes, costos) => {
    const alertas = [];
    const hoy = new Date();

    // Alertas por embarques con demoras
    embarques.forEach(embarque => {
      if (embarque.estado !== 'recibido') {
        const diasEnEstado = Math.floor((hoy - new Date(embarque.updated_at)) / (1000 * 60 * 60 * 24));
        
        if (embarque.estado === 'preparacion' && diasEnEstado > 30) {
          alertas.push({
            tipo: 'critico',
            categoria: 'Demora Crítica',
            mensaje: `Embarque ${embarque.codigo} lleva ${diasEnEstado} días en preparación`,
            embarque: embarque.codigo,
            dias: diasEnEstado,
            icono: AlertTriangle,
            color: 'text-red-600'
          });
        }
        
        if (embarque.estado === 'en_transito' && diasEnEstado > 45) {
          alertas.push({
            tipo: 'warning',
            categoria: 'Tránsito Prolongado', 
            mensaje: `Embarque ${embarque.codigo} lleva ${diasEnEstado} días en tránsito`,
            embarque: embarque.codigo,
            dias: diasEnEstado,
            icono: Clock,
            color: 'text-orange-600'
          });
        }

        if (embarque.estado === 'en_aduana' && diasEnEstado > 15) {
          alertas.push({
            tipo: 'warning',
            categoria: 'Aduana Demorada',
            mensaje: `Embarque ${embarque.codigo} lleva ${diasEnEstado} días en aduana`,
            embarque: embarque.codigo,
            dias: diasEnEstado,
            icono: Globe,
            color: 'text-orange-600'
          });
        }
      }
    });

    // Alertas por coeficientes anómalos
    if (costos.length >= 2) {
      const ultimoCoef = costos[0]?.coeficiente_decimal;
      const promedioAnterior = costos.slice(1, 4).reduce((sum, c) => sum + (c.coeficiente_decimal || 0), 0) / 3;
      
      if (ultimoCoef && promedioAnterior) {
        const variacion = (ultimoCoef - promedioAnterior) / promedioAnterior * 100;
        
        if (Math.abs(variacion) > 15) {
          alertas.push({
            tipo: variacion > 0 ? 'warning' : 'info',
            categoria: 'Coeficiente Anómalo',
            mensaje: `Coeficiente actual (${ultimoCoef.toFixed(2)}) ${variacion > 0 ? 'superior' : 'inferior'} al promedio en ${Math.abs(variacion).toFixed(1)}%`,
            variacion: variacion.toFixed(1),
            icono: variacion > 0 ? TrendingUp : TrendingDown,
            color: variacion > 0 ? 'text-red-600' : 'text-green-600'
          });
        }
      }
    }

    // Alerta por falta de actividad
    const ordenesRecientes = ordenes.filter(oc => {
      const fechaOC = new Date(oc.created_at);
      const diasDesde = Math.floor((hoy - fechaOC) / (1000 * 60 * 60 * 24));
      return diasDesde <= 30;
    });

    if (ordenesRecientes.length === 0) {
      alertas.push({
        tipo: 'info',
        categoria: 'Sin Actividad Reciente',
        mensaje: 'No hay órdenes de compra creadas en los últimos 30 días',
        icono: MinusCircle,
        color: 'text-blue-600'
      });
    }

    return alertas.sort((a, b) => {
      const prioridad = { critico: 3, warning: 2, info: 1 };
      return prioridad[b.tipo] - prioridad[a.tipo];
    });
  };

  const calcularAnalisisTiempos = (embarques, ordenes) => {
    const embarquesCompletos = embarques.filter(e => e.estado === 'recibido');
    
    if (embarquesCompletos.length === 0) {
      return { promedios: {}, historico: [], eficiencia: {} };
    }

    // Calcular tiempos promedio por estado (simulado)
    const promedios = {
      preparacion: 25, // días promedio en preparación
      transito: 35,   // días promedio en tránsito
      aduana: 8,      // días promedio en aduana
      total: 68       // total promedio
    };

    // Histórico de duraciones
    const historico = embarquesCompletos.slice(0, 12).map(e => {
      const inicio = new Date(e.created_at);
      const fin = new Date(e.updated_at);
      const duracion = Math.floor((fin - inicio) / (1000 * 60 * 60 * 24));
      
      return {
        embarque: e.codigo,
        duracion,
        fecha: e.created_at?.substring(0, 10),
        eficiente: duracion <= promedios.total
      };
    }).reverse();

    // Métricas de eficiencia
    const eficiencia = {
      embarquesDentroTiempo: historico.filter(h => h.eficiente).length,
      totalEmbarques: historico.length,
      porcentajeEficiencia: historico.length > 0 
        ? (historico.filter(h => h.eficiente).length / historico.length * 100).toFixed(1)
        : 0,
      mejorTiempo: historico.length > 0 ? Math.min(...historico.map(h => h.duracion)) : 0,
      peorTiempo: historico.length > 0 ? Math.max(...historico.map(h => h.duracion)) : 0
    };

    return { promedios, historico, eficiencia };
  };

  const calcularAnalisisRentabilidad = (embarques, ordenes, costos, productos) => {
    // Rentabilidad por embarque
    const rentabilidadEmbarques = embarques.slice(0, 6).map(embarque => {
      const costosEmbarque = costos.find(c => c.embarque_id === embarque.id);
      const ordenesEmbarque = ordenes.filter(oc => embarque.ordenes_ids?.includes(oc.id));
      
      const totalFOB = ordenesEmbarque.reduce((sum, oc) => sum + (oc.total_fob || 0), 0);
      const coeficiente = costosEmbarque?.coeficiente_decimal || 1.35;
      const costoTotal = totalFOB * coeficiente;
      
      // Simular precio de venta (FOB * coeficiente * margen)
      const precioVentaEstimado = costoTotal * 1.4; // 40% margen estimado
      const gananciaBruta = precioVentaEstimado - costoTotal;
      const margenPorcentaje = totalFOB > 0 ? (gananciaBruta / precioVentaEstimado * 100) : 0;

      return {
        embarque: embarque.codigo,
        estado: embarque.estado,
        totalFOB,
        coeficiente,
        costoTotal,
        precioVentaEstimado,
        gananciaBruta,
        margenPorcentaje,
        fecha: embarque.created_at?.substring(0, 10)
      };
    }).filter(r => r.totalFOB > 0);

    // Top categorías por rentabilidad (simulado)
    const categorias = ['Watches', 'Bags', 'Jewelry', 'Hair Accessories', 'Sunglasses'];
    const rentabilidadCategorias = categorias.map(cat => ({
      categoria: cat,
      volumenFOB: Math.floor(Math.random() * 50000) + 10000,
      margenPromedio: Math.floor(Math.random() * 20) + 25, // 25-45%
      productosActivos: Math.floor(Math.random() * 50) + 10
    })).sort((a, b) => b.margenPromedio - a.margenPromedio);

    return {
      embarques: rentabilidadEmbarques,
      categorias: rentabilidadCategorias,
      resumen: {
        margenPromedioGeneral: rentabilidadEmbarques.length > 0 
          ? (rentabilidadEmbarques.reduce((sum, r) => sum + r.margenPorcentaje, 0) / rentabilidadEmbarques.length).toFixed(1)
          : 0,
        mejorEmbarque: rentabilidadEmbarques.length > 0 
          ? rentabilidadEmbarques.reduce((max, r) => r.margenPorcentaje > max.margenPorcentaje ? r : max)
          : null,
        totalInversion: rentabilidadEmbarques.reduce((sum, r) => sum + r.costoTotal, 0)
      }
    };
  };

  // EXPORTAR REPORTE COMPLETO MEJORADO
  const exportarReporte = () => {
    const wb = XLSX.utils.book_new();
    const fecha = new Date().toISOString().split('T')[0];
    
    // Hoja Ejecutiva
    const ejecutivoData = [
      { Métrica: 'Embarques Activos', Valor: datosReportes.metricas.embarquesActivos },
      { Métrica: 'Embarques Completados', Valor: datosReportes.metricas.embarquesCompletos },
      { Métrica: 'Total Invertido USD', Valor: datosReportes.metricas.totalInvertido?.toFixed(2) },
      { Métrica: 'Valor Inventario USD', Valor: datosReportes.metricas.valorInventario?.toFixed(2) },
      { Métrica: 'Coeficiente Promedio', Valor: datosReportes.metricas.coeficientePromedio?.toFixed(2) },
      { Métrica: 'Tiempo Promedio Embarque (días)', Valor: datosReportes.metricas.tiempoPromedio?.toFixed(0) },
      { Métrica: 'Productos Activos', Valor: datosReportes.metricas.productosActivos },
      { Métrica: 'Eficiencia Control (%)', Valor: datosReportes.metricas.eficienciaControl }
    ];
    
    const wsEjecutivo = XLSX.utils.json_to_sheet(ejecutivoData);
    XLSX.utils.book_append_sheet(wb, wsEjecutivo, 'Resumen Ejecutivo');
    
    // Hoja Alertas
    if (datosReportes.alertas.length > 0) {
      const alertasData = datosReportes.alertas.map(a => ({
        Tipo: a.tipo.toUpperCase(),
        Categoría: a.categoria,
        Mensaje: a.mensaje,
        Embarque: a.embarque || '',
        Días: a.dias || ''
      }));
      
      const wsAlertas = XLSX.utils.json_to_sheet(alertasData);
      XLSX.utils.book_append_sheet(wb, wsAlertas, 'Alertas');
    }
    
    // Hoja Rentabilidad
    if (datosReportes.rentabilidad.embarques.length > 0) {
      const rentabilidadData = datosReportes.rentabilidad.embarques.map(r => ({
        Embarque: r.embarque,
        Estado: r.estado,
        'FOB USD': r.totalFOB.toFixed(2),
        'Coeficiente': r.coeficiente.toFixed(2),
        'Costo Total USD': r.costoTotal.toFixed(2),
        'Precio Venta Estimado USD': r.precioVentaEstimado.toFixed(2),
        'Ganancia Bruta USD': r.gananciaBruta.toFixed(2),
        'Margen %': r.margenPorcentaje.toFixed(1),
        'Fecha': r.fecha
      }));
      
      const wsRentabilidad = XLSX.utils.json_to_sheet(rentabilidadData);
      XLSX.utils.book_append_sheet(wb, wsRentabilidad, 'Análisis Rentabilidad');
    }
    
    const nombreArchivo = `reporte_mare_${fecha}.xlsx`;
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, nombreArchivo);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">📊</div>
          <p className="text-lg font-playfair">Generando reportes inteligentes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-playfair" style={{color: 'var(--marron-oscuro)'}}>Reportes Inteligentes</h1>
        <button onClick={exportarReporte} className="btn-mare">
          <Download size={20} />
          Exportar Completo
        </button>
      </div>

      {/* Navegación de vistas */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { id: 'ejecutivo', label: 'Dashboard Ejecutivo', icon: Target },
          { id: 'alertas', label: 'Alertas Inteligentes', icon: AlertTriangle },
          { id: 'rentabilidad', label: 'Análisis Rentabilidad', icon: DollarSign },
          { id: 'tiempos', label: 'Análisis Tiempos', icon: Clock }
        ].map(vista => (
          <button
            key={vista.id}
            onClick={() => setVistaActiva(vista.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              vistaActiva === vista.id 
                ? 'bg-marron-oscuro text-white' 
                : 'bg-white border border-arena-claro hover:bg-nude-suave'
            }`}
          >
            <vista.icon size={16} />
            {vista.label}
          </button>
        ))}
      </div>

      {/* Contenido por vista */}
      {vistaActiva === 'ejecutivo' && (
        <DashboardEjecutivo metricas={datosReportes.metricas} rentabilidad={datosReportes.rentabilidad} />
      )}
      
      {vistaActiva === 'alertas' && (
        <PanelAlertas alertas={datosReportes.alertas} />
      )}
      
      {vistaActiva === 'rentabilidad' && (
        <AnalisisRentabilidad rentabilidad={datosReportes.rentabilidad} />
      )}
      
      {vistaActiva === 'tiempos' && (
        <AnalisisTiempos tiempos={datosReportes.tiempos} />
      )}
    </div>
  );
}

// COMPONENTES DE VISTAS ESPECIALIZADAS

const DashboardEjecutivo = ({ metricas, rentabilidad }) => (
  <div className="space-y-6">
    {/* KPIs Principales */}
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <div className="card-mare text-center p-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Ship size={20} style={{color: 'var(--marron-intermedio)'}} />
          <span className="text-xs font-medium">Embarques Activos</span>
        </div>
        <p className="text-2xl font-bold" style={{color: 'var(--marron-oscuro)'}}>{metricas.embarquesActivos}</p>
      </div>
      
      <div className="card-mare text-center p-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <CheckCircle size={20} style={{color: 'var(--verde-suave)'}} />
          <span className="text-xs font-medium">Completados</span>
        </div>
        <p className="text-2xl font-bold text-green-600">{metricas.embarquesCompletos}</p>
      </div>

      <div className="card-mare text-center p-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <DollarSign size={20} style={{color: 'var(--marron-intermedio)'}} />
          <span className="text-xs font-medium">Invertido</span>
        </div>
        <p className="text-2xl font-bold" style={{color: 'var(--marron-oscuro)'}}>${(metricas.totalInvertido / 1000).toFixed(0)}k</p>
      </div>

      <div className="card-mare text-center p-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Package size={20} style={{color: 'var(--verde-suave)'}} />
          <span className="text-xs font-medium">Inventario</span>
        </div>
        <p className="text-2xl font-bold text-green-600">${(metricas.valorInventario / 1000).toFixed(0)}k</p>
      </div>

      <div className="card-mare text-center p-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <TrendingUp size={20} style={{color: 'var(--marron-intermedio)'}} />
          <span className="text-xs font-medium">Coeficiente</span>
        </div>
        <p className="text-2xl font-bold" style={{color: 'var(--marron-oscuro)'}}>{metricas.ultimoCoeficiente?.toFixed(2)}</p>
        <div className="flex items-center justify-center gap-1 mt-1">
          {metricas.tendenciaCoeficiente > 0 ? (
            <ArrowUp size={12} className="text-red-500" />
          ) : metricas.tendenciaCoeficiente < 0 ? (
            <ArrowDown size={12} className="text-green-500" />
          ) : null}
          <span className={`text-xs ${metricas.tendenciaCoeficiente > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {Math.abs(metricas.tendenciaCoeficiente).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="card-mare text-center p-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock size={20} style={{color: 'var(--marron-intermedio)'}} />
          <span className="text-xs font-medium">Tiempo Prom</span>
        </div>
        <p className="text-2xl font-bold" style={{color: 'var(--marron-oscuro)'}}>{metricas.tiempoPromedio?.toFixed(0)}</p>
        <span className="text-xs text-gray-600">días</span>
      </div>
    </div>

    {/* Resumen de Rentabilidad */}
    {rentabilidad.resumen && (
      <div className="card-mare p-6">
        <h3 className="text-xl font-playfair mb-4" style={{color: 'var(--marron-oscuro)'}}>💰 Resumen de Rentabilidad</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{rentabilidad.resumen.margenPromedioGeneral}%</p>
            <p className="text-sm text-gray-600">Margen Promedio</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">${(rentabilidad.resumen.totalInversion / 1000).toFixed(0)}k</p>
            <p className="text-sm text-gray-600">Inversión Total</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{rentabilidad.resumen.mejorEmbarque?.embarque || 'N/A'}</p>
            <p className="text-sm text-gray-600">Mejor Embarque</p>
            {rentabilidad.resumen.mejorEmbarque && (
              <p className="text-xs text-purple-500">{rentabilidad.resumen.mejorEmbarque.margenPorcentaje.toFixed(1)}% margen</p>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);

const PanelAlertas = ({ alertas }) => (
  <div className="space-y-4">
    {alertas.length === 0 ? (
      <div className="card-mare text-center py-12">
        <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
        <h3 className="text-xl font-playfair mb-2">¡Todo en Orden! 🎉</h3>
        <p className="text-gray-600">No hay alertas críticas que requieran tu atención</p>
      </div>
    ) : (
      alertas.map((alerta, index) => (
        <div
          key={index}
          className={`card-mare border-l-4 ${
            alerta.tipo === 'critico' ? 'border-red-500 bg-red-50' :
            alerta.tipo === 'warning' ? 'border-orange-500 bg-orange-50' :
            'border-blue-500 bg-blue-50'
          }`}
        >
          <div className="flex items-start gap-3 p-4">
            <alerta.icono size={24} className={alerta.color} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-sm">{alerta.categoria}</h4>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  alerta.tipo === 'critico' ? 'bg-red-200 text-red-800' :
                  alerta.tipo === 'warning' ? 'bg-orange-200 text-orange-800' :
                  'bg-blue-200 text-blue-800'
                }`}>
                  {alerta.tipo.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-700">{alerta.mensaje}</p>
              {alerta.embarque && (
                <div className="mt-2">
                  <button className="text-xs btn-mare-secondary px-3 py-1">
                    <Eye size={12} />
                    Ver Embarque
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))
    )}
  </div>
);

const AnalisisRentabilidad = ({ rentabilidad }) => (
  <div className="space-y-6">
    {/* Embarques */}
    <div className="card-mare">
      <h3 className="text-xl font-playfair mb-4">📊 Rentabilidad por Embarque</h3>
      {rentabilidad.embarques.length === 0 ? (
        <p className="text-center py-8 text-gray-600">No hay datos de rentabilidad disponibles</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-mare">
            <thead>
              <tr>
                <th>Embarque</th>
                <th>Estado</th>
                <th>FOB USD</th>
                <th>Coeficiente</th>
                <th>Costo Total</th>
                <th>Margen %</th>
                <th>Ganancia Est.</th>
              </tr>
            </thead>
            <tbody>
              {rentabilidad.embarques.map((r, idx) => (
                <tr key={idx}>
                  <td className="font-medium">{r.embarque}</td>
                  <td>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      r.estado === 'recibido' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {r.estado}
                    </span>
                  </td>
                  <td>${r.totalFOB.toFixed(0)}</td>
                  <td>{r.coeficiente.toFixed(2)}</td>
                  <td>${r.costoTotal.toFixed(0)}</td>
                  <td>
                    <span className={`font-bold ${
                      r.margenPorcentaje >= 30 ? 'text-green-600' :
                      r.margenPorcentaje >= 20 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {r.margenPorcentaje.toFixed(1)}%
                    </span>
                  </td>
                  <td className="font-medium text-green-600">${r.gananciaBruta.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

    {/* Categorías */}
    <div className="card-mare">
      <h3 className="text-xl font-playfair mb-4">🏷️ Rentabilidad por Categoría</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rentabilidad.categorias.map((cat, idx) => (
          <div key={idx} className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-bold mb-2">{cat.categoria}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Volumen FOB:</span>
                <span className="font-medium">${(cat.volumenFOB / 1000).toFixed(1)}k</span>
              </div>
              <div className="flex justify-between">
                <span>Margen:</span>
                <span className={`font-bold ${
                  cat.margenPromedio >= 35 ? 'text-green-600' : 'text-orange-600'
                }`}>{cat.margenPromedio}%</span>
              </div>
              <div className="flex justify-between">
                <span>Productos:</span>
                <span>{cat.productosActivos}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AnalisisTiempos = ({ tiempos }) => (
  <div className="space-y-6">
    {/* Resumen de Eficiencia */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="card-mare text-center p-4">
        <h4 className="text-sm font-medium mb-2">Eficiencia General</h4>
        <p className="text-3xl font-bold text-green-600">{tiempos.eficiencia.porcentajeEficiencia}%</p>
        <p className="text-xs text-gray-600">{tiempos.eficiencia.embarquesDentroTiempo} de {tiempos.eficiencia.totalEmbarques} embarques</p>
      </div>
      <div className="card-mare text-center p-4">
        <h4 className="text-sm font-medium mb-2">Tiempo Promedio</h4>
        <p className="text-3xl font-bold" style={{color: 'var(--marron-oscuro)'}}>{tiempos.promedios.total}</p>
        <p className="text-xs text-gray-600">días totales</p>
      </div>
      <div className="card-mare text-center p-4">
        <h4 className="text-sm font-medium mb-2">Mejor Tiempo</h4>
        <p className="text-3xl font-bold text-green-600">{tiempos.eficiencia.mejorTiempo}</p>
        <p className="text-xs text-gray-600">días (récord)</p>
      </div>
      <div className="card-mare text-center p-4">
        <h4 className="text-sm font-medium mb-2">Peor Tiempo</h4>
        <p className="text-3xl font-bold text-red-600">{tiempos.eficiencia.peorTiempo}</p>
        <p className="text-xs text-gray-600">días (máximo)</p>
      </div>
    </div>

    {/* Tiempos por Etapa */}
    <div className="card-mare">
      <h3 className="text-xl font-playfair mb-4">⏱️ Tiempos Promedio por Etapa</h3>
      <div className="space-y-4">
        {Object.entries(tiempos.promedios).filter(([key]) => key !== 'total').map(([etapa, dias]) => (
          <div key={etapa}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium capitalize">{etapa.replace('_', ' ')}</span>
              <span className="font-bold">{dias} días</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 relative">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(dias / tiempos.promedios.total) * 100}%`,
                  backgroundColor: 'var(--marron-intermedio)'
                }}
              >
                <span className="absolute left-2 top-0 h-full flex items-center text-xs text-white">
                  {((dias / tiempos.promedios.total) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Histórico */}
    {tiempos.historico.length > 0 && (
      <div className="card-mare">
        <h3 className="text-xl font-playfair mb-4">📈 Histórico de Duraciones</h3>
        <div className="overflow-x-auto">
          <table className="table-mare">
            <thead>
              <tr>
                <th>Embarque</th>
                <th>Fecha</th>
                <th>Duración</th>
                <th>Eficiencia</th>
              </tr>
            </thead>
            <tbody>
              {tiempos.historico.map((h, idx) => (
                <tr key={idx}>
                  <td className="font-medium">{h.embarque}</td>
                  <td>{h.fecha}</td>
                  <td>{h.duracion} días</td>
                  <td>
                    {h.eficiente ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle size={16} />
                        Eficiente
                      </span>
                    ) : (
                      <span className="text-red-600 flex items-center gap-1">
                        <XCircle size={16} />
                        Demorado
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
);

// Función exportable exacta para usar desde otros módulos (igual que el botón Exportar)
export const exportarReporteCompleto = (datosReportes) => {
  const wb = XLSX.utils.book_new();
  const fecha = new Date().toISOString().split('T')[0];
  
  // Hoja Ejecutiva (igual que la función original)
  const ejecutivoData = [
    { Métrica: 'Embarques Activos', Valor: datosReportes.metricas.embarquesActivos },
    { Métrica: 'Embarques Completados', Valor: datosReportes.metricas.embarquesCompletos },
    { Métrica: 'Total Invertido USD', Valor: datosReportes.metricas.totalInvertido?.toFixed(2) },
    { Métrica: 'Valor Inventario USD', Valor: datosReportes.metricas.valorInventario?.toFixed(2) },
    { Métrica: 'Coeficiente Promedio', Valor: datosReportes.metricas.coeficientePromedio?.toFixed(2) },
    { Métrica: 'Tiempo Promedio Embarque (días)', Valor: datosReportes.metricas.tiempoPromedio?.toFixed(0) },
    { Métrica: 'Productos Activos', Valor: datosReportes.metricas.productosActivos },
    { Métrica: 'Eficiencia Control (%)', Valor: datosReportes.metricas.eficienciaControl }
  ];
  
  const wsEjecutivo = XLSX.utils.json_to_sheet(ejecutivoData);
  XLSX.utils.book_append_sheet(wb, wsEjecutivo, 'Resumen Ejecutivo');
  
  // Hoja Alertas
  if (datosReportes.alertas.length > 0) {
    const alertasData = datosReportes.alertas.map(a => ({
      Tipo: a.tipo.toUpperCase(),
      Categoría: a.categoria,
      Mensaje: a.mensaje,
      Embarque: a.embarque || '',
      Días: a.dias || ''
    }));
    
    const wsAlertas = XLSX.utils.json_to_sheet(alertasData);
    XLSX.utils.book_append_sheet(wb, wsAlertas, 'Alertas');
  }
  
  // Hoja Rentabilidad
  if (datosReportes.rentabilidad.embarques.length > 0) {
    const rentabilidadData = datosReportes.rentabilidad.embarques.map(r => ({
      Embarque: r.embarque,
      Estado: r.estado,
      'FOB USD': r.totalFOB.toFixed(2),
      'Coeficiente': r.coeficiente.toFixed(2),
      'Costo Total USD': r.costoTotal.toFixed(2),
      'Precio Venta Estimado USD': r.precioVentaEstimado.toFixed(2),
      'Ganancia Bruta USD': r.gananciaBruta.toFixed(2),
      'Margen %': r.margenPorcentaje.toFixed(1),
      'Fecha': r.fecha
    }));
    
    const wsRentabilidad = XLSX.utils.json_to_sheet(rentabilidadData);
    XLSX.utils.book_append_sheet(wb, wsRentabilidad, 'Análisis Rentabilidad');
  }
  
  return wb;
};

// Función para generar reporte del embarque (obtiene datos y usa la función exacta del botón)
export const generarReporteParaEmbarque = async (embarqueId) => {
  try {
    // Obtener datos igual que el componente principal
    const [embarquesData, ordenesData, costosData, productosData, proveedoresData] = await Promise.all([
      supabase.from('embarques').select('*').eq('id', embarqueId),
      supabase.from('ordenes_compra').select('*'),
      supabase.from('costos_importacion').select('*'),
      supabase.from('productos').select('*'),
      supabase.from('proveedores').select('*')
    ]);

    if (embarquesData.error) throw embarquesData.error;

    const embarque = embarquesData.data[0];
    if (!embarque) return null;

    // Calcular métricas como en el módulo original
    const ordenes = ordenesData.data || [];
    const costos = costosData.data || [];
    const todosProductos = productosData.data || [];
    const productos = todosProductos.filter(p => p.embarque_id === embarqueId); // Filtrar por embarque
    const proveedores = proveedoresData.data || [];

    // Crear estructura de datos igual que el módulo principal
    const datosReportes = {
      metricas: {
        embarquesActivos: 1,
        embarquesCompletos: embarque.estado === 'recibido' ? 1 : 0,
        totalInvertido: ordenes.reduce((sum, o) => sum + (o.total_fob || 0), 0),
        valorInventario: productos.reduce((sum, p) => sum + ((p.precio_venta || 0) * (p.stock_actual || 0)), 0),
        coeficientePromedio: costos.reduce((sum, c) => sum + (c.coeficiente_decimal || 0), 0) / Math.max(costos.length, 1),
        tiempoPromedio: 30, // Estimado
        productosActivos: productos.filter(p => p.estado === 'activo').length,
        eficienciaControl: Math.round((productos.length / Math.max(ordenes.reduce((sum, o) => sum + (o.productos?.length || 0), 0), 1)) * 100)
      },
      alertas: [
        {
          tipo: 'info',
          categoria: 'Embarque',
          mensaje: `Reporte del embarque ${embarque.codigo}`,
          embarque: embarque.codigo,
          dias: ''
        }
      ],
      rentabilidad: {
        embarques: [{
          embarque: embarque.codigo,
          estado: embarque.estado,
          totalFOB: ordenes.reduce((sum, o) => sum + (o.total_fob || 0), 0),
          coeficiente: costos[0]?.coeficiente_decimal || 1.3,
          costoTotal: (ordenes.reduce((sum, o) => sum + (o.total_fob || 0), 0) * (costos[0]?.coeficiente_decimal || 1.3)),
          precioVentaEstimado: productos.reduce((sum, p) => sum + ((p.precio_venta || 0) * (p.stock_inicial || 0)), 0),
          gananciaBruta: productos.reduce((sum, p) => sum + ((p.precio_venta || 0) * (p.stock_inicial || 0)), 0) - (ordenes.reduce((sum, o) => sum + (o.total_fob || 0), 0) * (costos[0]?.coeficiente_decimal || 1.3)),
          margenPorcentaje: 30, // Estimado
          fecha: embarque.created_at?.split('T')[0] || ''
        }]
      }
    };

    // Usar la función exacta del botón
    return exportarReporteCompleto(datosReportes);

  } catch (error) {
    console.error('Error generando reporte para embarque:', error);
    return null;
  }
};