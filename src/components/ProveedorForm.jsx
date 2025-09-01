// src/components/ProveedorForm.jsx
import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function ProveedorForm({ proveedor, onClose, onSave }) {
  const [formData, setFormData] = useState({
    nombre: proveedor?.nombre || '',
    contacto: proveedor?.contacto || '',
    pais: proveedor?.pais || 'China',
    canal_comunicacion: proveedor?.canal_comunicacion || 'WeChat',
    email: proveedor?.email || '',
    usuario_activo: proveedor?.usuario_activo || false
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre) {
      alert('El nombre es obligatorio');
      return;
    }

    setLoading(true);
    try {
      if (proveedor?.id) {
        // Actualizar
        const { error } = await supabase
          .from('proveedores')
          .update(formData)
          .eq('id', proveedor.id);
        
        if (error) throw error;
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('proveedores')
          .insert([formData]);
        
        if (error) throw error;
      }

      onSave();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar el proveedor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card-mare" style={{ 
        backgroundColor: 'white',
        maxWidth: '32rem',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--arena-claro)' }}>
          <h2 className="text-2xl font-playfair">
            {proveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nombre del Proveedor *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({...formData, nombre: e.target.value})}
              className="input-mare"
              placeholder="Ej: Proveedor Principal China"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Persona de Contacto
            </label>
            <input
              type="text"
              value={formData.contacto}
              onChange={(e) => setFormData({...formData, contacto: e.target.value})}
              className="input-mare"
              placeholder="Ej: Juan Chen"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              País
            </label>
            <select
              value={formData.pais}
              onChange={(e) => setFormData({...formData, pais: e.target.value})}
              className="select-mare"
            >
              <option value="China">China</option>
              <option value="India">India</option>
              <option value="Vietnam">Vietnam</option>
              <option value="Bangladesh">Bangladesh</option>
              <option value="Turquía">Turquía</option>
              <option value="Brasil">Brasil</option>
              <option value="Uruguay">Uruguay</option>
              <option value="Argentina">Argentina</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Canal de Comunicación Principal
            </label>
            <select
              value={formData.canal_comunicacion}
              onChange={(e) => setFormData({...formData, canal_comunicacion: e.target.value})}
              className="select-mare"
            >
              <option value="WeChat">WeChat</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Email">Email</option>
              <option value="Telefono">Teléfono</option>
              <option value="Skype">Skype</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="input-mare"
              placeholder="proveedor@ejemplo.com"
            />
          </div>

          <div className="pt-4 border-t" style={{ borderColor: 'var(--arena-claro)' }}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.usuario_activo}
                onChange={(e) => setFormData({...formData, usuario_activo: e.target.checked})}
                className="w-5 h-5 rounded"
                style={{ accentColor: 'var(--marron-oscuro)' }}
              />
              <div>
                <span className="font-medium">Habilitar acceso al sistema</span>
                <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>
                  Permitir que el proveedor pueda ver solicitudes y responder cotizaciones
                </p>
              </div>
            </label>
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
            {loading ? 'Guardando...' : 'Guardar Proveedor'}
          </button>
        </div>
      </div>
    </div>
  );
}