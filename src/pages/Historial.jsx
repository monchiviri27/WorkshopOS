import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  Search,
  Calendar,
  User,
  Phone,
  Gem,
  DollarSign,
  CheckCircle,
  Filter,
  ChevronDown,
  Package,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';

function Historial() {
  const navigate = useNavigate();
  const { orders, clients } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');

  // Solo órdenes entregadas
  const completedOrders = orders.filter(o => 
    o.status === 'Entregado'
  );

  // Aplicar filtros
  const filteredOrders = completedOrders.filter(order => {
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.item_type?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterMonth !== 'all') {
      const orderDate = new Date(order.delivered_at || order.completed_at || order.created_at);
      const now = new Date();
      const monthsDiff = (now.getFullYear() - orderDate.getFullYear()) * 12 + 
                        (now.getMonth() - orderDate.getMonth());
      
      if (filterMonth === '1' && monthsDiff > 1) return false;
      if (filterMonth === '3' && monthsDiff > 3) return false;
      if (filterMonth === '6' && monthsDiff > 6) return false;
      if (filterMonth === '12' && monthsDiff > 12) return false;
    }

    return matchesSearch;
  });

  // Ordenar por fecha de entrega (más reciente primero)
  const sortedOrders = [...filteredOrders].sort((a, b) => 
    new Date(b.delivered_at || b.completed_at || b.created_at) - 
    new Date(a.delivered_at || a.completed_at || a.created_at)
  );

  // Calcular totales
  const totalRevenue = completedOrders
    .reduce((sum, o) => sum + (o.budget || 0), 0);

  const totalRepairs = completedOrders.length;

  // Función para ver el presupuesto (SOLO LECTURA)
  const handleViewBudget = (orderId, e) => {
    e.stopPropagation();
    navigate(`/presupuesto/ver/${orderId}`);  // 👈 CORREGIDO
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Historial</h1>
          <p className="text-sm text-gray-500">
            {totalRepairs} reparaciones completadas
          </p>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar en historial..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
          <div className="sm:w-48 relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 appearance-none bg-white"
            >
              <option value="all">Todo el historial</option>
              <option value="1">Último mes</option>
              <option value="3">Últimos 3 meses</option>
              <option value="6">Últimos 6 meses</option>
              <option value="12">Último año</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total reparaciones</p>
          <p className="text-2xl font-bold text-gray-800">{totalRepairs}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Ingresos totales</p>
          <p className="text-2xl font-bold text-green-600">{totalRevenue}€</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Ticket medio</p>
          <p className="text-2xl font-bold text-gray-800">
            {totalRepairs > 0 ? Math.round(totalRevenue / totalRepairs) : 0}€
          </p>
        </div>
      </div>

      {/* Lista de historial */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {sortedOrders.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay reparaciones en el historial</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha entrega</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joya</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Importe</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Presupuesto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedOrders.map((order) => {
                  const deliveredDate = order.delivered_at || order.completed_at || order.created_at;
                  
                  return (
                    <tr 
                      key={order.id} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/reparacion/${order.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {new Date(deliveredDate).toLocaleDateString()}
                        </div>
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm text-gray-900">
                          {order.order_number || order.id.slice(-6)}
                        </span>
                       </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{order.client_name}</p>
                            <p className="text-xs text-gray-500 flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {order.client_phone}
                            </p>
                          </div>
                        </div>
                       </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900">{order.item_type}</p>
                          <p className="text-xs text-gray-500">{order.material}</p>
                        </div>
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.budget ? (
                          <p className="text-sm font-bold text-gray-900">{order.budget}€</p>
                        ) : (
                          <p className="text-xs text-gray-400">-</p>
                        )}
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.budget > 0 ? (
                          <button
                            onClick={(e) => handleViewBudget(order.id, e)}
                            className="text-xs bg-gray-800 text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors flex items-center space-x-1"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Ver</span>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                          {order.status}
                        </span>
                       </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Historial;