import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Phone, Mail, Calendar, Clock, Tag, DollarSign, FileText, Printer, Edit } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateReceptionPDF } from '../../utils/pdfGenerator'; // CAMBIADO AQUÍ

function OrderDetailsModal({ order, isOpen, onClose }) {
  const navigate = useNavigate();
  const { clients } = useApp();

  if (!isOpen || !order) return null;

  const client = clients.find(c => c.id === order.clientId);

  const getStatusColor = (status) => {
    const colors = {
      'Recibido': 'bg-purple-100 text-purple-700',
      'En análisis': 'bg-blue-100 text-blue-700',
      'Presupuestado': 'bg-amber-100 text-amber-700',
      'Aceptado': 'bg-green-100 text-green-700',
      'En reparación': 'bg-orange-100 text-orange-700',
      'Listo': 'bg-green-100 text-green-700',
      'Rechazado': 'bg-gray-100 text-gray-700',
      'Entregado': 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const handlePrintPDF = () => {
    if (client) {
      // Usamos generateReceptionPDF con tipo 'cliente' para el resguardo
      generateReceptionPDF(order, client, 'cliente'); // CAMBIADO AQUÍ
    }
  };

  const handleGoToDetail = () => {
    onClose();
    navigate(`/reparacion/${order.id}`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-gray-800">
                Orden #{order.orderNumber || order.id.slice(-6)}
              </h2>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Creada el {new Date(order.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrintPDF}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Imprimir"
            >
              <Printer className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleGoToDetail}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Ver detalles completos"
            >
              <Edit className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Cliente */}
          {client && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                <User className="w-4 h-4 mr-2 text-primary-500" />
                Cliente
              </h3>
              <p className="font-medium text-gray-800">{client.name}</p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center">
                  <Phone className="w-3 h-3 mr-1" />
                  {client.phone}
                </span>
                {client.email && (
                  <span className="flex items-center">
                    <Mail className="w-3 h-3 mr-1" />
                    {client.email}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Joya */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-700 mb-3 flex items-center">
              <Tag className="w-4 h-4 mr-2 text-primary-500" />
              Joya
            </h3>
            <p className="font-medium text-gray-800">{order.itemType}</p>
            <p className="text-sm text-gray-600 mt-1">Material: {order.material}</p>
            <p className="text-sm text-gray-700 mt-2">{order.description}</p>
            {order.observations && (
              <p className="text-xs text-gray-500 mt-2">📝 {order.observations}</p>
            )}
          </div>

          {/* Económico */}
          {order.budget && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                <DollarSign className="w-4 h-4 mr-2 text-primary-500" />
                Presupuesto
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-gray-800">{order.budget}€</span>
                </div>
                {order.budgetStatus && (
                  <div className="flex items-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.budgetStatus === 'aceptado' ? 'bg-green-100 text-green-700' :
                      order.budgetStatus === 'rechazado' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {order.budgetStatus === 'aceptado' ? 'Aceptado' :
                       order.budgetStatus === 'rechazado' ? 'Rechazado' :
                       'Pendiente'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fechas */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-700 mb-3 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-primary-500" />
              Fechas
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Entrada:</span>
                <span className="text-gray-800">{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              {order.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Completada:</span>
                  <span className="text-gray-800">{new Date(order.completedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Historial de cambios */}
          {order.statusHistory && order.statusHistory.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                <Clock className="w-4 h-4 mr-2 text-primary-500" />
                Historial
              </h3>
              <div className="space-y-2">
                {order.statusHistory.map((change, idx) => (
                  <div key={idx} className="text-xs flex items-start space-x-2">
                    <span className="text-gray-400 whitespace-nowrap">
                      {new Date(change.date).toLocaleDateString()}:
                    </span>
                    <span>
                      {change.from ? `${change.from} → ` : ''}{change.to}
                      {change.note && <span className="text-gray-500 ml-1">({change.note})</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderDetailsModal;