import React, { useState } from 'react';
import { 
  Package, 
  Users, 
  FileText, 
  ShoppingCart, 
  Ship, 
  Calculator,
  BarChart3,
  Search,
  Menu,
  X,
  Home,
  TestTube
} from 'lucide-react';
import './styles/mare.css';
import { NotificationProvider } from './components/NotificationSystem';

// Páginas principales (SIN módulos de supplier)
import TestConnection from './pages/TestConnection';
import Productos from './pages/Productos';
import Proveedores from './pages/Proveedores';
import Investigacion from './pages/Investigacion';
import OrdenesCompra from './pages/OrdenesCompra';
import Embarques from './pages/Embarques';
import CostosImportacion from './pages/CostosImportacion';
import Reportes from './pages/Reportes';
import AnalizadorExcel from './components/AnalizadorExcel';
import Dashboard from './pages/Dashboard';

// Componente de navegación lateral
const Sidebar = ({ isOpen, setIsOpen, setCurrentPage }) => {
  const [activeItem, setActiveItem] = useState('inicio');

  // Menú simplificado SOLO para admin
  const menuItems = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'investigacion', label: 'Investigación', icon: Search },
    { id: 'embarques', label: 'Embarques', icon: Ship },
    { id: 'ordenes', label: 'Órdenes de Compra', icon: ShoppingCart },
    { id: 'productos', label: 'Catálogo', icon: Package },
    { id: 'costos', label: 'Costos', icon: Calculator },
    { id: 'reportes', label: 'Reportes', icon: BarChart3 },
    { id: 'proveedores', label: 'Proveedores', icon: Users },
    { id: 'test', label: 'Probar Conexión', icon: TestTube },
    { id: 'analizador', label: '🔍 Analizar Excel', icon: FileText },
  ];

  const handleItemClick = (itemId) => {
    setActiveItem(itemId);
    setCurrentPage(itemId);
  };

  return (
    <>
      {/* Overlay móvil */}
      <div 
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-logo">MARÉ</h1>
          <p className="sidebar-subtitle">Sistema de Compras</p>
        </div>

        <nav className="nav-menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`nav-item ${activeItem === item.id ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User info simplificado */}
        <div className="sidebar-footer" style={{ padding: '1rem', borderTop: '1px solid var(--borde)', marginTop: 'auto' }}>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Admin</p>
              <p className="text-xs text-gray-500">FERABEN / MARÉ</p>
            </div>
          </div>
        </div>

        {/* Botón cerrar móvil */}
        <button
          onClick={() => setIsOpen(false)}
          className="menu-button"
          style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}
        >
          <X size={24} />
        </button>
      </aside>
    </>
  );
};

// Componente principal simplificado
const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('inicio');

  // Título de página según selección
  const getPageTitle = () => {
    switch(currentPage) {
      case 'test': return 'Prueba de Conexión';
      case 'productos': return 'Catálogo de Productos';
      case 'proveedores': return 'Proveedores';
      case 'investigacion': return 'Investigación de Productos';
      case 'ordenes': return 'Órdenes de Compra';
      case 'embarques': return 'Embarques';
      case 'costos': return 'Costos de Importación';
      case 'reportes': return 'Reportes';
      case 'analizador': return 'Analizador de Excel';
      case 'inicio':
      default: return 'Panel de Control';
    }
  };

  // Renderizar página según selección
  const renderPage = () => {
    switch(currentPage) {
      case 'test':
        return <TestConnection />;
      case 'productos':
        return <Productos />;
      case 'proveedores':
        return <Proveedores />;
      case 'investigacion':
        return <Investigacion />;
      case 'ordenes':
        return <OrdenesCompra />;
      case 'embarques':
        return <Embarques />;
      case 'costos':
        return <CostosImportacion />;
      case 'reportes':
        return <Reportes />;
      case 'analizador':
        return <AnalizadorExcel />;
      case 'inicio':
      default:
        return <Dashboard />;
    }
  };

  return (
    <NotificationProvider>
      <div className="app-container">
        <Sidebar 
          isOpen={sidebarOpen} 
          setIsOpen={setSidebarOpen} 
          setCurrentPage={setCurrentPage}
        />
        
        {/* Contenido principal */}
        <main className="main-content">
          {/* Header */}
          <header className="header">
            <button
              onClick={() => setSidebarOpen(true)}
              className="menu-button"
            >
              <Menu size={24} />
            </button>

            <h2 className="text-2xl">
              {getPageTitle()}
            </h2>

            <div className="flex items-center gap-4">
              <span className="text-sm" style={{ color: 'var(--texto-secundario)' }}>
                FERABEN / MARÉ
              </span>
            </div>
          </header>

          {/* Área de contenido */}
          <div className="content">
            {renderPage()}
          </div>
        </main>
      </div>
    </NotificationProvider>
  );
};

export default App;