import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Calculator, Eye, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../services/supabase';

// Funciones de análisis Excel (copiadas del AnalizadorExcel)
const detectarInicioHeaders = (data) => {
  let filaHeaders = -1;
  let filaInicioDatos = -1;
  let tipoArchivo = 'desconocido';
  let estructuraDetectada = {};
  let filaTotales = -1;
  
  // DETECCIÓN ESPECÍFICA PARA INVOICE
  if (data.length > 14) {
    const fila14 = data[13] || [];
    const fila15 = data[14] || [];
    const fila16 = data[15] || [];
    
    // Detectar INVOICE por patrón de datos: códigos alfanuméricos + descripciones + números
    // Primero buscar la fila que realmente contiene datos (puede ser 13, 14, 15...)
    let filaConDatos = null;
    for (let i = 12; i < 16; i++) {
      if (data[i]) {
        const fila = data[i];
        const tieneCodigosProducto = fila[1] && fila[1].toString().match(/^[A-Z]{1,4}\d+/);
        const tieneDescripciones = fila[2] && typeof fila[2] === 'string' && fila[2].length > 5;
        const tieneCantidades = fila[3] && !isNaN(Number(fila[3])) && Number(fila[3]) > 0;
        const tienePrecios = fila[4] && !isNaN(Number(fila[4])) && Number(fila[4]) > 0;
        
        if (tieneCodigosProducto && tieneDescripciones && tieneCantidades && tienePrecios) {
          filaConDatos = i;
          break;
        }
      }
    }
    
    if (filaConDatos !== null) {
      filaHeaders = -1; // No hay headers reales
      tipoArchivo = 'invoice';
      filaInicioDatos = filaConDatos;
      
      // Buscar fila de totales (normalmente al final, contiene texto como "TOTAL" o "SAY")
      for (let i = data.length - 5; i < data.length; i++) {
        if (data[i] && data[i].some(cell => 
          cell && cell.toString().toLowerCase().includes('total') || 
          cell && cell.toString().toLowerCase().includes('say')
        )) {
          filaTotales = i;
          break;
        }
      }
      
      estructuraDetectada = {
        columnaA: { nombre: 'ITEM', indice: 0, descripcion: 'Columna vacía (metadata)' },
        columnaB: { nombre: 'ITEM NO', indice: 1, descripcion: 'Código del producto (LB010, MB001, etc.)' },
        columnaC: { nombre: 'DESCRIPTION OF GOODS', indice: 2, descripcion: 'Descripción del producto' },
        columnaD: { nombre: 'QTY', indice: 3, descripcion: 'Cantidad' },
        columnaE: { nombre: 'UNIT PRICE USD', indice: 4, descripcion: 'Precio unitario en USD' },
        columnaF: { nombre: 'AMOUNT USD', indice: 5, descripcion: 'Total calculado (QTY × UNIT PRICE)' }
      };
    }
  }
  
  // Extraer datos reales
  const ultimaFilaDatos = filaTotales > 0 ? filaTotales : data.length;
  const datosReales = data.slice(filaInicioDatos, ultimaFilaDatos);
  
  return {
    filaHeaders,
    filaInicioDatos,
    filaTotales,
    ultimaFilaDatos,
    tipoArchivo,
    estructuraDetectada,
    datosReales: datosReales.filter(fila => 
      fila.some(cell => cell !== undefined && cell !== null && cell !== '')
    ),
    totalFilasDatos: datosReales.filter(fila => 
      fila.some(cell => cell !== undefined && cell !== null && cell !== '')
    ).length
  };
};

