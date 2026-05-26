import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Phone, 
  Calendar, 
  Send, 
  CheckCircle, 
  Eye,
  RefreshCw,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';

function AvisosPendientes() {
  const navigate = useNavigate();
  const { orders, clients, updateOrder } = useApp();
  const [avisos, setAvisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Cargar órdenes en estado "Listo" con más de 7 días y no notificadas
  const cargarAvisos = () => {
    const sieteDiasAtras = new Date();
    sieteDiasAtras.setDate(sieteDiasAtras.getDate() - 7);

    const pendientes = orders.filter(order => {
      if (order.status !== 'Listo') return false;
      if (order.notified === true) return false;
      if (!order.completed_at) return false;
      
      const fechaListo = new Date(order.completed_at);
      return fechaListo <= sieteDiasAtras;
    });

    // Ordenar por más antiguos primero
    pendientes.sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at));
    setAvisos(pendientes);
    setLoading(false);
  };

  useEffect(() => {
    cargarAvisos();
  }, [orders]);

  const enviarWhatsApp = async (order) => {
    setEnviando(order.id);
    
    const client = clients.find(c => c.id === order.client_id);
    if (!client || !client.phone) {
      alert('El cliente no tiene número de teléfono registrado');
      setEnviando(null);
      return;
    }

    const mensaje = `Estimado/a ${client.name || order.client_name},

Le recordamos que su ${order.item_type || 'joya'} lleva más de 7 días esperando para ser recogido en nuestro taller.

Por favor, pase a recogerlo cuanto antes. Estamos a su disposición.

📋 IMPORTANTE: Para la retirada es imprescindible presentar el resguardo de depósito.

🕒 Nuestro horario:
• Lunes a sábado: 10:00 - 22:00
• Domingos y festivos: 11:00 - 15:00 y 16:00 - 21:00

Gracias por confiar en nosotros.

--
Taller de Relojería El Corte Inglés Sanchinarro`;

    const telefonoLimpio = client.phone.replace(/\s+/g, '').replace(/^\+/, '');
    const url = `https://web.whatsapp.com/send/?phone=${telefonoLimpio}&text=${encodeURIComponent(mensaje)}&app_absent=0`;
    
    window.open(url, '_blank');
    
    // Marcar como notificada
    await updateOrder(order.id, { notified: true });
    
    // Actualizar lista
    setAvisos(prev => prev.filter(a => a.id !== order.id));
    setEnviando(null);
    setSuccessMessage('✅ Aviso enviado correctamente');
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const marcarComoAvisado = async (order) => {
    await updateOrder(order.id, { notified: true });
    setAvisos(prev => prev.filter(a => a.id !== order.id));
    setSuccessMessage('✅ Marcado como avisado');
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    const date = new Date(dateString);
    const diffDays = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
    return `${date.toLocaleDateString()} (hace ${diffDays} días)`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensaje de éxito flotante */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slide-down">
          <div className="bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center space-x-3">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <Bell className="w-6 h-6 mr-2 text-orange-500" />
            Avisos pendientes
          </h1>
          <p className="text-sm text-gray-500">
            Reparaciones que llevan más de 7 días en estado "Listo" sin avisar
          </p>
        </div>
        <button
          onClick={cargarAvisos}
          className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          title="Actualizar"
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Lista de avisos */}
      {avisos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-800 mb-2">No hay avisos pendientes</h3>
          <p className="text-gray-500">
            Todas las reparaciones en estado "Listo" han sido avisadas o no superan los 7 días.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {avisos.map((order) => {
            const client = clients.find(c => c.id === order.client_id);
            const diasRetraso = Math.floor((new Date() - new Date(order.completed_at)) / (1000 * 60 * 60 * 24));
            
            return (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {order.order_number}
                      </span>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                        {diasRetraso} días de retraso
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 mt-2">
                      {client?.name || order.client_name}
                    </p>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Phone className="w-3 h-3 mr-1" />
                        {client?.phone || order.client_phone}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Listo desde: {formatDate(order.completed_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {order.item_type} · {order.material}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => enviarWhatsApp(order)}
                      disabled={enviando === order.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                    >
                      {enviando === order.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span>Enviar WhatsApp</span>
                    </button>
                    <button
                      onClick={() => marcarComoAvisado(order)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      title="Marcar como avisado"
                    >
                      <CheckCircle className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => navigate(`/reparacion/${order.id}`)}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      title="Ver detalles"
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AvisosPendientes;