// src/components/ProductoForm.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { X, Save, Plus, Trash2, Upload } from 'lucide-react';
import { productosService } from '../services/supabase';
import JsBarcode from 'jsbarcode';

export default function ProductoForm({ producto, onClose, onSave }) {
  const [formData, setFormData] = useState({
    codigo: producto?.codigo || '',
    nombre: producto?.nombre || '',
    descripcion: producto?.descripcion || '',
    categoria: producto?.categoria || '',
    subcategoria: producto?.subcategoria || '',
    precio_fob: producto?.precio_fob || '',
    coeficiente: producto?.coeficiente || 2.85,
    precio_sugerido: producto?.precio_sugerido || '',
    colores: producto?.colores || [''],
    medidas: producto?.medidas || { largo: '', ancho: '', alto: '' },
    imagen_principal: producto?.imagen_principal || '',
    codigo_barras: producto?.codigo_barras || ''
  });

  const [loading, setLoading] = useState(false);

  // useEffect para generar código de barras cuando cambie el código
  useEffect(() => {
    if (formData.codigo_barras) {
      const canvas = document.getElementById('barcode');
      if (canvas) {
        try {
          JsBarcode(canvas, formData.codigo_barras, {
            format: "CODE128",
            width: 2,
            height: 50,
            displayValue: true
          });
        } catch (error) {
          console.error('Error generando código de barras:', error);
        }
      }
    }
  }, [formData.codigo_barras]);

  // Calcular precio sugerido automáticamente
  const calcularPrecioSugerido = () => {
    if (formData.precio_fob && formData.coeficiente) {
      const sugerido = (parseFloat(formData.precio_fob) * parseFloat(formData.coeficiente)).toFixed(2);
      setFormData(prev => ({ ...prev, precio_sugerido: sugerido }));
    }
  };

  // Generar código de barras
  const generarCodigoBarras = () => {
    if (!formData.codigo) {
      alert('Primero ingrese un código de producto');
      return;
    }
    
    // Generar código numérico basado en el código del producto
    const numericCode = formData.codigo.replace(/[^0-9]/g, '').padStart(12, '0').slice(0, 12);
    setFormData(prev => ({ ...prev, codigo_barras: numericCode }));
  };

  // Manejar cambio en colores
  const handleColorChange = (index, value) => {
    const newColores = [...formData.colores];
    newColores[index] = value;
    setFormData(prev => ({ ...prev, colores: newColores }));
  };

  // Agregar color
  const agregarColor = () => {
    setFormData(prev => ({ ...prev, colores: [...prev.colores, ''] }));
  };

  // Eliminar color
  const eliminarColor = (index) => {
    const newColores = formData.colores.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, colores: newColores }));
  };

  // Guardar producto
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.codigo || !formData.nombre) {
      alert('El código y nombre son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        colores: formData.colores.filter(c => c.trim() !== ''),
        precio_fob: parseFloat(formData.precio_fob) || 0,
        coeficiente: parseFloat(formData.coeficiente) || 2.85,
        precio_sugerido: parseFloat(formData.precio_sugerido) || 0
      };

      if (producto?.id) {
        await productosService.update(producto.id, dataToSave);
      } else {
        await productosService.create(dataToSave);
      }

      onSave();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar el producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card-mare" style={{ 
        backgroundColor: 'white',
        maxWidth: '56rem',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-arena-claro/20">
          <h2 className="text-2xl font-playfair">
            {producto ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium mb-4">Información Básica</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Código *
                </label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                  className="input-mare"
                  placeholder="NK-001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="input-mare"
                  placeholder="Nombre del producto"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Descripción
                </label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  className="input-mare"
                  rows="3"
                  placeholder="Descripción detallada..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={formData.categoria}
                    onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                    className="input-mare"
                    placeholder="Bisutería"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Subcategoría
                  </label>
                  <input
                    type="text"
                    value={formData.subcategoria}
                    onChange={(e) => setFormData({...formData, subcategoria: e.target.value})}
                    className="input-mare"
                    placeholder="Collares"
                  />
                </div>
              </div>
            </div>

            {/* Precios y medidas */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium mb-4">Precios y Medidas</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Precio FOB
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.precio_fob}
                    onChange={(e) => setFormData({...formData, precio_fob: e.target.value})}
                    onBlur={calcularPrecioSugerido}
                    className="input-mare"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Coeficiente
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.coeficiente}
                    onChange={(e) => setFormData({...formData, coeficiente: e.target.value})}
                    onBlur={calcularPrecioSugerido}
                    className="input-mare"
                    placeholder="2.85"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    P. Sugerido
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.precio_sugerido}
                    onChange={(e) => setFormData({...formData, precio_sugerido: e.target.value})}
                    className="input-mare"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Medidas (cm)</label>
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="number"
                    value={formData.medidas.largo}
                    onChange={(e) => setFormData({...formData, medidas: {...formData.medidas, largo: e.target.value}})}
                    className="input-mare"
                    placeholder="Largo"
                  />
                  <input
                    type="number"
                    value={formData.medidas.ancho}
                    onChange={(e) => setFormData({...formData, medidas: {...formData.medidas, ancho: e.target.value}})}
                    className="input-mare"
                    placeholder="Ancho"
                  />
                  <input
                    type="number"
                    value={formData.medidas.alto}
                    onChange={(e) => setFormData({...formData, medidas: {...formData.medidas, alto: e.target.value}})}
                    className="input-mare"
                    placeholder="Alto"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Código de Barras
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.codigo_barras}
                    onChange={(e) => setFormData({...formData, codigo_barras: e.target.value})}
                    className="input-mare flex-1"
                    placeholder="Código de barras"
                  />
                  <button
                    type="button"
                    onClick={generarCodigoBarras}
                    className="btn-mare-secondary"
                  >
                    Generar
                  </button>
                </div>
                {formData.codigo_barras && (
                  <div className="mt-2 p-2 bg-white border rounded">
                    <canvas id="barcode" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Colores */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Colores Disponibles</h3>
              <button
                type="button"
                onClick={agregarColor}
                className="btn-mare-secondary text-sm"
              >
                <Plus size={16} />
                Agregar Color
              </button>
            </div>
            <div className="space-y-2">
              {formData.colores.map((color, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => handleColorChange(index, e.target.value)}
                    className="input-mare flex-1"
                    placeholder="Nombre del color"
                  />
                  {formData.colores.length > 1 && (
                    <button
                      type="button"
                      onClick={() => eliminarColor(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Imagen */}
          <div className="mt-6">
            <label className="block text-sm font-medium mb-2">
              URL de Imagen Principal
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.imagen_principal}
                onChange={(e) => setFormData({...formData, imagen_principal: e.target.value})}
                className="input-mare flex-1"
                placeholder="https://ejemplo.com/imagen.jpg"
              />
              <button type="button" className="btn-mare-secondary">
                <Upload size={20} />
                Subir
              </button>
            </div>
            {formData.imagen_principal && (
              <div className="mt-2">
                <img 
                  src={formData.imagen_principal} 
                  alt="Preview" 
                  className="w-32 h-32 object-cover rounded-lg"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-arena-claro/20">
          <button type="button" onClick={onClose} className="btn-mare-secondary">
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="btn-mare"
          >
            <Save size={20} />
            {loading ? 'Guardando...' : 'Guardar Producto'}
          </button>
        </div>
      </div>
    </div>
  );
}

ProductoForm.propTypes = {
  producto: PropTypes.shape({
    id: PropTypes.string,
    codigo: PropTypes.string,
    nombre: PropTypes.string,
    descripcion: PropTypes.string,
    categoria: PropTypes.string,
    subcategoria: PropTypes.string,
    precio_fob: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    coeficiente: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    precio_sugerido: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    colores: PropTypes.arrayOf(PropTypes.string),
    medidas: PropTypes.shape({
      largo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      ancho: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      alto: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    }),
    imagen_principal: PropTypes.string,
    codigo_barras: PropTypes.string
  }),
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
};