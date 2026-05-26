import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Users,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus,
  User,
  Phone,
  Mail,
  X,
  Wrench,
  FileText,
  PenTool
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import StatsCard from '../components/dashboard/StatsCard';
import ClientsList from '../components/clients/ClientsList';
import OrderDetailsModal from '../components/modals/OrderDetailsModal';

function Dashboard() {
  const navigate = useNavigate();
  const { orders, clients, getStats } = useApp();
  const [stats, setStats] = useState({
    activeOrders: 0,
    newClients: 0,
    monthlyRevenue: 0,
    readyForPickup: 0,
    pendingBudget: 0,
    inAnalysis: 0,
    inRepair: 0
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  useEffect(() => {
    setStats(getStats());
  }, [orders, clients, getStats]);

  // Tarjetas de estadísticas principales
  const statsCards = [
    {
      icon: Package,
      label: 'Órdenes activas',
      value: stats.activeOrders ?? 0,
      color: 'blue'
    },
    {
      icon: TrendingUp,
      label: 'Ingresos mes',
      value: `€${stats.monthlyRevenue ?? 0}`,
      color: 'green'
    },
    {
      icon: Users,
      label: 'Clientes nuevos',
      value: stats.newClients ?? 0,
      color: 'purple'
    },
    {
      icon: CheckCircle,
      label: 'Listas para entregar',
      value: stats.readyForPickup ?? 0,
      color: 'teal'
    }
  ];

  // Resumen rápido
  const quickStats = [
    { label: 'En análisis', value: stats.inAnalysis ?? 0, color: 'blue' },
    { label: 'Presupuestos', value: stats.pendingBudget ?? 0, color: 'amber' },
    { label: 'En reparación', value: stats.inRepair ?? 0, color: 'orange' },
    { label: 'Para entregar', value: stats.readyForPickup ?? 0, color: 'green' }
  ];

  // Alertas principales
  const alerts = [
    stats.pendingBudget > 0 && {
      icon: FileText,
      title: 'Presupuestos pendientes',
      description: `${stats.pendingBudget} clientes esperan respuesta`,
      color: 'amber',
      path: '/reparaciones-activas?estado=presupuestado'
    },
    stats.readyForPickup > 0 && {
      icon: Clock,
      title: 'Listas para entregar',
      description: `${stats.readyForPickup} joyas esperando recogida`,
      color: 'green',
      path: '/reparaciones-activas?estado=listo'
    },
    stats.inAnalysis > 0 && {
      icon: PenTool,
      title: 'En análisis',
      description: `${stats.inAnalysis} joyas pendientes de diagnóstico`,
      color: 'blue',
      path: '/reparaciones-activas?estado=analisis'
    }
  ].filter(Boolean);

  // Últimas órdenes
  const recentOrders = orders
    .filter(o => o.status !== 'Entregado' && o.status !== 'Rechazado')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setIsOrderDetailsModalOpen(true);
  };

  const handleClientClick = (client) => {
    setSelectedClient(client);
    setIsClientModalOpen(true);
  };

  // Navegar a nueva recepción
  const handleNewReception = () => {
    navigate('/nueva-recepcion');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>
        
        <button
          onClick={handleNewReception}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva recepción</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className={`text-xl font-bold text-${stat.color}-600`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Dos columnas principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: Alertas y últimas órdenes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Alertas */}
          {alerts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-medium text-gray-700 mb-3">Atención necesaria</h3>
              <div className="space-y-2">
                {alerts.map((alert, index) => {
                  const Icon = alert.icon;
                  const colorClasses = {
                    amber: 'bg-amber-50 text-amber-700',
                    green: 'bg-green-50 text-green-700',
                    blue: 'bg-blue-50 text-blue-700'
                  };
                  
                  return (
                    <div
                      key={index}
                      className={`${colorClasses[alert.color]} rounded-lg p-3 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity`}
                      onClick={() => navigate(alert.path)}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <div>
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-sm opacity-90">{alert.description}</p>
                        </div>
                      </div>
                      <span className="text-sm">→</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Últimas órdenes */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-700">Últimas recepciones</h3>
              <button
                onClick={() => navigate('/reparaciones-activas')}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Ver todas
              </button>
            </div>
            
            {recentOrders.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No hay órdenes recientes</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => handleOrderClick(order)}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-800">{order.client_name}</p>
                      <p className="text-sm text-gray-600">
                        {order.item_type} · {order.material}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.status === 'Recibido' ? 'bg-purple-100 text-purple-700' :
                        order.status === 'En análisis' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'Presupuestado' ? 'bg-amber-100 text-amber-700' :
                        order.status === 'Listo' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {order.status}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: Clientes recientes */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-700">Clientes recientes</h3>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
              {clients.length}
            </span>
          </div>

          <ClientsList
            clients={clients}
            orders={orders}
            limit={5}
            onSelectClient={handleClientClick}
          />

          <button
            onClick={() => navigate('/clientes')}
            className="w-full mt-3 text-center text-sm text-gray-600 hover:text-gray-800"
          >
            Ver todos →
          </button>
        </div>
      </div>

      {/* Modal de detalles de orden */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isOrderDetailsModalOpen}
        onClose={() => {
          setIsOrderDetailsModalOpen(false);
          setSelectedOrder(null);
        }}
      />

      {/* Modal de cliente */}
      {isClientModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold">Cliente</h3>
              <button
                onClick={() => {
                  setIsClientModalOpen(false);
                  setSelectedClient(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">{selectedClient.name}</p>
                  <p className="text-sm text-gray-500">
                    Cliente desde {selectedClient.created_at 
                      ? new Date(selectedClient.created_at).toLocaleDateString() 
                      : 'fecha no disponible'}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  {selectedClient.phone}
                </p>
                {selectedClient.email && (
                  <p className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    {selectedClient.email}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 p-2 rounded text-center">
                  <p className="text-xs text-gray-500">Total órdenes</p>
                  <p className="text-lg font-bold">{orders.filter(o => o.client_id === selectedClient.id).length}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded text-center">
                  <p className="text-xs text-gray-500">Activas</p>
                  <p className="text-lg font-bold text-gray-800">
                    {orders.filter(o => o.client_id === selectedClient.id && 
                      o.status !== 'Entregado' && 
                      o.status !== 'Rechazado').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setIsClientModalOpen(false);
                  setSelectedClient(null);
                }}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;