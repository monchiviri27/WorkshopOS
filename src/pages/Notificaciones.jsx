import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  CheckCheck,
  Mail,
  MailOpen,
  Eye,
  EyeOff
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

function Notificaciones() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAsUnread, markAllAsRead } = useNotifications();

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Hoy
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    // Esta semana
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('es-ES', { weekday: 'long' });
    }
    // Fecha completa
    return date.toLocaleDateString('es-ES');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notificaciones</h1>
          <p className="text-sm text-gray-500">
            {unreadCount} no leídas · {notifications.length} total
          </p>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="btn-secondary flex items-center space-x-2"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Marcar todas como leídas</span>
          </button>
        )}
      </div>

      {/* Lista de notificaciones */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No hay notificaciones</h3>
            <p className="text-sm text-gray-500">
              Las respuestas de tus clientes aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-6 hover:bg-gray-50 transition-colors ${
                  !notif.read ? 'bg-blue-50/30' : ''
                }`}
              >
                <div className="flex items-start space-x-4">
                  {/* Icono */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    notif.type === 'success' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {notif.type === 'success' ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`text-base font-medium ${
                          !notif.read ? 'text-gray-900' : 'text-gray-600'
                        }`}>
                          {notif.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {notif.message}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                        {formatDate(notif.timestamp)}
                      </span>
                    </div>

                    {/* Metadatos */}
                    <div className="flex items-center space-x-4 mt-3">
                      <span className="text-xs text-gray-400">
                        Orden: {notif.orderNumber || 'N/A'}
                      </span>
                      {notif.orderId && (
                        <button
                          onClick={() => navigate(`/reparacion/${notif.orderId}`)}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Ver reparación →
                        </button>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center space-x-2 mt-3">
                      {notif.read ? (
                        <button
                          onClick={() => markAsUnread(notif.id)}
                          className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                        >
                          <EyeOff className="w-3 h-3" />
                          <span>Marcar como no leída</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => markAsRead(notif.id)}
                          className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Marcar como leída</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Indicador de no leída */}
                  {!notif.read && (
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notificaciones;