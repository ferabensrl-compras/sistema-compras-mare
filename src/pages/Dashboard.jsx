// src/pages/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Ship, Package, Plus, Calculator, FileText, CheckCircle, Clock, Truck, AlertTriangle, TrendingUp } from 'lucide-react';
import { obtenerFechaUruguay } from '../utils/dateUtils';

// Utilidades para cálculos - OPTIMIZADO
const calcularDiasEnEstado = (fechaActualizacion) => {
  if (!fechaActualizacion) return 0;
  const ahora = new Date(); // Usar Date() nativo en lugar de función Uruguay
  const fechaEstado = new Date(fechaActualizacion);
  return Math.floor((ahora - fechaEstado) / (1000 * 60 * 60 * 24));
};

const obtenerIconoEstado = (estado) => {
  const iconos = {
    preparacion: '📝',
    en_transito: '🚢', 
    en_aduana: '🏛️',
    recibido: '✅'
  };
  return iconos[estado] || '📋';
};

const obtenerColorEstado = (estado) => {
  const colores = {
    preparacion: 'bg-yellow-50 border-yellow-200',
    en_transito: 'bg-blue-50 border-blue-200',
    en_aduana: 'bg-orange-50 border-orange-200', 
    recibido: 'bg-green-50 border-green-200'
  };
  return colores[estado] || 'bg-gray-50 border-gray-200';
};

