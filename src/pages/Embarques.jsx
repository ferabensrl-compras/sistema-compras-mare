// src/pages/Embarques.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Ship, 
  FileText,
  Calendar,
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Upload,
  Eye,
  Edit,
  X,
  Trash2
} from 'lucide-react';
import { supabase } from '../services/supabase';
import EmbarqueForm from '../components/EmbarqueForm';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { formatearSoloFecha, obtenerTimestampUruguay } from '../utils/dateUtils';
import { generarExcelCostosParaEmbarque } from './CostosImportacion';
import { generarReporteParaEmbarque } from './Reportes';

export default function Embarques() {
  const [embarques, setEmbarques] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmbarque, setSelectedEmbarque] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar embarques con relaciones
      const { data: embarquesData, error: embarquesError } = await supabase
        .from('embarques')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (embarquesError) throw embarquesError;
      
      // Cargar órdenes confirmadas o en producción
      const { data: ordenesData, error: ordenesError } = await supabase
        .from('ordenes_compra')
        .select(`
          *,
          proveedor:proveedores(id, nombre)
        `)
        .in('estado', ['borrador', 'enviada', 'en_proceso', 'confirmada'])
        .order('created_at', { ascending: false });
      
      if (ordenesError) throw ordenesError;
      
      setEmbarques(embarquesData || []);
      setOrdenes(ordenesData || []);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Crear nuevo embarque
  const crearEmbarque = async (datos) => {
    try {
      const { data, error } = await supabase
        .from('embarques')
        .insert([{
          codigo: datos.codigo,
          ordenes_ids: datos.ordenes_ids,
          fecha_estimada_salida: datos.fecha_estimada_salida,
          estado: 'preparacion',
          documentos: [],
          tracking: '',
          contenedor: '',
          forwarder: ''
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Actualizar estado de las órdenes incluidas
      await supabase
        .from('ordenes_compra')
        .update({ estado: 'enviada' })
        .in('id', datos.ordenes_ids);
      
      setEmbarques([data, ...embarques]);
      setSelectedEmbarque(data);
      setShowNewForm(false);
      cargarDatos();
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear embarque');
    }
  };

  // Eliminar embarque
  const eliminarEmbarque = async (embarque) => {
    if (!confirm(`¿Estás seguro de eliminar el embarque "${embarque.codigo}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      // Si el embarque tiene órdenes asociadas, liberar las órdenes primero
      if (embarque.ordenes_ids && embarque.ordenes_ids.length > 0) {
        await supabase
          .from('ordenes_compra')
          .update({ estado: 'confirmada' }) // Volver a estado anterior
          .in('id', embarque.ordenes_ids);
      }

      const { error } = await supabase
        .from('embarques')
        .delete()
        .eq('id', embarque.id);

      if (error) throw error;

      // Actualizar estado local
      setEmbarques(embarques.filter(emb => emb.id !== embarque.id));
      
      // Si era el embarque seleccionado, deseleccionar
      if (selectedEmbarque?.id === embarque.id) {
        setSelectedEmbarque(null);
      }

      alert('Embarque eliminado correctamente');
      
      // Recargar datos para actualizar órdenes disponibles
      cargarDatos();
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar embarque');
    }
  };

  // Actualizar estado del embarque
  const actualizarEstado = async (nuevoEstado) => {
    if (!selectedEmbarque) return;

    try {
      const { error } = await supabase
        .from('embarques')
        .update({ estado: nuevoEstado })
        .eq('id', selectedEmbarque.id);

      if (error) throw error;

      // Si se marca como recibido, actualizar las OCs
      if (nuevoEstado === 'recibido' && selectedEmbarque.ordenes_ids) {
        await supabase
          .from('ordenes_compra')
          .update({ estado: 'recibida' })
          .in('id', selectedEmbarque.ordenes_ids);
      }

      setSelectedEmbarque({
        ...selectedEmbarque,
        estado: nuevoEstado
      });

      setEmbarques(embarques.map(emb => 
        emb.id === selectedEmbarque.id 
          ? { ...emb, estado: nuevoEstado }
          : emb
      ));

    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar estado');
    }
  };

  // Actualizar tracking
  const actualizarTracking = async (campo, valor) => {
    if (!selectedEmbarque) return;

    try {
      const actualizacion = { [campo]: valor };
      
      const { error } = await supabase
        .from('embarques')
        .update(actualizacion)
        .eq('id', selectedEmbarque.id);

      if (error) throw error;

      setSelectedEmbarque({
        ...selectedEmbarque,
        ...actualizacion
      });

      setEmbarques(embarques.map(emb => 
        emb.id === selectedEmbarque.id 
          ? { ...emb, ...actualizacion }
          : emb
      ));

    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar información');
    }
  };

  // Exportación consolidada del embarque completo
  const exportarEmbarqueCompleto = async () => {
    if (!selectedEmbarque || selectedEmbarque.estado !== 'recibido') {
      alert('El embarque debe estar marcado como "Recibido" para exportar');
      return;
    }

    try {
      // Crear un ZIP con toda la información del embarque
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // 1. Obtener las órdenes completas con productos
      const { data: ordenesCompletas, error } = await supabase
        .from('ordenes_compra')
        .select('*')
        .in('id', selectedEmbarque.ordenes_ids || []);

      if (error) throw error;

      // 2. Preparar datos para ERP (CSV)
      const productosERP = [];
      ordenesCompletas.forEach(orden => {
        orden.productos?.forEach(producto => {
          productosERP.push({
            'Código': producto.codigo_producto || '',
            'Código Barras': producto.codigo_barras || '',
            'Nombre': producto.nombre,
            'Cantidad': producto.cantidad,
            'Precio FOB': producto.precio_fob,
            'Costo Total': producto.total_fob,
            'Embarque': selectedEmbarque.codigo,
            'Fecha Recepción': obtenerTimestampUruguay().split('T')[0]
          });
        });
      });

      // 3. Generar Excel ERP
      const wbERP = XLSX.utils.book_new();
      const wsERP = XLSX.utils.json_to_sheet(productosERP);
      wsERP['!cols'] = [
        { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 10 }, 
        { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(wbERP, wsERP, 'ERP');
      const excelERPBuffer = XLSX.write(wbERP, { bookType: 'xlsx', type: 'array' });
      zip.file(`ERP_${selectedEmbarque.codigo}.xlsx`, excelERPBuffer);

      // 4. Generar Excel Catálogo (similar al que se descarga desde Catálogo)
      const productosVenta = [];
      ordenesCompletas.forEach(orden => {
        orden.productos?.forEach(producto => {
          productosVenta.push({
            'Codigo': producto.codigo_producto || '',
            'Nombre': '', // Vacío como requerido
            'Descripcion': producto.nombre,
            'Categoria': producto.categoria || '',
            'Medidas': '', // Vacío
            'Precio': Math.round(producto.precio_fob * 1.40 * 41.0 * 2.0 * 1.22), // Precio sugerido
            'imagen de 1': '', 'imagen de 2': '', 'imagen de 3': '', 'imagen de 4': '',
            'imagen de 5': '', 'imagen de 6': '', 'imagen de 7': '', 'imagen de 8': '',
            'imagen de 9': '', 'imagen de 10': '', // Todas vacías
            'imagen Variante': '', 'Sin color': '', 'Permitir surtido': '', 'Estado': '',
            'Color 1': '', 'Color 2': '', 'Color 3': '', 'Color 4': '', 'Color 5': ''
          });
        });
      });

      const wbVenta = XLSX.utils.book_new();
      const wsVenta = XLSX.utils.json_to_sheet(productosVenta);
      XLSX.utils.book_append_sheet(wbVenta, wsVenta, 'Catalogo_Ventas');
      const excelVentaBuffer = XLSX.write(wbVenta, { bookType: 'xlsx', type: 'array' });
      zip.file(`Catalogo_Ventas_${selectedEmbarque.codigo}.xlsx`, excelVentaBuffer);

      // 5. Agregar Excel de Costos (si existen datos)
      try {
        const excelCostos = await generarExcelCostosParaEmbarque(selectedEmbarque.id);
        if (excelCostos) {
          const costosBuffer = XLSX.write(excelCostos, { bookType: 'xlsx', type: 'array' });
          
          // Obtener datos de costos para el nombre del archivo (sin consulta directa)
          const { data: todosCostosData } = await supabase
            .from('costos_importacion')
            .select('coeficiente_porcentaje, embarque_id');
            
          const costosData = todosCostosData?.find(c => c.embarque_id === selectedEmbarque.id);
          
          const coeficienteSufijo = costosData?.coeficiente_porcentaje 
            ? `_Coeficiente-${costosData.coeficiente_porcentaje.toFixed(2)}%` 
            : '';
            
          zip.file(`COSTOS_${selectedEmbarque.codigo}${coeficienteSufijo}.xlsx`, costosBuffer);
        }
      } catch (error) {
        console.warn('No se pudo agregar Excel de Costos al ZIP:', error);
      }

      // 6. Agregar Reporte del Embarque (si existen datos)
      try {
        const reporteExcel = await generarReporteParaEmbarque(selectedEmbarque.id);
        if (reporteExcel) {
          const reporteBuffer = XLSX.write(reporteExcel, { bookType: 'xlsx', type: 'array' });
          zip.file(`REPORTE_${selectedEmbarque.codigo}_Estadisticas.xlsx`, reporteBuffer);
        }
      } catch (error) {
        console.warn('No se pudo agregar Reporte del Embarque al ZIP:', error);
      }

      // 7. Agregar documentos del embarque (si existen)
      let documentosIncluidos = 0;
      if (selectedEmbarque.documentos && Array.isArray(selectedEmbarque.documentos) && selectedEmbarque.documentos.length > 0) {
        selectedEmbarque.documentos.forEach((doc, index) => {
          try {
            if (doc && doc.archivo && doc.nombre) {
              // Verificar si el archivo tiene formato base64 correcto
              if (doc.archivo.startsWith('data:')) {
                const base64Data = doc.archivo.split(',')[1];
                const binaryData = atob(base64Data);
                const bytes = new Uint8Array(binaryData.length);
                for (let i = 0; i < binaryData.length; i++) {
                  bytes[i] = binaryData.charCodeAt(i);
                }
                zip.file(`Documentos/${doc.nombre}`, bytes);
                documentosIncluidos++;
              } else {
                // Si no es base64, asumir que es texto plano
                zip.file(`Documentos/${doc.nombre}`, doc.archivo);
                documentosIncluidos++;
              }
            }
          } catch (error) {
            console.warn('Error agregando documento:', doc.nombre, error);
          }
        });
      }
      
      // Agregar información sobre documentos en el resumen
      if (documentosIncluidos === 0) {
        zip.file(`Documentos/NOTA_DOCUMENTOS.txt`, 'No se encontraron documentos adjuntos en este embarque.\nPuede agregar documentos desde el módulo de Embarques.');
      }

      // 8. Crear archivo de resumen del embarque
      const resumenEmbarque = [
        `RESUMEN DE EMBARQUE: ${selectedEmbarque.codigo}`,
        `Fecha de Recepción: ${formatearSoloFecha(null)}`,
        `Estado: ${selectedEmbarque.estado}`,
        ``,
        `INFORMACIÓN DE ENVÍO:`,
        `Tracking: ${selectedEmbarque.tracking || 'No especificado'}`,
        `Contenedor: ${selectedEmbarque.contenedor || 'No especificado'}`,
        `Forwarder: ${selectedEmbarque.forwarder || 'No especificado'}`,
        ``,
        `FECHAS:`,
        `Fecha Estimada Salida: ${selectedEmbarque.fecha_estimada_salida || 'No especificada'}`,
        `Fecha Llegada: ${selectedEmbarque.fecha_llegada || 'No especificada'}`,
        `Fecha Entrega: ${selectedEmbarque.fecha_entrega || 'No especificada'}`,
        ``,
        `ÓRDENES INCLUIDAS:`,
        ...ordenesCompletas.map(orden => `- ${orden.numero}: ${orden.productos?.length || 0} productos - $${orden.total_fob?.toFixed(2) || '0.00'} FOB`),
        ``,
        `TOTALES:`,
        `Total Productos: ${productosERP.length}`,
        `Total FOB: $${productosERP.reduce((sum, p) => sum + p['Costo Total'], 0).toFixed(2)}`,
        ``,
        `NOTAS:`,
        selectedEmbarque.notas || 'Sin notas adicionales'
      ].join('\n');

      zip.file(`RESUMEN_${selectedEmbarque.codigo}.txt`, resumenEmbarque);

      // 9. Generar y descargar el ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const fecha = obtenerTimestampUruguay().split('T')[0];
      const nombreZip = `EMBARQUE_COMPLETO_${selectedEmbarque.codigo}_${fecha}.zip`;
      
      saveAs(zipBlob, nombreZip);
      alert(`✅ Embarque exportado exitosamente!\n\nDescargado: ${nombreZip}\n\nContenido:\n- Excel ERP\n- Excel Catálogo Ventas\n- Excel Análisis de Costos (si disponible)\n- Excel Reporte Estadísticas (si disponible)\n- Documentos adjuntos (${documentosIncluidos} archivos)\n- Resumen del embarque`);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error al exportar embarque completo: ' + error.message);
    }
  };

  // Calcular totales del embarque
  const calcularTotales = async () => {
    if (!selectedEmbarque?.ordenes_ids) return { productos: 0, valor: 0 };

    try {
      const { data: ordenesData } = await supabase
        .from('ordenes_compra')
        .select('productos, total_fob')
        .in('id', selectedEmbarque.ordenes_ids);

      let totalProductos = 0;
      let totalValor = 0;

      ordenesData?.forEach(orden => {
        totalProductos += orden.productos?.length || 0;
        totalValor += orden.total_fob || 0;
      });

      return { productos: totalProductos, valor: totalValor };
    } catch (error) {
      console.error('Error:', error);
      return { productos: 0, valor: 0 };
    }
  };

  // Obtener icono de estado
  const getEstadoIcon = (estado) => {
    switch(estado) {
      case 'en_transito':
        return <Truck size={16} />;
      case 'en_aduana':
        return <Clock size={16} />;
      case 'recibido':
        return <CheckCircle size={16} />;
      default:
        return <Package size={16} />;
    }
  };

  // Obtener clase de estado
  const getEstadoClass = (estado) => {
    switch(estado) {
      case 'recibido':
        return 'estado-exito';
      case 'en_transito':
      case 'en_aduana':
        return 'estado-warning';
      default:
        return '';
    }
  };

  const [totalesEmbarque, setTotalesEmbarque] = useState({ productos: 0, valor: 0 });

  useEffect(() => {
    if (selectedEmbarque) {
      calcularTotales().then(setTotalesEmbarque);
    }
  }, [selectedEmbarque]);

  // Subir documentos
  const subirDocumentos = async (event) => {
    if (!selectedEmbarque) return;

    const files = Array.from(event.target.files);
    const documentosExistentes = selectedEmbarque.documentos || [];
    
    try {
      const nuevosDocumentos = await Promise.all(
        files.map(async (file) => {
          // Convertir archivo a base64 para almacenar en JSON
          const base64 = await convertirABase64(file);
          
          return {
            nombre: file.name,
            tipo: file.type || 'application/octet-stream',
            tamaño: formatearTamaño(file.size),
            fechaSubida: obtenerTimestampUruguay(),
            contenido: base64
          };
        })
      );

      const todosDocumentos = [...documentosExistentes, ...nuevosDocumentos];

      // Actualizar embarque en base de datos
      const { error } = await supabase
        .from('embarques')
        .update({ documentos: todosDocumentos })
        .eq('id', selectedEmbarque.id);

      if (error) throw error;

      // Actualizar estado local
      setSelectedEmbarque({
        ...selectedEmbarque,
        documentos: todosDocumentos
      });

      setEmbarques(embarques.map(emb => 
        emb.id === selectedEmbarque.id 
          ? { ...emb, documentos: todosDocumentos }
          : emb
      ));

      alert(`${files.length} documento(s) subido(s) correctamente`);
      
    } catch (error) {
      console.error('Error subiendo documentos:', error);
      alert('Error al subir documentos');
    }
  };

  // Convertir archivo a base64
  const convertirABase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Formatear tamaño de archivo
  const formatearTamaño = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Descargar documento
  const descargarDocumento = (documento) => {
    try {
      // Crear enlace de descarga
      const link = document.createElement('a');
      link.href = documento.contenido;
      link.download = documento.nombre;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error descargando documento:', error);
      alert('Error al descargar documento');
    }
  };

  // Eliminar documento
  const eliminarDocumento = async (index) => {
    if (!selectedEmbarque) return;

    if (confirm('¿Estás seguro de eliminar este documento?')) {
      try {
        const documentosActualizados = selectedEmbarque.documentos.filter((_, i) => i !== index);

        const { error } = await supabase
          .from('embarques')
          .update({ documentos: documentosActualizados })
          .eq('id', selectedEmbarque.id);

        if (error) throw error;

        setSelectedEmbarque({
          ...selectedEmbarque,
          documentos: documentosActualizados
        });

        setEmbarques(embarques.map(emb => 
          emb.id === selectedEmbarque.id 
            ? { ...emb, documentos: documentosActualizados }
            : emb
        ));

      } catch (error) {
        console.error('Error eliminando documento:', error);
        alert('Error al eliminar documento');
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Lista de embarques */}
      <div className="lg:col-span-1">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-playfair">Embarques</h2>
          <button 
            onClick={() => setShowNewForm(true)} 
            className="btn-mare"
          >
            <Plus size={20} />
            Nuevo
          </button>
        </div>

        {ordenes.length === 0 && (
          <div className="card-mare mb-4 p-4" style={{ backgroundColor: 'var(--nude-suave)' }}>
            <AlertCircle size={20} className="mb-2" style={{ color: 'var(--marron-oscuro)' }} />
            <p className="text-sm">
              Puedes crear embarques vacíos. Las OCs se asociarán automáticamente al embarque activo.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : embarques.length === 0 ? (
            <div className="card-mare text-center py-8">
              <p style={{ color: 'var(--texto-secundario)' }}>
                No hay embarques aún
              </p>
            </div>
          ) : (
            embarques.map(embarque => (
              <div
                key={embarque.id}
                className={`card-mare cursor-pointer transition-all relative group ${
                  selectedEmbarque?.id === embarque.id ? 'ring-2' : ''
                }`}
                style={{
                  ringColor: selectedEmbarque?.id === embarque.id ? 'var(--marron-oscuro)' : ''
                }}
              >
                <div onClick={() => setSelectedEmbarque(embarque)}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-lg">{embarque.codigo}</h3>
                      <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>
                        {embarque.ordenes_ids?.length || 0} órdenes
                      </p>
                    </div>
                    <span className={`estado ${getEstadoClass(embarque.estado)} flex items-center gap-1`}>
                      {getEstadoIcon(embarque.estado)}
                      {embarque.estado.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Botón eliminar */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminarEmbarque(embarque);
                  }}
                  className="absolute top-2 right-2 p-1 bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-50"
                  title="Eliminar embarque"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
                
                <div className="text-sm space-y-1">
                  {embarque.fecha_estimada_salida && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--texto-secundario)' }}>Salida est.:</span>
                      <span>{formatearSoloFecha(embarque.fecha_estimada_salida)}</span>
                    </div>
                  )}
                  {embarque.tracking && (
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--texto-secundario)' }}>Tracking:</span>
                      <span className="font-mono text-xs">{embarque.tracking}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detalle del embarque */}
      <div className="lg:col-span-2">
        {selectedEmbarque ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-playfair">{selectedEmbarque.codigo}</h2>
                <p style={{ color: 'var(--texto-secundario)' }}>
                  {selectedEmbarque.ordenes_ids?.length || 0} órdenes • 
                  {totalesEmbarque.productos} productos • 
                  ${totalesEmbarque.valor.toFixed(2)} FOB
                </p>
              </div>
              <div className="flex gap-3">
                {selectedEmbarque.estado === 'recibido' && (
                  <button 
                    onClick={exportarEmbarqueCompleto}
                    className="btn-mare"
                  >
                    <Download size={20} />
                    Exportar Embarque Completo
                  </button>
                )}
                <button 
                  onClick={() => setShowForm(true)}
                  className="btn-mare-secondary"
                >
                  <Edit size={20} />
                  Editar
                </button>
              </div>
            </div>

            {/* Estados del embarque */}
            <div className="card-mare mb-6">
              <h3 className="text-sm font-medium mb-3">Estado del Embarque</h3>
              <div className="flex gap-2 flex-wrap">
                {['preparacion', 'en_transito', 'en_aduana', 'recibido'].map(estado => (
                  <button
                    key={estado}
                    onClick={() => actualizarEstado(estado)}
                    disabled={selectedEmbarque.estado === estado}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      selectedEmbarque.estado === estado
                        ? 'bg-marron-oscuro text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: selectedEmbarque.estado === estado ? 'var(--marron-oscuro)' : ''
                    }}
                  >
                    {estado.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Información de tracking */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="card-mare">
                <h4 className="text-sm font-medium mb-3">Información de Envío</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--texto-secundario)' }}>
                      Número de Tracking
                    </label>
                    <input
                      type="text"
                      value={selectedEmbarque.tracking || ''}
                      onChange={(e) => actualizarTracking('tracking', e.target.value)}
                      className="input-mare text-sm"
                      placeholder="ABC123456789"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--texto-secundario)' }}>
                      Contenedor
                    </label>
                    <input
                      type="text"
                      value={selectedEmbarque.contenedor || ''}
                      onChange={(e) => actualizarTracking('contenedor', e.target.value)}
                      className="input-mare text-sm"
                      placeholder="MSKU1234567"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--texto-secundario)' }}>
                      Forwarder
                    </label>
                    <input
                      type="text"
                      value={selectedEmbarque.forwarder || ''}
                      onChange={(e) => actualizarTracking('forwarder', e.target.value)}
                      className="input-mare text-sm"
                      placeholder="Nombre del forwarder"
                    />
                  </div>
                </div>
              </div>

              <div className="card-mare">
                <h4 className="text-sm font-medium mb-3">Fechas Importantes</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--texto-secundario)' }}>
                      Fecha Estimada de Salida
                    </label>
                    <input
                      type="date"
                      value={selectedEmbarque.fecha_estimada_salida || ''}
                      onChange={(e) => actualizarTracking('fecha_estimada_salida', e.target.value)}
                      className="input-mare text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--texto-secundario)' }}>
                      Fecha de Llegada
                    </label>
                    <input
                      type="date"
                      value={selectedEmbarque.fecha_llegada || ''}
                      onChange={(e) => actualizarTracking('fecha_llegada', e.target.value)}
                      className="input-mare text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--texto-secundario)' }}>
                      Fecha de Entrega
                    </label>
                    <input
                      type="date"
                      value={selectedEmbarque.fecha_entrega || ''}
                      onChange={(e) => actualizarTracking('fecha_entrega', e.target.value)}
                      className="input-mare text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Documentos */}
            <div className="card-mare mb-6">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-medium">Documentos del Embarque</h4>
                <input
                  type="file"
                  id="file-upload"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  className="hidden"
                  onChange={subirDocumentos}
                />
                <button
                  onClick={() => document.getElementById('file-upload').click()}
                  className="btn-mare-secondary text-xs px-3 py-1"
                >
                  <Upload size={16} />
                  Subir Archivos
                </button>
              </div>
              
              {/* Lista de documentos */}
              <div className="space-y-2">
                {selectedEmbarque.documentos && selectedEmbarque.documentos.length > 0 ? (
                  selectedEmbarque.documentos.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText size={20} style={{ color: 'var(--marron-oscuro)' }} />
                        <div>
                          <p className="font-medium text-sm">{doc.nombre}</p>
                          <p className="text-xs" style={{ color: 'var(--texto-secundario)' }}>
                            {doc.tipo} • {formatearSoloFecha(doc.fechaSubida)} • {doc.tamaño}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => descargarDocumento(doc)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => eliminarDocumento(index)}
                          className="p-1 hover:bg-gray-200 rounded text-red-500"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6" style={{ color: 'var(--texto-secundario)' }}>
                    <FileText size={48} className="mx-auto mb-2" style={{ color: 'var(--arena-claro)' }} />
                    <p className="text-sm">No hay documentos subidos</p>
                    <p className="text-xs">Subir: BL, Facturas, Packing List, Fotos, etc.</p>
                  </div>
                )}
              </div>
              
              {/* Tipos de documentos sugeridos */}
              <div className="mt-4 pt-3 border-t">
                <p className="text-xs mb-2" style={{ color: 'var(--texto-secundario)' }}>Documentos sugeridos:</p>
                <div className="flex flex-wrap gap-2">
                  {['BL (Bill of Lading)', 'Factura Comercial', 'Packing List', 'Certificados', 'Fotos Producto', 'Transferencias', 'Comunicaciones'].map(tipo => (
                    <span key={tipo} className="px-2 py-1 bg-gray-100 rounded text-xs" style={{ color: 'var(--texto-secundario)' }}>
                      {tipo}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Órdenes incluidas */}
            <div className="card-mare">
              <h4 className="text-sm font-medium mb-3">Órdenes de Compra Incluidas</h4>
              {selectedEmbarque.ordenes_ids?.length > 0 ? (
                <div className="space-y-2">
                  {ordenes
                    .filter(oc => selectedEmbarque.ordenes_ids.includes(oc.id))
                    .map(oc => (
                      <div key={oc.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium">{oc.numero}</span>
                          <span className="text-sm ml-2" style={{ color: 'var(--texto-secundario)' }}>
                            {oc.proveedor?.nombre}
                          </span>
                        </div>
                        <span className="font-bold" style={{ color: 'var(--marron-oscuro)' }}>
                          ${oc.total_fob?.toFixed(2)}
                        </span>
                      </div>
                    ))
                  }
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>
                  No hay órdenes asignadas
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="card-mare text-center py-12">
            <Ship size={48} className="mx-auto mb-4" style={{ color: 'var(--arena-claro)' }} />
            <p style={{ color: 'var(--texto-secundario)' }}>
              Selecciona o crea un embarque para gestionar envíos
            </p>
          </div>
        )}
      </div>

      {/* Modal nuevo embarque */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card-mare" style={{ 
            backgroundColor: 'white',
            maxWidth: '40rem',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-playfair">Nuevo Embarque</h3>
              <button onClick={() => setShowNewForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Código del Embarque *
                </label>
                <input
                  type="text"
                  id="codigo-embarque"
                  className="input-mare"
                  placeholder="Ej: AGOSTO-2025 o CNT-001"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--texto-secundario)' }}>
                  Usa un código descriptivo para identificar fácilmente el embarque
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Fecha Estimada de Salida
                </label>
                <input
                  type="date"
                  id="fecha-salida"
                  className="input-mare"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Órdenes de Compra a Incluir (Opcional)
                </label>
                {ordenes.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {ordenes.map(oc => (
                      <label key={oc.id} className="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          value={oc.id}
                          className="mr-3"
                          style={{ accentColor: 'var(--marron-oscuro)' }}
                        />
                        <div className="flex-1">
                          <span className="font-medium">{oc.numero}</span>
                          <span className="text-sm ml-2" style={{ color: 'var(--texto-secundario)' }}>
                            {oc.proveedor?.nombre}
                          </span>
                        </div>
                        <span className="font-bold" style={{ color: 'var(--marron-oscuro)' }}>
                          ${oc.total_fob?.toFixed(2)}
                        </span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      📦 Se creará un embarque vacío. Las OCs nuevas se asociarán automáticamente a este embarque.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowNewForm(false)}
                className="btn-mare-secondary"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  const codigo = document.getElementById('codigo-embarque')?.value;
                  const fecha = document.getElementById('fecha-salida')?.value;
                  const checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
                  const ordenesIds = Array.from(checkboxes).map(cb => cb.value);
                  
                  if (!codigo) {
                    alert('El código del embarque es obligatorio');
                    return;
                  }
                  
                  crearEmbarque({
                    codigo,
                    ordenes_ids: ordenesIds,
                    fecha_estimada_salida: fecha
                  });
                }}
                className="btn-mare"
              >
                <Ship size={20} />
                Crear Embarque
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar embarque */}
      {showForm && selectedEmbarque && (
        <EmbarqueForm
          embarque={selectedEmbarque}
          ordenes={ordenes}
          onClose={() => setShowForm(false)}
          onSave={(embarqueActualizado) => {
            setSelectedEmbarque(embarqueActualizado);
            setEmbarques(embarques.map(emb => 
              emb.id === embarqueActualizado.id ? embarqueActualizado : emb
            ));
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}