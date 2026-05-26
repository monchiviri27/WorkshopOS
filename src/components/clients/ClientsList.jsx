import React, { useState } from 'react';
import { User, Phone, Mail, Search, Gem, Clock } from 'lucide-react';

function ClientsList({ clients, orders, onSelectClient, limit }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Función para obtener las órdenes activas de un cliente
  const getActiveOrders = (clientId) => {
    return orders.filter(o => 
      o.clientId === clientId && 
      o.status !== 'Entregado' && 
      o.status !== 'Rechazado' && 
      o.status !== 'Archivado'
    ).length;
  };

  // Función para obtener la última orden del cliente
  const getLastOrderDate = (clientId) => {
    const clientOrders = orders.filter(o => o.clientId === clientId);
    if (clientOrders.length === 0) return null;
    
    const lastOrder = clientOrders.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    )[0];
    
    return lastOrder.createdAt;
  };

  // Filtrar clientes por búsqueda
  const filteredClients = clients
    .filter(client => {
      const searchLower = searchTerm.toLowerCase();
      return (
        client.name.toLowerCase().includes(searchLower) ||
        client.phone.includes(searchTerm) ||
        (client.email && client.email.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      // Ordenar por fecha de última actividad (más reciente primero)
      const lastOrderA = getLastOrderDate(a.id);
      const lastOrderB = getLastOrderDate(b.id);
      if (!lastOrderA) return 1;
      if (!lastOrderB) return -1;
      return new Date(lastOrderB) - new Date(lastOrderA);
    })
    .slice(0, limit || clients.length);

  // Formatear fecha relativa
  const getRelativeDate = (dateString) => {
    if (!dateString) return 'Sin actividad';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Lista de clientes */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
        {filteredClients.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No hay clientes</p>
            {searchTerm && (
              <p className="text-xs text-gray-400 mt-1">
                No se encontraron resultados para "{searchTerm}"
              </p>
            )}
          </div>
        ) : (
          filteredClients.map((client) => {
            const activeOrders = getActiveOrders(client.id);
            const lastOrderDate = getLastOrderDate(client.id);
            const relativeDate = getRelativeDate(lastOrderDate);
            
            return (
              <div
                key={client.id}
                onClick={() => onSelectClient && onSelectClient(client)}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <Gem className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800 truncate">{client.name}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span className="flex items-center flex-shrink-0">
                        <Phone className="w-3 h-3 mr-1" />
                        {client.phone}
                      </span>
                      {client.email && (
                        <span className="flex items-center truncate">
                          <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Última actividad: {relativeDate}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                  {activeOrders > 0 && (
                    <div className="flex items-center bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3 mr-1" />
                      <span className="text-xs font-medium">{activeOrders}</span>
                    </div>
                  )}
                  <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded-full">
                    {client.totalOrders || 0}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Botón "Ver todos" si hay límite */}
      {limit && clients.length > limit && (
        <button className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-2">
          Ver todos los clientes ({clients.length})
        </button>
      )}
    </div>
  );
}

export default ClientsList;