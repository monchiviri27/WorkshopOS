import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NuevaRecepcion from './pages/NuevaRecepcion';
import DetalleReparacion from './pages/DetalleReparacion';
import ReparacionesActivas from './pages/ReparacionesActivas';
import Historial from './pages/Historial';
import Clientes from './pages/Clientes';
import PresupuestoPublico from './pages/PresupuestoPublico';
import Notificaciones from './pages/Notificaciones';
import VistaPreviaPresupuesto from './pages/VistaPreviaPresupuesto';
import Facturacion from './pages/Facturacion';
import Configuracion from './pages/Configuracion';
import AvisosPendientes from './pages/AvisosPendientes';
import VerPresupuesto from './pages/VerPresupuesto';
import ClienteReparaciones from './pages/ClienteReparaciones';
import Recepciones from './pages/Recepciones';
import EntregasSinResguardo from './pages/EntregasSinResguardo';
// Páginas de administración
import AdminTrabajos from './pages/AdminTrabajos';
import AdminFallos from './pages/AdminFallos';
import AdminFamilias from './pages/AdminFamilias';
import AdminFamiliasFallos from './pages/AdminFamiliasFallos';

function App() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Escuchar cambios en el estado del sidebar desde el evento personalizado
  useEffect(() => {
    const handleSidebarChange = (event) => {
      setIsSidebarExpanded(event.detail.isExpanded);
    };
    window.addEventListener('sidebarToggle', handleSidebarChange);
    return () => window.removeEventListener('sidebarToggle', handleSidebarChange);
  }, []);

  return (
    <AppProvider>
      <NotificationProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/presupuesto/:token" element={<PresupuestoPublico />} />
          
          {/* Rutas privadas */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="min-h-screen bg-gray-50">
                  {/* Header FIJO arriba - SIN padding */}
                  <Header />
                  
                  <div className="flex">
                    {/* Sidebar - empieza debajo del header (top-16) */}
                    <Sidebar onExpandChange={setIsSidebarExpanded} />
                    
                    {/* Contenido principal - con marginLeft y paddingTop */}
                    <main 
                      className="flex-1 p-4 md:p-6 overflow-auto transition-all duration-300"
                      style={{ 
                        marginLeft: window.innerWidth >= 1024 
                          ? (isSidebarExpanded ? '16rem' : '5rem')
                          : '0',
                        marginTop: '4rem'
                      }}
                    >
                      <Routes>
                        {/* Rutas principales */}
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/nueva-recepcion" element={<NuevaRecepcion />} />
                        <Route path="/reparacion/:id" element={<DetalleReparacion />} />
                        <Route path="/reparaciones-activas" element={<ReparacionesActivas />} />
                        <Route path="/historial" element={<Historial />} />
                        <Route path="/clientes" element={<Clientes />} />
                        <Route path="/notificaciones" element={<Notificaciones />} />
                        <Route path="/presupuesto/taller/:orderId" element={<VistaPreviaPresupuesto />} />
                        <Route path="/facturacion" element={<Facturacion />} />
                        <Route path="/configuracion" element={<Configuracion />} />
                        <Route path="/avisos-pendientes" element={<AvisosPendientes />} />
                        <Route path="/presupuesto/ver/:id" element={<VerPresupuesto />} />
                        <Route path="/cliente/:clienteId/reparaciones" element={<ClienteReparaciones />} />
                        <Route path="/recepciones" element={<Recepciones />} />
                        <Route path="/entregas-sin-resguardo" element={<EntregasSinResguardo />} />
                        {/* Rutas de administración */}
                        <Route path="/admin-trabajos" element={<AdminTrabajos />} />
                        <Route path="/admin-fallos" element={<AdminFallos />} />
                        <Route path="/admin-familias" element={<AdminFamilias />} />
                        <Route path="/admin-familias-fallos" element={<AdminFamiliasFallos />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </NotificationProvider>
    </AppProvider>
  );
}

export default App;