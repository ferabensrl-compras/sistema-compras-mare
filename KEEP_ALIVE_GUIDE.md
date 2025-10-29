# 🤖 GUÍA KEEP-ALIVE SISTEMA MARÉ

## 🎯 PROBLEMA
Supabase pausa proyectos gratuitos después de 7 días de inactividad. Como el sistema se usa solo para importaciones (3-4 veces al año), el proyecto se pausaba constantemente.

---

## ✅ SOLUCIONES IMPLEMENTADAS

### **SOLUCIÓN 1: GitHub Actions (Automática)** ⭐ RECOMENDADA

#### **¿Cómo funciona?**
- GitHub Actions ejecuta un workflow cada 5 días
- El workflow hace un ping simple a Supabase
- Esto genera actividad suficiente para evitar la pausa

#### **Configuración:**
1. **Crear función en Supabase:**
   - Ve a SQL Editor en Supabase Dashboard
   - Ejecuta el script: `supabase_keep_alive_function.sql`

2. **Configurar GitHub Secrets:**
   - Ve a tu repositorio en GitHub
   - Settings → Secrets and variables → Actions
   - Agrega estos secrets:
     - `VITE_SUPABASE_URL`: Tu URL de Supabase
     - `VITE_SUPABASE_ANON_KEY`: Tu clave anon pública

3. **Activar el workflow:**
   - El archivo `.github/workflows/keep-alive.yml` ya está creado
   - Se ejecutará automáticamente cada 5 días
   - Puedes ejecutarlo manualmente desde: Actions → Keep Supabase Alive → Run workflow

#### **¿Cómo verificar que funciona?**
```bash
# En GitHub
1. Ve a: Actions → Keep Supabase Alive
2. Verás el historial de ejecuciones
3. Cada 5 días debe aparecer una nueva ejecución ✅
```

---

### **SOLUCIÓN 2: Vercel Cron Job (Alternativa)**

#### **¿Cómo funciona?**
- Vercel ejecuta un endpoint API cada 5 días
- El endpoint hace ping a Supabase automáticamente
- ⚠️ **REQUIERE PLAN PRO de Vercel** (cron jobs no disponibles en free tier)

#### **Configuración:**
1. **Función SQL en Supabase:**
   - Ejecutar `supabase_keep_alive_function.sql` (igual que Solución 1)

2. **Variables de entorno en Vercel:**
   - Ya están configuradas (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY)

3. **El archivo está listo:**
   - `api/keep-alive.js` → Endpoint que hace el ping
   - `vercel.json` → Configuración del cron (cada 5 días a las 8 AM)

#### **¿Cómo verificar?**
```bash
# En Vercel Dashboard
1. Ve a: Settings → Cron Jobs
2. Verás "keep-alive" programado
3. Logs mostrarán ejecuciones cada 5 días
```

---

### **SOLUCIÓN 3: Upgrade a Plan Pro de Supabase**

#### **Ventajas:**
- ✅ Sin preocupaciones de pausa automática
- ✅ Mayor capacidad (8GB base de datos + 100GB storage)
- ✅ Mejor performance
- ✅ Backups automáticos

#### **Costo:**
- **$25 USD/mes** → Para uso estacional puede ser costoso

#### **Recomendación:**
Solo si el sistema crece y necesitas:
- Más de 500MB en base de datos
- Más de 1GB en storage de imágenes
- Uso regular (no estacional)

---

## 🚀 PASOS INMEDIATOS

### **1. Reactivar Proyecto Pausado:**
```bash
1. Ve a: https://app.supabase.com
2. Busca proyecto "Sistema-compras-mare"
3. Click en "Restore" o "Unpause"
4. Espera 2-3 minutos hasta que esté activo ✅
```

### **2. Implementar Keep-Alive (GitHub Actions):**
```bash
# Paso 1: Crear función en Supabase
1. SQL Editor → Ejecutar: supabase_keep_alive_function.sql

# Paso 2: Configurar GitHub Secrets
1. GitHub → Settings → Secrets → Actions
2. Agregar:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY

# Paso 3: Probar manualmente
1. Actions → Keep Supabase Alive → Run workflow
2. Verificar que se ejecuta correctamente ✅
```

### **3. Verificar funcionamiento:**
```bash
# Cada semana revisar:
1. GitHub Actions → Keep Supabase Alive
2. Debe haber ejecución reciente (< 5 días)
3. Status: ✅ Verde (success)

# Si falla:
- Verificar secrets en GitHub
- Verificar función ping() en Supabase SQL Editor
```

---

## 📊 COMPARACIÓN DE SOLUCIONES

| Solución | Costo | Complejidad | Confiabilidad | Recomendación |
|----------|-------|-------------|---------------|---------------|
| **GitHub Actions** | ✅ Gratis | Baja | Alta | ⭐ RECOMENDADA |
| **Vercel Cron** | ❌ $20/mes | Baja | Alta | Solo si ya tienes Pro |
| **Supabase Pro** | ❌ $25/mes | Ninguna | Máxima | Solo para uso intensivo |

---

## 🔍 PREGUNTAS FRECUENTES

### **¿Cada cuánto se ejecuta el keep-alive?**
Cada 5 días (calendario `0 8 */5 * *` = 8:00 AM UTC cada 5 días)

### **¿Consume recursos de mi plan gratuito?**
Sí, pero es mínimo:
- 1 consulta SQL cada 5 días
- < 1KB de datos transferidos
- Totalmente dentro de límites del plan gratuito

### **¿Qué pasa si el keep-alive falla?**
- GitHub te enviará email de notificación
- Tienes 7 días para solucionarlo antes de que se pause
- Puedes ejecutar manualmente el workflow

### **¿Puedo desactivar el keep-alive cuando esté usando el sistema?**
Sí, pero no es necesario. El ping no interfiere con el uso normal.

### **¿Qué pasa si se pausa igual?**
- Tienes 90 días para restaurar desde el dashboard
- Tus datos NO se pierden
- Solo vuelves a hacer "Restore"

---

## 📧 EMAILS DE SUPABASE

### **Email de Advertencia (7 días antes):**
```
Subject: Your Supabase project will be paused soon
Action: Ignorar si keep-alive está funcionando
```

### **Email de Pausa:**
```
Subject: Your Supabase project has been paused
Action:
1. Restaurar desde dashboard
2. Verificar que keep-alive esté activo
3. Revisar logs de GitHub Actions
```

---

## 🎯 RESUMEN

**Implementar GitHub Actions keep-alive es la solución perfecta porque:**
- ✅ Completamente gratis
- ✅ Automático (sin intervención manual)
- ✅ Confiable (GitHub Actions es muy estable)
- ✅ Fácil de monitorear (logs claros en GitHub)
- ✅ No afecta el uso normal del sistema

**Estado del sistema después de implementar:**
- 🤖 GitHub Actions ejecutándose cada 5 días
- ✅ Supabase siempre activo
- 💰 Sin costos adicionales
- 🚀 Sistema listo para importaciones cuando sea necesario

---

**Última actualización:** Agosto 30, 2025
**Sistema:** MARÉ v1.1
