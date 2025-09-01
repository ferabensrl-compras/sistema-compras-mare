// src/components/EmbarqueForm.jsx
import React, { useState } from 'react';
import { X, Save, Ship, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function EmbarqueForm({ embarque, ordenes, onClose, onSave }) {
  const [formData, setFormData] = useState({
    codigo: embarque?.codigo || '',
    ordenes_ids: embarque?.ordenes_ids || [],
    tracking: embarque?.tracking || '',
    contenedor: embarque?.contenedor || '',
    forwarder: embarque?.forwarder || '',
    fecha_estimada_salida: embarque?.fecha_estimada_salida || '',
    fecha_llegada: embarque?.fecha_llegada || '',
    fecha_entrega: embarque?.fecha_entrega || '',
    peso_total: embarque?.peso_total || '',
    volumen_total: embarque?.volumen_total || '',
    notas: embarque?.notas || ''
  });

  const [loading, setLoading] = useState(false);

  // Manejar selección de órdenes
  const toggleOrden = (ordenId) => {
    const nuevasOrdenes = formData.ordenes_ids.includes(ordenId)
      ? formData.ordenes_ids.filter(id => id !== ordenId)
      : [...formData.ordenes_ids, ordenId];
    
    setFormData({ ...formData, ordenes_ids: nuevasOrdenes });
  };

  // Calcular totales
  const calcularTotales = () => {
    const ordenesSeleccionadas = ordenes.filter(oc => 
      formData.ordenes_ids.includes(oc.id)
    );
    
    const totalFOB = ordenesSeleccionadas.reduce((sum, oc) => sum + (oc.total_fob || 0), 0);
    const totalOrdenes = ordenesSeleccionadas.length;
    
    return { totalFOB, totalOrdenes };
  };

  // Guardar cambios
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.codigo) {
      alert('El código del embarque es obligatorio');
      return;
    }

    if (formData.ordenes_ids.length === 0) {
      alert('Debe incluir al menos una orden de compra');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('embarques')
        .update({
          codigo: formData.codigo,
          ordenes_ids: formData.ordenes_ids,
          tracking: formData.tracking,
          contenedor: formData.contenedor,
          forwarder: formData.forwarder,
          fecha_estimada_salida: formData.fecha_estimada_salida || null,
          fecha_llegada: formData.fecha_llegada || null,
          fecha_entrega: formData.fecha_entrega || null,
          peso_total: formData.peso_total || null,
          volumen_total: formData.volumen_total || null,
          notas: formData.notas
        })
        .eq('id', embarque.id)
        .select()
        .single();

      if (error) throw error;

      onSave(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar embarque');
    } finally {
      setLoading(false);
    }
  };

  const totales = calcularTotales();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card-mare" style={{ 
        backgroundColor: 'white',
        maxWidth: '48rem',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--arena-claro)' }}>
          <h2 className="text-2xl font-playfair">Editar Embarque</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna izquierda */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información General</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Código del Embarque *
                </label>
                <input
                  type="text"
                  value={formData.codigo}
                  onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                  className="input-mare"
                  placeholder="Ej: AGOSTO-2025"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Número de Tracking
                </label>
                <input
                  type="text"
                  value={formData.tracking}
                  onChange={(e) => setFormData({...formData, tracking: e.target.value})}
                  className="input-mare"
                  placeholder="ABC123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Contenedor
                </label>
                <input
                  type="text"
                  value={formData.contenedor}
                  onChange={(e) => setFormData({...formData, contenedor: e.target.value})}
                  className="input-mare"
                  placeholder="MSKU1234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Forwarder / Agente
                </label>
                <input
                  type="text"
                  value={formData.forwarder}
                  onChange={(e) => setFormData({...formData, forwarder: e.target.value})}
                  className="input-mare"
                  placeholder="Nombre del forwarder"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Peso Total (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.peso_total}
                    onChange={(e) => setFormData({...formData, peso_total: e.target.value})}
                    className="input-mare"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Volumen (m³)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.volumen_total}
                    onChange={(e) => setFormData({...formData, volumen_total: e.target.value})}
                    className="input-mare"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Columna derecha */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Fechas y Órdenes</h3>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Fecha Estimada de Salida
                </label>
                <input
                  type="date"
                  value={formData.fecha_estimada_salida}
                  onChange={(e) => setFormData({...formData, fecha_estimada_salida: e.target.value})}
                  className="input-mare"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Fecha de Llegada
                </label>
                <input
                  type="date"
                  value={formData.fecha_llegada}
                  onChange={(e) => setFormData({...formData, fecha_llegada: e.target.value})}
                  className="input-mare"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Fecha de Entrega
                </label>
                <input
                  type="date"
                  value={formData.fecha_entrega}
                  onChange={(e) => setFormData({...formData, fecha_entrega: e.target.value})}
                  className="input-mare"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Órdenes de Compra Incluidas *
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                  {ordenes
                    .filter(oc => 
                      // Mostrar OCs que no tienen embarque O que ya están en este embarque
                      !oc.embarque_id || formData.ordenes_ids.includes(oc.id)
                    )
                    .map(oc => (
                    <label key={oc.id} className="flex items-center p-2 rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.ordenes_ids.includes(oc.id)}
                        onChange={() => toggleOrden(oc.id)}
                        className="mr-2"
                        style={{ accentColor: 'var(--marron-oscuro)' }}
                      />
                      <div className="flex-1">
                        <span className="font-medium text-sm">{oc.numero}</span>
                        <span className="text-xs ml-2" style={{ color: 'var(--texto-secundario)' }}>
                          {oc.proveedor?.nombre} {oc.embarque_id && !formData.ordenes_ids.includes(oc.id) ? '(Ya asignada)' : ''}
                        </span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: 'var(--marron-oscuro)' }}>
                        ${oc.total_fob?.toFixed(2)}
                      </span>
                    </label>
                  ))}
                  
                  {ordenes.filter(oc => !oc.embarque_id || formData.ordenes_ids.includes(oc.id)).length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      No hay órdenes disponibles para asignar
                    </p>
                  )}
                </div>
                {totales.totalOrdenes > 0 && (
                  <div className="mt-2 p-2 rounded" style={{ backgroundColor: 'var(--nude-suave)' }}>
                    <p className="text-sm">
                      <strong>{totales.totalOrdenes}</strong> órdenes seleccionadas • 
                      Total FOB: <strong style={{ color: 'var(--marron-oscuro)' }}>
                        ${totales.totalFOB.toFixed(2)}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="mt-6">
            <label className="block text-sm font-medium mb-2">
              Notas / Observaciones
            </label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({...formData, notas: e.target.value})}
              className="input-mare"
              rows="3"
              placeholder="Información adicional sobre el embarque..."
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t" style={{ borderColor: 'var(--arena-claro)' }}>
          <button type="button" onClick={onClose} className="btn-mare-secondary">
            Cancelar
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="btn-mare"
          >
            <Save size={20} />
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}