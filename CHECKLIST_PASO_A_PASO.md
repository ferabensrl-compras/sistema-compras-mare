# ✅ CHECKLIST COMPLETO - PASO A PASO

## 🎯 OBJETIVO
Restaurar Supabase y configurar keep-alive automático para que nunca más se pause.

---

## 📋 FASE 1: RESTAURAR SUPABASE (URGENTE - 2 MINUTOS)

### ✅ **PASO 1.1: Ir a Supabase Dashboard**
- [ ] Abrir navegador
- [ ] Ir a: https://app.supabase.com
- [ ] Iniciar sesión si es necesario

### ✅ **PASO 1.2: Restaurar proyecto**
- [ ] Buscar proyecto: "Sistema-compras-mare"
- [ ] Ver estado: "Paused" (pausado)
- [ ] Click en botón verde: **"Restore"** o **"Unpause"**
- [ ] Esperar 2-3 minutos
- [ ] Verificar estado: "Active" ✅

### ✅ **PASO 1.3: Probar que funciona**
- [ ] Abrir tu sistema: https://tu-sistema-mare.vercel.app
- [ ] Click en "Productos" o cualquier módulo
- [ ] Verificar que carga correctamente ✅

**🎉 ¡Restauración completada! Tu sistema ya funciona nuevamente.**

---

## 📋 FASE 2: CREAR FUNCIÓN SQL EN SUPABASE (5 MINUTOS)

