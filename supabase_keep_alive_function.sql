-- ============================================
-- FUNCIÓN KEEP-ALIVE PARA SUPABASE
-- ============================================
-- Función simple que responde al ping de GitHub Actions
-- para mantener el proyecto activo en el plan gratuito

CREATE OR REPLACE FUNCTION public.ping()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response json;
BEGIN
  -- Registrar el ping en logs
  response := json_build_object(
    'status', 'alive',
    'timestamp', NOW(),
    'message', 'Sistema MARÉ activo'
  );

  RETURN response;
END;
$$;

-- Comentario explicativo
COMMENT ON FUNCTION public.ping() IS 'Función keep-alive para mantener proyecto Supabase activo mediante GitHub Actions';

-- ============================================
-- INSTRUCCIONES DE USO
-- ============================================
-- 1. Ejecutar este script en el SQL Editor de Supabase
-- 2. GitHub Actions llamará esta función cada 5 días
-- 3. Esto genera actividad suficiente para evitar pausa automática
