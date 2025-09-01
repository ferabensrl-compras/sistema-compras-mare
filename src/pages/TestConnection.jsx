// src/pages/TestConnection.jsx
import React, { useState } from 'react';
import { supabase, imagenesService } from '../services/supabase';
import { CheckCircle, XCircle, Loader, Upload } from 'lucide-react';

export default function TestConnection() {
  const [testing, setTesting] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResults, setMigrationResults] = useState(null);
  const [results, setResults] = useState({
    connection: null,
    tables: null,
    data: null
  });

  const testConnection = async () => {
    setTesting(true);
    setResults({ connection: null, tables: null, data: null });

    try {
      // Test 1: Conexión básica
      const { data: testData, error: connError } = await supabase
        .from('productos')
        .select('count')
        .limit(1);

      if (connError) {
        setResults(prev => ({ ...prev, connection: false }));
        console.error('Error de conexión:', connError);
      } else {
        setResults(prev => ({ ...prev, connection: true }));
      }

      // Test 2: Verificar tablas
      const tables = [
        'productos', 'proveedores', 'investigaciones', 
        'ordenes_compra', 'embarques', 'costos_importacion'
      ];

      let tablesOk = true;
      for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error) {
          tablesOk = false;
          console.error(`Error en tabla ${table}:`, error);
        }
      }
      setResults(prev => ({ ...prev, tables: tablesOk }));

      // Test 3: Leer datos de ejemplo
      const { data: productos, error: dataError } = await supabase
        .from('productos')
        .select('*')
        .limit(3);

      if (!dataError && productos) {
        setResults(prev => ({ ...prev, data: productos }));
      }

    } catch (error) {
      console.error('Error general:', error);
    } finally {
      setTesting(false);
    }
  };

  const migrateToStorage = async () => {
    setMigrating(true);
    setMigrationResults(null);
    
    try {
      const results = await imagenesService.migrateAllOrdersToStorage();
      setMigrationResults(results);
    } catch (error) {
      console.error('Error en migración:', error);
      setMigrationResults({ error: error.message });
    } finally {
      setMigrating(false);
    }
  };

  const getIcon = (status) => {
    if (status === null) return null;
    return status ? 
      <CheckCircle className="text-green-600" size={20} /> : 
      <XCircle className="text-red-600" size={20} />;
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-playfair mb-8">Prueba de Conexión</h1>

      <div className="flex gap-4 mb-8">
        <button 
          onClick={testConnection} 
          disabled={testing}
          className="btn-mare"
        >
          {testing ? (
            <>
              <Loader className="animate-spin" size={20} />
              Probando...
            </>
          ) : (
            'Probar Conexión con Supabase'
          )}
        </button>

        <button 
          onClick={migrateToStorage} 
          disabled={migrating || testing}
          className="btn-mare bg-blue-600 hover:bg-blue-700"
        >
          {migrating ? (
            <>
              <Loader className="animate-spin" size={20} />
              Migrando...
            </>
          ) : (
            <>
              <Upload size={20} />
              Migrar Imágenes a Storage
            </>
          )}
        </button>
      </div>

      <div className="space-y-4">
        <div className="card-mare">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Conexión a Supabase</h3>
              <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>
                Verificando credenciales y conexión
              </p>
            </div>
            {getIcon(results.connection)}
          </div>
        </div>

        <div className="card-mare">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Tablas de Base de Datos</h3>
              <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>
                Verificando las 6 tablas necesarias
              </p>
            </div>
            {getIcon(results.tables)}
          </div>
        </div>

        {results.data && (
          <div className="card-mare">
            <h3 className="text-lg font-medium mb-4">Productos de Ejemplo</h3>
            <div className="space-y-2">
              {results.data.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--texto-secundario)' }}>
                  No hay productos aún. ¡Todo listo para empezar!
                </p>
              ) : (
                results.data.map(producto => (
                  <div key={producto.id} className="p-3 bg-gray-50 rounded">
                    <strong>{producto.codigo}</strong> - {producto.nombre}
                    {producto.precio_fob && ` - $${producto.precio_fob}`}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {migrationResults && (
        <div className={`mt-8 p-4 rounded-lg border ${
          migrationResults.error ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
        }`}>
          {migrationResults.error ? (
            <>
              <h4 className="font-medium text-red-800 mb-2">Error en Migración:</h4>
              <p className="text-sm text-red-700">{migrationResults.error}</p>
            </>
          ) : (
            <>
              <h4 className="font-medium text-green-800 mb-2">🎉 Migración Completada:</h4>
              <div className="text-sm text-green-700 space-y-1">
                {migrationResults.message ? (
                  <>
                    <p>📋 <strong>{migrationResults.message}</strong></p>
                    <p className="mt-2">El sistema está configurado y listo para usar Storage desde el inicio.</p>
                  </>
                ) : (
                  <>
                    <p>✅ Órdenes migradas: <strong>{migrationResults.migrated}</strong></p>
                    <p>⏭️ Órdenes saltadas (ya migradas): <strong>{migrationResults.skipped}</strong></p>
                    <p className="mt-2">Las imágenes ahora se almacenan en Supabase Storage en lugar de base64.</p>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {results.connection === false && (
        <div className="mt-8 p-4 bg-red-50 rounded-lg border border-red-200">
          <h4 className="font-medium text-red-800 mb-2">Pasos para solucionar:</h4>
          <ol className="list-decimal list-inside text-sm text-red-700 space-y-1">
            <li>Verifica que el archivo .env.local existe en la raíz del proyecto</li>
            <li>Confirma que tiene las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY</li>
            <li>Asegúrate de haber ejecutado el SQL en Supabase</li>
            <li>Reinicia el servidor con: npm run dev</li>
          </ol>
        </div>
      )}
    </div>
  );
}