// src/pages/Productos.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Image,
  Download,
  Upload,
  Filter,
  Eye,
  Trash2
} from 'lucide-react';
import { productosService, supabase } from '../services/supabase';
import ProductoForm from '../components/ProductoForm';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('todas');
  const [showForm, setShowForm] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [categorias, setCategorias] = useState(['todas']);
  
  // Configuración global para cálculos
  const [coeficienteGlobal, setCoeficienteGlobal] = useState(1.40);
  const [tipoCambioGlobal, setTipoCambioGlobal] = useState(41.0);
  const [margenGanancia, setMargenGanancia] = useState(2.0); // x2 por defecto
  const [ivaIncluido, setIvaIncluido] = useState(1.22); // 22% de IVA por defecto
  
  // Estados para embarques
  const [embarques, setEmbarques] = useState([]);
  const [embarqueActivo, setEmbarqueActivo] = useState(null);
  const [filtroEmbarque, setFiltroEmbarque] = useState('activo');
  const [showConfig, setShowConfig] = useState(false);

  // Cargar productos al montar
  useEffect(() => {
    cargarProductos();
    cargarEmbarques();
  }, []);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      const data = await productosService.getAll();
      setProductos(data || []);
      
      // Extraer categorías únicas
      const cats = ['todas', ...new Set(data.map(p => p.categoria).filter(Boolean))];
      setCategorias(cats);
    } catch (error) {
      console.error('Error cargando productos:', error);
      alert('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  // Cargar embarques
  const cargarEmbarques = async () => {
    try {
      const { data: embarquesData, error } = await supabase
        .from('embarques')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Encontrar embarque activo
      const embarqueActual = embarquesData?.find(e => e.estado !== 'recibido') || null;
      
      setEmbarques(embarquesData || []);
      setEmbarqueActivo(embarqueActual);
      
    } catch (error) {
      console.error('Error cargando embarques:', error);
    }
  };

  // Filtrar productos por embarque y otros criterios
  const productosFiltrados = productos.filter(producto => {
    const matchSearch = producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       producto.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       (producto.descripcion && producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchCategoria = filterCategoria === 'todas' || producto.categoria === filterCategoria;
    
    // Filtrado por embarque (basado en los metadatos del producto)
    let matchEmbarque = true;
    if (filtroEmbarque === 'activo' && embarqueActivo) {
      // Solo productos del embarque activo
      matchEmbarque = producto.embarque_id === embarqueActivo.id;
    } else if (filtroEmbarque !== 'activo' && filtroEmbarque !== 'todos') {
      // Embarque específico
      matchEmbarque = producto.embarque_id === filtroEmbarque;
    }
    // Si filtroEmbarque === 'todos', no filtrar por embarque
    
    return matchSearch && matchCategoria && matchEmbarque && producto.estado === 'activo';
  });

  // Manejar edición
  const handleEdit = (producto) => {
    setSelectedProducto(producto);
    setShowForm(true);
  };


  // Exportar Excel para Catálogo de Ventas
  const exportarExcelCatalogo = () => {
    const datosExport = productosFiltrados.map(p => ({
      'Codigo': p.codigo,
      'Nombre': '', // Dejar vacío - se llena manualmente
      'Descripcion': p.nombre, // Va el nombre del producto de la OC
      'Categoria': p.categoria || '',
      'Medidas': '', // Se llena manualmente
      'Precio': p.precio_sugerido || 0,
      'imagen de 1 hasta 10': '',
      'imagen Variante': '',
      'Sin color': '',
      'Permitir surtido': '',
      'Estado': '',
      // Agregar columnas de colores si existen
      ...(p.colores ? p.colores.reduce((acc, color, index) => {
        acc[`Color ${index + 1}`] = color;
        return acc;
      }, {}) : {})
    }));

    const ws = XLSX.utils.json_to_sheet(datosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Catálogo Ventas");
    
    // Generar archivo
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `catalogo_ventas_mare_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Exportar Excel para ERP
  const exportarExcelERP = () => {
    const datosExport = productosFiltrados.map(p => ({
      'Codigo del producto': p.codigo,
      'Descripcion': p.nombre, // Va el nombre del producto de la OC
      'Categoria': p.categoria || '',
      'Codigo de barras': p.codigo_barras || '',
      'Precio Costo': p.precio_fob || 0, // Costo FOB final de la OC
      'Precio venta': p.precio_sugerido || 0, // Precio final definido en catálogo
      'Stock inicial': p.stock_inicial || 0 // Cantidad confirmada del control invoice
    }));

    const ws = XLSX.utils.json_to_sheet(datosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos ERP");
    
    // Generar archivo
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `productos_erp_mare_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Cerrar formulario
  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedProducto(null);
    cargarProductos();
  };

  // Función centralizada para calcular precio sugerido
  const calcularPrecioSugerido = (precioFOB, coef = coeficienteGlobal, cambio = tipoCambioGlobal, margen = margenGanancia, iva = ivaIncluido) => {
    // Fórmula: FOB × Coeficiente × Tipo_Cambio × Margen_Ganancia × IVA
    return Math.round(precioFOB * coef * cambio * margen * iva);
  };

  // Actualizar coeficiente y recalcular precios
  const actualizarCoeficiente = async (nuevoCoeficiente) => {
    setCoeficienteGlobal(nuevoCoeficiente);
    
    // Recalcular precios sugeridos para todos los productos
    const productosActualizados = productos.map(producto => ({
      ...producto,
      coeficiente: nuevoCoeficiente,
      precio_sugerido: calcularPrecioSugerido(producto.precio_fob, nuevoCoeficiente)
    }));
    
    setProductos(productosActualizados);
  };

  // Actualizar tipo de cambio y recalcular precios
  const actualizarTipoCambio = async (nuevoTipoCambio) => {
    setTipoCambioGlobal(nuevoTipoCambio);
    
    // Recalcular precios sugeridos para todos los productos
    const productosActualizados = productos.map(producto => ({
      ...producto,
      precio_sugerido: calcularPrecioSugerido(producto.precio_fob, undefined, nuevoTipoCambio)
    }));
    
    setProductos(productosActualizados);
  };

  // Actualizar margen de ganancia y recalcular precios
  const actualizarMargenGanancia = async (nuevoMargen) => {
    setMargenGanancia(nuevoMargen);
    
    // Recalcular precios sugeridos para todos los productos
    const productosActualizados = productos.map(producto => ({
      ...producto,
      precio_sugerido: calcularPrecioSugerido(producto.precio_fob, undefined, undefined, nuevoMargen)
    }));
    
    setProductos(productosActualizados);
  };

  // Actualizar IVA y recalcular precios
  const actualizarIVA = async (nuevoIVA) => {
    setIvaIncluido(nuevoIVA);
    
    // Recalcular precios sugeridos para todos los productos
    const productosActualizados = productos.map(producto => ({
      ...producto,
      precio_sugerido: calcularPrecioSugerido(producto.precio_fob, undefined, undefined, undefined, nuevoIVA)
    }));
    
    setProductos(productosActualizados);
  };

  // Aplicar configuración global a todos los productos
  const aplicarConfiguracionGlobal = async () => {
    if (!confirm(`¿Aplicar nueva configuración (Coef: ${coeficienteGlobal}, Cambio: $${tipoCambioGlobal}, Margen: x${margenGanancia}, IVA: x${ivaIncluido}) a todos los productos?`)) {
      return;
    }

    try {
      // Actualizar todos los productos en la base de datos
      for (const producto of productos) {
        const nuevoPrecioSugerido = calcularPrecioSugerido(producto.precio_fob);
        
        await productosService.update(producto.id, {
          coeficiente: coeficienteGlobal,
          precio_sugerido: nuevoPrecioSugerido
        });
      }
      
      // Recargar productos
      await cargarProductos();
      setShowConfig(false);
      alert('Configuración aplicada exitosamente a todos los productos');
      
    } catch (error) {
      console.error('Error aplicando configuración:', error);
      alert('Error al aplicar configuración');
    }
  };

  // Editar precio sugerido individual
  const editarPrecioSugerido = async (productoId, nuevoPrecio) => {
    try {
      await productosService.update(productoId, {
        precio_sugerido: parseFloat(nuevoPrecio)
      });
      
      // Actualizar en el estado local
      setProductos(productos.map(p => 
        p.id === productoId ? { ...p, precio_sugerido: parseFloat(nuevoPrecio) } : p
      ));
      
    } catch (error) {
      console.error('Error actualizando precio:', error);
      alert('Error al actualizar precio');
    }
  };

  // Eliminar producto
  const eliminarProducto = async (producto) => {
    if (!confirm(`¿Estás seguro de eliminar el producto "${producto.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await productosService.delete(producto.id);
      
      // Actualizar estado local
      setProductos(productos.filter(p => p.id !== producto.id));
      
      alert('Producto eliminado correctamente');
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar producto');
    }
  };

  return (
    <div>
      {/* Header con acciones */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-playfair">Catálogo de Productos</h1>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="btn-mare-secondary"
            style={{ backgroundColor: showConfig ? 'var(--verde-agua)' : '', color: showConfig ? 'black' : '' }}
          >
            ⚙️ Configuración
          </button>
          <button className="btn-mare-secondary">
            <Upload size={20} />
            Importar Excel
          </button>
          <button onClick={exportarExcelCatalogo} className="btn-mare-secondary">
            <Download size={20} />
            Excel Catálogo
          </button>
          <button onClick={exportarExcelERP} className="btn-mare-secondary">
            <Download size={20} />
            Excel ERP
          </button>
          <button onClick={() => setShowForm(true)} className="btn-mare">
            <Plus size={20} />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Selector de Embarque */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Filtrar Catálogo por Embarque:</label>
        <select 
          value={filtroEmbarque} 
          onChange={(e) => setFiltroEmbarque(e.target.value)}
          className="input-mare text-sm max-w-md"
        >
          <option value="activo">
            📦 {embarqueActivo ? `Embarque Activo: ${embarqueActivo.codigo}` : 'Sin embarque activo'}
          </option>
          <option value="todos">📋 Todos los Productos</option>
          {embarques.filter(e => e.id !== embarqueActivo?.id).map(embarque => (
            <option key={embarque.id} value={embarque.id}>
              🚢 {embarque.codigo} ({embarque.estado})
            </option>
          ))}
        </select>
        
        <div className="mt-2 text-xs" style={{ color: 'var(--texto-secundario)' }}>
          {filtroEmbarque === 'activo' && embarqueActivo && (
            <span>✅ Mostrando productos del embarque activo solamente</span>
          )}
          {filtroEmbarque === 'activo' && !embarqueActivo && (
            <span>📝 No hay embarque activo - Mostrando todos los productos</span>
          )}
          {filtroEmbarque === 'todos' && (
            <span>📊 Mostrando productos de todos los embarques</span>
          )}
          {filtroEmbarque !== 'activo' && filtroEmbarque !== 'todos' && (
            <span>🔍 Mostrando solo productos del embarque seleccionado</span>
          )}
        </div>
      </div>

      {/* Panel de configuración global */}
      {showConfig && (
        <div className="card-mare mb-6" style={{ backgroundColor: 'var(--nude-suave)' }}>
          <h3 className="text-lg font-medium mb-4">Configuración Global de Precios</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-2">Coeficiente</label>
              <input
                type="number"
                value={coeficienteGlobal}
                onChange={(e) => actualizarCoeficiente(parseFloat(e.target.value) || 1.40)}
                className="input-mare"
                step="0.1"
                min="1"
                placeholder="1.40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Cambio (UYU)</label>
              <input
                type="number"
                value={tipoCambioGlobal}
                onChange={(e) => actualizarTipoCambio(parseFloat(e.target.value) || 41.0)}
                className="input-mare"
                step="0.1"
                min="1"
                placeholder="41.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Margen Ganancia (x)</label>
              <input
                type="number"
                value={margenGanancia}
                onChange={(e) => actualizarMargenGanancia(parseFloat(e.target.value) || 2.0)}
                className="input-mare"
                step="0.1"
                min="1"
                placeholder="2.0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">IVA Incluido (x)</label>
              <input
                type="number"
                value={ivaIncluido}
                onChange={(e) => actualizarIVA(parseFloat(e.target.value) || 1.22)}
                className="input-mare"
                step="0.01"
                min="1"
                placeholder="1.22"
              />
            </div>
            <div>
              <button 
                onClick={aplicarConfiguracionGlobal}
                className="btn-mare w-full"
                style={{ backgroundColor: 'var(--verde-agua)', color: 'black' }}
              >
                Aplicar a Todos
              </button>
            </div>
          </div>
          <div className="mt-3 text-sm" style={{ color: 'var(--texto-secundario)' }}>
            <strong>Vista previa:</strong> FOB $10.00 → Precio sugerido: ${calcularPrecioSugerido(10)} UYU
            <br />
            <span className="text-xs">Cálculo: $10 × {coeficienteGlobal} × {tipoCambioGlobal} × {margenGanancia} × {ivaIncluido} = ${calcularPrecioSugerido(10)} UYU</span>
          </div>
        </div>
      )}

      {/* Barra de búsqueda y filtros */}
      <div className="card-mare mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por código, nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-mare pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} style={{ color: 'var(--texto-secundario)' }} />
            <select 
              value={filterCategoria} 
              onChange={(e) => setFilterCategoria(e.target.value)}
              className="select-mare"
            >
              {categorias.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'todas' ? 'Todas las categorías' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Contador de resultados */}
        <div className="mt-4 text-sm" style={{ color: 'var(--texto-secundario)' }}>
          Mostrando {productosFiltrados.length} de {productos.filter(p => p.estado === 'activo').length} productos activos
        </div>
      </div>

      {/* Tabla de productos */}
      {loading ? (
        <div className="text-center py-8">Cargando productos...</div>
      ) : (
        <div className="card-mare">
          <div style={{ overflowX: 'auto' }}>
            <table className="table-mare">
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Precio FOB</th>
                  <th>Coef.</th>
                  <th>P. Sugerido</th>
                  <th>Stock Inicial</th>
                  <th>Stock Actual</th>
                  <th>Colores</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-8">
                      No se encontraron productos
                    </td>
                  </tr>
                ) : (
                  productosFiltrados.map(producto => (
                    <tr key={producto.id}>
                      <td>
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          {producto.imagen_principal ? (
                            <img 
                              src={producto.imagen_principal} 
                              alt={producto.nombre}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Image size={20} className="text-gray-400" />
                          )}
                        </div>
                      </td>
                      <td className="font-medium">{producto.codigo}</td>
                      <td>{producto.nombre}</td>
                      <td>{producto.categoria || '-'}</td>
                      <td>${producto.precio_fob || 0}</td>
                      <td>{producto.coeficiente || 2.85}</td>
                      <td className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>$</span>
                          <input
                            type="number"
                            value={producto.precio_sugerido || Math.round(producto.precio_fob * (producto.coeficiente || 2.85))}
                            onChange={(e) => editarPrecioSugerido(producto.id, e.target.value)}
                            className="input-mare text-center font-medium"
                            style={{ width: '80px' }}
                            step="1"
                            min="0"
                          />
                        </div>
                      </td>
                      <td className="text-center font-medium">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {producto.stock_inicial || 0}
                        </span>
                      </td>
                      <td className="text-center font-medium">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                          {producto.stock_actual || 0}
                        </span>
                      </td>
                      <td>
                        {producto.colores && producto.colores.length > 0 ? (
                          <div className="flex gap-1">
                            {producto.colores.slice(0, 3).map((color, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-1 text-xs rounded-full"
                                style={{ 
                                  backgroundColor: 'var(--arena-claro)',
                                  color: 'var(--texto-secundario)'
                                }}
                              >
                                {color}
                              </span>
                            ))}
                            {producto.colores.length > 3 && (
                              <span className="text-xs" style={{ color: 'var(--texto-secundario)' }}>
                                +{producto.colores.length - 3}
                              </span>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(producto)}
                            className="p-2 rounded-lg hover:bg-gray-100"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => eliminarProducto(producto)}
                            className="p-2 rounded-lg hover:bg-red-100"
                            title="Eliminar producto"
                          >
                            <Trash2 size={16} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de formulario */}
      {showForm && (
        <ProductoForm
          producto={selectedProducto}
          onClose={handleCloseForm}
          onSave={handleCloseForm}
        />
      )}
    </div>
  );
}