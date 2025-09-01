// src/services/supabase.js
import { createClient } from '@supabase/supabase-js'

// Estas variables vienen del archivo .env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = 'Faltan las variables de entorno de Supabase';
  console.error(errorMessage);
  console.error('Asegúrate de tener el archivo .env.local con:');
  console.error('VITE_SUPABASE_URL=tu_url');
  console.error('VITE_SUPABASE_ANON_KEY=tu_key');
  
  // Mostrar error al usuario si está disponible
  if (typeof window !== 'undefined') {
    window.SUPABASE_CONFIG_ERROR = errorMessage;
  }
}

// Crear cliente con configuración simple
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: false, // No necesitamos autenticación por ahora
  }
})

// Función helper para manejo consistente de errores
const handleSupabaseError = (error, context = '') => {
  console.error(`Error en ${context}:`, error);
  
  // Errores específicos de Supabase
  if (error?.code === 'PGRST116') {
    throw new Error('Se encontraron múltiples registros cuando se esperaba uno');
  }
  
  if (error?.code === '23505') {
    throw new Error('Ya existe un registro con estos datos');
  }
  
  if (error?.code === '23503') {
    throw new Error('No se puede eliminar: existen referencias relacionadas');
  }
  
  if (error?.code === '42501') {
    throw new Error('No tienes permisos para realizar esta operación');
  }
  
  if (error?.message?.includes('network')) {
    throw new Error('Error de conexión. Verifica tu conexión a internet');
  }
  
  // Error genérico con mensaje del servidor si está disponible
  throw new Error(error?.message || 'Error desconocido en la base de datos');
};

// Funciones auxiliares para productos
export const productosService = {
  // Obtener todos los productos
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) handleSupabaseError(error, 'obtener productos')
      return data || []
    } catch (error) {
      handleSupabaseError(error, 'obtener productos')
    }
  },

  // Obtener un producto por ID
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) handleSupabaseError(error, 'obtener producto por ID')
      return data
    } catch (error) {
      handleSupabaseError(error, 'obtener producto por ID')
    }
  },

  // Crear nuevo producto
  async create(producto) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .insert([producto])
        .select()
        .single()
      
      if (error) handleSupabaseError(error, 'crear producto')
      return data
    } catch (error) {
      handleSupabaseError(error, 'crear producto')
    }
  },

  // Actualizar producto
  async update(id, producto) {
    const { data, error } = await supabase
      .from('productos')
      .update(producto)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Eliminar producto definitivamente
  async delete(id) {
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  },

  // Verificar si un código interno ya existe
  async existeCodigo(codigo) {
    try {
      // 1. Buscar en tabla productos (catálogo)
      const { data: productosData, error: productosError } = await supabase
        .from('productos')
        .select('codigo, nombre, id')
        .eq('codigo', codigo)
        .limit(1)

      if (productosError) {
        console.error('Error buscando en productos:', productosError)
      }

      // Si encontró en productos, retornar resultado
      if (productosData && productosData.length > 0) {
        return {
          existe: true,
          ubicacion: 'catálogo',
          producto: productosData[0]
        }
      }

      // 2. Buscar en órdenes de compra (productos JSON)
      const { data: ordenesData, error: ordenesError } = await supabase
        .from('ordenes_compra')
        .select('numero, productos, proveedor_id')
        .not('productos', 'is', null)

      if (ordenesError) {
        console.error('Error buscando en órdenes:', ordenesError)
      }

      // Revisar cada orden de compra
      if (ordenesData) {
        for (const orden of ordenesData) {
          if (orden.productos && Array.isArray(orden.productos)) {
            for (const producto of orden.productos) {
              if (producto.codigo_producto === codigo) {
                return {
                  existe: true,
                  ubicacion: 'orden_compra',
                  orden: orden.numero,
                  producto: {
                    nombre: producto.nombre,
                    codigo_proveedor: producto.codigo_proveedor
                  }
                }
              }
            }
          }
        }
      }

      // No encontrado en ningún lugar
      return {
        existe: false,
        ubicacion: null,
        producto: null
      }
    } catch (error) {
      console.error('Error verificando código:', error)
      return {
        existe: false,
        ubicacion: null,
        producto: null
      }
    }
  }
}

