# 🔐 DÓNDE ENCONTRAR TUS CREDENCIALES DE SUPABASE

## 📋 NECESITAS ESTOS DOS VALORES PARA GITHUB SECRETS

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

## 📍 OPCIÓN 1: Desde tu archivo .env.local (MÁS RÁPIDO)

### **Ubicación del archivo:**
```
C:\Users\Usuario\sistema-compras-mare\.env.local
```

### **Cómo verlo:**
```bash
1. Abrir bloc de notas
2. File → Open
3. Navegar a: C:\Users\Usuario\sistema-compras-mare
4. Cambiar filtro a: "All Files (*.*)"
5. Abrir: .env.local
```

### **Contenido del archivo:**
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx...
```

### **Copiar estos valores exactos a GitHub Secrets** ✅

---

## 📍 OPCIÓN 2: Desde Supabase Dashboard

### **Paso 1: Ir a tu proyecto**
```
🔗 https://app.supabase.com
   └── Click en tu proyecto: "Sistema-compras-mare"
```

### **Paso 2: Ir a configuración API**
```
Menú lateral → ⚙️ Settings → API
```

### **Paso 3: Copiar valores**

#### **Project URL (Primera sección)**
```
📋 Copiar: https://xxxxx.supabase.co
   └── Este es tu VITE_SUPABASE_URL
```

#### **Project API keys (Segunda sección)**
```
📋 Buscar: "anon" / "public"
📋 Copiar: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   └── Este es tu VITE_SUPABASE_ANON_KEY
```

**⚠️ IMPORTANTE:**
- Copiar la clave **"anon"** o **"public"** (NO la "service_role")
- La clave anon es segura para usar en frontend
- Es la misma que usas en tu .env.local

---

## 🔧 CÓMO AGREGAR A GITHUB SECRETS

### **Paso 1: Ir a configuración del repositorio**
```
1. GitHub.com → Tu repositorio
2. Click: Settings (⚙️)
3. Menú lateral → Secrets and variables → Actions
4. Click: "New repository secret" (botón verde)
```

### **Paso 2: Agregar primer secret**
```
Name:  VITE_SUPABASE_URL

Value: https://xxxxx.supabase.co
       (copiar desde .env.local o Supabase Dashboard)

Click: "Add secret"
```

### **Paso 3: Agregar segundo secret**
```
Click nuevamente: "New repository secret"

Name:  VITE_SUPABASE_ANON_KEY

Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx...
       (copiar desde .env.local o Supabase Dashboard)

Click: "Add secret"
```

### **Paso 4: Verificar**
```
Settings → Secrets → Actions

Debes ver:
✅ VITE_SUPABASE_URL
✅ VITE_SUPABASE_ANON_KEY

(Los valores están ocultos por seguridad - es normal)
```

---

## 🖼️ GUÍA VISUAL

### **En Supabase Dashboard:**
```
┌─────────────────────────────────────────┐
│ Settings → API                          │
├─────────────────────────────────────────┤
│                                         │
│ Project URL                             │
│ ┌─────────────────────────────────┐   │
│ │ https://xxxxx.supabase.co  📋   │ ← COPIAR ESTO
│ └─────────────────────────────────┘   │
│                                         │
│ Project API keys                        │
│ ┌─────────────────────────────────┐   │
│ │ anon / public                   │   │
│ │ eyJhbGciOiJIUzI1Ni...      📋   │ ← COPIAR ESTO
│ └─────────────────────────────────┘   │
│                                         │
│ ⚠️ service_role (NO usar)              │
│ ┌─────────────────────────────────┐   │
│ │ eyJhbGciOiJIUzI1Ni...      🔒   │ ← NO COPIAR
│ └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### **En GitHub Secrets:**
```
┌─────────────────────────────────────────┐
│ Settings → Secrets → Actions            │
├─────────────────────────────────────────┤
│                                         │
│ Repository secrets                      │
│                                         │
│ ✅ VITE_SUPABASE_URL                    │
│    Updated 1 minute ago                 │
│                                         │
│ ✅ VITE_SUPABASE_ANON_KEY               │
│    Updated 1 minute ago                 │
│                                         │
│ [New repository secret] ➕              │
└─────────────────────────────────────────┘
```

