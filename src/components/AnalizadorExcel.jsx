// Componente temporal para analizar estructura de Excel
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileText, Eye, AlertCircle, CheckCircle, DollarSign, Calculator } from 'lucide-react';
import { supabase } from '../services/supabase';

// FUNCIÓN DE DETECCIÓN ESPECÍFICA PARA ESTRUCTURA REAL
const detectarInicioHeaders = (data) => {
  let filaHeaders = -1;
  let filaInicioDatos = -1;
  let tipoArchivo = 'desconocido';
  let estructuraDetectada = {};
  let filaTotales = -1;
  
  // DETECCIÓN ESPECÍFICA PARA INVOICE
  // Headers en filas 14 y 15 (índices 13 y 14)
  if (data.length > 14) {
    const fila14 = data[13] || []; // Primera línea de headers
    const fila15 = data[14] || []; // Segunda línea de headers (complementaria)
    const fila16 = data[15] || []; // Primera fila de datos
    
    // Combinar texto de ambas filas de headers
    const textoHeaders = fila14.concat(fila15).map(cell => (cell || '').toString().toLowerCase()).join('|');
    
    // CORRECCIÓN CRÍTICA: Columna A vacía desplaza todo
    // ESTRUCTURA REAL: A=vacía, B=código, C=descripción, D=cantidad, E=precio, F=total
    const columnaA_vacia = !fila14[0] || fila14[0] === '' || fila14[0] === null || fila14[0] === undefined;
    const tieneCodigosProducto = fila14[1] && fila14[1].toString().match(/^[A-Z]{2}\d+/); // Columna B = ITEM NO
    const tieneDescripciones = fila14[2] && typeof fila14[2] === 'string' && fila14[2].length > 5; // Columna C = DESCRIPTION  
    const tieneCantidades = fila14[3] && !isNaN(Number(fila14[3])) && Number(fila14[3]) > 0; // Columna D = QTY
    const tienePrecios = fila14[4] && !isNaN(Number(fila14[4])) && Number(fila14[4]) > 0; // Columna E = UNIT PRICE
    
    const esInvoice = tieneCodigosProducto && tieneDescripciones && tieneCantidades && tienePrecios;
    
    console.log('🔍 DETECCIÓN INVOICE - Fila 14:', fila14);
    console.log('📋 Columna A vacía:', columnaA_vacia, 'Valor:', fila14[0]);
    console.log('🏷️ Columna B (ITEM NO):', fila14[1], '¿Es código?', tieneCodigosProducto);
    console.log('📝 Columna C (DESCRIPTION):', fila14[2], '¿Es descripción?', tieneDescripciones);
    console.log('🔢 Columna D (QTY):', fila14[3], '¿Es cantidad?', tieneCantidades);
    console.log('💰 Columna E (UNIT PRICE):', fila14[4], '¿Es precio?', tienePrecios);
    console.log('✅ Es Invoice:', esInvoice);
    
    if (esInvoice) {
      // CORRECCIÓN: NO hay headers, datos empiezan directamente
      filaHeaders = -1; // No hay headers reales
      tipoArchivo = 'invoice';
      
      // BUSCAR PRIMERA FILA CON DATOS VÁLIDOS (LB010)
      // Según logs: índice 13 tiene LB010 (primera fila real)
      for (let i = 12; i < Math.min(data.length, 20); i++) {
        const filaTest = data[i] || [];
        const tieneCodigoProducto = filaTest[1] && filaTest[1].toString().match(/^[A-Z]{2}\d+/);
        const tieneCantidad = filaTest[3] && !isNaN(Number(filaTest[3])) && Number(filaTest[3]) > 0;
        const tienePrecio = filaTest[4] && !isNaN(Number(filaTest[4])) && Number(filaTest[4]) > 0;
        
        if (tieneCodigoProducto && tieneCantidad && tienePrecio) {
          filaInicioDatos = i;
          console.log(`✅ Primera fila de datos reales encontrada en: ${i + 1} (Excel) - Código: ${filaTest[1]}`);
          break;
        }
      }
      
      // ESTRUCTURA REAL CORREGIDA: A existe pero vacía en filas productos
      estructuraDetectada = {
        columnaA: { 
          nombre: 'ITEM', 
          indice: 0, 
          descripcion: '📄 Columna existe, vacía en productos (tiene datos en encabezado)',
          header14: '(vacía en productos)',
          header15: '(vacía en productos)'
        },
        columnaB: { 
          nombre: 'ITEM NO', 
          indice: 1, 
          descripcion: '🏷️ Código del producto (LB010, LB011, etc.)',
          header14: '(sin header)',
          header15: '(sin header)'
        },
        columnaC: { 
          nombre: 'DESCRIPTION OF GOODS', 
          indice: 2, 
          descripcion: '📝 Descripción del producto (CINTO DE DAMA, etc.)',
          header14: '(sin header)',
          header15: '(sin header)'
        },
        columnaD: { 
          nombre: 'QTY', 
          indice: 3, 
          descripcion: '🔢 Cantidad (119, 120, etc.)',
          header14: '(sin header)',
          header15: '(sin header)'
        },
        columnaE: { 
          nombre: 'UNIT PRICE USD', 
          indice: 4, 
          descripcion: '💰 Precio unitario USD (0.898, 1.11, etc.)',
          header14: '(sin header)',
          header15: '(sin header)'
        },
        columnaF: { 
          nombre: 'AMOUNT USD', 
          indice: 5, 
          descripcion: '💵 Total calculado USD (106.862, 133.2, etc.)',
          header14: '(sin header)',
          header15: '(sin header)'
        }
      };
      
      // CORRECCIÓN: Detectar fila de totales específicamente para INVOICE
      // Según Sonnet 4: Fila 358 = TOTAL, Fila 359 = "SAY TOTAL US DOLLAR..."
      // Buscar desde después de productos (fila 357 sería la última) 
      for (let i = filaInicioDatos + 10; i < data.length; i++) {
        const fila = data[i] || [];
        const textoFila = fila.join(' ').toLowerCase();
        
        if (textoFila.includes('total') || textoFila.includes('say total') || textoFila.includes('dollar')) {
          filaTotales = i;
          console.log(`Fila totales detectada en: ${i + 1} (Excel) - Contenido: ${textoFila}`);
          break;
        }
      }
    }
  }
  
  // DETECCIÓN ESPECÍFICA PARA PACKING LIST (según análisis Sonnet 4)
  if (tipoArchivo === 'desconocido' && data.length > 15) {
    // PACKING LIST: Datos empiezan en fila 16, headers en 14-15
    const fila14 = data[13] || []; // Headers principales
    const fila15 = data[14] || []; // Subtítulos
    const fila16 = data[15] || []; // Primera fila de datos
    
    console.log('PACKING - Fila 14 (headers):', fila14);
    console.log('PACKING - Fila 15 (subtítulos):', fila15);
    console.log('PACKING - Fila 16 (datos):', fila16);
    
    // Detectar PACKING por patrón de datos específicos según Sonnet 4
    const tieneNumeroCajas = fila16[0] && !isNaN(Number(fila16[0])) && Number(fila16[0]) > 0; // CTN: 1,2,3...
    const tieneCodigosItem = fila16[1] && fila16[1].toString().match(/^[A-Z]{2}\d+/); // ITEM NO: LB010, LB011
    const tieneDescripcion = fila16[2] && typeof fila16[2] === 'string' && fila16[2].length > 5; // DESCRIPTION
    const tieneCantidadPorCaja = fila16[3] && !isNaN(Number(fila16[3])) && Number(fila16[3]) > 0; // Q'TY/CTN
    const tieneCBM = fila16[9] && !isNaN(Number(fila16[9])) && Number(fila16[9]) > 0; // CBM en columna J
    
    const esPacking = tieneNumeroCajas && tieneCodigosItem && tieneDescripcion && tieneCantidadPorCaja && tieneCBM;
    
    console.log('PACKING - ¿Num cajas?', tieneNumeroCajas, '¿Códigos?', tieneCodigosItem);
    console.log('PACKING - ¿Descripción?', tieneDescripcion, '¿Cant/caja?', tieneCantidadPorCaja);
    console.log('PACKING - ¿CBM?', tieneCBM, 'Es Packing:', esPacking);
    
    if (esPacking) {
      // PACKING LIST: Headers reales en filas 14-15, datos desde 16
      filaHeaders = 13; // Headers en fila 14 (índice 13)
      tipoArchivo = 'packing';
      
      // BUSCAR PRIMERA FILA CON DATOS VÁLIDOS (similar a INVOICE)
      for (let i = 14; i < Math.min(data.length, 20); i++) {
        const filaTest = data[i] || [];
        const tieneNumCaja = filaTest[0] && !isNaN(Number(filaTest[0])) && Number(filaTest[0]) > 0;
        const tieneCodigoItem = filaTest[1] && filaTest[1].toString().match(/^[A-Z]{2}\d+/);
        const tieneCBM = filaTest[9] && !isNaN(Number(filaTest[9])) && Number(filaTest[9]) > 0;
        
        if (tieneNumCaja && tieneCodigoItem && tieneCBM) {
          filaInicioDatos = i;
          console.log(`✅ PACKING - Primera fila de datos encontrada en: ${i + 1} (Excel) - Caja: ${filaTest[0]}, Código: ${filaTest[1]}`);
          break;
        }
      }
      
      // ESTRUCTURA EXACTA PACKING LIST según análisis Sonnet 4
      // PACKING LIST 250610.xlsx - Hoja Sheet1 - Rango A14:J399
      estructuraDetectada = {
        columnaA: { 
          nombre: 'CTN', 
          indice: 0, 
          descripcion: 'Número de caja/cartón (1, 2, 3...)',
          header14: fila14[0] || 'CTN',
          header15: fila15[0] || ''
        },
        columnaB: { 
          nombre: 'ITEM NO.', 
          indice: 1, 
          descripcion: 'Código del producto (LB010, LB011, etc.)',
          header14: fila14[1] || 'ITEM NO.',
          header15: fila15[1] || ''
        },
        columnaC: { 
          nombre: 'DESCRIPTION', 
          indice: 2, 
          descripcion: 'Descripción del producto (CINTO DE DAMA, etc.)',
          header14: fila14[2] || 'DESCRIPTION',
          header15: fila15[2] || ''
        },
        columnaD: { 
          nombre: 'Q\'TY/CTN', 
          indice: 3, 
          descripcion: 'Cantidad por caja PCS (119, 120, 117, etc.)',
          header14: fila14[3] || 'Q\'TY/CTN',
          header15: fila15[3] || ''
        },
        columnaE: { 
          nombre: 'UNIDAD', 
          indice: 4, 
          descripcion: 'Unidad de medida (PCS)',
          header14: fila14[4] || '[Unidad]',
          header15: fila15[4] || ''
        },
        columnaF: { 
          nombre: 'TOTAL CTN.', 
          indice: 5, 
          descripcion: 'Total de cajas (1, 2, 3, etc.)',
          header14: fila14[5] || 'TOTAL CTN.',
          header15: fila15[5] || ''
        },
        columnaG: { 
          nombre: 'QUANTITY', 
          indice: 6, 
          descripcion: 'Cantidad total PCS (119, 120, 117, etc.)',
          header14: fila14[6] || 'QUANTITY',
          header15: fila15[6] || ''
        },
        columnaH: { 
          nombre: 'PESO UNITARIO', 
          indice: 7, 
          descripcion: 'Peso por unidad (9, 10.6, 8.2, etc.)',
          header14: fila14[7] || '[Peso unitario]',
          header15: fila15[7] || ''
        },
        columnaI: { 
          nombre: 'TOTAL G.W', 
          indice: 8, 
          descripcion: 'Peso bruto total (9, 10.6, 8.2, etc.)',
          header14: fila14[8] || 'TOTAL G.W',
          header15: fila15[8] || ''
        },
        columnaJ: { 
          nombre: 'CBM', 
          indice: 9, 
          descripcion: 'Metros cúbicos (0.036, 0.037, 0.03, etc.)',
          header14: fila14[9] || 'CBM',
          header15: fila15[9] || ''
        }
      };
      
      // Detectar fila de totales (buscar "TOTAL" y "SAY TOTAL")
      for (let i = filaInicioDatos + 5; i < data.length; i++) {
        const fila = data[i] || [];
        const textoFila = fila.join('').toLowerCase();
        
        if (textoFila.includes('total') && (textoFila.includes('cartons') || textoFila.includes('say'))) {
          filaTotales = i;
          break;
        }
      }
    }
  }
  
  // Si no detecta nada, valores por defecto
  if (tipoArchivo === 'desconocido') {
    filaHeaders = 13;
    filaInicioDatos = 14;
    tipoArchivo = 'invoice'; // Asumir invoice por defecto
    
    estructuraDetectada = {
      columnaB: { nombre: 'COLUMNA B', indice: 1, descripcion: 'Desconocida' },
      columnaC: { nombre: 'COLUMNA C', indice: 2, descripcion: 'Desconocida' },
      columnaD: { nombre: 'COLUMNA D', indice: 3, descripcion: 'Desconocida' },
      columnaE: { nombre: 'COLUMNA E', indice: 4, descripcion: 'Desconocida' },
      columnaF: { nombre: 'COLUMNA F', indice: 5, descripcion: 'Desconocida' }
    };
  }
  
  // Extraer datos reales (excluyendo totales)
  const ultimaFilaDatos = filaTotales > 0 ? filaTotales : data.length;
  const datosReales = data.slice(filaInicioDatos, ultimaFilaDatos);
  
  const primeraFilaDatos = datosReales[0] || [];
  const segundaFilaDatos = datosReales[1] || [];
  const terceraFilaDatos = datosReales[2] || [];
  
  // DEBUGGING: Mostrar las primeras filas detectadas CON ESTRUCTURA
  console.log(`📊 Datos extraídos desde fila ${filaInicioDatos + 1} (Excel):`);
  console.log('🔍 Primera fila análisis detallado:');
  if (primeraFilaDatos && primeraFilaDatos.length > 0) {
    console.log('  A (ITEM - vacía):', primeraFilaDatos[0]);
    console.log('  B (ITEM NO - código):', primeraFilaDatos[1]);
    console.log('  C (DESCRIPTION):', primeraFilaDatos[2]);
    console.log('  D (QTY):', primeraFilaDatos[3]);
    console.log('  E (UNIT PRICE USD):', primeraFilaDatos[4]);
    console.log('  F (AMOUNT USD):', primeraFilaDatos[5]);
  }
  console.log('Segunda fila datos:', segundaFilaDatos); 
  console.log('Tercera fila datos:', terceraFilaDatos);
  console.log(`Total filas de datos: ${datosReales.length}`);
  
  // Headers reales según el tipo
  const headersReales = Object.values(estructuraDetectada).map(col => col.nombre);
  
  return {
    filaHeaders,
    filaInicioDatos,
    filaTotales,
    ultimaFilaDatos,
    tipoArchivo,
    estructuraDetectada,
    headersReales,
    primeraFilaDatos,
    segundaFilaDatos, 
    terceraFilaDatos,
    totalFilasDatos: datosReales.filter(fila => 
      fila.some(cell => cell !== undefined && cell !== null && cell !== '')
    ).length,
    confianza: tipoArchivo !== 'desconocido' ? 'alta' : 'baja',
    datosReales
  };
};

// FUNCIÓN DE ANÁLISIS CRUZADO INVOICE vs PACKING LIST
const analizarCruzado = (invoiceData, packingData) => {
  if (!invoiceData || !packingData) return null;
  
  const analisisCruzado = {
    coincidencias: [],
    diferencias: [],
    soloEnInvoice: [],
    soloEnPacking: [],
    resumen: {
      totalInvoice: 0,
      totalPacking: 0,
      coincidencias: 0,
      diferencias: 0
    }
  };
  
  // Extraer productos de INVOICE - ESTRUCTURA CORRECTA:
  // A=vacía, B=código(LB010), C=descripción, D=cantidad, E=precio, F=total
  const productosInvoice = invoiceData.datosReales?.map(fila => ({
    codigo: fila[1],        // Columna B = ITEM NO (LB010, LB011...)
    descripcion: fila[2],   // Columna C = DESCRIPTION OF GOODS (CINTO DE DAMA...)  
    cantidadInvoice: Number(fila[3]) || 0,  // Columna D = QTY (119, 120...)
    precioUnitario: Number(fila[4]) || 0,   // Columna E = UNIT PRICE USD (0.898, 1.11...)
    totalFOB: Number(fila[5]) || 0          // Columna F = AMOUNT USD (106.862, 133.2...)
  })).filter(p => p.codigo) || [];
  
  // Extraer productos de PACKING (columna B = código, G = cantidad total, I = peso, J = CBM)
  const productosPacking = packingData.datosReales?.map(fila => ({
    codigo: fila[1],
    descripcion: fila[2],
    cantidadPacking: Number(fila[6]) || 0, // Columna G = QUANTITY
    cantidadPorCaja: Number(fila[3]) || 0, // Columna D = Q'TY/CTN
    totalCajas: Number(fila[5]) || 0, // Columna F = TOTAL CTN
    pesoUnitario: Number(fila[7]) || 0, // Columna H = peso unitario
    pesoTotal: Number(fila[8]) || 0, // Columna I = TOTAL G.W
    cbm: Number(fila[9]) || 0 // Columna J = CBM
  })).filter(p => p.codigo) || [];
  
  analisisCruzado.resumen.totalInvoice = productosInvoice.length;
  analisisCruzado.resumen.totalPacking = productosPacking.length;
  
  // Comparar productos por código
  productosInvoice.forEach(prodInvoice => {
    const prodPacking = productosPacking.find(p => p.codigo === prodInvoice.codigo);
    
    if (prodPacking) {
      // Producto existe en ambos archivos
      const diferenciaCantidad = Math.abs(prodInvoice.cantidadInvoice - prodPacking.cantidadPacking);
      const coincide = diferenciaCantidad === 0;
      
      const comparacion = {
        codigo: prodInvoice.codigo,
        descripcion: prodInvoice.descripcion,
        cantidadInvoice: prodInvoice.cantidadInvoice,
        cantidadPacking: prodPacking.cantidadPacking,
        diferenciaCantidad,
        coincide,
        // Datos adicionales del packing
        pesoUnitario: prodPacking.pesoUnitario,
        pesoTotal: prodPacking.pesoTotal,
        cbm: prodPacking.cbm,
        totalCajas: prodPacking.totalCajas,
        cantidadPorCaja: prodPacking.cantidadPorCaja,
        // Datos del invoice
        precioUnitario: prodInvoice.precioUnitario,
        totalFOB: prodInvoice.totalFOB,
        // Cálculos derivados
        costoPorGramo: prodInvoice.precioUnitario / (prodPacking.pesoUnitario || 1),
        costoPorCBM: prodInvoice.totalFOB / (prodPacking.cbm || 1),
        densidad: prodPacking.pesoUnitario / (prodPacking.cbm || 1)
      };
      
      if (coincide) {
        analisisCruzado.coincidencias.push(comparacion);
        analisisCruzado.resumen.coincidencias++;
      } else {
        analisisCruzado.diferencias.push(comparacion);
        analisisCruzado.resumen.diferencias++;
      }
    } else {
      // Producto solo en INVOICE
      analisisCruzado.soloEnInvoice.push(prodInvoice);
    }
  });
  
  // Productos solo en PACKING
  productosPacking.forEach(prodPacking => {
    const existeEnInvoice = productosInvoice.find(p => p.codigo === prodPacking.codigo);
    if (!existeEnInvoice) {
      analisisCruzado.soloEnPacking.push(prodPacking);
    }
  });
  
  return analisisCruzado;
};

// FUNCIÓN PARA EXTRAER METADATA DEL PROVEEDOR
const extraerMetadataProveedor = (data, filaHeaders) => {
  const metadata = {
    informacionProveedor: [],
    fechas: [],
    numeros: [],
    textoRelevante: []
  };
  
  // Analizar filas 0-12 (antes de headers)
  const filasMetadata = data.slice(0, Math.max(filaHeaders, 13));
  
  filasMetadata.forEach((fila, indice) => {
    if (fila && fila.some(cell => cell !== undefined && cell !== null && cell !== '')) {
      const filaTexto = fila.join(' ').trim();
      
      // Detectar fechas
      const regexFecha = /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b|\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/g;
      const fechasEncontradas = filaTexto.match(regexFecha);
      if (fechasEncontradas) {
        metadata.fechas.push(...fechasEncontradas);
      }
      
      // Detectar números relevantes (posibles códigos, cantidades)
      const regexNumeros = /\b\d{3,}\b/g;
      const numerosEncontrados = filaTexto.match(regexNumeros);
      if (numerosEncontrados) {
        metadata.numeros.push(...numerosEncontrados);
      }
      
      // Guardar texto relevante por fila
      metadata.informacionProveedor.push({
        fila: indice + 1,
        contenido: fila.filter(cell => cell !== undefined && cell !== null && cell !== ''),
        textoCompleto: filaTexto
      });
    }
  });
  
  return metadata;
};

export default function AnalizadorExcel() {
  const [analisis, setAnalisis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analisisCruzado, setAnalisisCruzado] = useState(null);
  
  // Estados para comparación Invoice vs Packing List
  const [archivoInvoice, setArchivoInvoice] = useState(null);
  const [archivoPackingList, setArchivoPackingList] = useState(null);
  const [analisisInvoice, setAnalisisInvoice] = useState(null);
  const [analisisPackingList, setAnalisisPackingList] = useState(null);
  const [comparacionActiva, setComparacionActiva] = useState(false);
  const [resultadoComparacion, setResultadoComparacion] = useState(null);
  
  // Estados para datos manuales del embarque
  const [datosEmbarqueManuales, setDatosEmbarqueManuales] = useState({
    cajasTotal: 0,
    pesoTotalKg: 0,
    cbmTotal: 0,
    cantidadTotal: 0,
    fobTotal: 0
  });
  const [calculosSimples, setCalculosSimples] = useState(null);

  // Función para procesar productos del Packing List con códigos repetidos
  const procesarProductosPackingList = (datosReales) => {
    const productosUnicos = new Map();
    
    datosReales.forEach(fila => {
      const codigo = fila[1]; // Columna B = ITEM NO
      const descripcion = fila[2]; // Columna C = DESCRIPTION
      const cantidadCaja = Number(fila[3]) || 0; // Columna D = QTY/CTN
      const totalCajas = Number(fila[5]) || 0; // Columna F = TOTAL CTN
      const cantidadTotal = Number(fila[6]) || 0; // Columna G = QUANTITY (PCS)
      const pesoTotal = Number(fila[8]) || 0; // Columna I = TOTAL G.W
      const cbm = Number(fila[9]) || 0; // Columna J = CBM
      
      if (codigo && productosUnicos.has(codigo)) {
        // Producto ya existe, sumar cantidades
        const existente = productosUnicos.get(codigo);
        existente.cantidadTotal += cantidadTotal;
        existente.totalCajas += totalCajas;
        existente.pesoTotal += pesoTotal;
        existente.cbm += cbm;
        existente.numerosCajas.push(...extraerNumerosCajas(fila[0])); // Columna A = CTN
      } else if (codigo) {
        // Producto nuevo
        productosUnicos.set(codigo, {
          codigo,
          descripcion,
          cantidadPorCaja: cantidadCaja,
          cantidadTotal,
          totalCajas,
          pesoTotal,
          cbm,
          pesoUnitario: cantidadTotal > 0 ? pesoTotal / cantidadTotal : 0,
          numerosCajas: extraerNumerosCajas(fila[0])
        });
      }
    });
    
    return Array.from(productosUnicos.values());
  };
  
  // Función para extraer números de cajas (maneja rangos como "14-15" o números individuales)
  const extraerNumerosCajas = (ctnValue) => {
    if (!ctnValue) return [];
    
    const valor = ctnValue.toString();
    if (valor.includes('-')) {
      // Rango: "14-15" o "180-184"
      const [inicio, fin] = valor.split('-').map(n => parseInt(n.trim()));
      const cajas = [];
      for (let i = inicio; i <= fin; i++) {
        cajas.push(i);
      }
      return cajas;
    } else {
      // Número individual
      return [parseInt(valor)];
    }
  };
  
  // Función para procesar archivos específicamente para comparación
  const procesarArchivoExcel = async (file, tipo) => {
    setLoading(true);
    
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const dataLimpia = jsonData.filter(row => 
          row.some(cell => cell !== undefined && cell !== null && cell !== '')
        );
        
        const deteccionHeaders = detectarInicioHeaders(dataLimpia);
        
        const analisisArchivo = {
          nombreArchivo: file.name,
          tipoArchivo: deteccionHeaders.tipoArchivo,
          datosReales: deteccionHeaders.datosReales,
          estructuraDetectada: deteccionHeaders.estructuraDetectada,
          filaInicioDatos: deteccionHeaders.filaInicioDatos,
          hojas: [{
            datosReales: deteccionHeaders.datosReales
          }]
        };
        
        console.log(`📁 Archivo ${tipo.toUpperCase()} procesado:`, analisisArchivo);
        
        if (tipo === 'invoice') {
          setAnalisisInvoice(analisisArchivo);
        } else if (tipo === 'packing') {
          setAnalisisPackingList(analisisArchivo);
        }
        
        setLoading(false);
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error(`Error procesando archivo ${tipo}:`, error);
      alert(`Error al procesar archivo ${tipo}: ${error.message}`);
      setLoading(false);
    }
  };
  
  // Función principal de comparación Invoice vs Packing List
  const compararInvoiceVsPackingList = () => {
    if (!analisisInvoice || !analisisPackingList) {
      alert('Necesitas analizar ambos archivos primero (Invoice y Packing List)');
      return;
    }
    
    console.log('🔄 INICIANDO COMPARACIÓN INVOICE vs PACKING LIST');
    
    // Extraer productos del Invoice
    const productosInvoice = analisisInvoice.hojas[0].datosReales.map(fila => ({
      codigo: fila[1], // ITEM NO
      descripcion: fila[2], // DESCRIPTION
      cantidadInvoice: Number(fila[3]) || 0, // QTY
      precioUnitario: Number(fila[4]) || 0, // UNIT PRICE USD
      totalFOB: Number(fila[5]) || 0 // AMOUNT USD
    })).filter(p => p.codigo);
    
    // Extraer productos del Packing List (manejo de repetidos)
    const productosPackingList = procesarProductosPackingList(analisisPackingList.hojas[0].datosReales);
    
    console.log('📄 Productos en Invoice:', productosInvoice.length);
    console.log('📦 Productos únicos en Packing List:', productosPackingList.length);
    
    // Realizar comparación
    const comparacion = {
      coincidencias: [],
      soloEnInvoice: [],
      soloEnPackingList: [],
      diferenciasQuantidad: []
    };
    
    // Comparar productos
    productosInvoice.forEach(prodInvoice => {
      const prodPacking = productosPackingList.find(p => p.codigo === prodInvoice.codigo);
      
      if (prodPacking) {
        const diferenciaCantidad = Math.abs(prodInvoice.cantidadInvoice - prodPacking.cantidadTotal);
        
        if (diferenciaCantidad === 0) {
          comparacion.coincidencias.push({
            ...prodInvoice,
            datosPackingList: prodPacking
          });
        } else {
          comparacion.diferenciasQuantidad.push({
            ...prodInvoice,
            datosPackingList: prodPacking,
            diferenciaCantidad
          });
        }
      } else {
        comparacion.soloEnInvoice.push(prodInvoice);
      }
    });
    
    // Productos solo en Packing List
    productosPackingList.forEach(prodPacking => {
      const existeEnInvoice = productosInvoice.some(p => p.codigo === prodPacking.codigo);
      if (!existeEnInvoice) {
        comparacion.soloEnPackingList.push(prodPacking);
      }
    });
    
    console.log('🎯 RESULTADO COMPARACIÓN:', {
      coincidencias: comparacion.coincidencias.length,
      diferenciasQuantidad: comparacion.diferenciasQuantidad.length,
      soloEnInvoice: comparacion.soloEnInvoice.length,
      soloEnPackingList: comparacion.soloEnPackingList.length
    });
    
    setResultadoComparacion(comparacion);
  };
  
  // Función para cálculos simples basados en datos manuales
  const calcularMetricasSimples = () => {
    console.log('📊 CALCULANDO MÉTRICAS SIMPLES con datos manuales...');
    console.log('Datos ingresados:', datosEmbarqueManuales);
    
    if (!resultadoComparacion || !resultadoComparacion.coincidencias) {
      alert('Necesitas realizar la comparación Invoice vs Packing List primero');
      return;
    }
    
    const { cajasTotal, pesoTotalKg, cbmTotal, cantidadTotal, fobTotal } = datosEmbarqueManuales;
    
    // Validaciones básicas
    if (cantidadTotal <= 0) {
      alert('Ingresa una cantidad total válida (mayor a 0)');
      return;
    }
    
    // Cálculos útiles y simples
    const metricas = {
      // Totales ingresados
      totales: {
        cajas: cajasTotal,
        pesoKg: pesoTotalKg,
        cbm: cbmTotal,
        cantidad: cantidadTotal,
        fobUsd: fobTotal
      },
      
      // Promedios por pieza
      promediosPorPieza: {
        pesoGramos: pesoTotalKg > 0 && cantidadTotal > 0 ? (pesoTotalKg * 1000) / cantidadTotal : 0,
        cbm: cbmTotal > 0 && cantidadTotal > 0 ? cbmTotal / cantidadTotal : 0,
        fobUsd: fobTotal > 0 && cantidadTotal > 0 ? fobTotal / cantidadTotal : 0,
        volumenCm3: cbmTotal > 0 && cantidadTotal > 0 ? (cbmTotal * 1000000) / cantidadTotal : 0
      },
      
      // Promedios por caja
      promediosPorCaja: {
        piezasPorCaja: cajasTotal > 0 && cantidadTotal > 0 ? cantidadTotal / cajasTotal : 0,
        pesoKgPorCaja: cajasTotal > 0 && pesoTotalKg > 0 ? pesoTotalKg / cajasTotal : 0,
        cbmPorCaja: cajasTotal > 0 && cbmTotal > 0 ? cbmTotal / cajasTotal : 0,
        fobPorCaja: cajasTotal > 0 && fobTotal > 0 ? fobTotal / cajasTotal : 0
      },
      
      // Densidad y ratios útiles
      ratios: {
        densidadGramosPorCm3: cbmTotal > 0 && pesoTotalKg > 0 ? (pesoTotalKg * 1000) / (cbmTotal * 1000000) : 0,
        pesoPromedioPorDolar: fobTotal > 0 && pesoTotalKg > 0 ? pesoTotalKg / fobTotal : 0,
        volumenPromedioPorDolar: fobTotal > 0 && cbmTotal > 0 ? cbmTotal / fobTotal : 0
      }
    };
    
    console.log('🎯 MÉTRICAS CALCULADAS:', metricas);
    setCalculosSimples(metricas);
  };
  
  
  // Función para limpiar los datos manuales
  const limpiarDatosEmbarque = () => {
    setDatosEmbarqueManuales({
      cajasTotal: 0,
      pesoTotalKg: 0,
      cbmTotal: 0,
      cantidadTotal: 0,
      fobTotal: 0
    });
    setCalculosSimples(null);
  };

  const analizarArchivo = (file) => {
    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const analisisCompleto = {
          nombreArchivo: file.name,
          hojas: [],
          timestamp: new Date().toLocaleString()
        };

        workbook.SheetNames.forEach((sheetName, index) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Filtrar filas vacías
          const dataLimpia = jsonData.filter(row => 
            row.some(cell => cell !== undefined && cell !== null && cell !== '')
          );

          // DETECCIÓN INTELIGENTE CON VERIFICACIÓN ESPECÍFICA
          console.log(`\n=== ANALIZANDO HOJA: ${sheetName} ===`);
          console.log('Total filas después de limpieza:', dataLimpia.length);
          console.log('Primeras 3 filas:', dataLimpia.slice(0, 3));
          console.log('Filas 13-16 (headers + datos):', dataLimpia.slice(12, 16));
          
          const deteccionHeaders = detectarInicioHeaders(dataLimpia);
          const metadataProveedor = extraerMetadataProveedor(dataLimpia, deteccionHeaders.filaHeaders);
          
          const hoja = {
            nombre: sheetName,
            totalFilas: dataLimpia.length,
            
            // METADATA DEL PROVEEDOR (filas 1-13)
            metadataProveedor: metadataProveedor,
            
            // DETECCIÓN DE ESTRUCTURA
            filaHeaders: deteccionHeaders.filaHeaders,
            filaInicioDatos: deteccionHeaders.filaInicioDatos,
            columnasRelevantes: deteccionHeaders.columnasRelevantes,
            
            // ESTRUCTURA DETECTADA
            estructuraDetectada: deteccionHeaders.estructuraDetectada,
            filaTotales: deteccionHeaders.filaTotales,
            ultimaFilaDatos: deteccionHeaders.ultimaFilaDatos,
            
            // HEADERS REALES
            headers: deteccionHeaders.headersReales || [],
            
            // DATOS REALES (excluyendo totales)
            ejemploFila1: deteccionHeaders.primeraFilaDatos || [],
            ejemploFila2: deteccionHeaders.segundaFilaDatos || [],
            ejemploFila3: deteccionHeaders.terceraFilaDatos || [],
            totalFilasDatos: deteccionHeaders.totalFilasDatos || 0,
            datosReales: deteccionHeaders.datosReales || [],
            
            // ANÁLISIS COMPLETO
            tiposDato: {},
            estadisticas: {},
            analisisCompleto: deteccionHeaders
          };

          // Analizar tipos de datos por columna usando estructura detectada
          if (hoja.datosReales && hoja.datosReales.length > 0 && hoja.estructuraDetectada) {
            Object.entries(hoja.estructuraDetectada).forEach(([clave, columnaInfo]) => {
              const colIndex = columnaInfo.indice;
              const nombreColumna = columnaInfo.nombre;
              
              // CORRECCIÓN: Columna A vacía, pero todas son relevantes para análisis
              // Mostrar que columna A está vacía es importante para debug
              
              const valores = hoja.datosReales
                .map(row => row[colIndex])
                .filter(v => v !== undefined && v !== null && v !== '');
              
              if (valores.length > 0) {
                const valoresNumericos = valores.filter(v => {
                  const num = Number(v);
                  return !isNaN(num) && isFinite(num);
                });
                
                // Análisis especial para columna CTN (rangos de cajas)
                let analisisEspecial = {};
                if (nombreColumna === 'CTN') {
                  const rangos = valores.filter(v => v.toString().includes('-'));
                  const individuales = valores.filter(v => !v.toString().includes('-'));
                  
                  analisisEspecial = {
                    tipoEspecial: 'rangos_cajas',
                    rangosDetectados: rangos.length,
                    cajasIndividuales: individuales.length,
                    ejemplosRangos: rangos.slice(0, 5),
                    ejemplosIndividuales: individuales.slice(0, 5)
                  };
                }
                
                hoja.tiposDato[nombreColumna] = {
                  columna: clave,
                  descripcion: columnaInfo.descripcion,
                  valores: valores.slice(0, 10), // Primeros 10 valores como ejemplo
                  tipos: [...new Set(valores.map(v => typeof v))],
                  valorMinimo: valoresNumericos.length > 0 ? Math.min(...valoresNumericos.map(v => Number(v))) : null,
                  valorMaximo: valoresNumericos.length > 0 ? Math.max(...valoresNumericos.map(v => Number(v))) : null,
                  valoresUnicos: [...new Set(valores)].length,
                  totalValores: valores.length,
                  porcentajeNumerico: valores.length > 0 ? ((valoresNumericos.length / valores.length) * 100).toFixed(1) : '0',
                  promedioNumerico: valoresNumericos.length > 0 ? 
                    (valoresNumericos.reduce((sum, v) => sum + Number(v), 0) / valoresNumericos.length).toFixed(2) : null,
                  ...analisisEspecial
                };
              }
            });
          }

          analisisCompleto.hojas.push(hoja);
        });

        setAnalisis(analisisCompleto);
        console.log('ANÁLISIS COMPLETO:', analisisCompleto);
        
        // ANÁLISIS CRUZADO: Si hay tanto INVOICE como PACKING LIST
        const hojaInvoice = analisisCompleto.hojas.find(h => h.analisisCompleto?.tipoArchivo === 'invoice');
        const hojaPacking = analisisCompleto.hojas.find(h => h.analisisCompleto?.tipoArchivo === 'packing');
        
        if (hojaInvoice && hojaPacking) {
          console.log('🔄 Realizando análisis cruzado INVOICE vs PACKING...');
          const cruzado = analizarCruzado(hojaInvoice.analisisCompleto, hojaPacking.analisisCompleto);
          setAnalisisCruzado(cruzado);
          console.log('📊 ANÁLISIS CRUZADO:', cruzado);
        } else {
          setAnalisisCruzado(null);
        }
        
      } catch (error) {
        console.error('Error al analizar Excel:', error);
        alert('Error al analizar el archivo: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const copiarAnalisis = () => {
    const textoAnalisis = JSON.stringify(analisis, null, 2);
    navigator.clipboard.writeText(textoAnalisis).then(() => {
      alert('Análisis copiado al portapapeles');
    });
  };

  return (
    <div className="card-mare">
      <h2 className="text-xl font-playfair mb-4">📊 Analizador Excel - Validación y Métricas</h2>
      
      {/* SECCIÓN COMPARACIÓN INVOICE vs PACKING LIST */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border-2 border-dashed border-blue-300">
        <h3 className="text-lg font-bold mb-3 text-blue-800">🔄 Comparación Invoice vs Packing List</h3>
        <p className="text-sm text-gray-700 mb-4">Sube ambos archivos para validar que lo facturado coincida con lo empacado</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Invoice Upload */}
          <div className="p-3 bg-white rounded border border-blue-200">
            <label className="block text-sm font-medium text-blue-700 mb-2">📄 Archivo INVOICE</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                if (e.target.files[0]) {
                  setArchivoInvoice(e.target.files[0]);
                  procesarArchivoExcel(e.target.files[0], 'invoice');
                }
              }}
              className="input-mare text-xs"
              disabled={loading}
            />
            {archivoInvoice && (
              <p className="text-xs text-green-600 mt-1">✅ {archivoInvoice.name}</p>
            )}
          </div>
          
          {/* Packing List Upload */}
          <div className="p-3 bg-white rounded border border-green-200">
            <label className="block text-sm font-medium text-green-700 mb-2">📦 Archivo PACKING LIST</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                if (e.target.files[0]) {
                  setArchivoPackingList(e.target.files[0]);
                  procesarArchivoExcel(e.target.files[0], 'packing');
                }
              }}
              className="input-mare text-xs"
              disabled={loading}
            />
            {archivoPackingList && (
              <p className="text-xs text-green-600 mt-1">✅ {archivoPackingList.name}</p>
            )}
          </div>
        </div>
        
        {/* Botón de Comparación */}
        <div className="text-center">
          <button
            onClick={compararInvoiceVsPackingList}
            disabled={!analisisInvoice || !analisisPackingList || loading}
            className={`px-6 py-3 rounded-lg font-bold text-white transition-all ${
              analisisInvoice && analisisPackingList && !loading
                ? 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 cursor-pointer'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {loading ? '⏳ Procesando...' : '🔍 Comparar Archivos'}
          </button>
          
          {(analisisInvoice || analisisPackingList) && (
            <div className="mt-2 text-xs text-gray-600">
              Estado: 
              <span className={analisisInvoice ? 'text-blue-600' : 'text-gray-400'}>
                {analisisInvoice ? '✅ Invoice' : '⏸️ Invoice'}
              </span>
              {' + '}
              <span className={analisisPackingList ? 'text-green-600' : 'text-gray-400'}>
                {analisisPackingList ? '✅ Packing' : '⏸️ Packing'}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* RESULTADO DE COMPARACIÓN */}
      {resultadoComparacion && (
        <div className="mb-6 p-4 bg-white rounded-lg border-2 border-blue-300">
          <h3 className="text-lg font-bold mb-3 text-blue-800">📊 Resultado de la Comparación</h3>
          
          {/* Resumen Estadístico */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-center">
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <div className="text-2xl font-bold text-green-600">{resultadoComparacion.coincidencias.length}</div>
              <div className="text-xs text-gray-600">✅ Coincidencias</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{resultadoComparacion.diferenciasQuantidad.length}</div>
              <div className="text-xs text-gray-600">⚠️ Diferencias Cantidad</div>
            </div>
            <div className="p-3 bg-orange-50 rounded border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">{resultadoComparacion.soloEnInvoice.length}</div>
              <div className="text-xs text-gray-600">📄 Solo en Invoice</div>
            </div>
            <div className="p-3 bg-purple-50 rounded border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">{resultadoComparacion.soloEnPackingList.length}</div>
              <div className="text-xs text-gray-600">📦 Solo en Packing</div>
            </div>
          </div>
          
          {/* Sección de datos manuales y cálculos simples */}
          {resultadoComparacion.coincidencias.length > 0 && (
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded border border-blue-300">
              <h4 className="font-bold text-blue-700 mb-2">📊 Datos del Embarque y Cálculos Útiles</h4>
              <p className="text-xs text-gray-700 mb-3">Ingresa manualmente los datos totales del embarque para obtener métricas útiles</p>
              
              {/* Campos de entrada manuales */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                <div className="p-2 bg-white rounded border">
                  <label className="block font-medium text-gray-700 mb-1 text-xs">Cajas Total</label>
                  <input
                    type="number"
                    placeholder="Ej: 120"
                    value={datosEmbarqueManuales.cajasTotal || ''}
                    onChange={(e) => setDatosEmbarqueManuales({...datosEmbarqueManuales, cajasTotal: parseInt(e.target.value) || 0})}
                    className="input-mare w-full text-xs"
                  />
                </div>
                <div className="p-2 bg-white rounded border">
                  <label className="block font-medium text-gray-700 mb-1 text-xs">Peso Total (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ej: 2500.5"
                    value={datosEmbarqueManuales.pesoTotalKg || ''}
                    onChange={(e) => setDatosEmbarqueManuales({...datosEmbarqueManuales, pesoTotalKg: parseFloat(e.target.value) || 0})}
                    className="input-mare w-full text-xs"
                  />
                </div>
                <div className="p-2 bg-white rounded border">
                  <label className="block font-medium text-gray-700 mb-1 text-xs">CBM Total</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Ej: 12.856"
                    value={datosEmbarqueManuales.cbmTotal || ''}
                    onChange={(e) => setDatosEmbarqueManuales({...datosEmbarqueManuales, cbmTotal: parseFloat(e.target.value) || 0})}
                    className="input-mare w-full text-xs"
                  />
                </div>
                <div className="p-2 bg-white rounded border">
                  <label className="block font-medium text-gray-700 mb-1 text-xs">Cantidad Total (pcs)</label>
                  <input
                    type="number"
                    placeholder="Ej: 15000"
                    value={datosEmbarqueManuales.cantidadTotal || ''}
                    onChange={(e) => setDatosEmbarqueManuales({...datosEmbarqueManuales, cantidadTotal: parseInt(e.target.value) || 0})}
                    className="input-mare w-full text-xs"
                  />
                </div>
                <div className="p-2 bg-white rounded border">
                  <label className="block font-medium text-gray-700 mb-1 text-xs">FOB Total (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 18500.50"
                    value={datosEmbarqueManuales.fobTotal || ''}
                    onChange={(e) => setDatosEmbarqueManuales({...datosEmbarqueManuales, fobTotal: parseFloat(e.target.value) || 0})}
                    className="input-mare w-full text-xs"
                  />
                </div>
              </div>
              
              {/* Botones de acción */}
              <div className="text-center grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                <button
                  onClick={calcularMetricasSimples}
                  disabled={!resultadoComparacion || datosEmbarqueManuales.cantidadTotal === 0}
                  className={`px-4 py-2 rounded font-medium text-xs transition-all ${
                    resultadoComparacion && datosEmbarqueManuales.cantidadTotal > 0
                      ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                >
                  📊 Calcular Métricas Útiles
                </button>
                
                <button
                  onClick={limpiarDatosEmbarque}
                  className="px-4 py-2 rounded font-medium text-xs bg-gray-500 text-white hover:bg-gray-600 transition-all"
                >
                  🧹 Limpiar Datos
                </button>
              </div>
              
              {/* Resultados de los cálculos simples */}
              {calculosSimples && (
                <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                  <h5 className="font-bold text-green-700 mb-3">📈 Métricas Calculadas</h5>
                  
                  {/* Totales ingresados */}
                  <div className="mb-4 p-3 bg-white rounded border border-green-100">
                    <h6 className="font-bold text-sm mb-2">📊 Resumen Total del Embarque</h6>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                      <div className="text-center">
                        <div className="font-bold text-lg text-blue-600">{calculosSimples.totales.cantidad.toLocaleString()}</div>
                        <div className="text-gray-600">Piezas Totales</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg text-purple-600">{calculosSimples.totales.pesoKg.toLocaleString()} kg</div>
                        <div className="text-gray-600">Peso Total</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg text-orange-600">{calculosSimples.totales.cbm.toFixed(3)}</div>
                        <div className="text-gray-600">CBM Total</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg text-green-600">${calculosSimples.totales.fobUsd.toLocaleString()}</div>
                        <div className="text-gray-600">FOB Total</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg text-gray-600">{calculosSimples.totales.cajas}</div>
                        <div className="text-gray-600">Cajas Totales</div>
                      </div>
                    </div>
                  </div>

                  {/* Promedios por pieza */}
                  <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded border border-yellow-200">
                    <h6 className="font-bold text-sm mb-2">⭐ Promedios por Pieza (Muy Útil para Referencias Futuras)</h6>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="text-center p-2 bg-white rounded">
                        <div className="font-bold text-lg text-blue-600">{calculosSimples.promediosPorPieza.pesoGramos.toFixed(1)}g</div>
                        <div className="text-gray-600">Peso Promedio</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <div className="font-bold text-lg text-purple-600">{calculosSimples.promediosPorPieza.volumenCm3.toFixed(1)} cm³</div>
                        <div className="text-gray-600">Volumen Promedio</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <div className="font-bold text-lg text-green-600">${calculosSimples.promediosPorPieza.fobUsd.toFixed(3)}</div>
                        <div className="text-gray-600">FOB Promedio</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <div className="font-bold text-lg text-orange-600">{calculosSimples.ratios.densidadGramosPorCm3.toFixed(3)}</div>
                        <div className="text-gray-600">Densidad (g/cm³)</div>
                      </div>
                    </div>
                  </div>

                  {/* Promedios por caja */}
                  {calculosSimples.totales.cajas > 0 && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded border border-indigo-200">
                      <h6 className="font-bold text-sm mb-2">📦 Promedios por Caja</h6>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="text-center p-2 bg-white rounded">
                          <div className="font-bold text-lg text-indigo-600">{calculosSimples.promediosPorCaja.piezasPorCaja.toFixed(0)}</div>
                          <div className="text-gray-600">Piezas/Caja</div>
                        </div>
                        <div className="text-center p-2 bg-white rounded">
                          <div className="font-bold text-lg text-purple-600">{calculosSimples.promediosPorCaja.pesoKgPorCaja.toFixed(1)} kg</div>
                          <div className="text-gray-600">Peso/Caja</div>
                        </div>
                        <div className="text-center p-2 bg-white rounded">
                          <div className="font-bold text-lg text-blue-600">{calculosSimples.promediosPorCaja.cbmPorCaja.toFixed(3)}</div>
                          <div className="text-gray-600">CBM/Caja</div>
                        </div>
                        <div className="text-center p-2 bg-white rounded">
                          <div className="font-bold text-lg text-green-600">${calculosSimples.promediosPorCaja.fobPorCaja.toFixed(2)}</div>
                          <div className="text-gray-600">FOB/Caja</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Ratios útiles */}
                  <div className="p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded border border-gray-200">
                    <h6 className="font-bold text-sm mb-2">📈 Ratios de Eficiencia</h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="text-center p-2 bg-white rounded">
                        <div className="font-bold text-lg text-gray-600">{calculosSimples.ratios.pesoPromedioPorDolar.toFixed(3)} kg</div>
                        <div className="text-gray-600">Peso por USD FOB</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <div className="font-bold text-lg text-gray-600">{calculosSimples.ratios.volumenPromedioPorDolar.toFixed(6)} CBM</div>
                        <div className="text-gray-600">CBM por USD FOB</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Detalles de Diferencias */}
          {resultadoComparacion.diferenciasQuantidad.length > 0 && (
            <div className="mb-4">
              <h4 className="font-bold text-red-700 mb-2">⚠️ Productos con Diferencias de Cantidad</h4>
              <div className="max-h-32 overflow-y-auto">
                <table className="w-full border-collapse border border-gray-300 text-xs">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="border border-gray-300 px-2 py-1">Código</th>
                      <th className="border border-gray-300 px-2 py-1">Descripción</th>
                      <th className="border border-gray-300 px-2 py-1">Invoice</th>
                      <th className="border border-gray-300 px-2 py-1">Packing</th>
                      <th className="border border-gray-300 px-2 py-1">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultadoComparacion.diferenciasQuantidad.map((prod, i) => (
                      <tr key={i} className="bg-white hover:bg-gray-50">
                        <td className="border border-gray-300 px-2 py-1 font-bold">{prod.codigo}</td>
                        <td className="border border-gray-300 px-2 py-1 max-w-32 truncate">{prod.descripcion}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{prod.cantidadInvoice}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center">{prod.datosPackingList.cantidadTotal}</td>
                        <td className="border border-gray-300 px-2 py-1 text-center font-bold text-red-600">±{prod.diferenciaCantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Productos Solo en Invoice */}
          {resultadoComparacion.soloEnInvoice.length > 0 && (
            <div className="mb-4 p-3 bg-orange-50 rounded border border-orange-200">
              <h4 className="font-bold text-orange-700 mb-2">📄 Productos Facturados pero NO Empacados ({resultadoComparacion.soloEnInvoice.length})</h4>
              <div className="text-xs text-gray-700 mb-2">Estos productos aparecen en la factura pero no en la lista de empaque</div>
              <div className="max-h-24 overflow-y-auto">
                {resultadoComparacion.soloEnInvoice.slice(0, 8).map((prod, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-orange-100 last:border-b-0">
                    <span className="font-bold">{prod.codigo}</span>
                    <span className="max-w-32 truncate text-center">{prod.descripcion}</span>
                    <span className="font-medium">{prod.cantidadInvoice} pcs</span>
                  </div>
                ))}
                {resultadoComparacion.soloEnInvoice.length > 8 && (
                  <div className="text-center text-gray-500 pt-1">... y {resultadoComparacion.soloEnInvoice.length - 8} productos más</div>
                )}
              </div>
            </div>
          )}
          
          {/* Productos Solo en Packing List */}
          {resultadoComparacion.soloEnPackingList.length > 0 && (
            <div className="p-3 bg-purple-50 rounded border border-purple-200">
              <h4 className="font-bold text-purple-700 mb-2">📦 Productos Empacados pero NO Facturados ({resultadoComparacion.soloEnPackingList.length})</h4>
              <div className="text-xs text-gray-700 mb-2">Estos productos aparecen en la lista de empaque pero no fueron facturados</div>
              <div className="max-h-24 overflow-y-auto">
                {resultadoComparacion.soloEnPackingList.slice(0, 8).map((prod, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-purple-100 last:border-b-0">
                    <span className="font-bold">{prod.codigo}</span>
                    <span className="max-w-32 truncate text-center">{prod.descripcion}</span>
                    <span className="font-medium">{prod.cantidadTotal} pcs</span>
                  </div>
                ))}
                {resultadoComparacion.soloEnPackingList.length > 8 && (
                  <div className="text-center text-gray-500 pt-1">... y {resultadoComparacion.soloEnPackingList.length - 8} productos más</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* NUEVA SECCIÓN: Validación de Consistencia Invoice vs Packing List */}
      {analisisInvoice && analisisPackingList && (
        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-200">
          <h3 className="font-bold text-lg mb-3 text-indigo-700">🔄 Validación de Consistencia: Invoice vs Packing List</h3>
          
          <div className="mb-4">
            <button
              onClick={compararInvoiceVsPackingList}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-medium"
            >
              🔍 Comparar Invoice vs Packing List
            </button>
          </div>
          
          {resultadoComparacion && (
            <div className="space-y-4">
              {/* Resumen de consistencia */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3 bg-green-100 rounded border border-green-300">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{resultadoComparacion.coincidencias?.length || 0}</div>
                    <div className="text-xs text-green-700">Productos Consistentes</div>
                  </div>
                </div>
                <div className="p-3 bg-orange-100 rounded border border-orange-300">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{resultadoComparacion.diferenciasQuantidad?.length || 0}</div>
                    <div className="text-xs text-orange-700">Diferencias Cantidad</div>
                  </div>
                </div>
                <div className="p-3 bg-red-100 rounded border border-red-300">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{resultadoComparacion.soloEnInvoice?.length || 0}</div>
                    <div className="text-xs text-red-700">Solo en Invoice</div>
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded border border-purple-300">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{resultadoComparacion.soloEnPackingList?.length || 0}</div>
                    <div className="text-xs text-purple-700">Solo en Packing</div>
                  </div>
                </div>
              </div>
              
              {/* Evaluación de consistencia */}
              <div className="p-3 bg-white rounded border">
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const totalInconsistencias = (resultadoComparacion.diferenciasQuantidad?.length || 0) + 
                                               (resultadoComparacion.soloEnInvoice?.length || 0) + 
                                               (resultadoComparacion.soloEnPackingList?.length || 0);
                    const totalProductos = (resultadoComparacion.coincidencias?.length || 0) + totalInconsistencias;
                    const porcentajeConsistencia = totalProductos > 0 ? ((resultadoComparacion.coincidencias?.length || 0) / totalProductos * 100) : 0;
                    
                    if (porcentajeConsistencia >= 95) {
                      return (
                        <>
                          <span className="text-green-600 text-xl">✅</span>
                          <span className="font-bold text-green-700">EXCELENTE CONSISTENCIA</span>
                          <span className="text-green-600">({porcentajeConsistencia.toFixed(1)}%)</span>
                        </>
                      );
                    } else if (porcentajeConsistencia >= 85) {
                      return (
                        <>
                          <span className="text-blue-600 text-xl">👍</span>
                          <span className="font-bold text-blue-700">BUENA CONSISTENCIA</span>
                          <span className="text-blue-600">({porcentajeConsistencia.toFixed(1)}%)</span>
                        </>
                      );
                    } else if (porcentajeConsistencia >= 70) {
                      return (
                        <>
                          <span className="text-orange-600 text-xl">⚠️</span>
                          <span className="font-bold text-orange-700">CONSISTENCIA REGULAR</span>
                          <span className="text-orange-600">({porcentajeConsistencia.toFixed(1)}%)</span>
                        </>
                      );
                    } else {
                      return (
                        <>
                          <span className="text-red-600 text-xl">❌</span>
                          <span className="font-bold text-red-700">BAJA CONSISTENCIA</span>
                          <span className="text-red-600">({porcentajeConsistencia.toFixed(1)}%)</span>
                        </>
                      );
                    }
                  })()}
                </div>
                
                <div className="text-sm text-gray-600">
                  {resultadoComparacion.diferenciasQuantidad?.length > 0 && (
                    <p className="text-orange-700">⚠️ Revisar diferencias de cantidades entre documentos</p>
                  )}
                  {resultadoComparacion.soloEnInvoice?.length > 0 && (
                    <p className="text-red-700">🚨 Productos facturados pero no empacados</p>
                  )}
                  {resultadoComparacion.soloEnPackingList?.length > 0 && (
                    <p className="text-purple-700">📦 Productos empacados pero no facturados</p>
                  )}
                </div>
              </div>
              
              {/* Detalles de inconsistencias más críticas */}
              {(resultadoComparacion.diferenciasQuantidad?.length > 0 || 
                resultadoComparacion.soloEnInvoice?.length > 0 || 
                resultadoComparacion.soloEnPackingList?.length > 0) && (
                <div className="p-3 bg-yellow-50 rounded border border-yellow-300">
                  <h4 className="font-bold text-yellow-700 mb-2">🔍 Inconsistencias Detectadas</h4>
                  
                  {resultadoComparacion.diferenciasQuantidad?.length > 0 && (
                    <div className="mb-2">
                      <strong className="text-orange-700">Diferencias de Cantidad:</strong>
                      <div className="text-xs max-h-20 overflow-y-auto mt-1">
                        {resultadoComparacion.diferenciasQuantidad.slice(0, 3).map((prod, i) => (
                          <div key={i} className="grid grid-cols-4 gap-2 py-1 border-b border-orange-200 last:border-b-0">
                            <span className="font-bold">{prod.codigo}</span>
                            <span>Invoice: {prod.cantidadInvoice}</span>
                            <span>Packing: {prod.datosPackingList?.cantidadTotal}</span>
                            <span className="text-red-600">Dif: ±{prod.diferenciaCantidad}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {resultadoComparacion.soloEnInvoice?.length > 0 && (
                      <div>
                        <strong className="text-red-700">Solo en Invoice ({resultadoComparacion.soloEnInvoice.length}):</strong>
                        <div className="max-h-16 overflow-y-auto">
                          {resultadoComparacion.soloEnInvoice.slice(0, 5).map((prod, i) => (
                            <div key={i}>{prod.codigo} - {prod.cantidadInvoice} pcs</div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {resultadoComparacion.soloEnPackingList?.length > 0 && (
                      <div>
                        <strong className="text-purple-700">Solo en Packing ({resultadoComparacion.soloEnPackingList.length}):</strong>
                        <div className="max-h-16 overflow-y-auto">
                          {resultadoComparacion.soloEnPackingList.slice(0, 5).map((prod, i) => (
                            <div key={i}>{prod.codigo} - {prod.cantidadTotal} pcs</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {!analisis ? (
        <div className="text-center py-8">
          <Upload size={48} className="mx-auto mb-4" style={{ color: 'var(--arena-claro)' }} />
          <p className="mb-4">Arrastra aquí tu archivo Excel (INVOICE o PACKING LIST)</p>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              if (e.target.files[0]) {
                analizarArchivo(e.target.files[0]);
              }
            }}
            className="input-mare"
            disabled={loading}
          />
          {loading && <p className="mt-2 text-blue-600">Analizando archivo...</p>}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Resumen general */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-bold text-lg mb-2">📄 {analisis.nombreArchivo}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Total de hojas:</strong> {analisis.hojas.length}</p>
                <p><strong>Analizado:</strong> {analisis.timestamp}</p>
              </div>
              <div>
                {analisis.hojas[0] && (
                  <div className="flex items-center gap-2">
                    {analisis.hojas[0].analisisCompleto?.confianza === 'alta' ? 
                      <CheckCircle size={16} className="text-green-600" /> : 
                      <AlertCircle size={16} className="text-yellow-600" />
                    }
                    <span className="font-medium">
                      Tipo detectado: {analisis.hojas[0].analisisCompleto?.tipoArchivo?.toUpperCase() || 'DESCONOCIDO'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Análisis por hoja */}
          {analisis.hojas.map((hoja, index) => (
            <div key={index} className="border rounded-lg p-4">
              <h4 className="font-bold text-lg mb-3">
                📋 Hoja: {hoja.nombre} 
                <span className={`ml-2 px-2 py-1 text-xs rounded ${
                  hoja.analisisCompleto?.tipoArchivo === 'invoice' ? 'bg-green-100 text-green-800' :
                  hoja.analisisCompleto?.tipoArchivo === 'packing' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {hoja.analisisCompleto?.tipoArchivo?.toUpperCase() || 'DESCONOCIDO'}
                </span>
              </h4>
              
              {/* ESTRUCTURA DETECTADA */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-3 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium text-gray-700">Estructura:</p>
                  <p><strong>Headers en fila:</strong> {(hoja.filaHeaders || 0) + 1}</p>
                  <p><strong>Datos desde fila:</strong> {(hoja.filaInicioDatos || 0) + 1}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Información:</p>
                  <p><strong>Filas de datos:</strong> {hoja.totalFilasDatos || 0}</p>
                  <p><strong>Hasta fila:</strong> {hoja.filaTotales ? hoja.filaTotales : 'Final'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Totales:</p>
                  <p><strong>Fila totales:</strong> {hoja.filaTotales ? (hoja.filaTotales + 1) : 'No detectada'}</p>
                  <p><strong>Datos válidos:</strong> {hoja.datosReales ? hoja.datosReales.length : 0}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Columnas:</p>
                  <p><strong>Activas:</strong> {Object.keys(hoja.estructuraDetectada || {}).filter(k => hoja.estructuraDetectada[k].nombre !== 'OCULTA').length}</p>
                  <p><strong>Rango:</strong> {
                    hoja.analisisCompleto?.tipoArchivo === 'invoice' ? 'B-F' :
                    hoja.analisisCompleto?.tipoArchivo === 'packing' ? 'A-J' : 'A-F'
                  }</p>
                </div>
              </div>

              {/* ESTRUCTURA DE COLUMNAS CON HEADERS COMBINADOS */}
              {hoja.estructuraDetectada && (
                <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <h5 className="font-medium mb-3">
                    📋 Estructura {hoja.analisisCompleto?.tipoArchivo?.toUpperCase()} (Headers Filas {(hoja.filaHeaders || 0) + 1}-{(hoja.filaHeaders || 0) + 2}):
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                    {Object.entries(hoja.estructuraDetectada).map(([clave, info]) => (
                      <div 
                        key={clave} 
                        className={`p-2 rounded border ${
                          info.nombre === 'OCULTA' ? 'bg-red-100 border-red-300' : 'bg-white border-blue-300'
                        }`}
                      >
                        <div className="font-medium">
                          {String.fromCharCode(65 + info.indice)}: {info.nombre}
                          {info.nombre === 'OCULTA' && <span className="text-red-600 ml-1">❌</span>}
                        </div>
                        
                        {/* Mostrar headers combinados */}
                        {info.header14 && info.header15 && (
                          <div className="text-xs mt-1 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Fila {(hoja.filaHeaders || 0) + 1}:</span>
                              <span className="font-mono">{info.header14}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Fila {(hoja.filaHeaders || 0) + 2}:</span>
                              <span className="font-mono">{info.header15}</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-600 mt-2">{info.descripcion}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* METADATA DEL PROVEEDOR */}
              {hoja.metadataProveedor && hoja.metadataProveedor.informacionProveedor.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                  <h5 className="font-medium mb-2">🏢 Información del Proveedor (Filas 1-{hoja.filaHeaders || 13}):</h5>
                  
                  {hoja.metadataProveedor.fechas.length > 0 && (
                    <div className="mb-2">
                      <span className="font-medium text-sm">📅 Fechas encontradas: </span>
                      <span className="text-sm">{hoja.metadataProveedor.fechas.join(', ')}</span>
                    </div>
                  )}
                  
                  {hoja.metadataProveedor.numeros.length > 0 && (
                    <div className="mb-2">
                      <span className="font-medium text-sm">🔢 Códigos/Números: </span>
                      <span className="text-sm">{hoja.metadataProveedor.numeros.slice(0, 8).join(', ')}</span>
                      {hoja.metadataProveedor.numeros.length > 8 && <span className="text-sm">... y {hoja.metadataProveedor.numeros.length - 8} más</span>}
                    </div>
                  )}
                  
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium text-blue-600">Ver información completa del proveedor</summary>
                    <div className="mt-2 space-y-1 text-xs bg-white p-2 rounded border">
                      {hoja.metadataProveedor.informacionProveedor.slice(0, 8).map((info, i) => (
                        <div key={i}>
                          <strong>Fila {info.fila}:</strong> {info.textoCompleto || 'Vacía'}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}

              {/* Headers */}
              <div className="mb-4">
                <h5 className="font-medium mb-2">🏷️ Headers Reales (Fila {(hoja.filaHeaders || 0) + 1}):</h5>
                <div className="bg-gray-100 p-2 rounded text-sm">
                  {hoja.headers.map((header, i) => (
                    <span key={i} className="inline-block bg-blue-100 px-2 py-1 rounded mr-2 mb-1">
                      Col {i + 1}: {header || 'Sin nombre'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Ejemplos de datos REALES */}
              <div className="mb-4">
                <h5 className="font-medium mb-2">
                  📝 Primeros datos reales (desde fila {(hoja.filaInicioDatos || 0) + 1}) - 
                  Excluyendo filas de headers {(hoja.filaHeaders || 0) + 1}-{(hoja.filaHeaders || 0) + 2}:
                </h5>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-gray-300 text-xs">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="border border-gray-300 px-2 py-1">Fila Real</th>
                        {hoja.headers.map((header, i) => (
                          <th key={i} className="border border-gray-300 px-2 py-1 font-medium">
                            {header || `Col${String.fromCharCode(65 + i)}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {hoja.ejemploFila1 && hoja.ejemploFila1.some(v => v) && (
                        <tr className="bg-white">
                          <td className="border border-gray-300 px-2 py-1 font-bold">{(hoja.filaInicioDatos || 0) + 1}</td>
                          {hoja.ejemploFila1.map((valor, i) => (
                            <td key={i} className="border border-gray-300 px-2 py-1">
                              {valor?.toString() || ''}
                            </td>
                          ))}
                        </tr>
                      )}
                      {hoja.ejemploFila2 && hoja.ejemploFila2.some(v => v) && (
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 px-2 py-1 font-bold">{(hoja.filaInicioDatos || 0) + 2}</td>
                          {hoja.ejemploFila2.map((valor, i) => (
                            <td key={i} className="border border-gray-300 px-2 py-1">
                              {valor?.toString() || ''}
                            </td>
                          ))}
                        </tr>
                      )}
                      {hoja.ejemploFila3 && hoja.ejemploFila3.some(v => v) && (
                        <tr className="bg-white">
                          <td className="border border-gray-300 px-2 py-1 font-bold">{(hoja.filaInicioDatos || 0) + 3}</td>
                          {hoja.ejemploFila3.map((valor, i) => (
                            <td key={i} className="border border-gray-300 px-2 py-1">
                              {valor?.toString() || ''}
                            </td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Análisis de tipos de datos por columna */}
              <div>
                <h5 className="font-medium mb-3">🔍 Análisis detallado por columna ({Object.keys(hoja.tiposDato).length} columnas activas):</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  {Object.entries(hoja.tiposDato).map(([columna, info]) => (
                    <div key={columna} className="bg-gray-50 border rounded p-3">
                      <div className="font-medium text-blue-700 mb-1">
                        {info.columna ? info.columna.replace('columna', '').toUpperCase() : ''}: {columna}
                      </div>
                      
                      {info.descripcion && (
                        <div className="text-xs text-gray-500 mb-2 italic">{info.descripcion}</div>
                      )}
                      
                      <div className="space-y-1 text-xs text-gray-600">
                        <div><strong>Total valores:</strong> {info.totalValores}</div>
                        <div><strong>Valores únicos:</strong> {info.valoresUnicos}</div>
                        <div><strong>% Numérico:</strong> {info.porcentajeNumerico}%</div>
                        
                        {info.promedioNumerico && (
                          <div><strong>Promedio:</strong> {info.promedioNumerico}</div>
                        )}
                        
                        {info.valorMinimo !== null && info.valorMaximo !== null && (
                          <div><strong>Rango:</strong> {info.valorMinimo} - {info.valorMaximo}</div>
                        )}
                        
                        <div><strong>Tipos datos:</strong> {info.tipos.join(', ')}</div>
                        
                        {/* Análisis especial para columna CTN (rangos de cajas) */}
                        {info.tipoEspecial === 'rangos_cajas' && (
                          <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-300">
                            <div className="font-medium text-yellow-800 text-xs mb-1">🏷️ Análisis Rangos de Cajas:</div>
                            <div className="text-xs space-y-1">
                              <div><strong>Cajas individuales:</strong> {info.cajasIndividuales} (ej: {info.ejemplosIndividuales.join(', ')})</div>
                              <div><strong>Rangos detectados:</strong> {info.rangosDetectados} (ej: {info.ejemplosRangos.join(', ')})</div>
                            </div>
                          </div>
                        )}
                        
                        <details className="mt-2">
                          <summary className="cursor-pointer font-medium text-blue-600">
                            Ver ejemplos ({info.valores.length})
                          </summary>
                          <div className="mt-1 p-2 bg-white rounded border text-xs max-h-32 overflow-y-auto">
                            {info.valores.slice(0, 10).map((valor, i) => (
                              <div key={i} className="flex justify-between">
                                <span>•</span>
                                <span className={`flex-1 ml-1 truncate ${
                                  valor?.toString().includes('-') ? 'font-bold text-orange-600' : ''
                                }`}>
                                  {valor?.toString() || '(vacío)'}
                                  {valor?.toString().includes('-') && <span className="ml-1 text-orange-400">📦</span>}
                                </span>
                              </div>
                            ))}
                            {info.valores.length > 10 && 
                              <div className="text-center text-gray-500 mt-1">
                                ... y {info.valores.length - 10} más
                              </div>
                            }
                          </div>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>
                
                {Object.keys(hoja.tiposDato).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No se pudo analizar la estructura de datos. 
                    Verifica que el archivo tenga la estructura esperada.
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* ANÁLISIS CRUZADO INVOICE vs PACKING LIST */}
          {analisisCruzado && (
            <div className="card-mare mt-6">
              <h3 className="text-xl font-bold mb-4">🔄 Análisis Cruzado: INVOICE vs PACKING LIST</h3>
              
              {/* Resumen */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{analisisCruzado.resumen.totalInvoice}</div>
                  <div className="text-sm text-gray-600">Productos en Invoice</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{analisisCruzado.resumen.totalPacking}</div>
                  <div className="text-sm text-gray-600">Productos en Packing</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{analisisCruzado.resumen.coincidencias}</div>
                  <div className="text-sm text-gray-600">✅ Coincidencias</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{analisisCruzado.resumen.diferencias}</div>
                  <div className="text-sm text-gray-600">⚠️ Diferencias</div>
                </div>
              </div>

              {/* Coincidencias */}
              {analisisCruzado.coincidencias.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-bold text-green-700 mb-2">✅ Productos que Coinciden ({analisisCruzado.coincidencias.length})</h4>
                  <div className="text-xs text-gray-600 mb-2">Productos con cantidades exactas entre Invoice y Packing List</div>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full border-collapse border border-gray-300 text-xs">
                      <thead className="bg-green-50">
                        <tr>
                          <th className="border border-gray-300 px-1 py-1">Código</th>
                          <th className="border border-gray-300 px-1 py-1">Cant</th>
                          <th className="border border-gray-300 px-1 py-1">Precio</th>
                          <th className="border border-gray-300 px-1 py-1">Total FOB</th>
                          <th className="border border-gray-300 px-1 py-1">Peso</th>
                          <th className="border border-gray-300 px-1 py-1">CBM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analisisCruzado.coincidencias.slice(0, 5).map((prod, i) => (
                          <tr key={i} className="bg-white">
                            <td className="border border-gray-300 px-1 py-1 font-bold">{prod.codigo}</td>
                            <td className="border border-gray-300 px-1 py-1 text-center">{prod.cantidadInvoice}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right">${prod.precioUnitario}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right font-bold">${prod.totalFOB}</td>
                            <td className="border border-gray-300 px-1 py-1 text-right">{prod.pesoUnitario}g</td>
                            <td className="border border-gray-300 px-1 py-1 text-right">{prod.cbm}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {analisisCruzado.coincidencias.length > 5 && (
                      <p className="text-xs text-gray-500 mt-1 text-center">... y {analisisCruzado.coincidencias.length - 5} productos más</p>
                    )}
                  </div>
                </div>
              )}

              {/* Diferencias */}
              {analisisCruzado.diferencias.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-bold text-red-700 mb-2">⚠️ Diferencias de Cantidad ({analisisCruzado.diferencias.length})</h4>
                  <div className="max-h-32 overflow-y-auto">
                    <table className="w-full border-collapse border border-gray-300 text-xs">
                      <thead className="bg-red-50">
                        <tr>
                          <th className="border border-gray-300 px-1 py-1">Código</th>
                          <th className="border border-gray-300 px-1 py-1">Invoice</th>
                          <th className="border border-gray-300 px-1 py-1">Packing</th>
                          <th className="border border-gray-300 px-1 py-1">Dif</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analisisCruzado.diferencias.map((prod, i) => (
                          <tr key={i} className="bg-white">
                            <td className="border border-gray-300 px-1 py-1 font-bold">{prod.codigo}</td>
                            <td className="border border-gray-300 px-1 py-1 text-center">{prod.cantidadInvoice}</td>
                            <td className="border border-gray-300 px-1 py-1 text-center">{prod.cantidadPacking}</td>
                            <td className="border border-gray-300 px-1 py-1 text-center font-bold text-red-600">±{prod.diferenciaCantidad}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Productos únicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analisisCruzado.soloEnInvoice.length > 0 && (
                  <div className="p-3 bg-orange-50 rounded border border-orange-200">
                    <h4 className="font-bold text-orange-700 mb-2">📄 Solo en Invoice ({analisisCruzado.soloEnInvoice.length})</h4>
                    <div className="max-h-24 overflow-y-auto text-xs">
                      {analisisCruzado.soloEnInvoice.slice(0, 5).map((prod, i) => (
                        <div key={i} className="flex justify-between py-1">
                          <span className="font-bold">{prod.codigo}</span>
                          <span>{prod.cantidadInvoice} pcs</span>
                        </div>
                      ))}
                      {analisisCruzado.soloEnInvoice.length > 5 && (
                        <div className="text-center text-gray-500">... +{analisisCruzado.soloEnInvoice.length - 5}</div>
                      )}
                    </div>
                  </div>
                )}
                
                {analisisCruzado.soloEnPacking.length > 0 && (
                  <div className="p-3 bg-purple-50 rounded border border-purple-200">
                    <h4 className="font-bold text-purple-700 mb-2">📦 Solo en Packing ({analisisCruzado.soloEnPacking.length})</h4>
                    <div className="max-h-24 overflow-y-auto text-xs">
                      {analisisCruzado.soloEnPacking.slice(0, 5).map((prod, i) => (
                        <div key={i} className="flex justify-between py-1">
                          <span className="font-bold">{prod.codigo}</span>
                          <span>{prod.cantidadPacking} pcs</span>
                        </div>
                      ))}
                      {analisisCruzado.soloEnPacking.length > 5 && (
                        <div className="text-center text-gray-500">... +{analisisCruzado.soloEnPacking.length - 5}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={copiarAnalisis} className="btn-mare-secondary">
              📋 Copiar Análisis
            </button>
            <button 
              onClick={() => { setAnalisis(null); setAnalisisCruzado(null); }} 
              className="btn-mare"
            >
              📤 Analizar Otro Archivo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}