// Tarjeta de progreso para el embarque activo
const ActiveShipmentTracker = ({ embarque, ocsDelEmbarque, alertas, historialReferencia }) => {
  const estados = ['preparacion', 'en_transito', 'en_aduana', 'recibido'];
  const estadoActualIndex = estados.indexOf(embarque.estado);
  const totalFob = ocsDelEmbarque.reduce((sum, oc) => sum + (oc.total_fob || 0), 0);
  const diasEnEstado = calcularDiasEnEstado(embarque.updated_at);
  
  // Calcular métricas mejoradas
  const proveedoresUnicos = new Set(ocsDelEmbarque.map(oc => oc.proveedor_id)).size;
  const ocsEnviadas = ocsDelEmbarque.filter(oc => oc.estado === 'enviada').length;
  
  // Productos confirmados (simulado - sería del control invoice)
  const productosConfirmados = Math.floor(Math.random() * 100); // TODO: Conectar con control invoice real
  const totalProductos = Math.floor(productosConfirmados * 1.2); // Estimado

  const getQueSigue = () => {
    switch (embarque.estado) {
      case 'preparacion': 
        return "Cuando el proveedor confirme el envío, cambia el estado a 'En Tránsito'.";
      case 'en_transito': 
        return "Prepara los documentos para la aduana. Sube el BL y la Factura comercial.";
      case 'en_aduana': 
        return "Una vez liberado, marca como 'Recibido' y procede a calcular los costos finales.";
      default: 
        return "Proceso completado. Revisa el cálculo de costos y actualiza el catálogo.";
    }
  };

  const getAccionesEspecificas = () => {
    switch(embarque.estado) {
      case 'preparacion': return [
        "📧 Seguimiento con proveedores pendientes",
        "📋 Control Invoice productos confirmados",
        "📝 Finalizar OCs en borrador"
      ];
      case 'en_transito': return [
        "📄 Subir Bill of Lading",
        "🧮 Preparar cálculo de costos estimados",
        "📋 Verificar documentos comerciales"
      ];
      case 'en_aduana': return [
        "🏛️ Seguimiento proceso aduanero",
        "💰 Calcular costos reales de importación",
        "📋 Preparar recepción de mercadería"
      ];
      case 'recibido': return [
        "✅ Catálogo: Agregar productos confirmados",
        "💲 Configurar precios con coeficiente calculado",
        "📊 Reportes: Análisis del embarque"
      ];
      default: return [];
    }
  };
  
  return (
    <div className={`card-mare border-2 ${obtenerColorEstado(embarque.estado)}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{obtenerIconoEstado(embarque.estado)}</span>
        <div>
          <h3 className="text-xl font-playfair">Tu Importación Actual: <span className="text-marron-oscuro font-bold">{embarque.codigo}</span></h3>
          <p className="text-sm font-bold capitalize" style={{color: 'var(--verde-agua)'}}>{embarque.estado.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Alertas por demoras */}
      {alertas.length > 0 && (
        <div className="mb-4 space-y-2">
          {alertas.map((alerta, index) => (
            <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800 flex items-center gap-2">
              <AlertTriangle size={16} />
              {alerta}
            </div>
          ))}
        </div>
      )}

      {/* Progreso Visual Mejorado */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {estados.map((estado, index) => (
            <React.Fragment key={estado}>
              <div className={`flex flex-col items-center transition-all duration-500 ${index <= estadoActualIndex ? 'text-marron-oscuro scale-110' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all duration-500 ${
                  index < estadoActualIndex ? 'bg-green-500 border-green-500 text-white' : 
                  index === estadoActualIndex ? 'bg-marron-oscuro border-marron-oscuro text-white animate-pulse' : 
                  'border-gray-300 bg-white'
                }`}>
                  {index < estadoActualIndex ? '✓' : 
                   index === estadoActualIndex ? obtenerIconoEstado(estado) : 
                   index + 1}
                </div>
                <span className="text-xs mt-1 capitalize font-medium">{estado.replace('_', ' ')}</span>
              </div>
              {index < estados.length - 1 && (
                <div className={`flex-1 h-2 mx-2 rounded transition-all duration-700 ${
                  index < estadoActualIndex ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="text-center text-xs text-gray-600 mt-2">
          En {embarque.estado.replace('_', ' ')} hace <strong>{diasEnEstado} días</strong>
        </div>
      </div>

      {/* Métricas Clave Mejoradas */}
      <div className="grid grid-cols-4 gap-3 text-center my-6 p-4 bg-nude-suave rounded-lg">
        <div>
          <p className="text-2xl font-bold" style={{color: 'var(--marron-oscuro)'}}>${(totalFob / 1000).toFixed(1)}k</p>
          <p className="text-sm text-texto-secundario">Valor FOB</p>
        </div>
        <div>
          <p className="text-2xl font-bold" style={{color: 'var(--marron-oscuro)'}}>{ocsDelEmbarque.length}</p>
          <p className="text-sm text-texto-secundario">Órdenes Compra</p>
        </div>
        <div>
          <p className="text-2xl font-bold" style={{color: 'var(--marron-oscuro)'}}>{ocsEnviadas}/{ocsDelEmbarque.length}</p>
          <p className="text-sm text-texto-secundario">OCs Enviadas</p>
        </div>
        <div>
          <p className="text-2xl font-bold" style={{color: 'var(--marron-oscuro)'}}>{proveedoresUnicos}</p>
          <p className="text-sm text-texto-secundario">Proveedores</p>
        </div>
      </div>

      {/* ¿Qué Sigue? Mejorado */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 mb-4">
        <div className="flex items-start gap-2">
          <div className="text-blue-600 mt-0.5">🎯</div>
          <div>
            <strong>¿Qué Sigue?</strong> {getQueSigue()}
          </div>
        </div>
      </div>

      {/* Acciones Específicas */}
      <div className="mb-4">
        <h4 className="text-sm font-bold mb-2 text-marron-oscuro">Próximas Acciones:</h4>
        <div className="space-y-1">
          {getAccionesEspecificas().map((accion, index) => (
            <div key={index} className="text-xs p-2 bg-white rounded border border-gray-100 flex items-center gap-2">
              <div className="w-2 h-2 bg-verde-agua rounded-full"></div>
              {accion}
            </div>
          ))}
        </div>
      </div>

      {/* Accesos Directos */}
      <div className="flex gap-2 flex-wrap">
        <button className="btn-mare text-xs px-3 py-2">
          <Package size={16} /> Ver Órdenes
        </button>
        <button className="btn-mare-secondary text-xs px-3 py-2">
          <FileText size={16} /> Documentos
        </button>
        {(embarque.estado === 'en_aduana' || embarque.estado === 'recibido') && (
          <button className="btn-mare-secondary text-xs px-3 py-2">
            <Calculator size={16} /> Calcular Costos
          </button>
        )}
      </div>
    </div>
  );
};

// Tarjeta para cuando no hay embarque activo
const PreparingShipmentCard = ({ ocsBorrador, historialReferencia }) => {
  const valorPotencial = ocsBorrador.reduce((sum, oc) => sum + (oc.total_fob || 0), 0);
  const proveedoresUnicos = new Set(ocsBorrador.map(oc => oc.proveedor_id)).size;

  return (
    <div className="card-mare border-2 border-dashed border-verde-agua">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📝</span>
        <div>
          <h3 className="text-xl font-playfair">Preparando la Próxima Compra</h3>
          <p className="text-sm font-bold" style={{color: 'var(--verde-agua)'}}>Creando Órdenes de Compra</p>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-center my-6 p-4 bg-nude-suave rounded-lg">
        <div>
          <p className="text-2xl font-bold" style={{color: 'var(--marron-oscuro)'}}>{ocsBorrador.length}</p>
          <p className="text-sm text-texto-secundario">OCs en Borrador</p>
        </div>
        <div>
          <p className="text-2xl font-bold" style={{color: 'var(--marron-oscuro)'}}>${(valorPotencial / 1000).toFixed(1)}k</p>
          <p className="text-sm text-texto-secundario">Valor FOB Potencial</p>
        </div>
        <div>
          <p className="text-2xl font-bold" style={{color: 'var(--marron-oscuro)'}}>{proveedoresUnicos}</p>
          <p className="text-sm text-texto-secundario">Proveedores</p>
        </div>
      </div>

      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800 mb-4">
        <div className="flex items-start gap-2">
          <div className="text-green-600 mt-0.5">🎯</div>
          <div>
            <strong>¿Qué Sigue?</strong> Continúa creando tus OCs. Cuando estés listo, crea un nuevo embarque para agruparlas y enviarlas.
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button className="btn-mare text-xs px-3 py-2">
          <Plus size={16} /> Crear Nueva OC Manual
        </button>
        <button className="btn-mare-secondary text-xs px-3 py-2">
          <Ship size={16} /> Crear Nuevo Embarque
        </button>
      </div>

      {/* Referencia del último embarque */}
      {historialReferencia.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-xs font-bold mb-2 text-gray-700">📊 Referencia Último Embarque:</h4>
          <div className="text-xs text-gray-600">
            <strong>{historialReferencia[0].codigo}:</strong> Coeficiente {historialReferencia[0].coeficiente?.toFixed(2) || 'N/A'} - Duración {historialReferencia[0].duracion || 'N/A'} días
          </div>
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      try {
        console.log('🚀 Dashboard: Cargando datos...');

        // Cargar todos los datos necesarios
        const [embarquesRes, ordenesRes, costosRes] = await Promise.all([
          supabase.from('embarques').select('*').order('created_at', { ascending: false }),
          supabase.from('ordenes_compra').select('*, proveedor:proveedores(nombre)'),
          supabase.from('costos_importacion').select('*').order('created_at', { ascending: false })
        ]);
        
        console.log('📊 Embarques cargados:', embarquesRes.data?.length || 0);
        console.log('📋 OCs cargadas:', ordenesRes.data?.length || 0);
        console.log('💰 Costos cargados:', costosRes.data?.length || 0);

        // Encontrar embarque activo (no recibido)
        const embarqueActivo = embarquesRes.data?.find(e => e.estado !== 'recibido') || null;
        
        let ocsDelProceso = [];
        let tituloTabla = '';

        if (embarqueActivo) {
          console.log('🚢 Embarque activo encontrado:', embarqueActivo.codigo, '- Estado:', embarqueActivo.estado);
          // Filtrar OCs del embarque activo
          ocsDelProceso = ordenesRes.data.filter(oc => embarqueActivo.ordenes_ids?.includes(oc.id)) || [];
          tituloTabla = `OCs del Embarque ${embarqueActivo.codigo}`;
        } else {
          console.log('📝 No hay embarque activo - Mostrando OCs en borrador');
          // Mostrar OCs en borrador
          ocsDelProceso = ordenesRes.data.filter(oc => oc.estado === 'borrador') || [];
          tituloTabla = "OCs en Preparación";
        }

        // Generar alertas inteligentes
        const alertas = [];
        if (embarqueActivo) {
          const diasEnEstado = calcularDiasEnEstado(embarqueActivo.updated_at);
          
          if (embarqueActivo.estado === 'preparacion' && diasEnEstado > 30) {
            alertas.push(`⚠️ Preparación demorada: ${diasEnEstado} días sin envío`);
          }
          if (embarqueActivo.estado === 'en_transito' && diasEnEstado > 45) {
            alertas.push(`🚨 Tránsito prolongado: ${diasEnEstado} días - verificar con proveedor`);
          }
          if (embarqueActivo.estado === 'en_aduana' && diasEnEstado > 15) {
            alertas.push(`🏛️ Proceso aduanero demorado: ${diasEnEstado} días`);
          }
        }

        // Calcular historial de referencia
        const embarquesCompletos = embarquesRes.data?.filter(e => e.estado === 'recibido') || [];
        const historialReferencia = embarquesCompletos.slice(0, 3).map(e => {
          const costoEmbarque = costosRes.data?.find(c => c.embarque_id === e.id);
          return {
            codigo: e.codigo,
            coeficiente: costoEmbarque?.coeficiente_decimal,
            duracion: e.created_at && e.updated_at ? 
              Math.floor((new Date(e.updated_at) - new Date(e.created_at)) / (1000 * 60 * 60 * 24)) : null
          };
        });

        // Coeficiente de referencia (último o promedio)
        const ultimoCosto = costosRes.data?.[0];
        const coeficienteReferencia = ultimoCosto?.coeficiente_decimal || 1.35;

        setData({
          embarqueActivo,
          ocsDelProceso,
          tituloTabla,
          alertas,
          historialReferencia,
          coeficienteReferencia,
          estadisticas: {
            totalEmbarques: embarquesRes.data?.length || 0,
            embarquesCompletos: embarquesCompletos.length,
            totalOCs: ordenesRes.data?.length || 0,
            costosCalculados: costosRes.data?.length || 0
          }
        });

        console.log('✅ Dashboard: Datos cargados exitosamente');

      } catch (error) {
        console.error("❌ Error cargando datos del dashboard:", error);
        setData({
          embarqueActivo: null,
          ocsDelProceso: [],
          tituloTabla: "Error cargando datos",
          alertas: [],
          historialReferencia: [],
          coeficienteReferencia: 1.35,
          estadisticas: { totalEmbarques: 0, embarquesCompletos: 0, totalOCs: 0, costosCalculados: 0 }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🚢</div>
          <p className="text-lg font-playfair">Cargando tu panel de control...</p>
        </div>
      </div>
    );
  }

  const titulo = data.embarqueActivo 
    ? `Panel de Control: Embarque Activo ${data.embarqueActivo.codigo}`
    : "Panel de Control: Preparando Nueva Compra";
  
  return (
    <div className="space-y-6">
      {/* Título Dinámico */}
      <div className="text-center">
        <h1 className="text-3xl font-playfair mb-2" style={{color: 'var(--marron-oscuro)'}}>{titulo}</h1>
        <p className="text-texto-secundario">Tu centro de control para importaciones inteligentes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Principal */}
        <div className="lg:col-span-2">
          {data.embarqueActivo ? (
            <ActiveShipmentTracker 
              embarque={data.embarqueActivo} 
              ocsDelEmbarque={data.ocsDelProceso}
              alertas={data.alertas}
              historialReferencia={data.historialReferencia}
            />
          ) : (
            <PreparingShipmentCard 
              ocsBorrador={data.ocsDelProceso}
              historialReferencia={data.historialReferencia}
            />
          )}
        </div>

        {/* Columna Lateral */}
        <div className="space-y-6">
          {/* Tabla de OCs */}
          <div>
            <h3 className="text-xl font-playfair mb-4" style={{color: 'var(--marron-oscuro)'}}>{data.tituloTabla}</h3>
            <div className="card-mare max-h-96 overflow-y-auto">
              {data.ocsDelProceso.length > 0 ? (
                <div className="space-y-3">
                  {data.ocsDelProceso.map(oc => (
                    <div key={oc.id} className="text-sm pb-3 border-b border-arena-claro/50 last:border-b-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold" style={{color: 'var(--marron-oscuro)'}}>{oc.numero}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          oc.estado === 'enviada' ? 'bg-green-100 text-green-800' : 
                          oc.estado === 'borrador' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {oc.estado}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-texto-secundario text-xs">{oc.proveedor?.nombre || 'Sin proveedor'}</span>
                        <span className="font-medium" style={{color: 'var(--verde-agua)'}}>${oc.total_fob?.toFixed(2) || '0.00'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-texto-secundario">
                  <Package size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No hay OCs para mostrar</p>
                </div>
              )}
            </div>
          </div>

          {/* Alertas y Datos Clave */}
          <div>
            <h3 className="text-xl font-playfair mb-4" style={{color: 'var(--marron-oscuro)'}}>Datos de Referencia</h3>
            <div className="space-y-3">
              <div className="card-mare p-4 border-l-4 border-green-400">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-green-600" />
                  <strong className="text-sm">Coeficiente de Referencia</strong>
                </div>
                <p className="text-2xl font-bold text-green-700">{data.coeficienteReferencia.toFixed(2)}</p>
                <p className="text-xs text-gray-600">Úsalo para estimar precios de nuevos productos</p>
              </div>
              
              {/* Historial Rápido */}
              {data.historialReferencia.length > 0 && (
                <div className="card-mare p-4">
                  <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                    <Clock size={14} />
                    Historial Reciente
                  </h4>
                  <div className="space-y-2">
                    {data.historialReferencia.map((embarque, index) => (
                      <div key={index} className="flex justify-between text-xs py-1 border-b border-gray-100 last:border-b-0">
                        <span className="font-medium">{embarque.codigo}</span>
                        <span>Coef: {embarque.coeficiente?.toFixed(2) || 'N/A'}</span>
                        <span>{embarque.duracion || 'N/A'} días</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Estadísticas Generales */}
              <div className="card-mare p-4 bg-gradient-to-r from-marron-claro/10 to-verde-agua/10">
                <h4 className="text-sm font-bold mb-3">📊 Estadísticas Generales</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="text-center">
                    <p className="font-bold text-lg">{data.estadisticas.totalEmbarques}</p>
                    <p className="text-gray-600">Total Embarques</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">{data.estadisticas.embarquesCompletos}</p>
                    <p className="text-gray-600">Completados</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">{data.estadisticas.totalOCs}</p>
                    <p className="text-gray-600">Total OCs</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-lg">{data.estadisticas.costosCalculados}</p>
                    <p className="text-gray-600">Costos Calculados</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}