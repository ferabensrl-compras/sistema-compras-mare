// src/pages/OrdenesCompra.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  FileText, 
  Download,
  Edit,
  Eye,
  CheckCircle,
  Clock,
  Package,
  Truck,
  AlertCircle,
  Printer,
  X,
  ShoppingCart,
  Trash2
} from 'lucide-react';
import { supabase } from '../services/supabase';
import OrdenCompraForm from '../components/OrdenCompraForm';
import ControlInvoiceInteligente from '../components/ControlInvoiceInteligente';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
// import { verificarProveedorPortal } from '../services/quoteToOrderService'; // REMOVED - supplier system disabled

export default function OrdenesCompra() {
  const [ordenes, setOrdenes] = useState([]);
  // ESTADO ELIMINADO: cotizaciones - Sistema simplificado sin cotizaciones
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrden, setSelectedOrden] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingProductIndex, setEditingProductIndex] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceProducts, setInvoiceProducts] = useState([]);
  const [showControlInvoice, setShowControlInvoice] = useState(false);
  const [embarques, setEmbarques] = useState([]);
  const [embarqueActivo, setEmbarqueActivo] = useState(null);
  const [filtroEmbarque, setFiltroEmbarque] = useState('activo'); // 'activo', 'todos', 'embarqueId'
  // ESTADO ELIMINADO: enviandoAlPortal - Sistema de portal eliminado

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar embarques
      const { data: embarquesData, error: embarquesError } = await supabase
        .from('embarques')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (embarquesError) throw embarquesError;

      // Encontrar embarque activo (el más reciente que no esté 'recibido')
      const embarqueActual = embarquesData?.find(e => e.estado !== 'recibido') || null;
      
      // Cargar órdenes con relaciones
      const { data: ordenesData, error: ordenesError } = await supabase
        .from('ordenes_compra')
        .select(`
          *,
          proveedor:proveedores(id, nombre, contacto),
          embarque:embarques(id, codigo, estado)
        `)
        .order('created_at', { ascending: false });
      
      if (ordenesError) throw ordenesError;
      
      // NOTA: Sistema de cotizaciones eliminado - ahora solo OCs manuales

      // Cargar proveedores para OC manual
      const { data: provData, error: provError } = await supabase
        .from('proveedores')
        .select('id, nombre, contacto')
        .order('nombre');

      if (provError) throw provError;
      
      setOrdenes(ordenesData || []);
      // LÍNEA ELIMINADA: setCotizaciones - Sistema simplificado sin cotizaciones
      setProveedores(provData || []);
      setEmbarques(embarquesData || []);
      setEmbarqueActivo(embarqueActual);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // Eliminar orden de compra
  const eliminarOrdenCompra = async (orden) => {
    if (!confirm(`¿Estás seguro de eliminar la orden ${orden.numero}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('ordenes_compra')
        .delete()
        .eq('id', orden.id);

      if (error) throw error;

      // Actualizar estado local
      setOrdenes(ordenes.filter(oc => oc.id !== orden.id));
      
      // Si era la orden seleccionada, deseleccionar
      if (selectedOrden?.id === orden.id) {
        setSelectedOrden(null);
      }

      alert('Orden de compra eliminada correctamente');
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar orden de compra');
    }
  };

  // Filtrar órdenes por embarque (usando el nuevo campo embarque_id)
  const filtrarOrdenesPorEmbarque = () => {
    if (filtroEmbarque === 'todos') {
      return ordenes; // Mostrar todas
    }
    
    if (filtroEmbarque === 'activo') {
      // Mostrar OCs del embarque activo o sin embarque
      if (!embarqueActivo) {
        return ordenes.filter(oc => !oc.embarque_id); // Solo OCs sin embarque
      }
      
      // OCs del embarque activo + OCs sin embarque
      return ordenes.filter(oc => 
        oc.embarque_id === embarqueActivo.id || !oc.embarque_id
      );
    }
    
    // Filtrar por embarque específico
    return ordenes.filter(oc => oc.embarque_id === filtroEmbarque);
  };

  // Generar número único de OC (global, no por proveedor)
  const generarNumeroOC = async () => {
    try {
      const { data, error } = await supabase
        .from('ordenes_compra')
        .select('numero')
        .order('numero', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const lastNumber = parseInt(data[0].numero.split('-')[1]);
        const nextNumber = Math.max(lastNumber + 1, 2320); // Asegurar que sea al menos 2320
        return `OC-${String(nextNumber).padStart(6, '0')}`;
      }
      
      // Comenzar desde OC-002320 si no hay órdenes
      return 'OC-002320';
    } catch (error) {
      console.error('Error generando número de OC:', error);
      return `OC-${Date.now().toString().slice(-4)}`; // Fallback con timestamp
    }
  };

  // FUNCIÓN ELIMINADA: crearOrdenDesde (cotizaciones) - Sistema simplificado a OCs manuales únicamente

  // Actualizar cantidad de un producto
  const actualizarCantidad = async (indexProducto, nuevaCantidad) => {
    if (!selectedOrden || selectedOrden.estado !== 'borrador') return;

    try {
      const productosActualizados = [...selectedOrden.productos];
      productosActualizados[indexProducto].cantidad = parseInt(nuevaCantidad) || 0;
      productosActualizados[indexProducto].total_fob = 
        productosActualizados[indexProducto].precio_fob * productosActualizados[indexProducto].cantidad;
      
      const nuevoTotal = productosActualizados.reduce((sum, p) => sum + p.total_fob, 0);

      const { error } = await supabase
        .from('ordenes_compra')
        .update({ 
          productos: productosActualizados,
          total_fob: nuevoTotal
        })
        .eq('id', selectedOrden.id);

      if (error) throw error;

      setSelectedOrden({
        ...selectedOrden,
        productos: productosActualizados,
        total_fob: nuevoTotal
      });

      setOrdenes(ordenes.map(oc => 
        oc.id === selectedOrden.id 
          ? { ...oc, productos: productosActualizados, total_fob: nuevoTotal }
          : oc
      ));

    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar cantidad');
    }
  };

  // Cambiar estado de la OC
  const cambiarEstado = async (nuevoEstado) => {
    if (!selectedOrden) return;

    try {
      let productosActualizados = selectedOrden.productos;
      
      // Si se confirma la orden, generar códigos de barra
      if (nuevoEstado === 'confirmada' && selectedOrden.estado === 'borrador') {
        productosActualizados = await generarCodigosBarras(productosActualizados);
      }

      const { error } = await supabase
        .from('ordenes_compra')
        .update({ 
          estado: nuevoEstado,
          productos: productosActualizados
        })
        .eq('id', selectedOrden.id);

      if (error) throw error;

      const ordenActualizada = {
        ...selectedOrden,
        estado: nuevoEstado,
        productos: productosActualizados
      };

      setSelectedOrden(ordenActualizada);
      setOrdenes(ordenes.map(oc => 
        oc.id === selectedOrden.id ? ordenActualizada : oc
      ));

    } catch (error) {
      console.error('Error:', error);
      alert('Error al cambiar estado');
    }
  };

  // Generar códigos de barra para productos nuevos
  const generarCodigosBarras = async (productos) => {
    const productosActualizados = [];
    
    for (const producto of productos) {
      if (!producto.codigo_barras && producto.codigo_producto) {
        // Verificar si el producto ya existe en el catálogo
        const { data: productoExistente } = await supabase
          .from('productos')
          .select('codigo_barras')
          .eq('codigo', producto.codigo_producto)
          .single();
        
        if (productoExistente?.codigo_barras) {
          // Usar código existente
          producto.codigo_barras = productoExistente.codigo_barras;
        } else {
          // Generar nuevo código
          const numericCode = Date.now().toString().slice(-12);
          producto.codigo_barras = numericCode;
        }
      }
      productosActualizados.push(producto);
    }
    
    return productosActualizados;
  };

  // Abrir modal de edición de producto
  const abrirEdicionProducto = (producto, index) => {
    setEditingProduct(producto);
    setEditingProductIndex(index);
    setShowEditForm(true);
  };

  // Actualizar producto editado
  const actualizarProductoEditado = async (productoActualizado) => {
    if (!selectedOrden || editingProductIndex === null) return;

    try {
      const productosActualizados = [...selectedOrden.productos];
      productosActualizados[editingProductIndex] = productoActualizado;
      
      // Recalcular total
      const nuevoTotal = productosActualizados.reduce((sum, p) => sum + p.total_fob, 0);

      const { data, error } = await supabase
        .from('ordenes_compra')
        .update({ 
          productos: productosActualizados,
          total_fob: nuevoTotal
        })
        .eq('id', selectedOrden.id)
        .select(`
          *,
          proveedor:proveedores(id, nombre, contacto)
        `)
        .single();

      if (error) throw error;

      setSelectedOrden(data);
      setOrdenes(ordenes.map(ord => 
        ord.id === data.id ? data : ord
      ));

      // Cerrar modal
      setEditingProduct(null);
      setEditingProductIndex(null);
      setShowEditForm(false);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar producto');
    }
  };

  // Crear OC manual (para tu proceso real)
  const crearOCManual = async (proveedorId, notas = '') => {
    try {
      const numeroOC = await generarNumeroOC();
      
      const { data, error } = await supabase
        .from('ordenes_compra')
        .insert([{
          numero: numeroOC,
          proveedor_id: proveedorId,
          fecha: new Date().toISOString().split('T')[0],
          productos: [],
          total_fob: 0,
          estado: 'borrador',
          embarque_id: embarqueActivo?.id || null, // Auto-asignar al embarque activo
          comentarios: notas || `OC creada manualmente - ${new Date().toLocaleDateString()}${embarqueActivo ? ` (Embarque: ${embarqueActivo.codigo})` : ''}`
        }])
        .select(`
          *,
          proveedor:proveedores(id, nombre, contacto)
        `)
        .single();

      if (error) throw error;

      // Si hay embarque activo, actualizar su array de ordenes_ids
      if (embarqueActivo && data.id) {
        const { data: embarqueData, error: embarqueError } = await supabase
          .from('embarques')
          .select('ordenes_ids')
          .eq('id', embarqueActivo.id)
          .single();
        
        if (!embarqueError && embarqueData) {
          const nuevasOrdenes = [...(embarqueData.ordenes_ids || []), data.id];
          await supabase
            .from('embarques')
            .update({ ordenes_ids: nuevasOrdenes })
            .eq('id', embarqueActivo.id);
        }
      }

      // Actualizar la lista de órdenes
      setOrdenes([data, ...ordenes]);
      setSelectedOrden(data);
      setShowManualForm(false);
      
      alert(`¡OC ${numeroOC} creada exitosamente! Ahora puedes agregar productos.`);
      
    } catch (error) {
      console.error('Error creando OC manual:', error);
      alert('Error al crear OC: ' + error.message);
    }
  };

  // Convertir base64 a buffer
  const base64ToBuffer = (base64) => {
    const base64Data = base64.split(',')[1]; // Quitar el prefijo data:image/...
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Exportar a Excel con imágenes
  const exportarExcel = async () => {
    if (!selectedOrden) return;

    try {
      const wb = XLSX.utils.book_new();
      
      // HOJA PRINCIPAL - SOLO EN INGLÉS
      const dataHeader = [];
      
      // Información de la orden
      dataHeader.push(['PURCHASE ORDER']);
      dataHeader.push(['']);
      dataHeader.push(['Order Number:', selectedOrden.numero]);
      dataHeader.push(['Supplier:', selectedOrden.proveedor?.nombre || '']);
      dataHeader.push(['Embarque / Shipment:', selectedOrden.embarque?.codigo || 'N/A']);
      dataHeader.push(['Date:', new Date(selectedOrden.fecha).toLocaleDateString()]);
      dataHeader.push(['Status:', selectedOrden.estado]);
      dataHeader.push(['Total FOB USD:', `$${selectedOrden.total_fob.toFixed(2)}`]);
      dataHeader.push(['']);
      dataHeader.push(['Comments:']);
      dataHeader.push([selectedOrden.comentarios || 'No comments']);
      dataHeader.push(['']);
      dataHeader.push(['PRODUCTS']);
      dataHeader.push(['']);
      
      // Headers de productos - EXACTO AL PDF
      const headers = [
        'Item#',
        'Internal Code',
        'Supplier Code',
        'Supplier File',
        'Category',
        'Product Name',
        'FOB Price',
        'Quantity', 
        'Total FOB',
        'Barcode EAN13',
        'Production Time',
        'Notes',
        'Images Info'
      ];
      
      dataHeader.push(headers);
      
      // Agregar productos con mismo formato que PDF
      selectedOrden.productos.forEach((prod, index) => {
        dataHeader.push([
          index + 1,
          prod.codigo_producto || '',
          prod.codigo_proveedor || '',
          prod.nombre_archivo_proveedor || '',
          prod.categoria || '',
          prod.nombre || '',
          `$${(prod.precio_fob || 0).toFixed(2)}`,
          prod.cantidad || 0,
          `$${(prod.total_fob || 0).toFixed(2)}`,
          prod.codigo_barras || '',
          prod.tiempo_produccion || '',
          prod.notas || '',
          prod.imagenes?.length > 0 ? `${prod.imagenes.length} images - Check PDF` : 'No images'
        ]);
      });
      
      // Agregar resumen final
      dataHeader.push(['']);
      dataHeader.push(['SUMMARY']);
      dataHeader.push(['Total Products:', selectedOrden.productos.length]);
      dataHeader.push(['Total Quantity:', selectedOrden.productos.reduce((sum, p) => sum + (p.cantidad || 0), 0)]);
      dataHeader.push(['Total FOB USD:', `$${selectedOrden.total_fob.toFixed(2)}`]);
      dataHeader.push(['']);
      dataHeader.push(['NOTE: For product images, please check the PDF file']);
      dataHeader.push(['All images include annotations and specifications']);
      
      // Crear worksheet principal
      const wsMain = XLSX.utils.aoa_to_sheet(dataHeader);
      
      // Configurar columnas con anchos apropiados - MISMAS PROPORCIONES QUE PDF
      wsMain['!cols'] = [
        { wch: 8 },   // Item#
        { wch: 18 },  // Internal Code
        { wch: 18 },  // Supplier Code  
        { wch: 25 },  // Supplier File
        { wch: 15 },  // Category
        { wch: 35 },  // Product Name
        { wch: 12 },  // FOB Price
        { wch: 10 },  // Quantity
        { wch: 12 },  // Total FOB
        { wch: 20 },  // Barcode EAN13
        { wch: 20 },  // Production Time
        { wch: 30 },  // Notes
        { wch: 25 }   // Images Info
      ];
      
      // Configurar alturas de filas para mejor legibilidad
      const rowHeights = [];
      
      // Headers y información general con altura normal
      for (let i = 0; i < 13; i++) { // 13 filas antes de la tabla de productos
        rowHeights[i] = { hpt: 20 };
      }
      
      // Header de tabla de productos
      rowHeights[13] = { hpt: 25 };
      
      // Filas de productos con altura media
      for (let i = 0; i < selectedOrden.productos.length; i++) {
        rowHeights[14 + i] = { hpt: 35 }; // Altura media para copiar/pegar fácil
      }
      
      // Filas de resumen
      const startSummary = 14 + selectedOrden.productos.length;
      for (let i = startSummary; i < dataHeader.length; i++) {
        rowHeights[i] = { hpt: 20 };
      }
      
      wsMain['!rows'] = rowHeights;
      
      // Agregar hoja principal
      XLSX.utils.book_append_sheet(wb, wsMain, 'Purchase Order');
      
      // Crear hoja separada con imágenes detalladas
      if (selectedOrden.productos.some(p => p.imagenes && p.imagenes.length > 0)) {
        const imagenesData = [];
        imagenesData.push(['IMAGES REFERENCE / REFERENCIA DE IMÁGENES']);
        imagenesData.push(['']);
        imagenesData.push(['Important / Importante: All images are included in the PDF file / Todas las imágenes están incluidas en el archivo PDF']);
        imagenesData.push(['Images include annotations and specifications / Las imágenes incluyen anotaciones y especificaciones']);
        imagenesData.push(['']);
        
        // Tabla simple de referencia
        imagenesData.push(['Item#', 'Internal Code', 'Supplier Code', 'Product Name', 'Images Count', 'Status']);
        
        selectedOrden.productos.forEach((prod, index) => {
          if (prod.imagenes && prod.imagenes.length > 0) {
            imagenesData.push([
              index + 1,
              prod.codigo_producto || 'N/A',
              prod.codigo_proveedor || 'N/A', 
              prod.nombre || 'N/A',
              prod.imagenes.length,
              'Edited with annotations'
            ]);
          }
        });
        
        imagenesData.push(['']);
        imagenesData.push(['For visual specifications, please refer to PDF file']);
        imagenesData.push(['Para especificaciones visuales, consultar archivo PDF']);
        
        const wsImagenes = XLSX.utils.aoa_to_sheet(imagenesData);
        wsImagenes['!cols'] = [
          { wch: 8 },   // Item#
          { wch: 18 },  // Internal Code
          { wch: 18 },  // Supplier Code
          { wch: 35 },  // Product Name
          { wch: 15 },  // Images Count
          { wch: 25 }   // Status
        ];
        XLSX.utils.book_append_sheet(wb, wsImagenes, 'Images Reference');
      }
      
      // Guardar referencia en base de datos
      const fecha = new Date().toISOString().split('T')[0];
      const nombreArchivo = `OC_${selectedOrden.numero}_${fecha}.xlsx`;
      
      // Actualizar registro en Supabase
      await supabase
        .from('ordenes_compra')
        .update({ archivo_excel: nombreArchivo })
        .eq('id', selectedOrden.id);
      
      // Generar y descargar archivo
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(data, nombreArchivo);
      
      // Mostrar mensaje informativo
      alert(`Excel generado exitosamente!

- Productos con formato expandido
- ${selectedOrden.productos.filter(p => p.imagenes?.length > 0).length} productos con imágenes
- Hoja separada "Imágenes" con detalles

NOTA: Las imágenes editadas están integradas en el proceso. Para enviar las imágenes reales al proveedor, considere adjuntar archivos de imagen por separado.`);
      
    } catch (error) {
      console.error('Error generando Excel:', error);
      alert('Error al generar Excel: ' + error.message);
    }
  };

  // Generar PDF profesional con imágenes integradas
  const exportarPDF = async () => {
    if (!selectedOrden) return;
    
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let yPosition = 20;

      // HEADER PRINCIPAL
      doc.setFillColor(139, 101, 77); // Color marrón MARÉ
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('PURCHASE ORDER', pageWidth / 2, 18, { align: 'center' });
      
      doc.setFontSize(16);
      doc.text(`${selectedOrden.numero}`, pageWidth / 2, 30, { align: 'center' });
      
      yPosition = 50;

      // INFORMACIÓN GENERAL
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      const infoBox = [
        `Supplier: ${selectedOrden.proveedor?.nombre || 'N/A'}`,
        `Embarque / Shipment: ${selectedOrden.embarque?.codigo || 'N/A'}`,
        `Date: ${new Date(selectedOrden.fecha).toLocaleDateString()}`,
        `Status: ${selectedOrden.estado.toUpperCase()}`,
        `Total FOB: $${selectedOrden.total_fob.toFixed(2)} USD`
      ];
      
      doc.setDrawColor(200, 200, 200);
      doc.rect(15, yPosition, pageWidth - 30, 25);
      
      infoBox.forEach((line, index) => {
        doc.text(line, 20, yPosition + 8 + (index * 5));
      });
      
      yPosition += 35;

      // PRODUCTOS CON IMÁGENES
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('DETAILED PRODUCTS', 20, yPosition);
      yPosition += 10;

      for (let i = 0; i < selectedOrden.productos.length; i++) {
        const producto = selectedOrden.productos[i];
        
        // Verificar espacio en página
        const espacioNecesario = producto.imagenes && producto.imagenes.length > 0 ? 120 : 60;
        if (yPosition + espacioNecesario > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }

        // HEADER DEL PRODUCTO
        doc.setFillColor(245, 235, 220); // Fondo nude suave
        doc.rect(15, yPosition, pageWidth - 30, 25, 'F');
        doc.setDrawColor(139, 101, 77);
        doc.rect(15, yPosition, pageWidth - 30, 25);

        doc.setTextColor(139, 101, 77);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${i + 1}. Product Name: ${producto.nombre}`, 20, yPosition + 8);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Internal Code: ${producto.codigo_producto || 'N/A'}`, 20, yPosition + 15);
        doc.text(`Supplier Code: ${producto.codigo_proveedor || 'N/A'}`, 20, yPosition + 20);
        doc.text(`Category: ${producto.categoria || 'No category'}`, 120, yPosition + 15);
        doc.text(`Quantity: ${producto.cantidad} pcs`, 120, yPosition + 20);

        yPosition += 25;

        // Mostrar archivo del proveedor si existe
        if (producto.nombre_archivo_proveedor) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(9);
          doc.text(`Supplier File: ${producto.nombre_archivo_proveedor}`, 20, yPosition);
          yPosition += 6;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
        }

        yPosition += 5;

        // DETALLES DEL PRODUCTO
        const detalles = [
          `FOB Price: $${producto.precio_fob} USD`,
          `Total FOB: $${producto.total_fob.toFixed(2)} USD`,
          `Production Time: ${producto.tiempo_produccion || 'N/A'}`,
          `Barcode: ${producto.codigo_barras || 'Pending'}`
        ];

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        detalles.forEach((detalle, index) => {
          const x = index < 2 ? 20 : 120;
          const y = yPosition + (index % 2) * 6;
          doc.text(detalle, x, y);
        });

        yPosition += 15;

        // NOTAS SI EXISTEN
        if (producto.notas) {
          doc.setFont('helvetica', 'bold');
          doc.text('Notes:', 20, yPosition);
          doc.setFont('helvetica', 'normal');
          
          // Dividir texto largo en líneas
          const notasLineas = doc.splitTextToSize(producto.notas, pageWidth - 50);
          doc.text(notasLineas, 20, yPosition + 6);
          yPosition += 6 + (notasLineas.length * 4);
        }

        yPosition += 10;

        // IMÁGENES DEL PRODUCTO
        if (producto.imagenes && producto.imagenes.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.text(`EDITED IMAGES (${producto.imagenes.length})`, 20, yPosition);
          yPosition += 8;

          // Calcular layout de imágenes
          const imageWidth = 35;
          const imageHeight = 35;
          const imagesPerRow = Math.floor((pageWidth - 40) / (imageWidth + 5));
          let currentRow = 0;
          let currentCol = 0;

          for (let imgIndex = 0; imgIndex < producto.imagenes.length; imgIndex++) {
            try {
              const imagen = producto.imagenes[imgIndex];
              
              // Posición de la imagen
              const x = 20 + (currentCol * (imageWidth + 5));
              const y = yPosition + (currentRow * (imageHeight + 5));

              // Verificar si necesita nueva página
              if (y + imageHeight > pageHeight - 20) {
                doc.addPage();
                yPosition = 20;
                currentRow = 0;
                currentCol = 0;
              }

              // Insertar imagen editada
              doc.addImage(imagen, 'PNG', x, y, imageWidth, imageHeight);
              
              // Borde y número de imagen
              doc.setDrawColor(139, 101, 77);
              doc.rect(x, y, imageWidth, imageHeight);
              
              doc.setFillColor(139, 101, 77);
              doc.rect(x, y + imageHeight - 5, 5, 5, 'F');
              doc.setTextColor(255, 255, 255);
              doc.setFontSize(6);
              doc.text(`${imgIndex + 1}`, x + 1, y + imageHeight - 1);
              doc.setTextColor(0, 0, 0);

              currentCol++;
              if (currentCol >= imagesPerRow) {
                currentCol = 0;
                currentRow++;
              }
            } catch (error) {
              console.error(`Error agregando imagen ${imgIndex}:`, error);
            }
          }

          // Ajustar yPosition después de las imágenes
          const totalRows = Math.ceil(producto.imagenes.length / imagesPerRow);
          yPosition += (totalRows * (imageHeight + 5)) + 10;

        }

        // Separador entre productos
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 15;
      }

      // FOOTER FINAL
      if (yPosition + 30 > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFillColor(245, 235, 220);
      doc.rect(15, yPosition, pageWidth - 30, 25, 'F');
      
      doc.setTextColor(139, 101, 77);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMEN FINAL / FINAL SUMMARY', pageWidth / 2, yPosition + 8, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Total de productos / Total products: ${selectedOrden.productos.length}`, 20, yPosition + 18);
      doc.text(`TOTAL FOB: $${selectedOrden.total_fob.toFixed(2)} USD`, pageWidth - 70, yPosition + 18);

      yPosition += 30;

      // Información de contacto
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.text('FERABEN / MARÉ - Sistema de Compras', pageWidth / 2, yPosition, { align: 'center' });
      doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition + 5, { align: 'center' });

      // Actualizar referencia en base de datos
      const fileName = `OC_${selectedOrden.numero}_COMPLETA_${new Date().toISOString().split('T')[0]}.pdf`;
      await supabase
        .from('ordenes_compra')
        .update({ archivo_pdf: fileName })
        .eq('id', selectedOrden.id);

      // Guardar PDF
      doc.save(fileName);

      // Mensaje de éxito
      const productosConImagenes = selectedOrden.productos.filter(p => p.imagenes && p.imagenes.length > 0).length;
      const totalImagenes = selectedOrden.productos.reduce((sum, p) => sum + (p.imagenes?.length || 0), 0);
      
      alert(`¡PDF generado exitosamente! 🎉

📋 ${selectedOrden.productos.length} productos incluidos
🖼️ ${productosConImagenes} productos con imágenes
📸 ${totalImagenes} imágenes editadas integradas

✅ El proveedor verá todo en un solo archivo profesional`);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar PDF: ' + error.message);
    }
  };

  // Descargar ZIP de imágenes
  const descargarImagenesZIP = async () => {
    if (!selectedOrden) return;
    try {
      const zip = new JSZip();
      let totalImagenes = 0;
      
      for (const producto of selectedOrden.productos) {
        if (producto.imagenes?.length > 0) {
          const codigo = producto.codigo_producto || producto.codigo_proveedor || 'PROD';
          
          for (let i = 0; i < producto.imagenes.length; i++) {
            const imagen = producto.imagenes[i];
            const response = await fetch(imagen);
            const blob = await response.blob();
            const nombre = `${codigo}_img${i + 1}.png`;
            zip.file(nombre, blob);
            totalImagenes++;
          }
        }
      }
      
      if (totalImagenes === 0) {
        alert('No hay imágenes para descargar.');
        return;
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const fileName = `OC_${selectedOrden.numero}_IMAGENES.zip`;
      saveAs(zipBlob, fileName);
      alert(`ZIP creado: ${totalImagenes} imágenes organizadas`);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  // Generar página web temporal para visualización del proveedor
  const generarPaginaWeb = async () => {
    if (!selectedOrden) return;

    try {
      const productosConImagenes = selectedOrden.productos.filter(p => p.imagenes && p.imagenes.length > 0).length;
      const totalImagenes = selectedOrden.productos.reduce((sum, p) => sum + (p.imagenes?.length || 0), 0);

      const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orden de Compra ${selectedOrden.numero} - MARÉ</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 15px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: linear-gradient(135deg, #8b654d 0%, #a0725c 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { font-size: 2.5rem; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .header .subtitle { font-size: 1.2rem; opacity: 0.9; }
        .info-box { padding: 25px; background: #f8f9fa; border-bottom: 1px solid #dee2e6; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .info-item { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .info-label { font-weight: bold; color: #8b654d; font-size: 0.9rem; }
        .info-value { font-size: 1.1rem; margin-top: 5px; }
        .products-section { padding: 30px; }
        .section-title { font-size: 1.8rem; color: #8b654d; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 3px solid #8b654d; }
        .product-card { background: #fff; border: 1px solid #e9ecef; border-radius: 12px; margin-bottom: 30px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.08); }
        .product-header { background: linear-gradient(135deg, #f5ebdc 0%, #e8d5c4 100%); padding: 20px; border-bottom: 1px solid #d1c7b7; }
        .product-title { font-size: 1.4rem; font-weight: bold; color: #8b654d; margin-bottom: 10px; }
        .product-codes { display: flex; gap: 15px; flex-wrap: wrap; }
        .code-item { background: white; padding: 8px 12px; border-radius: 20px; font-size: 0.9rem; border: 1px solid #d1c7b7; }
        .product-details { padding: 20px; }
        .details-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .detail-item { padding: 10px; background: #f8f9fa; border-radius: 6px; }
        .detail-label { font-weight: bold; color: #495057; font-size: 0.9rem; }
        .detail-value { color: #212529; margin-top: 2px; }
        .notes-section { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 15px 0; }
        .images-section { margin-top: 20px; }
        .images-title { font-size: 1.2rem; font-weight: bold; color: #8b654d; margin-bottom: 15px; display: flex; align-items: center; }
        .images-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 15px; }
        .image-item { position: relative; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 8px rgba(0,0,0,0.1); transition: transform 0.3s ease; }
        .image-item:hover { transform: scale(1.05); }
        .image-item img { width: 100%; height: 150px; object-fit: cover; display: block; }
        .image-number { position: absolute; top: 5px; left: 5px; background: #8b654d; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
        .image-edited-badge { position: absolute; bottom: 5px; right: 5px; background: #28a745; color: white; padding: 2px 6px; border-radius: 6px; font-size: 0.7rem; }
        .footer { background: #8b654d; color: white; padding: 25px; text-align: center; }
        .summary-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; text-align: center; }
        .summary-item { background: white; padding: 15px; border-radius: 8px; }
        .summary-number { font-size: 2rem; font-weight: bold; color: #8b654d; }
        .summary-label { color: #6c757d; font-size: 0.9rem; margin-top: 5px; }
        .download-section { text-align: center; margin: 30px 0; }
        .download-btn { background: #8b654d; color: white; padding: 12px 25px; border: none; border-radius: 25px; font-size: 1rem; cursor: pointer; text-decoration: none; display: inline-block; margin: 0 10px; transition: background 0.3s ease; }
        .download-btn:hover { background: #6d4c39; }
        @media print { body { background: white; } .container { box-shadow: none; } .download-section { display: none; } }
        @media (max-width: 768px) { .info-grid, .details-grid { grid-template-columns: 1fr; } .images-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); } }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>ORDEN DE COMPRA / PURCHASE ORDER</h1>
            <div class="subtitle">${selectedOrden.numero}</div>
        </header>

        <div class="info-box">
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Proveedor / Supplier</div>
                    <div class="info-value">${selectedOrden.proveedor?.nombre || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Embarque / Shipment</div>
                    <div class="info-value">${selectedOrden.embarque?.codigo || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Fecha / Date</div>
                    <div class="info-value">${new Date(selectedOrden.fecha).toLocaleDateString()}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Estado / Status</div>
                    <div class="info-value" style="text-transform: uppercase;">${selectedOrden.estado}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Total FOB</div>
                    <div class="info-value" style="color: #8b654d; font-weight: bold;">$${selectedOrden.total_fob.toFixed(2)} USD</div>
                </div>
            </div>
        </div>

        <div class="summary-box">
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-number">${selectedOrden.productos.length}</div>
                    <div class="summary-label">Productos Total / Total Products</div>
                </div>
                <div class="summary-item">
                    <div class="summary-number">${productosConImagenes}</div>
                    <div class="summary-label">Con Imágenes / With Images</div>
                </div>
                <div class="summary-item">
                    <div class="summary-number">${totalImagenes}</div>
                    <div class="summary-label">Imágenes Editadas / Edited Images</div>
                </div>
            </div>
        </div>

        <div class="download-section">
            <h3 style="color: #8b654d; margin-bottom: 20px;">Descargas Disponibles / Available Downloads</h3>
            <button class="download-btn" onclick="window.print()">Imprimir / Print</button>
            <button class="download-btn" onclick="downloadPDF()">Descargar PDF / Download PDF</button>
            <button class="download-btn" onclick="downloadExcel()">Descargar Excel / Download Excel</button>
            <button class="download-btn" onclick="downloadImages()">Descargar Imagenes ZIP / Download Images ZIP</button>
        </div>

        <div class="products-section">
            <h2 class="section-title">PRODUCTOS DETALLADOS / DETAILED PRODUCTS</h2>
            
            ${selectedOrden.productos.map((producto, index) => `
                <div class="product-card">
                    <div class="product-header">
                        <div class="product-title">${index + 1}. Nombre del producto / Product Name: ${producto.nombre}</div>
                        <div class="product-codes">
                            ${producto.codigo_producto ? `<div class="code-item"><strong>Codigo Interno / Internal Code:</strong> ${producto.codigo_producto}</div>` : ''}
                            ${producto.codigo_proveedor ? `<div class="code-item"><strong>Codigo Proveedor / Supplier Code:</strong> ${producto.codigo_proveedor}</div>` : ''}
                            ${producto.nombre_archivo_proveedor ? `<div class="code-item"><strong>Archivo Proveedor / Supplier File:</strong> ${producto.nombre_archivo_proveedor}</div>` : ''}
                            ${producto.categoria ? `<div class="code-item"><strong>Categoria / Category:</strong> ${producto.categoria}</div>` : ''}
                        </div>
                    </div>
                    
                    <div class="product-details">
                        <div class="details-grid">
                            <div class="detail-item">
                                <div class="detail-label">Precio FOB / FOB Price</div>
                                <div class="detail-value">$${producto.precio_fob} USD</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Cantidad / Quantity</div>
                                <div class="detail-value">${producto.cantidad} piezas</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Total FOB</div>
                                <div class="detail-value" style="font-weight: bold; color: #8b654d;">$${producto.total_fob.toFixed(2)} USD</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Tiempo Produccion / Production Time</div>
                                <div class="detail-value">${producto.tiempo_produccion || 'N/A'}</div>
                            </div>
                        </div>
                        
                        ${producto.codigo_barras ? `
                        <div class="detail-item" style="margin-top: 15px;">
                            <div class="detail-label">Codigo Barras / Barcode EAN13</div>
                            <div class="detail-value" style="font-family: monospace; font-size: 1.1rem;">${producto.codigo_barras}</div>
                        </div>
                        ` : ''}
                        
                        ${producto.notas ? `
                        <div class="notes-section">
                            <div style="font-weight: bold; color: #856404; margin-bottom: 8px;">Observaciones / Notes:</div>
                            <div>${producto.notas}</div>
                        </div>
                        ` : ''}
                        
                        ${producto.imagenes && producto.imagenes.length > 0 ? `
                        <div class="images-section">
                            <div class="images-title">
                                IMAGENES EDITADAS / EDITED IMAGES (${producto.imagenes.length})
                            </div>
                            <div class="images-grid">
                                ${producto.imagenes.map((imagen, imgIndex) => `
                                    <div class="image-item">
                                        <img src="${imagen}" alt="Imagen ${imgIndex + 1}">
                                        <div class="image-number">${imgIndex + 1}</div>
                                        <div class="image-edited-badge"></div>
                                    </div>
                                `).join('')}
                            </div>
                            <div style="margin-top: 10px; font-size: 0.9rem; color: #6c757d; font-style: italic;">
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        <footer class="footer">
            <div>FERABEN / MARÉ - Sistema de Compras</div>
            <div style="margin-top: 10px; font-size: 0.9rem; opacity: 0.8;">
                Generado: ${new Date().toLocaleString()} | Válido por 30 días
            </div>
        </footer>
    </div>

    <script>
        function downloadPDF() {
            alert('Funcionalidad PDF desde web próximamente disponible.\\\
Por ahora usa Ctrl+P para imprimir.');
        }
        
        function downloadExcel() {
            const productos = ${JSON.stringify(selectedOrden.productos)};
            let csv = 'Internal Code,Supplier Code,Product Name,Category,FOB Price,Quantity,Total FOB,Production Time,Barcode,Supplier File,Notes\
';
            
            productos.forEach(producto => {
                csv += [
                    producto.codigo_producto || '',
                    producto.codigo_proveedor || '',
                    producto.nombre || '',
                    producto.categoria || '',
                    producto.precio_fob || '',
                    producto.cantidad || '',
                    producto.total_fob || '',
                    producto.tiempo_produccion || '',
                    parseInt(producto.codigo_barras || '0') || '',
                    producto.nombre_archivo_proveedor || '',
                    (producto.notas || '').replace(/,/g, ';')
                ].join(',') + '\
';
            });
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'OC_${selectedOrden.numero}_PRODUCTOS.csv';
            link.click();
            URL.revokeObjectURL(url);
            alert('Excel (CSV) descargado!');
        }
        
        function downloadImages() {
            const productos = ${JSON.stringify(selectedOrden.productos)};
            let totalImagenes = 0;
            
            productos.forEach(producto => {
                if (producto.imagenes && producto.imagenes.length > 0) {
                    producto.imagenes.forEach((imagen, index) => {
                        const codigoProducto = producto.codigo_producto || producto.codigo_proveedor || 'PROD';
                        const nombreArchivo = \`\${codigoProducto}_img\${index + 1}.png\`;
                        
                        const link = document.createElement('a');
                        link.href = imagen;
                        link.download = nombreArchivo;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        totalImagenes++;
                    });
                }
            });
            
            if (totalImagenes > 0) {
                alert(\`Descargando \${totalImagenes} imágenes con nombres organizados:\
\
Formato: CODIGO_img1.png, CODIGO_img2.png, etc.\
\
Revisa tu carpeta de Descargas.\`);
            } else {
                alert('Esta orden no tiene imágenes para descargar.');
            }
        }
        
        // Página estable sin auto-refresh para que el proveedor trabaje tranquilo
    </script>
</body>
</html>`;

      // Crear blob y URL para descarga
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Abrir en nueva ventana
      const newWindow = window.open(url, '_blank');
      
      if (newWindow) {
        // Mostrar instrucciones al usuario
        alert(`¡Página web temporal generada! 🌐

📋 ${selectedOrden.productos.length} productos incluidos
🖼️ ${productosConImagenes} productos con imágenes
📸 ${totalImagenes} imágenes editadas integradas

✅ Se abrirá en nueva ventana
💡 Puedes compartir esta ventana con tu proveedor
🔗 Guarda el link para envío por email`);
        
        // Revocar URL después de 5 minutos para liberar memoria
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 300000);
      } else {
        alert('No se pudo abrir la nueva ventana. Verifica que no esté bloqueada por el navegador.');
      }
      
    } catch (error) {
      console.error('Error generando página web:', error);
      alert('Error al generar página web: ' + error.message);
    }
  };

  // FUNCIÓN ELIMINADA: enviarOCAlPortal - Sistema de portal eliminado

  // Obtener icono de estado
  const getEstadoIcon = (estado) => {
    switch(estado) {
      case 'confirmada':
        return <CheckCircle size={16} />;
      case 'en_proceso':
        return <Clock size={16} />;
      case 'enviada':
        return <Truck size={16} />;
      case 'recibida':
        return <Package size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  // Obtener clase de estado
  const getEstadoClass = (estado) => {
    switch(estado) {
      case 'confirmada':
      case 'recibida':
        return 'estado-exito';
      case 'en_proceso':
      case 'enviada':
        return 'estado-warning';
      default:
        return '';
    }
  };

  // Abrir control de invoice consolidado
  const abrirControlInvoice = () => {
    if (!selectedOrden || !selectedOrden.embarque_id) return;

    // Buscar todas las OCs del mismo embarque que estén enviadas
    const ocsDelEmbarque = ordenes.filter(oc => 
      oc.embarque_id === selectedOrden.embarque_id && 
      (oc.estado === 'en_proceso' || oc.estado === 'enviada')
    );

    // Consolidar todos los productos de todas las OCs
    const productosConsolidados = [];
    
    ocsDelEmbarque.forEach(oc => {
      oc.productos.forEach((producto, index) => {
        productosConsolidados.push({
          ...producto,
          oc_numero: oc.numero,
          oc_id: oc.id,
          producto_index: index,
          // Estados de control de invoice
          estado_control: 'pendiente', // pendiente, confirmado, cancelado
          cantidad_pedida: producto.cantidad,
          cantidad_confirmada: producto.cantidad,
          precio_fob_original: producto.precio_fob,
          precio_fob_final: producto.precio_fob,
          total_fob_final: producto.cantidad * producto.precio_fob, // Calcular total inicial
          notas_control: ''
        });
      });
    });

    setInvoiceProducts(productosConsolidados);
    setShowInvoiceModal(true);
  };

  // Actualizar estado de producto en control de invoice
  const actualizarProductoInvoice = (index, campo, valor) => {
    const nuevosProductos = [...invoiceProducts];
    nuevosProductos[index] = {
      ...nuevosProductos[index],
      [campo]: valor
    };

    // Si cambia cantidad confirmada o precio, recalcular total FOB
    if (campo === 'cantidad_confirmada' || campo === 'precio_fob_final') {
      const cantidad = parseFloat(campo === 'cantidad_confirmada' ? valor : nuevosProductos[index].cantidad_confirmada) || 0;
      const precio = parseFloat(campo === 'precio_fob_final' ? valor : nuevosProductos[index].precio_fob_final) || 0;
      nuevosProductos[index].total_fob_final = cantidad * precio;
    }

    setInvoiceProducts(nuevosProductos);
  };

  // Confirmar invoice completo y enviar productos confirmados al catálogo
  const confirmarInvoiceCompleto = async () => {
    try {
      const productosConfirmados = invoiceProducts.filter(p => p.estado_control === 'confirmado');
      
      if (productosConfirmados.length === 0) {
        alert('Debe confirmar al menos un producto antes de finalizar el invoice.');
        return;
      }

      // Actualizar cada OC con los productos modificados y cambiar estado a 'confirmada'
      const ocsAfectadas = [...new Set(productosConfirmados.map(p => p.oc_id))];
      
      for (const ocId of ocsAfectadas) {
        const productosDeEstaOC = productosConfirmados.filter(p => p.oc_id === ocId);
        const ordenActual = ordenes.find(o => o.id === ocId);
        
        // Actualizar productos de la OC con datos finales
        const productosActualizados = ordenActual.productos.map((prod, index) => {
          const productoControl = productosDeEstaOC.find(p => p.producto_index === index);
          if (productoControl) {
            return {
              ...prod,
              cantidad: productoControl.cantidad_confirmada,
              precio_fob: productoControl.precio_fob_final,
              total_fob: productoControl.total_fob_final,
              estado_invoice: productoControl.estado_control,
              notas_control: productoControl.notas_control
            };
          }
          return prod;
        });

        // Recalcular total de la OC
        const nuevoTotalFOB = productosActualizados.reduce((sum, p) => 
          sum + (p.estado_invoice === 'confirmado' ? p.total_fob : 0), 0
        );

        // Actualizar en base de datos
        await supabase
          .from('ordenes_compra')
          .update({
            productos: productosActualizados,
            total_fob: nuevoTotalFOB,
            estado: 'confirmada'
          })
          .eq('id', ocId);
      }

      // Enviar productos confirmados al catálogo automáticamente
      let productosEnviados = 0;
      
      for (const producto of productosConfirmados) {
        try {
          // Preparar producto para el catálogo - SOLO CAMPOS EXISTENTES
          // TODO: Obtener configuración global del catálogo
          const coeficienteDefecto = 1.40; // Se podría obtener del localStorage o configuración
          const tipoCambioDefecto = 41.0;
          const precioSugerido = Math.round(producto.precio_fob_final * coeficienteDefecto * tipoCambioDefecto);
          
          // Encontrar el embarque_id de la OC del producto
          const ordenDelProducto = ordenes.find(o => o.id === producto.oc_id);
          const embarqueId = ordenDelProducto?.embarque_id || null;

          const productoParaCatalogo = {
            codigo: producto.codigo_producto,
            nombre: producto.nombre,
            descripcion: `OC: ${producto.oc_numero} | Proveedor: ${producto.codigo_proveedor || 'N/A'}${producto.notas_control && producto.notas_control.trim() ? ` | ${producto.notas_control}` : ''}`,
            categoria: producto.categoria,
            subcategoria: producto.categoria, // Usar categoría como subcategoría por ahora
            precio_fob: producto.precio_fob_final,
            coeficiente: coeficienteDefecto,
            precio_sugerido: precioSugerido,
            colores: ['Sin especificar'], // Array de colores por defecto
            medidas: { largo: '', ancho: '', alto: '' }, // Objeto de medidas vacío
            imagen_principal: producto.imagenes?.[0] || '',
            codigo_barras: producto.codigo_barras || '',
            // ✅ NUEVOS CAMPOS DE STOCK
            stock_inicial: producto.cantidad_confirmada,
            stock_actual: producto.cantidad_confirmada,
            // ✅ CAMPO EMBARQUE CRÍTICO
            embarque_id: embarqueId
          };

          // Verificar si ya existe un producto con este código
          const { data: productosExistentes } = await supabase
            .from('productos')
            .select('id, descripcion, stock_actual, stock_inicial')
            .eq('codigo', producto.codigo_producto);

          if (productosExistentes && productosExistentes.length > 0) {
            // Actualizar producto existente - SUMAR STOCK
            const productoExistente = productosExistentes[0];
            
            // Crear descripción sin duplicar información
            let nuevaDescripcion = '';
            if (productoExistente.descripcion) {
              // Solo agregar las notas si son diferentes y no están vacías
              if (producto.notas_control && producto.notas_control.trim()) {
                nuevaDescripcion = `${productoExistente.descripcion} | Nota OC ${producto.oc_numero}: ${producto.notas_control}`;
              } else {
                nuevaDescripcion = `${productoExistente.descripcion} | Actualizado OC: ${producto.oc_numero}`;
              }
            } else {
              // Primera vez, crear descripción completa
              nuevaDescripcion = `OC: ${producto.oc_numero} | Proveedor: ${producto.codigo_proveedor || 'N/A'}${producto.notas_control ? ` | ${producto.notas_control}` : ''}`;
            }
            
            // Sumar stock nuevo al existente
            const nuevoStockInicial = (productoExistente.stock_inicial || 0) + producto.cantidad_confirmada;
            const nuevoStockActual = (productoExistente.stock_actual || 0) + producto.cantidad_confirmada;
            
            await supabase
              .from('productos')
              .update({ 
                // Actualizar precios con valores más recientes
                precio_fob: producto.precio_fob_final,
                precio_sugerido: precioSugerido,
                // Actualizar descripción con nueva OC
                descripcion: nuevaDescripcion,
                // Actualizar imagen si hay una nueva
                imagen_principal: producto.imagenes?.[0] || productoExistente.imagen_principal,
                // ✅ SUMAR STOCK AL EXISTENTE
                stock_inicial: nuevoStockInicial,
                stock_actual: nuevoStockActual
              })
              .eq('id', productoExistente.id);
          } else {
            // Crear nuevo producto en catálogo
            await supabase
              .from('productos')
              .insert([productoParaCatalogo]);
          }
          
          productosEnviados++;
        } catch (error) {
          console.error(`Error enviando producto ${producto.codigo_producto} al catálogo:`, error);
        }
      }

      alert(`Invoice confirmado! ${productosEnviados}/${productosConfirmados.length} productos enviados al catálogo.`);
      
      // Recargar datos y cerrar modal
      await cargarDatos();
      setShowInvoiceModal(false);
      
    } catch (error) {
      console.error('Error confirmando invoice:', error);
      alert('Error al confirmar invoice');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Lista de órdenes */}
      <div className="lg:col-span-1">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-playfair">Órdenes de Compra</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowManualForm(true)} 
              className="btn-mare"
            >
              <Plus size={20} />
              Manual
            </button>
            {embarqueActivo && (
              <button 
                onClick={() => setShowControlInvoice(true)}
                className="btn-mare text-sm px-3"
                title="Control Invoice Inteligente"
              >
                <CheckCircle size={18} />
                Control Invoice
              </button>
            )}
          </div>
        </div>

        {/* Selector de Embarque */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Filtrar por Embarque:</label>
          <select 
            value={filtroEmbarque} 
            onChange={(e) => setFiltroEmbarque(e.target.value)}
            className="input-mare text-sm"
          >
            <option value="activo">
              📦 {embarqueActivo ? `Embarque Activo: ${embarqueActivo.codigo}` : 'Compra Actual (sin embarque)'}
            </option>
            <option value="todos">📋 Todas las Órdenes</option>
            {embarques.filter(e => e.id !== embarqueActivo?.id).map(embarque => (
              <option key={embarque.id} value={embarque.id}>
                🚢 {embarque.codigo} ({embarque.estado})
              </option>
            ))}
          </select>
          
          {/* Información del filtro actual */}
          <div className="mt-2 text-xs" style={{ color: 'var(--texto-secundario)' }}>
            {filtroEmbarque === 'activo' && embarqueActivo && (
              <span>✅ Mostrando OCs del embarque activo + nuevas OCs sin embarque</span>
            )}
            {filtroEmbarque === 'activo' && !embarqueActivo && (
              <span>📝 No hay embarque activo - Mostrando todas las OCs</span>
            )}
            {filtroEmbarque === 'todos' && (
              <span>📊 Mostrando todas las OCs de todos los embarques</span>
            )}
            {filtroEmbarque !== 'activo' && filtroEmbarque !== 'todos' && (
              <span>🔍 Mostrando solo OCs del embarque seleccionado</span>
            )}
          </div>
        </div>


        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : filtrarOrdenesPorEmbarque().length === 0 ? (
            <div className="card-mare text-center py-8">
              <p style={{ color: 'var(--texto-secundario)' }}>
                {filtroEmbarque === 'activo' 
                  ? 'No hay órdenes en el embarque activo'
                  : 'No hay órdenes para el filtro seleccionado'
                }
              </p>
            </div>
          ) : (
            filtrarOrdenesPorEmbarque().map(orden => (
              <div
                key={orden.id}
                className={`card-mare cursor-pointer transition-all relative group ${
                  selectedOrden?.id === orden.id ? 'ring-2' : ''
                }`}
                style={{
                  ringColor: selectedOrden?.id === orden.id ? 'var(--marron-oscuro)' : ''
                }}
              >
                <div onClick={() => setSelectedOrden(orden)}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-lg">{orden.numero}</h3>
                      <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>
                        {orden.proveedor?.nombre || 'Sin proveedor'}
                      </p>
                    </div>
                    <span className={`estado ${getEstadoClass(orden.estado)} flex items-center gap-1`}>
                      {getEstadoIcon(orden.estado)}
                      {orden.estado.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--texto-secundario)' }}>Fecha:</span>
                      <span>{new Date(orden.fecha).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--texto-secundario)' }}>Embarque:</span>
                      <span className="font-medium" style={{ color: 'var(--marron-oscuro)' }}>
                        {orden.embarque?.codigo || 'Sin asignar'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--texto-secundario)' }}>Items:</span>
                      <span className="font-medium">{orden.productos?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--texto-secundario)' }}>Total FOB:</span>
                      <span className="font-bold" style={{ color: 'var(--marron-oscuro)' }}>
                        ${orden.total_fob?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botón eliminar */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminarOrdenCompra(orden);
                  }}
                  className="absolute top-2 right-2 p-1 bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-50"
                  title="Eliminar orden de compra"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detalle de orden */}
      <div className="lg:col-span-2">
        {selectedOrden ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-playfair">{selectedOrden.numero}</h2>
                <p style={{ color: 'var(--texto-secundario)' }}>
                  {selectedOrden.proveedor?.nombre} • {new Date(selectedOrden.fecha).toLocaleDateString()}
                  {selectedOrden.embarque?.codigo && (
                    <span>
                      <br />
                      🚢 Embarque: <span style={{ fontWeight: 'bold', color: 'var(--marron-oscuro)' }}>{selectedOrden.embarque.codigo}</span> ({selectedOrden.embarque.estado})
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-3 flex-wrap">
                {(selectedOrden.estado === 'en_proceso' || selectedOrden.estado === 'enviada') && (
                  <button 
                    onClick={abrirControlInvoice}
                    className="btn-mare"
                    style={{ backgroundColor: 'var(--verde-agua)', borderColor: 'var(--verde-agua)', color: 'black' }}
                  >
                    <CheckCircle size={20} />
                    Control Invoice
                  </button>
                )}
                <button 
                  onClick={() => setShowEditForm(true)}
                  className="btn-mare"
                  disabled={selectedOrden.estado === 'confirmada'}
                >
                  <Plus size={20} />
                  Agregar Producto
                </button>
                <button 
                  onClick={exportarExcel}
                  className="btn-mare-secondary"
                >
                  <Download size={20} />
                  Excel
                </button>
                <button 
                  onClick={exportarPDF}
                  className="btn-mare-secondary"
                  style={{ background: '#28a745', borderColor: '#28a745' }}
                >
                  <Printer size={20} />
                  PDF Completo
                </button>
                <button 
                  onClick={descargarImagenesZIP}
                  className="btn-mare-secondary"
                  style={{ background: '#6f42c1', borderColor: '#6f42c1', color: 'white' }}
                >
                  <Package size={20} />
                  ZIP Imágenes
                </button>
                <button 
                  onClick={generarPaginaWeb}
                  className="btn-mare-secondary"
                  style={{ background: '#007bff', borderColor: '#007bff', color: 'white' }}
                >
                  🌐 Web Temporal
                </button>
                {/* BOTÓN ELIMINADO: Enviar a Portal - Sistema de portal eliminado */}
              </div>
            </div>

            {/* Estados disponibles */}
            <div className="card-mare mb-6">
              <h3 className="text-sm font-medium mb-3">Estado de la Orden</h3>
              <div className="flex gap-2 flex-wrap">
                {['borrador', 'enviada', 'en_proceso', 'confirmada'].map(estado => (
                  <button
                    key={estado}
                    onClick={() => cambiarEstado(estado)}
                    disabled={selectedOrden.estado === estado}
                    className={`px-4 py-2 rounded-lg text-sm transition-all ${
                      selectedOrden.estado === estado
                        ? 'bg-marron-oscuro text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: selectedOrden.estado === estado ? 'var(--marron-oscuro)' : ''
                    }}
                  >
                    {estado === 'borrador' ? 'Borrador' :
                     estado === 'enviada' ? 'Enviada' :
                     estado === 'en_proceso' ? 'En Proceso' :
                     estado === 'confirmada' ? 'Confirmada' : estado}
                  </button>
                ))}
              </div>
            </div>

            {/* Comentarios */}
            {selectedOrden.comentarios && (
              <div className="card-mare mb-6">
                <h3 className="text-sm font-medium mb-2">Comentarios</h3>
                <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>
                  {selectedOrden.comentarios}
                </p>
              </div>
            )}

            {/* Tabla de productos */}
            <div className="card-mare">
              <h3 className="text-lg font-medium mb-4">Productos ({selectedOrden.productos?.length || 0})</h3>
              <div style={{ overflowX: 'auto' }}>
                <table className="table-mare">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th>Precio FOB</th>
                      <th>Cantidad</th>
                      <th>Total</th>
                      <th>Código Barras</th>
                      <th>Tiempo</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrden.productos?.map((producto, index) => (
                      <tr key={index}>
                        <td>
                          <div>
                            <p className="font-medium">{producto.nombre}</p>
                            <div className="flex gap-2 text-xs" style={{ color: 'var(--texto-secundario)' }}>
                              {producto.codigo_producto && <span>Int: {producto.codigo_producto}</span>}
                              {producto.codigo_proveedor && <span>Prov: {producto.codigo_proveedor}</span>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-xs px-2 py-1 rounded" style={{ 
                            backgroundColor: 'var(--nude-suave)', 
                            color: 'var(--marron-oscuro)' 
                          }}>
                            {producto.categoria || 'Sin categoría'}
                          </span>
                        </td>
                        <td>${producto.precio_fob}</td>
                        <td>
                          {selectedOrden.estado === 'borrador' ? (
                            <input
                              type="number"
                              value={producto.cantidad}
                              onChange={(e) => actualizarCantidad(index, e.target.value)}
                              className="input-mare"
                              style={{ width: '80px' }}
                              min="1"
                            />
                          ) : (
                            producto.cantidad
                          )}
                        </td>
                        <td className="font-medium">${producto.total_fob.toFixed(2)}</td>
                        <td>
                          {producto.codigo_barras || (
                            <span className="text-xs" style={{ color: 'var(--texto-secundario)' }}>
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td>{producto.tiempo_produccion || '-'}</td>
                        <td>
                          {selectedOrden.estado === 'borrador' && (
                            <button
                              onClick={() => abrirEdicionProducto(producto, index)}
                              className="btn-mare-secondary"
                              style={{ fontSize: '12px', padding: '4px 8px' }}
                              title="Editar producto"
                            >
                              <Edit size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="4" className="text-right font-medium">Total FOB:</td>
                      <td className="font-bold" style={{ color: 'var(--marron-oscuro)' }}>
                        ${(selectedOrden.total_fob || 0).toFixed(2)}
                      </td>
                      <td colSpan="3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-mare text-center py-12">
            <ShoppingCart size={48} className="mx-auto mb-4" style={{ color: 'var(--arena-claro)' }} />
            <p style={{ color: 'var(--texto-secundario)' }}>
              Selecciona o crea una orden de compra
            </p>
          </div>
        )}
      </div>

      {/* MODAL ELIMINADO: Nueva orden desde cotizaciones (sistema simplificado) */}

      {/* Modal crear OC manual */}
      {showManualForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card-mare" style={{ 
            backgroundColor: 'white',
            maxWidth: '28rem',
            width: '100%'
          }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-playfair">Nueva OC Manual</h3>
              <button onClick={() => setShowManualForm(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={24} />
              </button>
            </div>
            
            <p className="text-sm mb-4" style={{ color: 'var(--texto-secundario)' }}>
              Selecciona el proveedor para crear una nueva orden de compra:
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Proveedor *
                </label>
                <select
                  id="select-proveedor-manual"
                  className="select-mare"
                  required
                >
                  <option value="">Seleccionar proveedor...</option>
                  {proveedores.map(prov => (
                    <option key={prov.id} value={prov.id}>{prov.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  id="notas-oc-manual"
                  className="input-mare"
                  rows="3"
                  placeholder="Notas adicionales sobre esta orden..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowManualForm(false)}
                className="btn-mare-secondary"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  const proveedorId = document.getElementById('select-proveedor-manual')?.value;
                  const notas = document.getElementById('notas-oc-manual')?.value;
                  
                  if (!proveedorId) {
                    alert('Por favor selecciona un proveedor');
                    return;
                  }
                  
                  crearOCManual(proveedorId, notas);
                }}
                className="btn-mare"
              >
                Crear OC Manual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar/editar producto a OC */}
      {showEditForm && selectedOrden && (
        <OrdenCompraForm
          orden={selectedOrden}
          editingProduct={editingProduct}
          editingIndex={editingProductIndex}
          onClose={() => {
            setShowEditForm(false);
            setEditingProduct(null);
            setEditingProductIndex(null);
          }}
          onSave={(ordenActualizada) => {
            setSelectedOrden(ordenActualizada);
            setOrdenes(ordenes.map(ord => 
              ord.id === ordenActualizada.id ? ordenActualizada : ord
            ));
            setShowEditForm(false);
            setEditingProduct(null);
            setEditingProductIndex(null);
          }}
        />
      )}

      {/* Modal Control Invoice Consolidado */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card-mare" style={{ 
            backgroundColor: 'white',
            maxWidth: '95vw',
            width: '100%',
            maxHeight: '95vh',
            overflow: 'hidden'
          }}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-playfair">Control Invoice Consolidado</h3>
                  <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>
                    Proveedor: {selectedOrden?.proveedor?.nombre} • {invoiceProducts.length} productos
                  </p>
                </div>
                <button 
                  onClick={() => setShowInvoiceModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="max-h-[70vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white" style={{ borderBottom: '2px solid var(--arena-claro)' }}>
                    <tr>
                      <th className="text-left p-3">Estado</th>
                      <th className="text-left p-3">OC</th>
                      <th className="text-left p-3">Código</th>
                      <th className="text-left p-3">Producto</th>
                      <th className="text-left p-3">Pedido</th>
                      <th className="text-left p-3">Confirmado</th>
                      <th className="text-left p-3">Precio Original</th>
                      <th className="text-left p-3">Precio Final</th>
                      <th className="text-left p-3">Total Final</th>
                      <th className="text-left p-3">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceProducts.map((producto, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50" style={{ borderColor: 'var(--arena-claro)' }}>
                        {/* Estado con checkbox/select */}
                        <td className="p-3">
                          <select
                            value={producto.estado_control}
                            onChange={(e) => actualizarProductoInvoice(index, 'estado_control', e.target.value)}
                            className="input-mare text-xs"
                            style={{ 
                              backgroundColor: 
                                producto.estado_control === 'confirmado' ? '#dcfce7' :
                                producto.estado_control === 'cancelado' ? '#fee2e2' : '#fef3c7'
                            }}
                          >
                            <option value="pendiente">⏳ Pendiente</option>
                            <option value="confirmado">✅ Confirmado</option>
                            <option value="cancelado">❌ Cancelado</option>
                          </select>
                        </td>
                        
                        {/* OC */}
                        <td className="p-3 font-medium text-xs" style={{ color: 'var(--marron-oscuro)' }}>
                          {producto.oc_numero}
                        </td>
                        
                        {/* Código */}
                        <td className="p-3 text-xs">
                          <div className="font-medium">{producto.codigo_producto || 'N/A'}</div>
                        </td>
                        
                        {/* Producto */}
                        <td className="p-3">
                          <div className="font-medium text-xs">{producto.nombre || 'Sin nombre'}</div>
                          <div className="text-xs" style={{ color: 'var(--texto-secundario)' }}>
                            {producto.categoria || 'Sin categoría'}
                          </div>
                        </td>
                        
                        {/* Cantidad Pedida */}
                        <td className="p-3 text-center font-medium">
                          {producto.cantidad_pedida}
                        </td>
                        
                        {/* Cantidad Confirmada */}
                        <td className="p-3">
                          {producto.estado_control === 'cancelado' ? (
                            <span className="text-red-600 font-medium">0</span>
                          ) : (
                            <input
                              type="number"
                              value={producto.cantidad_confirmada}
                              onChange={(e) => actualizarProductoInvoice(index, 'cantidad_confirmada', parseInt(e.target.value) || 0)}
                              className="input-mare text-center"
                              style={{ width: '90px' }}
                              min="0"
                              disabled={producto.estado_control === 'pendiente'}
                            />
                          )}
                        </td>
                        
                        {/* Precio Original */}
                        <td className="p-3 text-xs">
                          ${producto.precio_fob_original?.toFixed(2) || '0.00'}
                        </td>
                        
                        {/* Precio Final */}
                        <td className="p-3">
                          {producto.estado_control === 'cancelado' ? (
                            <span className="text-red-600 font-medium">$0.00</span>
                          ) : (
                            <input
                              type="number"
                              value={producto.precio_fob_final}
                              onChange={(e) => actualizarProductoInvoice(index, 'precio_fob_final', parseFloat(e.target.value) || 0)}
                              className="input-mare text-center"
                              style={{ width: '80px' }}
                              step="0.01"
                              min="0"
                              disabled={producto.estado_control === 'pendiente'}
                            />
                          )}
                        </td>
                        
                        {/* Total Final */}
                        <td className="p-3 font-bold" style={{ color: 'var(--marron-oscuro)' }}>
                          ${(producto.total_fob_final || 0).toFixed(2)}
                        </td>
                        
                        {/* Notas */}
                        <td className="p-3">
                          <input
                            type="text"
                            value={producto.notas_control}
                            onChange={(e) => actualizarProductoInvoice(index, 'notas_control', e.target.value)}
                            className="input-mare text-xs"
                            style={{ width: '120px' }}
                            placeholder="Notas..."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Resumen totales */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total Pedido:</span>
                    <div className="text-lg font-bold" style={{ color: 'var(--marron-oscuro)' }}>
                      ${invoiceProducts.reduce((sum, p) => sum + (p.cantidad_pedida * p.precio_fob_original), 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Total Confirmado:</span>
                    <div className="text-lg font-bold text-green-600">
                      ${invoiceProducts.filter(p => p.estado_control === 'confirmado').reduce((sum, p) => sum + (p.total_fob_final || 0), 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Productos Confirmados:</span>
                    <div className="text-lg font-bold text-green-600">
                      {invoiceProducts.filter(p => p.estado_control === 'confirmado').length}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Productos Cancelados:</span>
                    <div className="text-lg font-bold text-red-600">
                      {invoiceProducts.filter(p => p.estado_control === 'cancelado').length}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Botones de acción */}
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setShowInvoiceModal(false)}
                  className="btn-mare-secondary"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmarInvoiceCompleto}
                  className="btn-mare"
                  style={{ backgroundColor: 'var(--verde-agua)', borderColor: 'var(--verde-agua)', color: 'black' }}
                  disabled={invoiceProducts.filter(p => p.estado_control === 'confirmado').length === 0}
                >
                  <CheckCircle size={20} />
                  Confirmar Invoice Completo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Control Invoice Inteligente */}
      {showControlInvoice && embarqueActivo && (
        <ControlInvoiceInteligente
          embarqueId={embarqueActivo.id}
          onClose={() => setShowControlInvoice(false)}
        />
      )}
    </div>
  );
}