const ControlInvoiceInteligente = ({ embarqueId, onClose }) => {
  console.log('🎯 ControlInvoiceInteligente renderizado - embarqueId:', embarqueId);
  const [step, setStep] = useState(1); // 1: Seleccionar OCs, 2: Subir archivos, 3: Análisis, 4: Confirmación
  const [ordenesCompra, setOrdenesCompra] = useState([]);
  const [ordenesSeleccionadas, setOrdenesSeleccionadas] = useState([]);
  const [archivos, setArchivos] = useState({
    invoice: null,
    packingList: null
  });
  const [analisisCompleto, setAnalisisCompleto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar órdenes de compra del embarque
  useEffect(() => {
    if (embarqueId) {
      console.log('🔄 Cargando órdenes de compra para embarque:', embarqueId);
      cargarOrdenesCompra();
    }
  }, [embarqueId]);

  const cargarOrdenesCompra = async () => {
    try {
      const { data, error } = await supabase
        .from('ordenes_compra')
        .select('*')
        .eq('embarque_id', embarqueId)
        .eq('estado', 'enviada') // Solo OCs enviadas
        .order('created_at', { ascending: true });

      if (error) throw error;
      console.log('📋 Órdenes de compra cargadas:', data?.length || 0);
      console.log('📋 Primera orden ejemplo:', data?.[0]);
      setOrdenesCompra(data || []);
    } catch (err) {
      console.error('Error al cargar órdenes de compra:', err);
      setError('Error al cargar las órdenes de compra');
    }
  };

  // Procesar archivo Excel usando lógica del analizador
  const procesarArchivoExcel = async (file, tipo) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Buscar la hoja principal
          const nombreHoja = tipo === 'invoice' ? 'Invoice' : 'Sheet1';
          const hoja = workbook.Sheets[nombreHoja] || workbook.Sheets[workbook.SheetNames[0]];
          
          if (!hoja) {
            reject(new Error(`No se encontró la hoja ${nombreHoja}`));
            return;
          }

          const jsonData = XLSX.utils.sheet_to_json(hoja, { header: 1 });
          const dataLimpia = jsonData.filter(row => 
            row.some(cell => cell !== undefined && cell !== null && cell !== '')
          );

          // Usar la lógica del analizador para detectar estructura
          const deteccion = detectarInicioHeaders(dataLimpia);
          
          resolve({
            nombreArchivo: file.name,
            tipoArchivo: deteccion.tipoArchivo,
            datosReales: deteccion.datosReales,
            estructuraDetectada: deteccion.estructuraDetectada,
            totalProductos: deteccion.totalFilasDatos,
            analisisCompleto: deteccion
          });
          
        } catch (error) {
          reject(new Error(`Error al procesar ${file.name}: ${error.message}`));
        }
      };

      reader.onerror = () => reject(new Error(`Error al leer ${file.name}`));
      reader.readAsArrayBuffer(file);
    });
  };

  // Manejar subida de archivos
  const handleFileUpload = async (e, tipo) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const datosArchivo = await procesarArchivoExcel(file, tipo);
      
      setArchivos(prev => ({
        ...prev,
        [tipo]: datosArchivo
      }));

      console.log(`${tipo.toUpperCase()} procesado:`, datosArchivo);
      
    } catch (err) {
      console.error(`Error al procesar ${tipo}:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Extraer productos de las OCs seleccionadas
  const extraerProductosOCs = () => {
    let productosOC = [];
    
    ordenesSeleccionadas.forEach(ordenId => {
      const orden = ordenesCompra.find(oc => oc.id === ordenId);
      if (orden && orden.productos) {
        let productos;
        try {
          productos = typeof orden.productos === 'string' 
            ? JSON.parse(orden.productos) 
            : orden.productos;
        } catch (e) {
          console.error('Error parsing productos JSON:', e, orden.productos);
          productos = [];
        }
        
        productos.forEach(producto => {
          productosOC.push({
            numeroOC: orden.numero,
            codigoInterno: producto.codigo_producto,
            codigoProveedor: producto.codigo_proveedor,
            nombre: producto.nombre,
            cantidadOC: producto.cantidad,
            precioFOB: producto.precio_fob,
            totalFOB: producto.total_fob,
            categoria: producto.categoria,
            tiempoProduccion: producto.tiempo_produccion
          });
        });
      }
    });

    return productosOC;
  };

  // Realizar análisis completo
  const realizarAnalisis = () => {
    if (!archivos.invoice) {
      setError('Se requiere al menos el archivo INVOICE para realizar el análisis');
      return;
    }

    setLoading(true);
    
    try {
      const productosOC = extraerProductosOCs();
      
      // CORRECCIÓN CRÍTICA: Columna A vacía, datos correctos en B-F
      // Extraer productos del INVOICE con estructura correcta
      console.log('🔍 DEBUGGING INVOICE - Datos reales:', archivos.invoice.datosReales);
      console.log('🔍 DEBUGGING INVOICE - Estructura detectada:', archivos.invoice.estructuraDetectada);
      
      const productosInvoice = archivos.invoice.datosReales?.map((fila, index) => {
        const producto = {
          codigo: fila[1], // Columna B = ITEM NO (LB010, LB011...)
          descripcion: fila[2], // Columna C = DESCRIPTION (CINTO DE DAMA...)
          cantidadInvoice: Number(fila[3]) || 0, // Columna D = QTY (119, 120...)
          precioUnitario: Number(fila[4]) || 0, // Columna E = UNIT PRICE (0.898, 1.11...)
          totalFOB: Number(fila[5]) || 0 // Columna F = AMOUNT (106.862, 133.2...)
        };
        
        // Log de los primeros 3 productos para verificar
        if (index < 3) {
          console.log(`🔍 PRODUCTO ${index + 1}:`, {
            filaCompleta: fila,
            productoExtractado: producto
          });
        }
        
        return producto;
      }).filter(p => p.codigo) || [];
      
      console.log('🔍 RESUMEN FINAL:', {
        totalFilasReales: archivos.invoice.datosReales?.length,
        productosExtractados: productosInvoice.length,
        primeros3Productos: productosInvoice.slice(0, 3)
      });

      console.log('📊 COMPARACIÓN - Productos OC:', productosOC.map(p => ({
        numeroOC: p.numeroOC,
        codigoInterno: p.codigoInterno,
        codigoProveedor: p.codigoProveedor,
        nombre: p.nombre
      })));

      console.log('📊 COMPARACIÓN - Productos Invoice:', productosInvoice.slice(0, 5).map(p => ({
        codigo: p.codigo,
        descripcion: p.descripcion,
        cantidad: p.cantidadInvoice,
        precio: p.precioUnitario
      })));

      // Extraer productos del PACKING LIST (si existe)
      let productosPacking = [];
      if (archivos.packingList) {
        productosPacking = archivos.packingList.datosReales?.map(fila => ({
          codigo: fila[1], // Columna B
          descripcion: fila[2], // Columna C
          cantidadPacking: Number(fila[6]) || 0, // Columna G - QUANTITY
          pesoUnitario: Number(fila[7]) || 0, // Columna H
          pesoTotal: Number(fila[8]) || 0, // Columna I
          cbm: Number(fila[9]) || 0, // Columna J
          totalCajas: Number(fila[5]) || 0 // Columna F
        })).filter(p => p.codigo) || [];
      }

      // Realizar comparación OC vs INVOICE vs PACKING
      const comparacion = compararOCvsProveedorArchivos(productosOC, productosInvoice, productosPacking);
      
      setAnalisisCompleto({
        productosOC,
        productosInvoice,
        productosPacking,
        comparacion,
        resumen: {
          totalOC: productosOC.length,
          totalInvoice: productosInvoice.length,
          totalPacking: productosPacking.length,
          coincidencias: comparacion.coincidencias.length,
          diferencias: comparacion.diferencias.length,
          soloEnOC: comparacion.soloEnOC.length,
          soloEnInvoice: comparacion.soloEnInvoice.length,
          nuevosProductos: comparacion.nuevosProductos.length
        }
      });

      setStep(3); // Ir a paso de análisis
      
    } catch (err) {
      console.error('Error en análisis:', err);
      setError('Error al realizar el análisis: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Función de comparación OC vs archivos del proveedor
  const compararOCvsProveedorArchivos = (productosOC, productosInvoice, productosPacking) => {
    console.log('🔄 INICIANDO COMPARACIÓN');
    console.log('📋 Total productos OC:', productosOC.length);
    console.log('📄 Total productos Invoice:', productosInvoice.length);
    
    const comparacion = {
      coincidencias: [],
      diferencias: [],
      soloEnOC: [],
      soloEnInvoice: [],
      nuevosProductos: [],
      productosCompletos: []
    };

    // Comparar productos por código del proveedor
    productosOC.forEach((prodOC, index) => {
      const codigoBusqueda = prodOC.codigoProveedor || prodOC.codigoInterno;
      console.log(`🔍 BUSCANDO PRODUCTO OC ${index + 1}:`, {
        numeroOC: prodOC.numeroOC,
        codigoInterno: prodOC.codigoInterno,
        codigoProveedor: prodOC.codigoProveedor,
        codigoBusqueda: codigoBusqueda,
        nombre: prodOC.nombre
      });
      
      const prodInvoice = productosInvoice.find(p => p.codigo === codigoBusqueda);
      const prodPacking = productosPacking.find(p => p.codigo === codigoBusqueda);
      
      console.log(`${prodInvoice ? '✅ ENCONTRADO' : '❌ NO ENCONTRADO'} en Invoice:`, 
        prodInvoice ? { codigo: prodInvoice.codigo, descripcion: prodInvoice.descripcion } : 'null');
      
      if (prodInvoice) {
        const diferenciaCantidad = Math.abs(prodOC.cantidadOC - prodInvoice.cantidadInvoice);
        const diferenciaPrecio = Math.abs(prodOC.precioFOB - prodInvoice.precioUnitario);
        
        const productoCompleto = {
          ...prodOC,
          // Datos del invoice
          cantidadInvoice: prodInvoice.cantidadInvoice,
          precioInvoice: prodInvoice.precioUnitario,
          totalInvoice: prodInvoice.totalFOB,
          descripcionInvoice: prodInvoice.descripcion,
          // Datos del packing (si existe)
          ...(prodPacking ? {
            cantidadPacking: prodPacking.cantidadPacking,
            pesoUnitario: prodPacking.pesoUnitario,
            pesoTotal: prodPacking.pesoTotal,
            cbm: prodPacking.cbm,
            totalCajas: prodPacking.totalCajas,
            // Cálculos derivados
            costoPorGramo: prodInvoice.precioUnitario / (prodPacking.pesoUnitario || 1),
            costoPorCBM: prodInvoice.totalFOB / (prodPacking.cbm || 1),
            densidad: prodPacking.pesoUnitario / (prodPacking.cbm || 1)
          } : {}),
          // Análisis de diferencias
          diferenciaCantidad,
          diferenciaPrecio,
          coincideCantidad: diferenciaCantidad === 0,
          coincidePrecio: diferenciaPrecio < 0.01, // Tolerancia de 1 centavo
          estado: diferenciaCantidad === 0 && diferenciaPrecio < 0.01 ? 'coincide' : 'diferencia'
        };

        comparacion.productosCompletos.push(productoCompleto);
        
        if (productoCompleto.estado === 'coincide') {
          comparacion.coincidencias.push(productoCompleto);
        } else {
          comparacion.diferencias.push(productoCompleto);
        }
        
      } else {
        // Producto en OC pero no en INVOICE
        comparacion.soloEnOC.push(prodOC);
      }
    });

    // Productos solo en INVOICE (no solicitados en OC)
    productosInvoice.forEach(prodInvoice => {
      const existeEnOC = productosOC.some(oc => 
        oc.codigoProveedor === prodInvoice.codigo || oc.codigoInterno === prodInvoice.codigo
      );
      
      if (!existeEnOC) {
        comparacion.soloEnInvoice.push(prodInvoice);
      }
    });

    console.log('🎯 RESULTADO COMPARACIÓN:', {
      coincidencias: comparacion.coincidencias.length,
      diferencias: comparacion.diferencias.length,
      soloEnOC: comparacion.soloEnOC.length,
      soloEnInvoice: comparacion.soloEnInvoice.length,
      productosCompletos: comparacion.productosCompletos.length
    });
    
    console.log('📊 PRODUCTOS SOLO EN OC (no encontrados en Invoice):', 
      comparacion.soloEnOC.map(p => ({ codigo: p.codigoProveedor || p.codigoInterno, nombre: p.nombre })));
    
    console.log('📊 PRODUCTOS SOLO EN INVOICE (no solicitados en OC):', 
      comparacion.soloEnInvoice.slice(0, 5).map(p => ({ codigo: p.codigo, descripcion: p.descripcion })));

    return comparacion;
  };

  // Confirmar y guardar análisis
  const confirmarAnalisis = async () => {
    setLoading(true);
    
    try {
      // Aquí guardarías el análisis en la base de datos
      // y actualizarías el estado de las OCs
      
      // Por ahora, solo simular éxito
      console.log('Análisis confirmado:', analisisCompleto);
      
      // Cerrar el modal
      onClose();
      
    } catch (err) {
      console.error('Error al confirmar análisis:', err);
      setError('Error al guardar el análisis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center" 
      style={{ 
        zIndex: 99999, 
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(2px)'
      }}
      onClick={(e) => {
        // Solo cerrar si se hace clic en el fondo, no en el contenido del modal
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '2px solid #3b82f6',
          zIndex: 100000,
          position: 'relative'
        }}
        onClick={(e) => {
          // Prevenir que se cierre al hacer clic dentro del modal
          e.stopPropagation();
        }}
      >
        <div className="flex justify-between items-center mb-6" style={{ backgroundColor: '#f0f9ff', padding: '10px', borderRadius: '5px' }}>
          <h2 className="text-2xl font-bold" style={{ color: '#1e40af' }}>🔍 Control Invoice Inteligente</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Indicador de pasos */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map(num => (
              <div key={num} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= num ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {num}
                </div>
                {num < 4 && <div className={`w-8 h-1 ${step > num ? 'bg-blue-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
        </div>

        {/* Contenido según paso */}
        {step === 1 && (
          <div>
            <h3 className="text-xl font-bold mb-4">📋 Paso 1: Seleccionar Órdenes de Compra</h3>
            <p className="text-gray-600 mb-4">
              Selecciona las órdenes de compra que quieres comparar con los archivos del proveedor:
            </p>
            
            {ordenesCompra.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle size={48} className="mx-auto mb-4 text-orange-500" />
                <p className="text-gray-500">No hay órdenes de compra enviadas en este embarque</p>
              </div>
            ) : (
              <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                {ordenesCompra.map(orden => (
                  <div key={orden.id} className="flex items-center p-3 border rounded-lg">
                    <input
                      type="checkbox"
                      id={`oc-${orden.id}`}
                      checked={ordenesSeleccionadas.includes(orden.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setOrdenesSeleccionadas([...ordenesSeleccionadas, orden.id]);
                        } else {
                          setOrdenesSeleccionadas(ordenesSeleccionadas.filter(id => id !== orden.id));
                        }
                      }}
                      className="mr-3"
                    />
                    <label htmlFor={`oc-${orden.id}`} className="flex-1 cursor-pointer">
                      <div className="font-bold">{orden.numero}</div>
                      <div className="text-sm text-gray-500">
                        {(() => {
                          try {
                            const productos = typeof orden.productos === 'string' 
                              ? JSON.parse(orden.productos) 
                              : orden.productos || [];
                            return productos.length;
                          } catch (e) {
                            return 0;
                          }
                        })()} productos - 
                        Total FOB: ${orden.total_fob}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={onClose} className="btn-mare-secondary">
                Cancelar
              </button>
              <button 
                onClick={() => setStep(2)}
                disabled={ordenesSeleccionadas.length === 0}
                className="btn-mare"
              >
                Continuar ({ordenesSeleccionadas.length} OCs seleccionadas)
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="text-xl font-bold mb-4">📤 Paso 2: Subir Archivos del Proveedor</h3>
            
            {/* Upload INVOICE */}
            <div className="mb-6 p-4 border rounded-lg">
              <h4 className="font-bold mb-2">📄 INVOICE (Obligatorio)</h4>
              <p className="text-sm text-gray-600 mb-3">
                Archivo Excel con los productos facturados por el proveedor
              </p>
              
              {!archivos.invoice ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, 'invoice')}
                    className="hidden"
                    id="invoice-upload"
                  />
                  <label htmlFor="invoice-upload" className="btn-mare cursor-pointer">
                    Seleccionar archivo INVOICE
                  </label>
                </div>
              ) : (
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <div className="flex items-center">
                    <CheckCircle size={20} className="text-green-600 mr-2" />
                    <div>
                      <div className="font-bold">{archivos.invoice.nombreArchivo}</div>
                      <div className="text-sm text-gray-600">
                        ✅ {archivos.invoice.totalProductos} productos detectados
                      </div>
                      <div className="text-xs text-blue-600">
                        Estructura: ITEM NO | DESCRIPTION | QTY | UNIT PRICE | AMOUNT
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Upload PACKING LIST */}
            <div className="mb-6 p-4 border rounded-lg">
              <h4 className="font-bold mb-2">📦 PACKING LIST (Opcional)</h4>
              <p className="text-sm text-gray-600 mb-3">
                Archivo Excel con información de peso, CBM y embalaje
              </p>
              
              {!archivos.packingList ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, 'packingList')}
                    className="hidden"
                    id="packing-upload"
                  />
                  <label htmlFor="packing-upload" className="btn-mare-secondary cursor-pointer">
                    Seleccionar archivo PACKING LIST
                  </label>
                </div>
              ) : (
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <div className="flex items-center">
                    <CheckCircle size={20} className="text-green-600 mr-2" />
                    <div>
                      <div className="font-bold">{archivos.packingList.nombreArchivo}</div>
                      <div className="text-sm text-gray-600">
                        {archivos.packingList.totalProductos} productos con datos logísticos
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 p-3 rounded mb-4">
                <div className="flex items-center">
                  <AlertCircle size={20} className="text-red-600 mr-2" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="btn-mare-secondary">
                Volver
              </button>
              <button 
                onClick={realizarAnalisis}
                disabled={!archivos.invoice || loading}
                className="btn-mare"
              >
                {loading ? 'Analizando...' : 'Realizar Análisis'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && analisisCompleto && (
          <div>
            <h3 className="text-xl font-bold mb-4">📊 Paso 3: Resultados del Análisis</h3>
            
            {/* Resumen */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{analisisCompleto.resumen.totalOC}</div>
                <div className="text-sm text-gray-600">Productos en OC</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{analisisCompleto.resumen.totalInvoice}</div>
                <div className="text-sm text-gray-600">En Invoice</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{analisisCompleto.resumen.coincidencias}</div>
                <div className="text-sm text-gray-600">✅ Coinciden</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{analisisCompleto.resumen.diferencias}</div>
                <div className="text-sm text-gray-600">⚠️ Diferencias</div>
              </div>
            </div>

            {/* Tabla de productos */}
            <div className="mb-6">
              <h4 className="font-bold mb-3">🔄 Comparación Detallada</h4>
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full border-collapse border border-gray-300 text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="border border-gray-300 px-2 py-1">Estado</th>
                      <th className="border border-gray-300 px-2 py-1">Código</th>
                      <th className="border border-gray-300 px-2 py-1">Descripción</th>
                      <th className="border border-gray-300 px-2 py-1">Cant. OC</th>
                      <th className="border border-gray-300 px-2 py-1">Cant. Invoice</th>
                      <th className="border border-gray-300 px-2 py-1">Precio OC</th>
                      <th className="border border-gray-300 px-2 py-1">Precio Invoice</th>
                      <th className="border border-gray-300 px-2 py-1">Diferencias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analisisCompleto.comparacion.productosCompletos.map((prod, i) => (
                      <tr key={i} className={`
                        ${prod.estado === 'coincide' ? 'bg-green-50' : 'bg-red-50'}
                      `}>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                          {prod.estado === 'coincide' ? '✅' : '⚠️'}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 font-bold">
                          {prod.codigoProveedor || prod.codigoInterno}
                        </td>
                        <td className="border border-gray-300 px-2 py-1">{prod.nombre}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{prod.cantidadOC}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{prod.cantidadInvoice}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right">${prod.precioFOB}</td>
                        <td className="border border-gray-300 px-2 py-1 text-right">${prod.precioInvoice}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">
                          {prod.diferenciaCantidad > 0 && (
                            <span className="text-red-600">Cant: ±{prod.diferenciaCantidad}</span>
                          )}
                          {prod.diferenciaPrecio > 0.01 && (
                            <span className="text-orange-600 ml-1">Precio: ±${prod.diferenciaPrecio.toFixed(2)}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="btn-mare-secondary">
                Volver
              </button>
              <button 
                onClick={() => setStep(4)}
                className="btn-mare"
              >
                Confirmar Análisis
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h3 className="text-xl font-bold mb-4">✅ Paso 4: Confirmación Final</h3>
            <p className="text-gray-600 mb-6">
              El análisis se ha completado correctamente. ¿Confirmas que deseas aplicar estos resultados?
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
              <div className="flex items-center">
                <AlertCircle size={20} className="text-yellow-600 mr-2" />
                <div>
                  <div className="font-bold">Acciones que se realizarán:</div>
                  <ul className="text-sm mt-2 space-y-1">
                    <li>• Se guardarán los resultados del análisis en la base de datos</li>
                    <li>• Se actualizará el estado de las órdenes de compra</li>
                    <li>• Se generará un reporte detallado para revisión</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="btn-mare-secondary">
                Volver al Análisis
              </button>
              <button 
                onClick={confirmarAnalisis}
                disabled={loading}
                className="btn-mare"
              >
                {loading ? 'Guardando...' : 'Confirmar y Guardar'}
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2">Procesando...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlInvoiceInteligente;