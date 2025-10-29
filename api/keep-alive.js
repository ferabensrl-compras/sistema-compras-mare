// ============================================
// VERCEL CRON JOB - KEEP SUPABASE ALIVE
// ============================================
// Endpoint que se ejecuta automáticamente cada 5 días
// para mantener el proyecto Supabase activo

export default async function handler(req, res) {
  try {
    // Obtener variables de entorno
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variables de entorno de Supabase no configuradas');
    }

    // Hacer ping a la función de Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/ping`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    // Log del resultado
    console.log('✅ Keep-alive ejecutado:', new Date().toISOString());
    console.log('Respuesta Supabase:', data);

    // Responder al cron job
    return res.status(200).json({
      success: true,
      message: 'Sistema MARÉ - Keep-alive ejecutado correctamente',
      timestamp: new Date().toISOString(),
      supabase_response: data
    });

  } catch (error) {
    console.error('❌ Error en keep-alive:', error);

    return res.status(500).json({
      success: false,
      message: 'Error al ejecutar keep-alive',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