### ✅ **PASO 2.1: Abrir SQL Editor**
- [ ] En Supabase Dashboard (https://app.supabase.com)
- [ ] Click en tu proyecto: "Sistema-compras-mare"
- [ ] Menú lateral → **SQL Editor** (icono de código)

### ✅ **PASO 2.2: Crear nueva query**
- [ ] Click: **"New Query"** (botón arriba a la derecha)

### ✅ **PASO 2.3: Copiar y ejecutar script**
- [ ] Abrir archivo: `supabase_keep_alive_function.sql`
- [ ] Copiar TODO el contenido
- [ ] Pegar en el SQL Editor
- [ ] Click: **"Run"** (botón verde abajo a la derecha)

### ✅ **PASO 2.4: Verificar éxito**
- [ ] Ver mensaje: **"Success. No rows returned"** ✅
- [ ] Si dice "Success" → ¡Perfecto!

**🎉 Función SQL creada correctamente.**

---

## 📋 FASE 3: OBTENER CREDENCIALES (3 MINUTOS)

### ✅ **OPCIÓN A: Desde archivo .env.local (MÁS FÁCIL)**

#### **PASO 3A.1: Abrir archivo**
- [ ] Abrir bloc de notas
- [ ] File → Open
- [ ] Navegar a: `C:\Users\Usuario\sistema-compras-mare`
- [ ] Cambiar filtro: "All Files (*.*)"
- [ ] Abrir: `.env.local`

#### **PASO 3A.2: Copiar valores**
- [ ] Buscar línea: `VITE_SUPABASE_URL=https://xxxxx.supabase.co`
- [ ] Copiar valor después del `=` (solo la URL)
- [ ] Guardar en notepad temporalmente

- [ ] Buscar línea: `VITE_SUPABASE_ANON_KEY=eyJhbGciO...`
- [ ] Copiar valor después del `=` (la clave completa)
- [ ] Guardar en notepad temporalmente

**Ir a FASE 4** ✅

---

### ✅ **OPCIÓN B: Desde Supabase Dashboard (ALTERNATIVA)**

#### **PASO 3B.1: Ir a configuración API**
- [ ] En Supabase Dashboard
- [ ] Menú lateral → ⚙️ **Settings**
- [ ] Click: **API**

#### **PASO 3B.2: Copiar Project URL**
- [ ] Buscar sección: "Project URL"
- [ ] Click en icono 📋 (copiar)
- [ ] Pegar en notepad temporalmente
- [ ] Ejemplo: `https://xxxxx.supabase.co`

#### **PASO 3B.3: Copiar API Key**
- [ ] Buscar sección: "Project API keys"
- [ ] Buscar fila: **"anon"** o **"public"** (NO service_role)
- [ ] Click en icono 📋 (copiar)
- [ ] Pegar en notepad temporalmente
- [ ] Ejemplo: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Ir a FASE 4** ✅

---

## 📋 FASE 4: CONFIGURAR GITHUB SECRETS (5 MINUTOS)

### ✅ **PASO 4.1: Ir a tu repositorio en GitHub**
- [ ] Abrir: https://github.com
- [ ] Buscar repositorio: "sistema-compras-mare"
- [ ] Click en el repositorio

### ✅ **PASO 4.2: Ir a configuración de Secrets**
- [ ] Click: **Settings** (⚙️ arriba a la derecha)
- [ ] Menú lateral izquierdo → **Secrets and variables**
- [ ] Click: **Actions**

### ✅ **PASO 4.3: Agregar primer secret (URL)**
- [ ] Click: **"New repository secret"** (botón verde)

- [ ] **Name:** `VITE_SUPABASE_URL` (copiar exacto, sin espacios)
- [ ] **Value:** Pegar tu URL de Supabase (desde notepad)
  - Ejemplo: `https://xxxxx.supabase.co`
  - ⚠️ Sin "/" al final

- [ ] Click: **"Add secret"** (botón verde)

### ✅ **PASO 4.4: Agregar segundo secret (API Key)**
- [ ] Click nuevamente: **"New repository secret"**

- [ ] **Name:** `VITE_SUPABASE_ANON_KEY` (copiar exacto, sin espacios)
- [ ] **Value:** Pegar tu clave anon de Supabase (desde notepad)
  - Ejemplo: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - ⚠️ Todo en una sola línea, sin espacios extras

- [ ] Click: **"Add secret"** (botón verde)

### ✅ **PASO 4.5: Verificar secrets creados**
- [ ] Ver lista de secrets:
  - [ ] ✅ `VITE_SUPABASE_URL`
  - [ ] ✅ `VITE_SUPABASE_ANON_KEY`

**Nota:** Los valores están ocultos (por seguridad) - es normal.

**🎉 GitHub Secrets configurados correctamente.**

---

## 📋 FASE 5: SUBIR ARCHIVOS A GITHUB (3 MINUTOS)

### ✅ **PASO 5.1: Abrir terminal/cmd**
- [ ] Presionar: `Win + R`
- [ ] Escribir: `cmd`
- [ ] Enter

### ✅ **PASO 5.2: Navegar a carpeta del proyecto**
```bash
cd C:\Users\Usuario\sistema-compras-mare
```
- [ ] Pegar comando y Enter

### ✅ **PASO 5.3: Verificar archivos nuevos**
```bash
git status
```
- [ ] Ejecutar comando
- [ ] Debes ver archivos nuevos en rojo:
  - `.github/workflows/keep-alive.yml`
  - `supabase_keep_alive_function.sql`
  - Archivos .md de documentación

### ✅ **PASO 5.4: Agregar todos los archivos**
```bash
git add .
```
- [ ] Ejecutar comando

### ✅ **PASO 5.5: Crear commit**
```bash
git commit -m "🤖 Agregar keep-alive automático para Supabase"
```
- [ ] Ejecutar comando
- [ ] Ver mensaje de confirmación ✅

### ✅ **PASO 5.6: Subir a GitHub**
```bash
git push origin main
```
- [ ] Ejecutar comando
- [ ] Esperar que termine (puede tardar 10-20 segundos)
- [ ] Ver mensaje: "To https://github.com/..." ✅

**🎉 Archivos subidos correctamente a GitHub.**

---

## 📋 FASE 6: PROBAR WORKFLOW (5 MINUTOS)

### ✅ **PASO 6.1: Ir a Actions en GitHub**
- [ ] En tu repositorio de GitHub
- [ ] Click: **Actions** (pestaña superior)

### ✅ **PASO 6.2: Verificar workflow disponible**
- [ ] Ver en la lista: **"Keep Supabase Alive"** ✅
- [ ] Si no aparece → Refrescar página (F5)

### ✅ **PASO 6.3: Ejecutar workflow manualmente**
- [ ] Click en: **"Keep Supabase Alive"**
- [ ] Click botón azul derecha: **"Run workflow"**
- [ ] En dropdown → Seleccionar: `main`
- [ ] Click: **"Run workflow"** (confirmar)

### ✅ **PASO 6.4: Esperar ejecución**
- [ ] Esperar 10-15 segundos
- [ ] Refrescar página (F5)
- [ ] Ver nueva ejecución en la lista

### ✅ **PASO 6.5: Verificar resultado**
- [ ] Click en la ejecución (primera de la lista)
- [ ] Ver estado:
  - [ ] ✅ **Verde con ✓** = ¡Funciona perfectamente!
  - [ ] ❌ **Rojo con ✗** = Hay un error → Ver FASE 7

### ✅ **PASO 6.6: Ver detalles (opcional)**
- [ ] Click en: **"ping-supabase"**
- [ ] Ver logs:
  ```
  Enviando ping a Supabase...
  ✅ Ping completado exitosamente
  ```

**🎉 ¡Workflow funcionando perfectamente!**

---

## 📋 FASE 7: SOLUCIÓN DE PROBLEMAS (SI ALGO FALLA)

### ⚠️ **Error: "secrets not configured"**

**Causa:** GitHub Secrets no configurados correctamente

**Solución:**
- [ ] Volver a FASE 4
- [ ] Verificar nombres exactos:
  - `VITE_SUPABASE_URL` (exacto, con guiones bajos)
  - `VITE_SUPABASE_ANON_KEY` (exacto, con guiones bajos)
- [ ] Si están mal → Delete y crear nuevamente

---

### ⚠️ **Error: "function ping() does not exist"**

**Causa:** Función SQL no creada en Supabase

**Solución:**
- [ ] Volver a FASE 2
- [ ] Ejecutar script SQL nuevamente
- [ ] Verificar mensaje: "Success. No rows returned"

---

### ⚠️ **Error: "unauthorized" o "invalid API key"**

**Causa:** Clave API incorrecta

**Solución:**
- [ ] Verificar que copiaste la clave **"anon"** (NO service_role)
- [ ] Ir a Supabase → Settings → API
- [ ] Copiar clave "anon" / "public" nuevamente
- [ ] Actualizar secret en GitHub:
  - Settings → Secrets → VITE_SUPABASE_ANON_KEY
  - Delete → New secret con valor correcto

---

### ⚠️ **Error: "invalid URL"**

**Causa:** URL mal formateada

**Solución:**
- [ ] Verificar formato: `https://xxxxx.supabase.co`
- [ ] Sin "/" al final
- [ ] Sin espacios extras
- [ ] Actualizar secret en GitHub si es necesario

---

## ✅ CHECKLIST FINAL

**Después de completar todo, verifica:**

### **En Supabase:**
- [ ] ✅ Proyecto activo (no pausado)
- [ ] ✅ Función `ping()` creada (SQL Editor)

### **En GitHub:**
- [ ] ✅ Secrets configurados (2 secrets visibles)
- [ ] ✅ Workflow "Keep Supabase Alive" visible en Actions
- [ ] ✅ Workflow ejecutado manualmente → Estado verde ✅

### **En tu sistema:**
- [ ] ✅ Aplicación funciona correctamente
- [ ] ✅ Puedes abrir módulos (Productos, OCs, etc.)
- [ ] ✅ Datos se cargan normalmente

### **Verificación final:**
- [ ] ✅ Workflow se ejecutará automáticamente cada 5 días
- [ ] ✅ Recibes notificaciones en GitHub si falla
- [ ] ✅ Supabase nunca más se pausará ✅

---

## 🎉 ¡COMPLETADO!

**🚀 Tu sistema ahora tiene keep-alive automático:**
- ⏰ Se ejecuta cada 5 días
- 🤖 Sin intervención manual
- 💰 Completamente gratis
- ✅ Supabase siempre activo

**📊 ¿Qué esperar ahora?**
- Cada 5 días GitHub ejecutará el workflow automáticamente
- Verás ejecuciones en: Actions → Keep Supabase Alive
- Si algo falla → Recibirás email de GitHub
- Tu sistema funcionará 24/7 sin pausas

**🎯 Próximos pasos (opcional):**
- [ ] Revisar semanalmente que el workflow se ejecute
- [ ] Leer `KEEP_ALIVE_GUIDE.md` para más detalles
- [ ] Considerar alternativas en `ALTERNATIVAS_SIMPLES.md`

---

## 📁 ARCHIVOS DE REFERENCIA

**Guías:**
- `README_KEEP_ALIVE.md` → Resumen ejecutivo
- `SOLUCION_RAPIDA.md` → Paso a paso detallado
- `DONDE_ENCONTRAR_CREDENCIALES.md` → Guía de credenciales
- `ALTERNATIVAS_SIMPLES.md` → Otras soluciones
- `KEEP_ALIVE_GUIDE.md` → Documentación completa

**Archivos técnicos:**
- `.github/workflows/keep-alive.yml` → Workflow automático
- `supabase_keep_alive_function.sql` → Función SQL
- `api/keep-alive.js` → Endpoint Vercel (alternativa)

---

**Última actualización:** Agosto 30, 2025
**Sistema:** MARÉ v1.1
**Estado:** ✅ Keep-alive implementado y funcionando
