# Sistema de Compras MARÉ

Sistema de gestión de compras para importación de accesorios femeninos (FERABEN/MARÉ).

## 🎯 Características

- **Dashboard** - Panel de control con métricas de importación
- **Investigación** - Búsqueda y análisis de productos Alibaba/AliExpress  
- **Embarques** - Gestión de procesos de importación
- **Órdenes de Compra** - Creación y gestión de OCs con proveedores
- **Catálogo** - Control de productos con pricing automático
- **Costos de Importación** - Cálculo de coeficientes reales
- **Reportes** - Análisis y métricas ejecutivas
- **Proveedores** - Gestión de contactos

## 🛠️ Stack Tecnológico

- **Frontend:** React 18 + Vite
- **Base de Datos:** Supabase
- **Iconos:** Lucide React
- **Exportación:** XLSX, jsPDF, html2canvas
- **Códigos de Barras:** JSBarcode
- **Compresión:** JSZip

## 🚀 Instalación y Uso

### Requisitos Previos
- Node.js 18+
- Cuenta de Supabase

### Configuración

1. **Clonar repositorio:**
```bash
git clone [tu-repo]
cd sistema-compras-mare
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar Supabase:**
Crear archivo `.env.local`:
```env
VITE_SUPABASE_URL=tu-supabase-url
VITE_SUPABASE_ANON_KEY=tu-supabase-anon-key
```

4. **Ejecutar en desarrollo:**
```bash
npm run dev
```

5. **Compilar para producción:**
```bash
npm run build
```

## 📊 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── AnalizadorExcel.jsx
│   ├── EmbarqueForm.jsx
│   ├── ImageEditor.jsx
│   ├── NotificationSystem.jsx
│   ├── OrdenCompraForm.jsx
│   └── ProductoForm.jsx
├── pages/               # Páginas principales
│   ├── Dashboard.jsx
│   ├── Investigacion.jsx
│   ├── Embarques.jsx
│   ├── OrdenesCompra.jsx
│   ├── Productos.jsx
│   ├── CostosImportacion.jsx
│   ├── Reportes.jsx
│   └── Proveedores.jsx
├── services/            # Servicios de API
│   └── supabase.js
├── styles/              # Estilos CSS
│   └── mare.css
└── utils/               # Utilidades
    └── dateUtils.js
```

## 🎨 Paleta de Colores MARÉ

```css
--verde-agua: #20B2AA;
--marron-oscuro: #8B4513;
--beige-claro: #F5F5DC;
--gris-neutro: #708090;
```

## 📱 Características Principales

### 🔍 **Investigación de Productos**
- Captura de URLs de Alibaba/AliExpress
- Categorización automática
- Exportación a Excel por categorías

### 📋 **Órdenes de Compra**
- Numeración única (OC-0001, OC-0002...)
- Editor de imágenes integrado
- Códigos de barras EAN13
- Exportación PDF profesional
- Múltiples productos por OC

### 📦 **Gestión de Embarques**
- Estados: Preparación → En Tránsito → En Aduana → Recibido
- Control de documentos
- Seguimiento de tiempos

### 💰 **Cálculo de Costos**
- Coeficientes reales de importación
- Costos uruguayos detallados (DUA, IMADUNI, etc.)
- Conversión automática UYU/USD

### 📊 **Catálogo Inteligente**
- Precios sugeridos automáticos
- Configuración de coeficientes
- Control de stock inicial/actual
- Exportación para ERP

## 🚀 Deploy

### Vercel (Recomendado)

1. **Conectar repositorio a Vercel**
2. **Configurar variables de entorno:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. **Deploy automático**

### Netlify

```bash
npm run build
# Subir carpeta dist/ a Netlify
```

## 📄 Licencia

Uso privado - FERABEN/MARÉ

---

**Desarrollado para FERABEN/MARÉ** - Sistema de compras profesional para importación de accesorios femeninos.