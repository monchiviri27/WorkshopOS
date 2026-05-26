import React from 'react';
import OrderCard from './OrderCard';

const columns = [
  { id: 'Recibido', title: '📦 Recibido', color: 'bg-purple-50' },
  { id: 'En análisis', title: '🔍 En análisis', color: 'bg-blue-50' },
  { id: 'Presupuestado', title: '💰 Presupuestado', color: 'bg-amber-50' },
  { id: 'Aceptado', title: '✅ Aceptado', color: 'bg-green-50' },
  { id: 'En reparación', title: '🔧 En reparación', color: 'bg-orange-50' },
  { id: 'Listo', title: '⏰ Listo', color: 'bg-green-100' }
];

function KanbanBoard({ orders, onOrderClick }) {
  // Filtrar solo los estados que queremos mostrar en el kanban
  const kanbanOrders = orders.filter(o => 
    o.status !== 'Rechazado' && 
    o.status !== 'Entregado' && 
    o.status !== 'Archivado'
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
      {columns.map((column) => {
        const columnOrders = kanbanOrders.filter(o => o.status === column.id);
        
        return (
          <div key={column.id} className={`${column.color} rounded-lg p-4 min-w-[250px]`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700 text-sm">{column.title}</h3>
              <span className="bg-white px-2 py-1 rounded-full text-xs font-medium shadow-sm">
                {columnOrders.length}
              </span>
            </div>
            
            <div className="space-y-3 min-h-[400px] max-h-[600px] overflow-y-auto scrollbar-thin">
              {columnOrders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onClick={() => onOrderClick(order)}
                />
              ))}
              
              {columnOrders.length === 0 && (
                <div className="bg-white/50 rounded-lg p-4 text-center border-2 border-dashed border-gray-200">
                  <p className="text-sm text-gray-400">Sin órdenes</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default KanbanBoard;