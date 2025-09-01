// src/pages/Investigacion.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Download,
  Trash2,
  Image,
  Link,
  FolderOpen,
  Send,
  Edit,
  Eye,
  Upload,
  ShoppingCart,
  Calendar,
  AlertCircle,
  X
} from 'lucide-react';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
// import { verificarProveedorPortal } from '../services/quoteToOrderService'; // REMOVED - supplier system disabled
import { obtenerTimestampUruguay } from '../utils/dateUtils';

export default function Investigacion() {
  const [investigaciones, setInvestigaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvestigacion, setSelectedInvestigacion] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showOCModal, setShowOCModal] = useState(false);
  const [ordenesCompra, setOrdenesCompra] = useState([]);
  const [loadingOC, setLoadingOC] = useState(false);
  // ESTADOS ELIMINADOS: Portal variables - Sistema de portal eliminado
  
  // Estado para el formulario de items
  const [currentItem, setCurrentItem] = useState({
    tipo: 'url', // 'url' o 'imagen'
    url: '',
    imagen_base64: '',
    descripcion: '',
    nombre_tentativo: '',
    categoria: ''
  });

  // Categorías predefinidas
  const categorias = [
    'Hair Accessories',
    'Watches',
    'Jewelry',
    'Bags',
    'Sunglasses',
    'Belts',
    'Scarves',
    'Hats',
    'Electronics Accessories',
    'Home Decor',
    'Others'
  ];

  useEffect(() => {
    cargarInvestigaciones();
  }, []);

  const cargarInvestigaciones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('investigaciones')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setInvestigaciones(data || []);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar investigaciones');
    } finally {
      setLoading(false);
    }
  };

  // Cargar órdenes de compra para repetir productos
  const cargarOrdenesCompra = async () => {
    try {
      setLoadingOC(true);
      
      // 1. Obtener embarque activo (en trabajo/creación)
      const { data: embarqueActivo } = await supabase
        .from('embarques')
        .select('id, ordenes_ids')
        .in('estado', ['preparacion', 'en_transito']) // Embarques activos
        .single();
      
      // 2. Obtener todas las OCs
      const { data, error } = await supabase
        .from('ordenes_compra')
        .select(`
          id,
          numero,
          fecha,
          productos,
          proveedor_id,
          proveedores (nombre),
          estado
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // 3. Filtrar OCs: Solo historial (excluir embarque activo)
      let ocsFiltradas = data || [];
      
      if (embarqueActivo?.ordenes_ids) {
        // Excluir OCs del embarque activo
        ocsFiltradas = ocsFiltradas.filter(oc => 
          !embarqueActivo.ordenes_ids.includes(oc.id)
        );
      }
      
      // 4. Solo OCs completadas/enviadas (historial real)
      ocsFiltradas = ocsFiltradas.filter(oc => 
        oc.estado && ['enviada', 'confirmada', 'completada'].includes(oc.estado.toLowerCase())
      );
      
      setOrdenesCompra(ocsFiltradas);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar órdenes de compra');
    } finally {
      setLoadingOC(false);
    }
  };

  // Abrir modal de OC
  const abrirModalOC = () => {
    setShowOCModal(true);
    cargarOrdenesCompra();
  };

  // Agregar producto de OC a investigación actual
  const agregarProductoDeOC = async (producto, numeroOC) => {
    if (!selectedInvestigacion) {
      alert('Primero selecciona una investigación');
      return;
    }

    // Convertir producto de OC a formato de investigación
    const nuevoItem = {
      tipo: 'imagen',
      url: '',
      imagen_base64: producto.imagenes?.[0] || '', // Primera imagen
      descripcion: `Repetir de ${numeroOC}: ${producto.notas || ''}`,
      nombre_tentativo: producto.nombre || 'Producto sin nombre',
      categoria: producto.categoria || 'Others',
      // Agregar referencias del producto original
      codigo_producto_original: producto.codigo_producto,
      codigo_proveedor_original: producto.codigo_proveedor,
      nombre_archivo_proveedor: producto.nombre_archivo_proveedor,
      precio_fob_anterior: producto.precio_fob,
      oc_origen: numeroOC
    };

    try {
      const nuevosItems = [...(selectedInvestigacion.items || []), nuevoItem];
      
      const { error } = await supabase
        .from('investigaciones')
        .update({ items: nuevosItems })
        .eq('id', selectedInvestigacion.id);

      if (error) throw error;

      // Actualizar estado local
      setSelectedInvestigacion({
        ...selectedInvestigacion,
        items: nuevosItems
      });

      alert(`Producto agregado desde ${numeroOC}`);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al agregar producto');
    }
  };

  // Crear nueva investigación
  const crearInvestigacion = async () => {
    const titulo = prompt('Nombre de la investigación:');
    if (!titulo) return;

    try {
      const { data, error } = await supabase
        .from('investigaciones')
        .insert([{
          titulo,
          items: [],
          estado: 'pendiente'
        }])
        .select()
        .single();

      if (error) throw error;
      
      setInvestigaciones([data, ...investigaciones]);
      setSelectedInvestigacion(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear investigación');
    }
  };

  // Eliminar investigación completa
  const eliminarInvestigacion = async (investigacion) => {
    if (!confirm(`¿Estás seguro de eliminar la investigación "${investigacion.titulo}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('investigaciones')
        .delete()
        .eq('id', investigacion.id);

      if (error) throw error;

      // Actualizar estado local
      setInvestigaciones(investigaciones.filter(inv => inv.id !== investigacion.id));
      
      // Si era la investigación seleccionada, deseleccionar
      if (selectedInvestigacion?.id === investigacion.id) {
        setSelectedInvestigacion(null);
      }

      alert('Investigación eliminada correctamente');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar investigación');
    }
  };

  // Agregar item a investigación
  const agregarItem = async () => {
    if (!selectedInvestigacion) return;
    
    if (!currentItem.categoria) {
      alert('Por favor selecciona una categoría');
      return;
    }

    if (currentItem.tipo === 'url' && !currentItem.url) {
      alert('Por favor ingresa una URL');
      return;
    }

    if (currentItem.tipo === 'imagen' && !currentItem.imagen_base64) {
      alert('Por favor selecciona una imagen');
      return;
    }

    try {
      const nuevosItems = [...(selectedInvestigacion.items || []), currentItem];
      
      const { error } = await supabase
        .from('investigaciones')
        .update({ items: nuevosItems })
        .eq('id', selectedInvestigacion.id);

      if (error) throw error;

      // Actualizar estado local
      setSelectedInvestigacion({
        ...selectedInvestigacion,
        items: nuevosItems
      });

      // Limpiar formulario
      setCurrentItem({
        tipo: 'url',
        url: '',
        imagen_base64: '',
        descripcion: '',
        nombre_tentativo: '',
        categoria: currentItem.categoria // Mantener la categoría
      });

      setShowForm(false);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al agregar item');
    }
  };

  // Eliminar item
  const eliminarItem = async (index) => {
    if (!selectedInvestigacion || !confirm('¿Eliminar este item?')) return;

    try {
      const nuevosItems = selectedInvestigacion.items.filter((_, i) => i !== index);
      
      const { error } = await supabase
        .from('investigaciones')
        .update({ items: nuevosItems })
        .eq('id', selectedInvestigacion.id);

      if (error) throw error;

      setSelectedInvestigacion({
        ...selectedInvestigacion,
        items: nuevosItems
      });
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar item');
    }
  };

  // Cargar imagen y convertir a base64
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentItem({
          ...currentItem,
          imagen_base64: reader.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Exportar a Excel con hojas por categoría y hoja separada para repeticiones
  const exportarExcel = async () => {
    if (!selectedInvestigacion || !selectedInvestigacion.items?.length) {
      alert('No hay items para exportar');
      return;
    }

    const wb = XLSX.utils.book_new();
    
    // Separar items nuevos de repeticiones
    const itemsNuevos = [];
    const itemsRepetidos = [];
    
    selectedInvestigacion.items.forEach(item => {
      if (item.oc_origen) {
        itemsRepetidos.push(item);
      } else {
        itemsNuevos.push(item);
      }
    });

    // Función para crear datos de hoja con el formato correcto
    const crearDatosHoja = (items, esRepeticion = false) => {
      return items.map((item, index) => {
        const datos = {
          'No.': index + 1,
          'Type': item.tipo === 'url' ? 'URL' : 'Uploaded Image',
          'URL/Image': item.tipo === 'url' ? item.url : 'See attached image',
          'Product Name': item.nombre_tentativo || '',
          'Description': item.descripcion || '',
          'Notes': esRepeticion ? `Repeat from ${item.oc_origen}` : '',
          'Image Space': '' // Columna adicional para imágenes
        };

        // Agregar columnas específicas para repeticiones
        if (esRepeticion) {
          datos['Supplier Code'] = item.codigo_proveedor_original || 'N/A';
          datos['Supplier File'] = item.nombre_archivo_proveedor || 'N/A';
          datos['Previous Internal Code'] = item.codigo_producto_original || 'N/A';
          datos['Previous FOB Price'] = `$${item.precio_fob_anterior || '0.00'}`;
        }

        return datos;
      });
    };

    // Configurar columnas según tipo de hoja
    const configurarColumnas = (esRepeticion = false) => {
      if (esRepeticion) {
        return [
          { wch: 5 },   // No.
          { wch: 15 },  // Type
          { wch: 45 },  // URL/Image
          { wch: 30 },  // Product Name
          { wch: 20 },  // Supplier Code
          { wch: 25 },  // Supplier File
          { wch: 20 },  // Previous Internal Code
          { wch: 15 },  // Previous FOB Price
          { wch: 35 },  // Description
          { wch: 25 },  // Notes
          { wch: 20 }   // Image Space
        ];
      } else {
        return [
          { wch: 5 },   // No.
          { wch: 15 },  // Type
          { wch: 45 },  // URL/Image
          { wch: 30 },  // Product Name
          { wch: 35 },  // Description
          { wch: 25 },  // Notes
          { wch: 20 }   // Image Space
        ];
      }
    };

    // Crear hoja de productos repetidos primero (más importante)
    if (itemsRepetidos.length > 0) {
      const datosRepetidos = crearDatosHoja(itemsRepetidos, true);
      const wsRepetidos = XLSX.utils.json_to_sheet(datosRepetidos);
      
      wsRepetidos['!cols'] = configurarColumnas(true);
      
      // Configurar altura de filas
      const numFilasRepetidos = itemsRepetidos.length + 1;
      wsRepetidos['!rows'] = Array.from({ length: numFilasRepetidos }, (_, i) => ({ 
        hpt: i === 0 ? 25 : 60 
      }));

      XLSX.utils.book_append_sheet(wb, wsRepetidos, 'Repeat Products');
    }

    // Agrupar items nuevos por categoría
    const itemsPorCategoria = {};
    itemsNuevos.forEach(item => {
      if (!itemsPorCategoria[item.categoria]) {
        itemsPorCategoria[item.categoria] = [];
      }
      itemsPorCategoria[item.categoria].push(item);
    });

    // Crear una hoja por cada categoría (productos nuevos)
    Object.entries(itemsPorCategoria).forEach(([categoria, items]) => {
      const datosHoja = crearDatosHoja(items, false);
      const ws = XLSX.utils.json_to_sheet(datosHoja);
      
      ws['!cols'] = configurarColumnas(false);

      // Configurar altura de filas para acomodar imágenes
      const numFilas = items.length + 1; // +1 por el header
      ws['!rows'] = Array.from({ length: numFilas }, (_, i) => ({ 
        hpt: i === 0 ? 25 : 60 // Header normal, filas de datos más altas
      }));

      // Nombre de hoja válido (máx 31 caracteres)
      const nombreHoja = categoria.slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
    });

    // Guardar archivo
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `investigacion_${selectedInvestigacion.titulo.replace(/\s+/g, '_')}_${fecha}.xlsx`;
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, nombreArchivo);

    // Actualizar estado
    await supabase
      .from('investigaciones')
      .update({ estado: 'enviada' })
      .eq('id', selectedInvestigacion.id);
  };

  // FUNCIÓN ELIMINADA: cargarProveedoresConPortal - Sistema de portal eliminado

  // FUNCIÓN ELIMINADA: abrirModalPortal - Sistema de portal eliminado

  // FUNCIÓN ELIMINADA: enviarAlPortal - Sistema de portal eliminado

  // Agrupar items por categoría para mostrar
  const getItemsPorCategoria = () => {
    if (!selectedInvestigacion?.items) return {};
    
    const grupos = {};
    selectedInvestigacion.items.forEach((item, index) => {
      if (!grupos[item.categoria]) {
        grupos[item.categoria] = [];
      }
      grupos[item.categoria].push({ ...item, index });
    });
    return grupos;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Lista de investigaciones */}
      <div className="lg:col-span-1">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-playfair">Investigaciones</h2>
          <button onClick={crearInvestigacion} className="btn-mare">
            <Plus size={20} />
            Nueva
          </button>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : investigaciones.length === 0 ? (
            <div className="card-mare text-center py-8">
              <p style={{ color: 'var(--texto-secundario)' }}>
                No hay investigaciones aún
              </p>
            </div>
          ) : (
            investigaciones.map(inv => (
              <div
                key={inv.id}
                className={`card-mare cursor-pointer transition-all relative group ${
                  selectedInvestigacion?.id === inv.id ? 'ring-2' : ''
                }`}
                style={{
                  ringColor: selectedInvestigacion?.id === inv.id ? 'var(--marron-oscuro)' : ''
                }}
              >
                <div onClick={() => setSelectedInvestigacion(inv)}>
                  <h3 className="font-medium">{inv.titulo}</h3>
                  <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>
                    {inv.items?.length || 0} items • {new Date(inv.created_at).toLocaleDateString()}
                  </p>
                  <span className={`estado mt-2 ${
                    inv.estado === 'enviada' ? 'estado-exito' : ''
                  }`}>
                    {inv.estado}
                  </span>
                </div>
                
                {/* Botón eliminar */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminarInvestigacion(inv);
                  }}
                  className="absolute top-2 right-2 p-1 bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-50"
                  title="Eliminar investigación"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detalle de investigación */}
      <div className="lg:col-span-2">
        {selectedInvestigacion ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-playfair">{selectedInvestigacion.titulo}</h2>
              <div className="flex gap-3">
                <button 
                  onClick={exportarExcel}
                  className="btn-mare-secondary"
                  disabled={!selectedInvestigacion.items?.length}
                >
                  <Download size={20} />
                  Exportar Excel
                </button>
                {/* BOTÓN ELIMINADO: Enviar al Portal - Sistema simplificado */}
                <button onClick={abrirModalOC} className="btn-mare-secondary">
                  <ShoppingCart size={20} />
                  Desde OC
                </button>
                <button onClick={() => setShowForm(true)} className="btn-mare">
                  <Plus size={20} />
                  Agregar Item
                </button>
              </div>
            </div>

            {/* Items agrupados por categoría */}
            {Object.entries(getItemsPorCategoria()).length === 0 ? (
              <div className="card-mare text-center py-12">
                <FolderOpen size={48} className="mx-auto mb-4" style={{ color: 'var(--arena-claro)' }} />
                <p style={{ color: 'var(--texto-secundario)' }}>
                  No hay items aún. Comienza agregando productos que te interesen.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(getItemsPorCategoria()).map(([categoria, items]) => (
                  <div key={categoria} className="card-mare">
                    <h3 className="text-lg font-medium mb-4 pb-3 border-b" style={{ borderColor: 'var(--arena-claro)' }}>
                      {categoria} ({items.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {items.map(item => (
                        <div key={item.index} className="relative group">
                          {/* Imagen o placeholder */}
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2">
                            {item.tipo === 'url' && item.url ? (
                              <img 
                                src={item.url} 
                                alt={item.nombre_tentativo}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = '';
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : item.tipo === 'imagen' && item.imagen_base64 ? (
                              <img 
                                src={item.imagen_base64} 
                                alt={item.nombre_tentativo}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {item.tipo === 'url' ? <Link size={32} /> : <Image size={32} />}
                              </div>
                            )}
                          </div>
                          
                          {/* Info del item */}
                          <p className="text-sm font-medium truncate">
                            {item.nombre_tentativo || 'Sin nombre'}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--texto-secundario)' }}>
                            {item.descripcion || 'Sin descripción'}
                          </p>

                          {/* Botón eliminar */}
                          <button
                            onClick={() => eliminarItem(item.index)}
                            className="absolute top-2 right-2 p-1 bg-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                          >
                            <Trash2 size={16} className="text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="card-mare text-center py-12">
            <Search size={48} className="mx-auto mb-4" style={{ color: 'var(--arena-claro)' }} />
            <p style={{ color: 'var(--texto-secundario)' }}>
              Selecciona o crea una investigación para comenzar
            </p>
          </div>
        )}
      </div>

      {/* Modal de formulario */}
      {showForm && selectedInvestigacion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card-mare" style={{ 
            backgroundColor: 'white',
            maxWidth: '32rem',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden'
          }}>
            <div className="p-6">
              <h3 className="text-xl font-playfair mb-4">Agregar Item</h3>
              
              {/* Tipo de item */}
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipo"
                    value="url"
                    checked={currentItem.tipo === 'url'}
                    onChange={(e) => setCurrentItem({...currentItem, tipo: e.target.value})}
                    style={{ accentColor: 'var(--marron-oscuro)' }}
                  />
                  <Link size={20} />
                  <span>URL de imagen</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipo"
                    value="imagen"
                    checked={currentItem.tipo === 'imagen'}
                    onChange={(e) => setCurrentItem({...currentItem, tipo: e.target.value})}
                    style={{ accentColor: 'var(--marron-oscuro)' }}
                  />
                  <Image size={20} />
                  <span>Subir imagen</span>
                </label>
              </div>

              {/* URL o carga de imagen */}
              {currentItem.tipo === 'url' ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">URL de la imagen</label>
                  <input
                    type="url"
                    value={currentItem.url}
                    onChange={(e) => setCurrentItem({...currentItem, url: e.target.value})}
                    className="input-mare"
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Seleccionar imagen</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="input-mare"
                  />
                  {currentItem.imagen_base64 && (
                    <img 
                      src={currentItem.imagen_base64} 
                      alt="Preview" 
                      className="mt-2 w-32 h-32 object-cover rounded-lg"
                    />
                  )}
                </div>
              )}

              {/* Categoría */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Categoría *</label>
                <select
                  value={currentItem.categoria}
                  onChange={(e) => setCurrentItem({...currentItem, categoria: e.target.value})}
                  className="select-mare"
                  required
                >
                  <option value="">Seleccionar categoría...</option>
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Nombre tentativo */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Nombre tentativo</label>
                <input
                  type="text"
                  value={currentItem.nombre_tentativo}
                  onChange={(e) => setCurrentItem({...currentItem, nombre_tentativo: e.target.value})}
                  className="input-mare"
                  placeholder="Ej: Collar con perlas"
                />
              </div>

              {/* Descripción */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Descripción / Notas</label>
                <textarea
                  value={currentItem.descripcion}
                  onChange={(e) => setCurrentItem({...currentItem, descripcion: e.target.value})}
                  className="input-mare"
                  rows="3"
                  placeholder="Detalles adicionales..."
                />
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowForm(false)}
                  className="btn-mare-secondary"
                >
                  Cancelar
                </button>
                <button 
                  onClick={agregarItem}
                  className="btn-mare"
                >
                  Agregar Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de selección de productos de OC */}
      {showOCModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card-mare" style={{ 
            backgroundColor: 'white',
            maxWidth: '80rem',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header fijo */}
            <div className="p-6 border-b" style={{ borderColor: 'var(--arena-claro)', flexShrink: 0 }}>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-playfair">Agregar Productos desde Órdenes de Compra</h3>
                <button 
                  onClick={() => setShowOCModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            {/* Contenido con scroll */}
            <div className="flex-1 overflow-y-auto p-6" style={{ minHeight: 0 }}>
              {loadingOC ? (
                <div className="text-center py-8">Cargando órdenes de compra...</div>
              ) : ordenesCompra.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--texto-secundario)' }}>
                  <ShoppingCart size={48} className="mx-auto mb-4" style={{ color: 'var(--arena-claro)' }} />
                  <p className="text-lg font-medium mb-2">No hay órdenes de compra en el historial</p>
                  <p className="text-sm">Solo se muestran OCs completadas de embarques anteriores</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {ordenesCompra.map(oc => (
                    <div key={oc.id} className="border rounded-lg p-4" style={{ borderColor: 'var(--arena-claro)' }}>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <ShoppingCart size={20} style={{ color: 'var(--marron-oscuro)' }} />
                            <h4 className="font-medium">{oc.numero}</h4>
                          </div>
                          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--texto-secundario)' }}>
                            <Calendar size={16} />
                            {new Date(oc.fecha).toLocaleDateString()}
                          </div>
                          <div className="text-sm" style={{ color: 'var(--texto-secundario)' }}>
                            {oc.proveedores?.nombre || 'Sin proveedor'}
                          </div>
                        </div>
                        
                        {oc.productos && oc.productos.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {oc.productos.map((producto, index) => (
                              <div key={index} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors" style={{ borderColor: 'var(--arena-claro)' }}>
                                {/* Imagen del producto */}
                                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
                                  {producto.imagenes?.[0] ? (
                                    <img 
                                      src={producto.imagenes[0]} 
                                      alt={producto.nombre}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Image size={24} style={{ color: 'var(--arena-claro)' }} />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Info del producto */}
                                <div className="space-y-2">
                                  <p className="text-sm font-medium truncate">
                                    {producto.nombre || 'Sin nombre'}
                                  </p>
                                  <p className="text-xs" style={{ color: 'var(--texto-secundario)' }}>
                                    {producto.codigo_producto || 'Sin código'}
                                  </p>
                                  <p className="text-xs" style={{ color: 'var(--texto-secundario)' }}>
                                    {producto.categoria || 'Sin categoría'}
                                  </p>
                                  <p className="text-xs font-medium">
                                    FOB: ${producto.precio_fob || '0.00'}
                                  </p>
                                  
                                  <button
                                    onClick={() => agregarProductoDeOC(producto, oc.numero)}
                                    className="w-full btn-mare text-xs py-1 mt-2"
                                  >
                                    <Plus size={14} />
                                    Agregar
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-center py-4" style={{ color: 'var(--texto-secundario)' }}>
                            Esta orden no tiene productos
                          </p>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINADO: Portal de proveedores - Sistema simplificado */}
    </div>
  );
}