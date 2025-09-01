// src/components/OrdenCompraForm.jsx
import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Package, Calculator, Edit3, AlertTriangle } from 'lucide-react';
import { supabase, productosService, imagenesService } from '../services/supabase';
import ImageEditor from './ImageEditor';

export default function OrdenCompraForm({ orden, onClose, onSave, editingProduct = null, editingIndex = null }) {
  const [formData, setFormData] = useState({
    nombre: '',
    codigo_producto: '',
    codigo_proveedor: '', // Código que usa el proveedor
    nombre_archivo_proveedor: '', // Nombre del archivo Excel del proveedor
    categoria: '',
    precio_fob: '',
    cantidad: '',
    tiempo_produccion: '',
    notas: '',
    codigo_barras: '',
    imagenes: [] // Array de URLs públicas de Storage
  });

  const [loading, setLoading] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [mostrarCategorias, setMostrarCategorias] = useState(false);
  const [categoriasFiltradas, setCategoriasFiltradas] = useState([]);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingImageIndex, setEditingImageIndex] = useState(null);
  const [editingImageUrl, setEditingImageUrl] = useState(null);
  const [codigoValidation, setCodigoValidation] = useState({
    validando: false,
    duplicado: false,
    mensaje: '',
    detalles: null
  });

  // Variable para prevenir procesamiento doble de paste
  const [processingPaste, setProcessingPaste] = useState(false);

  // Agregar event listener para paste global en el formulario
  useEffect(() => {
    const handleGlobalPaste = (e) => {
      // Prevenir procesamiento múltiple
      if (processingPaste) {
        e.preventDefault();
        return;
      }

      // Solo si el foco no está en un input de texto o si está en el área de drop
      const isInputActive = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
      const isDropArea = e.target.hasAttribute('data-paste-area') || e.target.closest('[data-paste-area]');
      
      if (!isInputActive || isDropArea) {
        setProcessingPaste(true);
        handlePaste(e);
        // Reset después de un breve delay
        setTimeout(() => setProcessingPaste(false), 100);
      }
    };

    document.addEventListener('paste', handleGlobalPaste);
    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
      // Limpiar timeout si existe
      if (window.codigoTimeout) {
        clearTimeout(window.codigoTimeout);
      }
    };
  }, [processingPaste]);

  // Cargar categorías existentes al montar el componente
  useEffect(() => {
    cargarCategorias();
    
    // Si está editando, cargar datos del producto
    if (editingProduct) {
      setFormData({
        nombre: editingProduct.nombre || '',
        codigo_producto: editingProduct.codigo_producto || '',
        codigo_proveedor: editingProduct.codigo_proveedor || '',
        nombre_archivo_proveedor: editingProduct.nombre_archivo_proveedor || '',
        categoria: editingProduct.categoria || '',
        precio_fob: editingProduct.precio_fob || '',
        cantidad: editingProduct.cantidad || '',
        tiempo_produccion: editingProduct.tiempo_produccion || '',
        notas: editingProduct.notas || '',
        codigo_barras: editingProduct.codigo_barras || '',
        imagenes: editingProduct.imagenes || []
      });
    }
  }, [editingProduct]);

  // Cargar categorías desde órdenes existentes
  const cargarCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('ordenes_compra')
        .select('productos')
        .neq('productos', null);

      if (error) throw error;

      const categoriasSet = new Set();
      data.forEach(orden => {
        if (orden.productos && Array.isArray(orden.productos)) {
          orden.productos.forEach(producto => {
            if (producto.categoria && producto.categoria.trim()) {
              categoriasSet.add(producto.categoria.trim());
            }
          });
        }
      });

      const categoriasArray = Array.from(categoriasSet).sort();
      setCategorias(categoriasArray);
      setCategoriasFiltradas(categoriasArray);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  };

  // Filtrar categorías mientras escribe
  const manejarCambioCategoria = (valor) => {
    setFormData({ ...formData, categoria: valor });
    
    if (valor) {
      const filtradas = categorias.filter(cat => 
        cat.toLowerCase().includes(valor.toLowerCase())
      );
      setCategoriasFiltradas(filtradas);
      setMostrarCategorias(true);
    } else {
      setCategoriasFiltradas(categorias);
      setMostrarCategorias(false);
    }
  };

  // Seleccionar una categoría
  const seleccionarCategoria = (categoria) => {
    setFormData({ ...formData, categoria });
    setMostrarCategorias(false);
  };

  // Validar código interno con debounce
  const validarCodigo = async (codigo) => {
    // Reset estado
    setCodigoValidation({ validando: false, duplicado: false, mensaje: '', detalles: null });
    
    // Si está vacío o es muy corto, no validar
    if (!codigo || codigo.trim().length < 2) {
      return;
    }
    
    // Si estamos editando y el código no cambió, no validar
    if (editingProduct && editingProduct.codigo_producto === codigo) {
      return;
    }

    setCodigoValidation(prev => ({ ...prev, validando: true }));

    try {
      const resultado = await productosService.existeCodigo(codigo.trim().toUpperCase());
      
      if (resultado.existe) {
        setCodigoValidation({
          validando: false,
          duplicado: true,
          mensaje: resultado.ubicacion === 'catálogo' 
            ? `⚠️ Código duplicado en CATÁLOGO`
            : `⚠️ Código duplicado en ${resultado.orden}`,
          detalles: resultado
        });
      } else {
        setCodigoValidation({
          validando: false,
          duplicado: false,
          mensaje: '✅ Código disponible',
          detalles: null
        });
      }
    } catch (error) {
      console.error('Error validando código:', error);
      setCodigoValidation({
        validando: false,
        duplicado: false,
        mensaje: '❌ Error al validar',
        detalles: null
      });
    }
  };

  // Manejar cambio en código con debounce
  const manejarCambioCodigo = (valor) => {
    const codigoUpperCase = valor.toUpperCase();
    setFormData({ ...formData, codigo_producto: codigoUpperCase });
    
    // Limpiar timeout anterior
    if (window.codigoTimeout) {
      clearTimeout(window.codigoTimeout);
    }
    
    // Validar después de 500ms de no escribir
    window.codigoTimeout = setTimeout(() => {
      validarCodigo(codigoUpperCase);
    }, 500);
  };

  // Calcular dígito verificador EAN13
  const calcularDigitoVerificadorEAN13 = (codigo12digitos) => {
    let suma = 0;
    for (let i = 0; i < 12; i++) {
      const digito = parseInt(codigo12digitos[i]);
      // Multiplicar por 1 o 3 alternadamente (posiciones pares por 1, impares por 3)
      suma += (i % 2 === 0) ? digito : digito * 3;
    }
    
    // El dígito verificador es el número que sumado a la suma da un múltiplo de 10
    const digitoVerificador = (10 - (suma % 10)) % 10;
    return digitoVerificador;
  };

  // Generar código de barras EAN13 único (YYYYMMDDHHMM + dígito verificador)
  const generarCodigoBarras = async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    
    // Crear base de 11 dígitos para poder agregar 1 dígito de intento
    let baseCode = `${year}${month}${day}${hour}${minute}`; // 12 dígitos
    
    // Verificar que no exista ya en la base de datos
    let attempt = 0;
    let finalCode = '';
    
    do {
      // Si es el primer intento, usar el código base (12 dígitos)
      // Si hay conflicto, modificar el último dígito de minutos
      let codigo12digitos;
      if (attempt === 0) {
        codigo12digitos = baseCode; // YYYYMMDDHHMM (12 dígitos)
      } else {
        // Modificar el último dígito del minuto para crear variación
        const baseWithoutLastDigit = baseCode.slice(0, -1);
        const lastDigit = (parseInt(baseCode.slice(-1)) + attempt) % 10;
        codigo12digitos = `${baseWithoutLastDigit}${lastDigit}`;
      }
      
      // Calcular dígito verificador correcto
      const digitoVerificador = calcularDigitoVerificadorEAN13(codigo12digitos);
      finalCode = `${codigo12digitos}${digitoVerificador}`;
      
      const { data, error } = await supabase
        .from('ordenes_compra')
        .select('productos')
        .neq('productos', null);
      
      if (error) break;
      
      // Verificar si ya existe este código
      const codigoExiste = data.some(oc => 
        oc.productos?.some(p => p.codigo_barras === finalCode)
      );
      
      if (!codigoExiste) break;
      
      attempt++;
    } while (attempt < 10);
    
    setFormData(prev => ({ ...prev, codigo_barras: finalCode }));
    return finalCode;
  };

  // Calcular total del producto
  const calcularTotal = () => {
    const precio = parseFloat(formData.precio_fob) || 0;
    const cantidad = parseInt(formData.cantidad) || 0;
    return (precio * cantidad).toFixed(2);
  };

  // Manejar múltiples imágenes
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    
    files.forEach(async (file) => {
      try {
        await uploadImageToStorage(file);
      } catch (error) {
        console.error('Error subiendo archivo:', error);
        alert('Error al subir una imagen. Inténtalo de nuevo.');
      }
    });
    
    // Limpiar el input
    e.target.value = '';
  };

  // Subir imagen a Storage
  const uploadImageToStorage = async (file) => {
    try {
      setLoading(true);
      
      // Generar nombre único basado en código del producto
      const codigoBase = formData.codigo_producto || 'temp';
      const timestamp = Date.now();
      const fileName = `${codigoBase}_${timestamp}.jpg`;
      
      // Subir a Storage
      const result = await imagenesService.uploadImage(file, fileName);
      
      if (result && result.publicUrl) {
        setFormData(prev => ({
          ...prev,
          imagenes: [...prev.imagenes, result.publicUrl]
        }));
        console.log('Imagen subida exitosamente:', result.publicUrl);
      }
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      alert('Error al subir la imagen. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Pegar imagen desde clipboard (Ctrl+V)
  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    let imageFound = false;
    
    console.log('Clipboard items:', items.length);
    
    for (let item of items) {
      console.log('Item type:', item.type, 'Kind:', item.kind);
      
      // Manejo de imágenes directas (funciona con Paint, etc.)
      if (item.type.indexOf('image') === 0 && !imageFound) {
        e.preventDefault();
        imageFound = true;
        
        const file = item.getAsFile();
        console.log('Image file:', file);
        
        if (file && file instanceof File) {
          // Subir imagen a Storage
          uploadImageToStorage(file);
        } else {
          console.warn('File is null or not valid:', file);
        }
        break;
      }
      
      // Manejo de HTML (para Excel, Word, etc.)
      if (item.type === 'text/html' && !imageFound) {
        item.getAsString((html) => {
          console.log('HTML content:', html.substring(0, 200));
          
          // Buscar imágenes en el HTML
          const imgRegex = /<img[^>]+src="data:image\/[^;]+;base64,[^"]+"/gi;
          const matches = html.match(imgRegex);
          
          if (matches && matches.length > 0) {
            e.preventDefault();
            imageFound = true;
            
            matches.forEach(async (match) => {
              const srcMatch = match.match(/src="([^"]+)"/);
              if (srcMatch && srcMatch[1]) {
                // Convertir base64 a Storage
                try {
                  const codigoBase = formData.codigo_producto || 'temp';
                  const timestamp = Date.now();
                  const fileName = `${codigoBase}_${timestamp}.jpg`;
                  
                  const result = await imagenesService.uploadFromBase64(srcMatch[1], fileName);
                  
                  if (result && result.publicUrl) {
                    setFormData(prev => ({
                      ...prev,
                      imagenes: [...prev.imagenes, result.publicUrl]
                    }));
                  }
                } catch (error) {
                  console.error('Error procesando imagen HTML:', error);
                  // Fallback: usar base64 si falla Storage
                  setFormData(prev => ({
                    ...prev,
                    imagenes: [...prev.imagenes, srcMatch[1]]
                  }));
                }
              }
            });
          }
        });
      }
    }
    
    if (!imageFound) {
      console.log('No se encontró imagen en el clipboard');
    }
  };

  // Eliminar imagen
  const eliminarImagen = (index) => {
    setFormData(prev => ({
      ...prev,
      imagenes: prev.imagenes.filter((_, i) => i !== index)
    }));
  };

  // Abrir editor de imagen
  const abrirEditorImagen = (imagenUrl, index) => {
    setEditingImageUrl(imagenUrl);
    setEditingImageIndex(index);
    setShowImageEditor(true);
  };

  // Guardar imagen editada
  const guardarImagenEditada = async (nuevaImagenUrl) => {
    try {
      setLoading(true);
      
      // Si la imagen editada es base64, subirla a Storage
      if (nuevaImagenUrl.startsWith('data:image/')) {
        const codigoBase = formData.codigo_producto || 'temp';
        const timestamp = Date.now();
        const fileName = `${codigoBase}_edited_${timestamp}.jpg`;
        
        const result = await imagenesService.uploadFromBase64(nuevaImagenUrl, fileName);
        
        if (result && result.publicUrl) {
          // Actualizar con la URL de Storage
          setFormData(prev => {
            const nuevasImagenes = [...prev.imagenes];
            nuevasImagenes[editingImageIndex] = result.publicUrl;
            return {
              ...prev,
              imagenes: nuevasImagenes
            };
          });
        }
      } else {
        // Si ya es una URL de Storage, usar directamente
        setFormData(prev => {
          const nuevasImagenes = [...prev.imagenes];
          nuevasImagenes[editingImageIndex] = nuevaImagenUrl;
          return {
            ...prev,
            imagenes: nuevasImagenes
          };
        });
      }
      
      setShowImageEditor(false);
      setEditingImageUrl(null);
      setEditingImageIndex(null);
    } catch (error) {
      console.error('Error guardando imagen editada:', error);
      alert('Error al guardar la imagen editada.');
    } finally {
      setLoading(false);
    }
  };

  // Manejar envío del formulario (agregar o editar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre || !formData.precio_fob || !formData.cantidad) {
      alert('Nombre, precio FOB y cantidad son obligatorios');
      return;
    }

    // Validar código interno obligatorio
    if (!formData.codigo_producto || formData.codigo_producto.trim() === '') {
      alert('El código interno es obligatorio');
      return;
    }

    // Validar que no esté duplicado
    if (codigoValidation.duplicado) {
      alert('No se puede guardar: El código interno ya existe en el sistema.\n\n' +
            `Producto existente: ${codigoValidation.detalles.producto.nombre}\n` +
            `Ubicación: ${codigoValidation.detalles.ubicacion === 'catálogo' ? 'Catálogo' : codigoValidation.detalles.orden}`);
      return;
    }

    // Si está validando, esperar resultado
    if (codigoValidation.validando) {
      alert('Espere un momento... se está validando el código interno');
      return;
    }

    setLoading(true);
    try {
      // Generar código de barras si no existe y es un producto nuevo
      let codigoBarras = formData.codigo_barras;
      if (!codigoBarras && !editingProduct) {
        codigoBarras = await generarCodigoBarras();
      }

      // Preparar el producto (nuevo o editado)
      const producto = {
        nombre: formData.nombre,
        codigo_producto: formData.codigo_producto || '',
        codigo_proveedor: formData.codigo_proveedor || '',
        nombre_archivo_proveedor: formData.nombre_archivo_proveedor || '',
        categoria: formData.categoria || '',
        precio_fob: parseFloat(formData.precio_fob),
        cantidad: parseInt(formData.cantidad),
        total_fob: parseFloat(formData.precio_fob) * parseInt(formData.cantidad),
        tiempo_produccion: formData.tiempo_produccion || '',
        notas: formData.notas || '',
        codigo_barras: codigoBarras || formData.codigo_barras || '',
        imagenes: formData.imagenes || []
      };

      let productosActualizados;
      
      if (editingProduct && editingIndex !== null) {
        // Modo edición: reemplazar producto existente
        productosActualizados = [...(orden.productos || [])];
        productosActualizados[editingIndex] = producto;
      } else {
        // Modo agregar: agregar nuevo producto
        productosActualizados = [...(orden.productos || []), producto];
      }
      
      // Calcular nuevo total
      const nuevoTotal = productosActualizados.reduce((sum, p) => sum + p.total_fob, 0);

      // Actualizar en base de datos
      const { data, error } = await supabase
        .from('ordenes_compra')
        .update({ 
          productos: productosActualizados,
          total_fob: nuevoTotal
        })
        .eq('id', orden.id)
        .select(`
          *,
          proveedor:proveedores(id, nombre, contacto)
        `)
        .single();

      if (error) throw error;

      onSave(data);
    } catch (error) {
      console.error('Error:', error);
      alert(editingProduct ? 'Error al actualizar producto' : 'Error al agregar producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card-mare" style={{ 
        backgroundColor: 'white',
        maxWidth: '50rem',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--arena-claro)', flexShrink: 0 }}>
          <div>
            <h2 className="text-xl font-playfair">
              {editingProduct ? 'Editar Producto' : 'Agregar Producto a OC'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>
              Orden: {orden.numero}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
            <div className="space-y-4">
            {/* Código del producto */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Código Interno
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.codigo_producto}
                    onChange={(e) => manejarCambioCodigo(e.target.value)}
                    className={`input-mare ${codigoValidation.duplicado ? 'border-red-500 bg-red-50' : codigoValidation.mensaje.includes('✅') ? 'border-green-500 bg-green-50' : ''}`}
                    placeholder="Ej: RELW001, CAR002"
                    style={{
                      borderColor: codigoValidation.duplicado ? '#ef4444' : codigoValidation.mensaje.includes('✅') ? '#22c55e' : undefined,
                      backgroundColor: codigoValidation.duplicado ? '#fef2f2' : codigoValidation.mensaje.includes('✅') ? '#f0fdf4' : undefined
                    }}
                  />
                  {codigoValidation.validando && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
                    </div>
                  )}
                  {codigoValidation.duplicado && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                  {codigoValidation.mensaje.includes('✅') && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="h-4 w-4 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Mensaje de validación */}
                {codigoValidation.mensaje && (
                  <p className={`text-xs mt-1 font-medium ${
                    codigoValidation.duplicado ? 'text-red-600' : 
                    codigoValidation.mensaje.includes('✅') ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {codigoValidation.mensaje}
                  </p>
                )}
                
                {/* Detalles del producto duplicado */}
                {codigoValidation.duplicado && codigoValidation.detalles && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                    <p className="font-medium text-red-700">Producto existente:</p>
                    <p className="text-red-600">📦 {codigoValidation.detalles.producto.nombre}</p>
                    {codigoValidation.detalles.ubicacion === 'orden_compra' && codigoValidation.detalles.producto.codigo_proveedor && (
                      <p className="text-red-600">🏷️ Código proveedor: {codigoValidation.detalles.producto.codigo_proveedor}</p>
                    )}
                    {codigoValidation.detalles.orden && (
                      <p className="text-red-600">📋 En: {codigoValidation.detalles.orden}</p>
                    )}
                  </div>
                )}
                
                <p className="text-xs mt-1" style={{ color: 'var(--texto-secundario)' }}>
                  Tu código interno único (se valida automáticamente)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Código del Proveedor
                </label>
                <input
                  type="text"
                  value={formData.codigo_proveedor}
                  onChange={(e) => setFormData({...formData, codigo_proveedor: e.target.value})}
                  className="input-mare"
                  placeholder="Ej: SP-NK-001"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--texto-secundario)' }}>
                  Código del proveedor
                </p>
              </div>
            </div>

            {/* Nombre archivo del proveedor */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Nombre Archivo del Proveedor
              </label>
              <input
                type="text"
                value={formData.nombre_archivo_proveedor}
                onChange={(e) => setFormData({...formData, nombre_archivo_proveedor: e.target.value})}
                className="input-mare"
                placeholder="Ej: COTIZACION_ENERO_2025.xlsx"
              />
              <p className="text-xs mt-1" style={{ color: 'var(--texto-secundario)' }}>
                Nombre del Excel que te envió el proveedor para referencia
              </p>
            </div>

            {/* Código de barras EAN13 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Código de Barras EAN13
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.codigo_barras}
                  onChange={(e) => setFormData({...formData, codigo_barras: e.target.value})}
                  className="input-mare flex-1"
                  placeholder="Se generará automáticamente"
                  maxLength="13"
                />
                <button
                  type="button"
                  onClick={generarCodigoBarras}
                  className="btn-mare-secondary"
                >
                  Generar
                </button>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--texto-secundario)' }}>
                Formato: YYYYMMDDHHMM + dígito de control (13 dígitos)
              </p>
            </div>

            {/* Nombre del producto y Categoría */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="input-mare"
                  placeholder="Ej: Collar de perlas sintéticas"
                  required
                />
              </div>
              
              <div className="relative">
                <label className="block text-sm font-medium mb-2">
                  Categoría
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.categoria}
                    onChange={(e) => manejarCambioCategoria(e.target.value)}
                    onFocus={() => setMostrarCategorias(categorias.length > 0)}
                    className="input-mare"
                    placeholder="Ej: Jewelry"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarCategorias(!mostrarCategorias)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ▼
                  </button>
                  
                  {mostrarCategorias && categoriasFiltradas.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {categoriasFiltradas.map((categoria, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => seleccionarCategoria(categoria)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                        >
                          {categoria}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--texto-secundario)' }}>
                  Escribe o selecciona
                </p>
              </div>
            </div>

            {/* Precio y cantidad */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Precio FOB Unitario *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.precio_fob}
                  onChange={(e) => setFormData({...formData, precio_fob: e.target.value})}
                  className="input-mare"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Cantidad *
                </label>
                <input
                  type="number"
                  value={formData.cantidad}
                  onChange={(e) => setFormData({...formData, cantidad: e.target.value})}
                  className="input-mare"
                  placeholder="100"
                  min="1"
                  required
                />
              </div>
            </div>

            {/* Tiempo de producción */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Tiempo de Producción
              </label>
              <input
                type="text"
                value={formData.tiempo_produccion}
                onChange={(e) => setFormData({...formData, tiempo_produccion: e.target.value})}
                className="input-mare"
                placeholder="Ej: 15-20 días"
              />
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Notas / Observaciones
              </label>
              <textarea
                value={formData.notas}
                onChange={(e) => setFormData({...formData, notas: e.target.value})}
                className="input-mare"
                rows="3"
                placeholder="Información adicional sobre el producto..."
              />
            </div>

            {/* Imágenes del producto */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Imágenes del Producto
              </label>
              
              {/* Botón para subir archivos */}
              <div className="mb-4">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="input-mare"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--texto-secundario)' }}>
                  También puedes pegar imágenes con Ctrl+V en cualquier parte del formulario
                </p>
              </div>

              {/* Galería de imágenes */}
              {formData.imagenes.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.imagenes.map((imagen, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={imagen}
                        alt={`Producto ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90"
                        style={{ borderColor: 'var(--arena-claro)' }}
                        onClick={() => abrirEditorImagen(imagen, index)}
                      />
                      
                      {/* Botones de acción */}
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEditorImagen(imagen, index)}
                          className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          title="Editar imagen"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            eliminarImagen(index);
                          }}
                          className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg font-bold"
                          title="Eliminar imagen"
                        >
                          ×
                        </button>
                      </div>
                      
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 rounded-b-lg">
                        Imagen {index + 1} • Click para editar
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {formData.imagenes.length === 0 && (
                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center"
                  style={{ borderColor: 'var(--arena-claro)' }}
                  data-paste-area="true"
                  tabIndex={0}
                >
                  <Package size={32} className="mx-auto mb-2" style={{ color: 'var(--texto-secundario)' }} />
                  <p style={{ color: 'var(--texto-secundario)' }}>
                    Sube archivos de imagen o pega desde el portapapeles (Ctrl+V)
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--texto-secundario)' }}>
                    Formato: JPG, PNG, etc.
                  </p>
                </div>
              )}
            </div>

            {/* Total calculado */}
            {(formData.precio_fob && formData.cantidad) && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--nude-suave)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator size={20} style={{ color: 'var(--marron-oscuro)' }} />
                    <span className="font-medium">Total FOB del Producto:</span>
                  </div>
                  <span className="text-xl font-bold" style={{ color: 'var(--marron-oscuro)' }}>
                    ${calcularTotal()}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: 'var(--texto-secundario)' }}>
                  {formData.cantidad} unidades × ${formData.precio_fob}
                </p>
              </div>
            )}

            {/* Productos actuales en la orden */}
            {orden.productos && orden.productos.length > 0 && (
              <div className="border-t pt-4" style={{ borderColor: 'var(--arena-claro)' }}>
                <h4 className="text-sm font-medium mb-2">Productos en esta orden:</h4>
                <div className="space-y-1">
                  {orden.productos.slice(0, 3).map((prod, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{prod.nombre}</span>
                      <span style={{ color: 'var(--texto-secundario)' }}>
                        {prod.cantidad} pcs - ${prod.total_fob.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {orden.productos.length > 3 && (
                    <p className="text-xs" style={{ color: 'var(--texto-secundario)' }}>
                      y {orden.productos.length - 3} productos más...
                    </p>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t flex justify-between" style={{ borderColor: 'var(--arena-claro)' }}>
                  <span className="font-medium">Total actual OC:</span>
                  <span className="font-bold" style={{ color: 'var(--marron-oscuro)' }}>
                    ${orden.total_fob.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            </div>
          </div>
          
          {/* Footer con botones */}
          <div className="flex justify-end gap-3 p-4 border-t" style={{ borderColor: 'var(--arena-claro)', flexShrink: 0 }}>
            <button type="button" onClick={onClose} className="btn-mare-secondary">
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={loading || orden.estado !== 'borrador'}
              className="btn-mare"
            >
              <Package size={18} />
              {loading 
                ? (editingProduct ? 'Actualizando...' : 'Agregando...') 
                : (editingProduct ? 'Actualizar Producto' : 'Agregar Producto')
              }
            </button>
          </div>
        </form>
      </div>

      {/* Editor de imágenes */}
      {showImageEditor && (
        <ImageEditor
          imageUrl={editingImageUrl}
          onClose={() => {
            setShowImageEditor(false);
            setEditingImageUrl(null);
            setEditingImageIndex(null);
          }}
          onSave={guardarImagenEditada}
        />
      )}
    </div>
  );
}