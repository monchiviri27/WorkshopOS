import React, { useMemo } from 'react';
import { Clock, User, Tag, Camera, AlertCircle, DollarSign, Eye, CheckCircle, XCircle } from 'lucide-react';

function OrderCard({ order, client, onClick }) {
  // Validación segura de fechas
  const getDaysSince = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      const now = new Date();
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      // No mostrar negativos, si es futuro mostrar 0
      return Math.max(0, diffDays);
    } catch {
      return null;
    }
  };

  // Formatear precio seguro
  const formatPrice = (price) => {
    if (!price && price !== 0) return null;
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return null;
    return num.toFixed(2);
  };

  // Obtener datos del cliente (desde prop o desde order.client)
  const clientName = client?.name || order.client_name || order.clientName || 'Cliente sin nombre';
  const clientPhone = client?.phone || order.client_phone || order.clientPhone;

  // Prioridades con colores
  const priorityColors = {
    'Baja': 'text-green-600 bg-green-50',
    'Normal': 'text-blue-600 bg-blue-50',
    'Alta': 'text-orange-600 bg-orange-50',
    'Urgente': 'text-red-600 bg-red-50'
  };

  // Estados con colores y acciones
  const statusConfig = {
    'Recibido': { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: null, action: 'En análisis' },
    'En análisis': { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: null, action: 'Presupuestar' },
    'Presupuestado': { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: DollarSign, action: 'Enviado al cliente' },
    'Aceptado': { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle, action: 'Iniciar reparación' },
    'Rechazado': { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, action: 'Ver motivo' },
    'En reparación': { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: null, action: 'Finalizar' },
    'Listo': { color: 'bg-teal-100 text-teal-700 border-teal-200', icon: null, action: 'Entregar' },
    'Entregado': { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: null, action: 'Ver factura' },
    'Archivado': { color: 'bg-gray-100 text-gray-600 border-gray-200', icon: null, action: null }
  };

  const status = statusConfig[order.status] || statusConfig['Recibido'];
  
  // Calcular días desde creación
  const daysSince = getDaysSince(order.created_at || order.createdAt);
  
  // Verificar retraso (si tiene fecha estimada y pasó)
  const estimatedDate = order.estimated_date || order.estimatedDate;
  const isOverdue = estimatedDate && new Date(estimatedDate) < new Date() && 
                    order.status !== 'Listo' && order.status !== 'Entregado';
  
  // Verificar presupuesto pendiente
  const hasPendingBudget = order.status === 'Presupuestado' && order.budget_status !== 'aceptado';
  
  // Verificar si tiene fotos
  const photoCount = order.photos?.length || 0;
  
  // Precio formateado
  const formattedBudget = formatPrice(order.budget);
  
  // Clase de borde según estado
  const getBorderClass = () => {
    if (isOverdue) return 'border-red-500';
    if (hasPendingBudget) return 'border-amber-500';
    if (order.status === 'Listo') return 'border-teal-500';
    if (order.status === 'Entregado') return 'border-gray-400';
    return 'border-primary-500';
  };

  // Fondo según días
  const getDaysClass = () => {
    if (daysSince === null) return 'text-gray-400';
    if (daysSince > 7) return 'text-red-600 font-bold';
    if (daysSince > 3) return 'text-orange-600 font-medium';
    return 'text-gray-500';
  };

  return (
    <div 
      className={`
        bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer 
        border-l-4 ${getBorderClass()} hover:scale-[1.01] hover:bg-gray-50/50
        group relative
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            #{order.order_number || order.orderNumber || order.id?.slice(-6)}
          </span>
          {hasPendingBudget && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center space-x-1">
              <Eye className="w-3 h-3" />
              <span>Pendiente</span>
            </span>
          )}
        </div>
        {order.priority && (
          <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[order.priority] || 'bg-gray-100 text-gray-600'}`}>
            {order.priority}
          </span>
        )}
      </div>

      {/* Cliente */}
      <div className="flex items-center space-x-2 mb-2 group-hover:text-gray-900">
        <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
        <span className="text-sm font-medium text-gray-800 truncate" title={clientName}>
          {clientName}
        </span>
        {clientPhone && (
          <span className="text-xs text-gray-400 hidden sm:inline">
            {clientPhone}
          </span>
        )}
      </div>

      {/* Artículo */}
      <div className="mb-2">
        <p className="text-sm font-medium text-gray-800 truncate">
          {order.item_type || order.itemType || 'Joya'}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {order.material || 'Material no especificado'}
        </p>
      </div>
      
      {/* Descripción corta */}
      {order.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2" title={order.description}>
          {order.description.length > 80 ? `${order.description.substring(0, 80)}...` : order.description}
        </p>
      )}

      {/* Footer stats */}
      <div className="flex items-center justify-between text-xs border-t border-gray-100 pt-2">
        {/* Días desde creación */}
        <div className="flex items-center space-x-1" title={`Recibido el ${new Date(order.created_at || order.createdAt).toLocaleDateString()}`}>
          <Clock className="w-3 h-3 text-gray-400" />
          <span className={getDaysClass()}>
            {daysSince !== null ? `${daysSince}d` : '—'}
          </span>
        </div>
        
        {/* Presupuesto */}
        <div className="flex items-center space-x-1">
          <Tag className="w-3 h-3 text-gray-400" />
          {formattedBudget ? (
            <span className="text-gray-700 font-medium">
              {formattedBudget}€
            </span>
          ) : order.status === 'Presupuestado' ? (
            <span className="text-amber-600 text-xs animate-pulse">Pendiente</span>
          ) : (
            <span className="text-gray-400 text-xs">Sin presupuesto</span>
          )}
        </div>
        
        {/* Fotos */}
        {photoCount > 0 && (
          <div className="flex items-center space-x-1" title={`${photoCount} foto${photoCount !== 1 ? 's' : ''}`}>
            <Camera className="w-3 h-3 text-gray-400" />
            <span className="text-gray-500">{photoCount}</span>
          </div>
        )}

        {/* Indicador de retraso */}
        {isOverdue && (
          <div className="flex items-center space-x-1" title="Retrasado respecto a fecha estimada">
            <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" />
            <span className="text-red-500 text-[10px]">Retraso</span>
          </div>
        )}
      </div>

      {/* Status badge con acción sugerida */}
      <div className="mt-3 flex items-center justify-between">
        <span className={`text-xs px-2 py-1 rounded-full border ${status.color}`}>
          {order.status}
        </span>
        {status.action && !isOverdue && (
          <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
            {status.action} →
          </span>
        )}
      </div>

      {/* Tooltip de resumen (hover) */}
      <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 hidden md:block">
        <div className="space-y-1">
          <p><strong>Orden:</strong> {order.order_number || order.orderNumber}</p>
          <p><strong>Cliente:</strong> {clientName}</p>
          {formattedBudget && <p><strong>Presupuesto:</strong> {formattedBudget}€</p>}
          {estimatedDate && (
            <p><strong>Fecha estimada:</strong> {new Date(estimatedDate).toLocaleDateString()}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente Skeleton para loading
export const OrderCardSkeleton = () => {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 animate-pulse">
      <div className="flex justify-between mb-2">
        <div className="h-4 w-20 bg-gray-200 rounded"></div>
        <div className="h-4 w-16 bg-gray-200 rounded"></div>
      </div>
      <div className="flex items-center space-x-2 mb-2">
        <div className="w-3 h-3 bg-gray-200 rounded"></div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
      </div>
      <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
      <div className="h-3 w-full bg-gray-200 rounded mb-3"></div>
      <div className="flex justify-between pt-2 border-t border-gray-100">
        <div className="h-3 w-12 bg-gray-200 rounded"></div>
        <div className="h-3 w-16 bg-gray-200 rounded"></div>
        <div className="h-3 w-8 bg-gray-200 rounded"></div>
      </div>
      <div className="mt-3 h-5 w-20 bg-gray-200 rounded-full"></div>
    </div>
  );
};

// Componente vacío para cuando no hay órdenes
export const OrderCardEmpty = () => {
  return (
    <div className="bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
      <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">No hay órdenes para mostrar</p>
      <p className="text-xs text-gray-400 mt-1">Las órdenes aparecerán aquí automáticamente</p>
    </div>
  );
};

export default OrderCard;