// Funciones para órdenes de compra
export const ordenesCompraService = {
  async getAll() {
    const { data, error } = await supabase
      .from('ordenes_compra')
      .select(`
        *,
        proveedor:proveedores(nombre, contacto)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async create(orden) {
    const { data, error } = await supabase
      .from('ordenes_compra')
      .insert([orden])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getNextNumber(proveedorId) {
    const { data, error } = await supabase
      .from('ordenes_compra')
      .select('numero')
      .eq('proveedor_id', proveedorId)
      .order('numero', { ascending: false })
      .limit(1)
    
    if (error) throw error
    
    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].numero.split('-')[1])
      return `OC-${String(lastNumber + 1).padStart(6, '0')}`
    }
    
    return 'OC-002320'
  }
}

// Funciones para manejo de imágenes en Storage
export const imagenesService = {
  // Subir imagen al bucket 'imagenes'
  async uploadImage(file, fileName) {
    try {
      // Asegurar nombre único con timestamp
      const timestamp = Date.now()
      const uniqueName = `${timestamp}_${fileName}`
      
      const { data, error } = await supabase.storage
        .from('imagenes')
        .upload(uniqueName, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) handleSupabaseError(error, 'subir imagen')
      
      // Retornar la URL pública
      const { data: publicUrl } = supabase.storage
        .from('imagenes')
        .getPublicUrl(uniqueName)
      
      return {
        path: data.path,
        publicUrl: publicUrl.publicUrl,
        fileName: uniqueName
      }
    } catch (error) {
      handleSupabaseError(error, 'subir imagen')
    }
  },

  // Subir imagen desde base64 (para migrar imágenes existentes)
  async uploadFromBase64(base64Data, fileName) {
    try {
      // Convertir base64 a blob
      const response = await fetch(base64Data)
      const blob = await response.blob()
      
      return await this.uploadImage(blob, fileName)
    } catch (error) {
      handleSupabaseError(error, 'subir imagen desde base64')
    }
  },

  // Eliminar imagen del storage
  async deleteImage(fileName) {
    try {
      const { error } = await supabase.storage
        .from('imagenes')
        .remove([fileName])
      
      if (error) handleSupabaseError(error, 'eliminar imagen')
      return true
    } catch (error) {
      handleSupabaseError(error, 'eliminar imagen')
    }
  },

  // Obtener URL pública de una imagen
  getPublicUrl(fileName) {
    const { data } = supabase.storage
      .from('imagenes')
      .getPublicUrl(fileName)
    
    return data.publicUrl
  },

  // Migrar imágenes base64 existentes a Storage
  async migrateBase64ToStorage(base64Images, productCode) {
    try {
      const migratedImages = []
      
      for (let i = 0; i < base64Images.length; i++) {
        const base64 = base64Images[i]
        
        // Solo migrar si es base64, si ya es URL saltear
        if (base64.startsWith('data:image/')) {
          const fileName = `${productCode}_img${i + 1}.jpg`
          const result = await this.uploadFromBase64(base64, fileName)
          migratedImages.push(result.publicUrl)
        } else {
          // Ya es URL de Storage
          migratedImages.push(base64)
        }
      }
      
      return migratedImages
    } catch (error) {
      console.error('Error migrando imágenes:', error)
      // En caso de error, retornar las imágenes originales
      return base64Images
    }
  },

  // Función utilitaria para migrar todas las OCs existentes
  async migrateAllOrdersToStorage() {
    try {
      console.log('Iniciando migración de todas las OCs...')
      
      const { data: ordenes, error } = await supabase
        .from('ordenes_compra')
        .select('id, numero, productos')
        .not('productos', 'is', null)
      
      if (error) {
        console.error('Error consultando órdenes:', error)
        throw error
      }
      
      // Si no hay órdenes, retornar resultado vacío
      if (!ordenes || ordenes.length === 0) {
        console.log('✅ No hay órdenes de compra con productos para migrar')
        return { migrated: 0, skipped: 0, message: 'Sistema sin datos - listo para usar' }
      }
      
      let migrated = 0
      let skipped = 0
      
      for (const orden of ordenes) {
        if (orden.productos && Array.isArray(orden.productos)) {
          let hasChanges = false
          const updatedProductos = []
          
          for (const producto of orden.productos) {
            if (producto.imagenes && producto.imagenes.length > 0) {
              // Verificar si hay imágenes base64
              const hasBase64 = producto.imagenes.some(img => img.startsWith('data:image/'))
              
              if (hasBase64) {
                console.log(`Migrando imágenes de producto ${producto.codigo_producto}...`)
                const migratedImages = await this.migrateBase64ToStorage(
                  producto.imagenes, 
                  producto.codigo_producto
                )
                
                updatedProductos.push({
                  ...producto,
                  imagenes: migratedImages
                })
                hasChanges = true
              } else {
                updatedProductos.push(producto)
              }
            } else {
              updatedProductos.push(producto)
            }
          }
          
          if (hasChanges) {
            // Actualizar la orden con las nuevas URLs
            const { error: updateError } = await supabase
              .from('ordenes_compra')
              .update({ productos: updatedProductos })
              .eq('id', orden.id)
            
            if (updateError) {
              console.error(`Error actualizando orden ${orden.numero}:`, updateError)
            } else {
              migrated++
              console.log(`✅ Orden ${orden.numero} migrada exitosamente`)
            }
          } else {
            skipped++
          }
        }
      }
      
      console.log(`\n🎉 Migración completada:`)
      console.log(`- Órdenes migradas: ${migrated}`)
      console.log(`- Órdenes saltadas (ya migradas): ${skipped}`)
      
      return { migrated, skipped }
    } catch (error) {
      console.error('Error en migración masiva:', error)
      throw error
    }
  }
}