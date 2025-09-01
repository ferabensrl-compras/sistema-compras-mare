// src/pages/Proveedores.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Archive,
  Mail,
  Phone,
  MapPin,
  MessageCircle,
  User,
  Trash2
} from 'lucide-react';
import { supabase } from '../services/supabase';
import ProveedorForm from '../components/ProveedorForm';

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState(null);

  // Cargar proveedores al montar
  useEffect(() => {
    cargarProveedores();
  }, []);

  const cargarProveedores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .order('nombre', { ascending: true });
      
      if (error) throw error;
      setProveedores(data || []);
    } catch (error) {
      console.error('Error cargando proveedores:', error);
      alert('Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar proveedores
  const proveedoresFiltrados = proveedores.filter(proveedor => {
    const searchLower = searchTerm.toLowerCase();
    return proveedor.nombre.toLowerCase().includes(searchLower) ||
           (proveedor.contacto && proveedor.contacto.toLowerCase().includes(searchLower)) ||
           (proveedor.pais && proveedor.pais.toLowerCase().includes(searchLower));
  });

  // Manejar edición
  const handleEdit = (proveedor) => {
    setSelectedProveedor(proveedor);
    setShowForm(true);
  };

  // Cerrar formulario
  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedProveedor(null);
    cargarProveedores();
  };

  // Eliminar proveedor
  const eliminarProveedor = async (proveedor) => {
    if (!confirm(`¿Estás seguro de eliminar el proveedor "${proveedor.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('proveedores')
        .delete()
        .eq('id', proveedor.id);

      if (error) throw error;

      // Actualizar estado local
      setProveedores(proveedores.filter(p => p.id !== proveedor.id));
      
      alert('Proveedor eliminado correctamente');
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar proveedor');
    }
  };

  // Obtener icono del canal
  const getChannelIcon = (canal) => {
    switch(canal?.toLowerCase()) {
      case 'wechat':
        return <MessageCircle size={16} />;
      case 'email':
        return <Mail size={16} />;
      case 'telefono':
      case 'phone':
        return <Phone size={16} />;
      default:
        return <User size={16} />;
    }
  };

  return (
    <div>
      {/* Header con acciones */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-playfair">Proveedores</h1>
        <button onClick={() => setShowForm(true)} className="btn-mare">
          <Plus size={20} />
          Nuevo Proveedor
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="card-mare mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, contacto o país..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-mare pl-10"
          />
        </div>
        <div className="mt-4 text-sm" style={{ color: 'var(--texto-secundario)' }}>
          Mostrando {proveedoresFiltrados.length} proveedores
        </div>
      </div>

      {/* Grid de proveedores */}
      {loading ? (
        <div className="text-center py-8">Cargando proveedores...</div>
      ) : proveedoresFiltrados.length === 0 ? (
        <div className="card-mare text-center py-8">
          <p style={{ color: 'var(--texto-secundario)' }}>
            {searchTerm ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proveedoresFiltrados.map(proveedor => (
            <div key={proveedor.id} className="card-mare fade-in">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-medium">{proveedor.nombre}</h3>
                  {proveedor.contacto && (
                    <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>
                      {proveedor.contacto}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(proveedor)}
                    className="p-2 rounded-lg hover:bg-gray-100"
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => eliminarProveedor(proveedor)}
                    className="p-2 rounded-lg hover:bg-red-100"
                    title="Eliminar proveedor"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {proveedor.pais && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={16} style={{ color: 'var(--marron-intermedio)' }} />
                    <span>{proveedor.pais}</span>
                  </div>
                )}

                {proveedor.canal_comunicacion && (
                  <div className="flex items-center gap-2 text-sm">
                    {getChannelIcon(proveedor.canal_comunicacion)}
                    <span style={{ color: 'var(--marron-intermedio)' }}>
                      {proveedor.canal_comunicacion}
                    </span>
                  </div>
                )}

                {proveedor.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={16} style={{ color: 'var(--marron-intermedio)' }} />
                    <span className="truncate">{proveedor.email}</span>
                  </div>
                )}

                <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--arena-claro)' }}>
                  <span className={`estado ${proveedor.usuario_activo ? 'estado-exito' : ''}`}>
                    {proveedor.usuario_activo ? 'Con acceso al sistema' : 'Sin acceso'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de formulario */}
      {showForm && (
        <ProveedorForm
          proveedor={selectedProveedor}
          onClose={handleCloseForm}
          onSave={handleCloseForm}
        />
      )}
    </div>
  );
}