---

## ⚠️ ERRORES COMUNES

### **Error 1: "Valores incorrectos"**
```
❌ Problema: Copié la clave service_role
✅ Solución: Usar la clave "anon" / "public"
```

### **Error 2: "URL mal formateada"**
```
❌ Problema: https://xxxxx.supabase.co/
✅ Solución: Sin "/" al final → https://xxxxx.supabase.co
```

### **Error 3: "Clave con espacios"**
```
❌ Problema: Clave tiene espacios o saltos de línea
✅ Solución: Copiar en una sola línea, sin espacios extras
```

### **Error 4: "Secrets no se ven"**
```
✅ Normal: GitHub oculta los valores por seguridad
✅ Verificar: Que aparezcan los nombres en la lista
```

---

## 🧪 CÓMO PROBAR QUE FUNCIONA

### **Después de agregar los secrets:**

```bash
1. GitHub → Actions
2. Click: "Keep Supabase Alive"
3. Click: "Run workflow" (botón derecho)
4. Click: "Run workflow" (confirmar)
5. Esperar 10-15 segundos
6. Ver resultado:
   - ✅ Verde = Configuración correcta
   - ❌ Rojo = Revisar secrets
```

### **Si falla:**
```bash
1. Click en la ejecución fallida
2. Click en "ping-supabase"
3. Leer el error:
   - "secrets no configurados" → Revisar nombres exactos
   - "unauthorized" → Verificar clave anon/public
   - "invalid URL" → Verificar formato URL
```

---

## 📝 CHECKLIST FINAL

Antes de subir a GitHub, verifica:

- [ ] Tengo mi .env.local con valores reales
- [ ] Copié VITE_SUPABASE_URL (https://xxxxx.supabase.co)
- [ ] Copié VITE_SUPABASE_ANON_KEY (empieza con eyJhbGciO...)
- [ ] Es la clave "anon" / "public" (NO service_role)
- [ ] URL sin "/" al final
- [ ] Clave sin espacios ni saltos de línea
- [ ] Agregados ambos secrets en GitHub
- [ ] Probado workflow manualmente
- [ ] Workflow ejecutado exitosamente ✅

---

## 🔒 SEGURIDAD

### **¿Es seguro usar la clave anon en GitHub Actions?**
✅ Sí, es completamente seguro porque:
- GitHub Secrets están encriptados
- No son visibles en logs públicos
- Solo los workflows pueden acceder
- Es la misma clave que usas en tu frontend (ya es pública)

### **¿Qué NO debo compartir?**
❌ **NUNCA** compartir la clave **"service_role"**
- Tiene acceso total a tu base de datos
- Puede saltarse todas las reglas RLS
- Solo debe usarse en backend privado

### **¿La clave anon es pública?**
✅ Sí, y está bien:
- Ya está en tu aplicación frontend de Vercel
- Supabase la protege con Row Level Security (RLS)
- No puede hacer nada que tu app no pueda hacer

---

## 🎯 RESUMEN RÁPIDO

```bash
# 1. OBTENER VALORES
.env.local → Abrir con bloc de notas
   └── Copiar: VITE_SUPABASE_URL
   └── Copiar: VITE_SUPABASE_ANON_KEY

# 2. AGREGAR A GITHUB
GitHub → Settings → Secrets → Actions
   └── New secret: VITE_SUPABASE_URL
   └── New secret: VITE_SUPABASE_ANON_KEY

# 3. PROBAR
Actions → Keep Supabase Alive → Run workflow
   └── ✅ Verde = ¡Funciona!
```

---

**¿Necesitas ayuda?** Lee: `SOLUCION_RAPIDA.md` para el proceso completo paso a paso.
