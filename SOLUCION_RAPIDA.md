# 🚨 SOLUCIÓN RÁPIDA - SUPABASE PAUSADO

## 📋 PASOS INMEDIATOS (10 minutos)

### **PASO 1: Reactivar Supabase (AHORA)** ⏰
```bash
1. Ir a: https://app.supabase.com
2. Buscar proyecto: "Sistema-compras-mare"
3. Click en botón verde: "Restore" o "Unpause"
4. Esperar 2-3 minutos → ✅ Proyecto activo
```

---

### **PASO 2: Crear función SQL en Supabase** 📊
```sql
1. En Supabase Dashboard → Click "SQL Editor"
2. New Query → Copiar contenido de: supabase_keep_alive_function.sql
3. Click "Run" (botón verde abajo a la derecha)
4. Mensaje: ✅ "Success. No rows returned"
```

**Script completo:**
```sql
CREATE OR REPLACE FUNCTION public.ping()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response json;
BEGIN
  response := json_build_object(
    'status', 'alive',
    'timestamp', NOW(),
    'message', 'Sistema MARÉ activo'
  );
  RETURN response;
END;
$$;
```

---

### **PASO 3: Configurar GitHub Secrets** 🔐
```bash
1. Ir a: https://github.com/TU-USUARIO/sistema-compras-mare
2. Click: Settings → Secrets and variables → Actions
3. Click: "New repository secret"

# Agregar Secret 1:
- Name: VITE_SUPABASE_URL
- Value: [Tu URL de Supabase - algo como: https://xxxxx.supabase.co]

# Agregar Secret 2:
- Name: VITE_SUPABASE_ANON_KEY
- Value: [Tu clave anon - la misma que está en tu .env]
```

**¿Dónde encuentro estos valores?**
```bash
# Opción 1: En tu archivo .env local
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Opción 2: En Supabase Dashboard
1. Project Settings → API
2. Project URL → Copiar
3. Project API keys → anon/public → Copiar
```

---

### **PASO 4: Subir archivos a GitHub** 📤
```bash
# En la carpeta del proyecto:
cd C:\Users\Usuario\sistema-compras-mare

git add .
git commit -m "🤖 Agregar keep-alive automático para Supabase"
git push origin main
```

---

### **PASO 5: Probar el workflow (Opcional)** 🧪
```bash
1. Ir a: https://github.com/TU-USUARIO/sistema-compras-mare
2. Click: Actions → Keep Supabase Alive
3. Click: "Run workflow" (botón azul a la derecha)
4. Click: "Run workflow" (confirmar)
5. Esperar 10-15 segundos
6. Ver resultado: ✅ Verde = Funciona perfectamente
```

---

## 🎯 ¿QUÉ HACE ESTO?

**GitHub Actions ejecutará automáticamente:**
- ⏰ **Cada 5 días** → Un ping simple a Supabase
- 🤖 **Sin intervención manual** → Completamente automático
- 💰 **Gratis** → Sin costos adicionales
- ✅ **Supabase siempre activo** → Nunca más se pausará

---

## 📊 ¿CÓMO VERIFICAR QUE FUNCIONA?

### **Opción 1: Ver en GitHub**
```bash
1. GitHub → Actions → Keep Supabase Alive
2. Ver historial de ejecuciones
3. Debe haber una cada 5 días ✅
```

### **Opción 2: Revisar emails de Supabase**
```bash
# Antes de keep-alive:
- Email cada 7 días: "Your project will be paused soon" ❌

# Después de keep-alive:
- No más emails de pausa ✅
```

---

## ❓ PREGUNTAS FRECUENTES

### **¿Cuándo se ejecuta el keep-alive?**
Cada 5 días a las 8:00 AM UTC (automáticamente)

### **¿Puedo ejecutarlo manualmente?**
Sí: Actions → Keep Supabase Alive → Run workflow

### **¿Qué pasa si falla?**
GitHub te enviará un email. Tienes 7 días para arreglarlo.

### **¿Cuesta algo?**
No, GitHub Actions es gratis para repositorios públicos y privados (2000 minutos/mes gratis)

### **¿Afecta el rendimiento?**
No, es solo 1 consulta SQL cada 5 días (< 1KB de datos)

---

## 🚨 SI ALGO FALLA

### **Error: "secrets no configurados"**
```bash
# Verificar en GitHub:
Settings → Secrets → Actions
Deben existir:
✅ VITE_SUPABASE_URL
✅ VITE_SUPABASE_ANON_KEY
```

### **Error: "función ping() no existe"**
```bash
# En Supabase SQL Editor:
1. Ejecutar nuevamente: supabase_keep_alive_function.sql
2. Verificar mensaje: "Success. No rows returned"
```

### **Error: "proyecto se sigue pausando"**
```bash
# Verificar ejecuciones:
1. GitHub → Actions → Keep Supabase Alive
2. ¿Última ejecución hace cuántos días?
3. Si > 7 días → Ejecutar manualmente: Run workflow
```

---

## 📞 CONTACTO DE EMERGENCIA

**Si nada funciona:**
1. Crear issue en GitHub del proyecto
2. Enviar email a soporte de Supabase: support@supabase.com
3. **Upgrade temporal a Pro** ($25/mes) si es urgente

---

## ✅ CHECKLIST FINAL

- [ ] Proyecto Supabase restaurado
- [ ] Función `ping()` creada en Supabase SQL
- [ ] GitHub Secrets configurados (URL + ANON_KEY)
- [ ] Archivos subidos a GitHub (git push)
- [ ] Workflow probado manualmente (opcional)
- [ ] Sistema funcionando correctamente

**¡Listo! Tu sistema nunca más se pausará automáticamente.** 🚀

---

**Tiempo total:** 10 minutos
**Complejidad:** Baja ⭐⭐☆☆☆
**Costo:** $0 💰
