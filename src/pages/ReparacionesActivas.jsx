import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Package,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  Gem,
  DollarSign,
  Calendar,
  Printer,
  Edit,
  XCircle,
  ChevronDown,
  ArrowRight,
  Archive,
  AlertTriangle,
  RefreshCw,
  Send,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateReceptionPDF } from '../utils/pdfGenerator';
import { supabase } from '../lib/supabaseClient';

function ReparacionesActivas() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orders, clients, updateOrder } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todas');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppOrder, setWhatsAppOrder] = useState(null);
  const [whatsAppTipo, setWhatsAppTipo] = useState('');
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 👈 SINCRONIZAR FILTRO CON LA URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const estadoParam = params.get('estado');
    
    if (estadoParam === 'listo') {
      setFilterStatus('Listo');
    } else {
      setFilterStatus('todas');
    }
  }, [location.search]);

  // Usar useMemo para que se recalcule cuando cambien orders o filtros
  const activeOrders = useMemo(() => 
    orders.filter(o => o.status !== 'Entregado' && o.status !== 'Archivado'),
    [orders]
  );
  
  // Aplicar filtros de búsqueda y estado
  const filteredOrders = useMemo(() => {
    return activeOrders.filter(order => {
      const matchesSearch = 
        order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.item_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.client_phone?.includes(searchTerm) ||
        order.material?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterStatus === 'todas' || order.status === filterStatus;
      
      return matchesSearch && matchesFilter;
    });
  }, [activeOrders, searchTerm, filterStatus]);

  // Ordenar por fecha (más recientes primero)
  const sortedOrders = useMemo(() => 
    [...filteredOrders].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    ),
    [filteredOrders]
  );

  // Paginación
  const totalPages = Math.ceil(sortedOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedOrders.slice(start, end);
  }, [sortedOrders, currentPage]);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const getStatusColor = (status) => {
    const colors = {
      'Recibido': 'bg-purple-100 text-purple-700 border-purple-200',
      'En análisis': 'bg-blue-100 text-blue-700 border-blue-200',
      'Presupuestado': 'bg-amber-100 text-amber-700 border-amber-200',
      'Aceptado': 'bg-green-100 text-green-700 border-green-200',
      'En reparación': 'bg-orange-100 text-orange-700 border-orange-200',
      'Garantia': 'bg-purple-100 text-purple-700 border-purple-200',
      'pendiente_de_recoger': 'bg-amber-100 text-amber-700 border-amber-200',
      'Listo': 'bg-green-100 text-green-700 border-green-200',
      'Rechazado': 'bg-red-100 text-red-700 border-red-200',
      'Entregado': 'bg-gray-100 text-gray-700 border-gray-200',
      'Archivado': 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // Abrir modal de cambio de estado
  const openStatusModal = (order, status) => {
    setSelectedOrder(order);
    setNewStatus(status);
    setStatusNote('');
    setShowStatusModal(true);
  };

  // Abrir modal de WhatsApp
  const openWhatsAppModal = (order, tipo) => {
    setWhatsAppOrder(order);
    setWhatsAppTipo(tipo);
    setShowWhatsAppModal(true);
  };

  // Obtener mensaje según el tipo
  const getMensajeWhatsApp = (tipo, order) => {
    const clientName = order.client_name || 'Cliente';
    const itemType = order.item_type || 'joya';
    
    switch(tipo) {
      case 'aceptado':
        return `Estimado/a ${clientName},

Le informamos que su presupuesto para la reparación de su ${itemType} ha sido ACEPTADO.

En los próximos días comenzaremos con los trabajos necesarios. Le mantendremos informado del proceso.

Gracias por confiar en nosotros.


Taller de Relojería El Corte Inglés Sanchinarro`;
      
      case 'en_reparacion':
        return `Estimado/a ${clientName},

Le informamos que la reparación de su ${itemType} ha comenzado.

Nuestros técnicos ya están trabajando en ella. Le mantendremos informado cuando esté finalizada.

Gracias por confiar en nosotros.


Taller de Relojería El Corte Inglés Sanchinarro`;

      case 'garantia':
  return `Estimado/a ${clientName},

Le informamos que su ${itemType} ha entrado en período de GARANTÍA.

Procederemos a revisarla y le mantendremos informado.

Gracias por confiar en nosotros.


Taller de Relojería El Corte Inglés Sanchinarro`;

      case 'pendiente_recoger':
  return `Estimado/a ${clientName},

Le informamos que su ${itemType} ya se encuentra en nuestro taller y está disponible para recoger.

📋 IMPORTANTE: Para la retirada es imprescindible presentar el resguardo de depósito.

🕒 Nuestro horario:
• Lunes a sábado: 10:00 - 22:00
• Domingos y festivos: 11:00 - 15:00 y 16:00 - 21:00

Gracias por confiar en nosotros.


Taller de Relojería El Corte Inglés Sanchinarro`;
      
      case 'listo':
        return `Estimado/a ${clientName},

Le informamos que su ${itemType} ya está TERMINADO y listo para ser recogido.

Puede pasar a recogerlo cuando lo desee en nuestro establecimiento.

📋 IMPORTANTE: Para la retirada es imprescindible presentar el resguardo de depósito.

🕒 Nuestro horario:
• Lunes a sábado: 10:00 - 22:00
• Domingos y festivos: 11:00 - 15:00 y 16:00 - 21:00

Gracias por confiar en nosotros.


Taller de Relojería El Corte Inglés Sanchinarro`;
      
      case 'entregado':
        return `Estimado/a ${clientName},

Le informamos que su ${itemType} ya ha sido ENTREGADO y ha salido de nuestro taller.

Esperamos haber cumplido con sus expectativas. Quedamos a su disposición para cualquier futura reparación o consulta.

Gracias por confiar en nosotros.


Taller de Relojería El Corte Inglés Sanchinarro`;
      
      default:
        return '';
    }
  };

  // Enviar WhatsApp al cliente
  const sendWhatsApp = () => {
    if (!whatsAppOrder) return;
    
    const client = clients.find(c => c.id === whatsAppOrder.client_id);
    if (!client || !client.phone) {
      alert('El cliente no tiene número de teléfono registrado');
      return;
    }

    const mensaje = getMensajeWhatsApp(whatsAppTipo, whatsAppOrder);
    const telefonoLimpio = client.phone.replace(/\s+/g, '').replace(/^\+/, '');
    const url = `https://web.whatsapp.com/send/?phone=${telefonoLimpio}&text=${encodeURIComponent(mensaje)}&app_absent=0`;
    
    window.open(url, '_blank');
    setShowWhatsAppModal(false);
    setSuccessMessage(`✅ Mensaje enviado por WhatsApp`);
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  // Confirmar cambio de estado
const confirmStatusChange = async () => {
  if (!selectedOrder || !newStatus || newStatus === selectedOrder.status) return;
  
  setIsUpdating(true);

  try {
    const updates = {
      status: newStatus,
      status_history: [
        ...(selectedOrder.status_history || []),
        {
          from: selectedOrder.status,
          to: newStatus,
          date: new Date().toISOString(),
          note: statusNote
        }
      ]
    };

    // 👇 AÑADE ESTAS DOS LÍNEAS 👇
    if (newStatus === 'En análisis') {
      updates.diagnosis_date = new Date().toISOString();
    }

    if (newStatus === 'En reparación') {
      updates.start_date = new Date().toISOString();
    }
    // 👆 HASTA AQUÍ 👆

    if (newStatus === 'Listo') {
      updates.completed_at = new Date().toISOString();
      updates.notified = false;
    }

    if (newStatus === 'Entregado') {
      updates.delivered_at = new Date().toISOString();
      updates.paid = true;
    }

    if (newStatus === 'Rechazado') {
      updates.budget_status = 'rechazado';
    }

    await updateOrder(selectedOrder.id, updates);

    setShowStatusModal(false);
    
    let tipoMensaje = null;
    if (newStatus === 'Aceptado') {
      tipoMensaje = 'aceptado';
    } else if (newStatus === 'En reparación') {
      tipoMensaje = 'en_reparacion';
    } else if (newStatus === 'Listo') {
      tipoMensaje = 'listo';
    } else if (newStatus === 'Entregado') {
      tipoMensaje = 'entregado';
    } else if (newStatus === 'pendiente_de_recoger') {
      tipoMensaje = 'pendiente_recoger';
    }  
      else if (newStatus === 'Garantia') {  // 👈 NUEVO: Estado Garantía
      tipoMensaje = 'garantia';
    } 
    
    if (tipoMensaje) {
      const orderCopy = { ...selectedOrder };
      setSelectedOrder(null);
      setNewStatus('');
      setStatusNote('');
      openWhatsAppModal(orderCopy, tipoMensaje);
    } else {
      setSuccessMessage(`✅ Estado cambiado a: ${newStatus}`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      setSelectedOrder(null);
      setNewStatus('');
      setStatusNote('');
    }
    
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    setSuccessMessage('❌ Error al cambiar estado');
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  } finally {
    setIsUpdating(false);
  }
};

  // ============================================
  // FUNCIÓN handlePrintReceipt (sin cambios)
  // ============================================
  const handlePrintReceipt = async (order) => {
    const client = clients.find(c => c.id === order.client_id);
    if (!client) {
      const fallbackClient = {
        name: order.client_name,
        phone: order.client_phone,
        email: order.client_email
      };
      
      if (order.recepcion_id) {
        try {
          const { data: recepcion, error: recepcionError } = await supabase
            .from('recepciones')
            .select('*')
            .eq('id', order.recepcion_id)
            .single();
          
          if (!recepcionError && recepcion) {
            const { data: ordenesRecepcion, error: ordenesError } = await supabase
              .from('ordenes')
              .select('*')
              .eq('recepcion_id', order.recepcion_id);
            
            if (!ordenesError && ordenesRecepcion && ordenesRecepcion.length > 0) {
              generateReceptionPDF(recepcion, ordenesRecepcion, fallbackClient, 'cliente');
              return;
            }
          }
        } catch (err) {
          console.error('Error cargando recepción:', err);
        }
      }
      
      generateReceptionPDF(null, [order], fallbackClient, 'cliente');
      return;
    }

    if (order.recepcion_id) {
      try {
        const { data: recepcion, error: recepcionError } = await supabase
          .from('recepciones')
          .select('*')
          .eq('id', order.recepcion_id)
          .single();
        
        if (!recepcionError && recepcion) {
          const { data: ordenesRecepcion, error: ordenesError } = await supabase
            .from('ordenes')
            .select('*')
            .eq('recepcion_id', order.recepcion_id);
          
          if (!ordenesError && ordenesRecepcion && ordenesRecepcion.length > 0) {
            generateReceptionPDF(recepcion, ordenesRecepcion, client, 'cliente');
            return;
          }
        }
      } catch (err) {
        console.error('Error cargando recepción:', err);
      }
    }
    
    generateReceptionPDF(null, [order], client, 'cliente');
  };

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

      {/* Modal de WhatsApp */}
      {showWhatsAppModal && whatsAppOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-scale-up">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <Send className="w-5 h-5 mr-2 text-green-600" />
                Enviar WhatsApp
              </h3>
              <button 
                onClick={() => setShowWhatsAppModal(false)} 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Cliente</p>
                <p className="font-medium text-gray-800">{whatsAppOrder.client_name}</p>
                <p className="text-sm text-gray-500 mt-2">Teléfono</p>
                <p className="font-medium text-gray-800">
                  {clients.find(c => c.id === whatsAppOrder.client_id)?.phone || 'No disponible'}
                </p>
                <p className="text-sm text-gray-500 mt-2">Joya</p>
                <p className="font-medium text-gray-800">{whatsAppOrder.item_type || 'No especificado'}</p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 font-medium">Mensaje a enviar:</p>
                <p className="text-sm text-blue-700 mt-2 whitespace-pre-line">
                  {getMensajeWhatsApp(whatsAppTipo, whatsAppOrder)}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={sendWhatsApp}
                className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Enviar WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reparaciones Activas</h1>
          <p className="text-sm text-gray-500">
            {activeOrders.length} reparaciones en curso
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.location.reload()}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => navigate('/nueva-recepcion')}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
          >
            <Package className="w-4 h-4" />
            <span>Nueva recepción</span>
          </button>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por orden, cliente, joya o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="sm:w-48 relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
            >
              <option value="todas">Todos los estados</option>
              <option value="Recibido">📦 Recibido</option>
              <option value="En análisis">🔍 En análisis</option>
              <option value="Presupuestado">💰 Presupuestado</option>
              <option value="Aceptado">✅ Aceptado</option>
              <option value="En reparación">🔧 En reparación</option>
              <option value="pendiente_de_recoger" className="text-amber-600">📦 Pendiente de recoger</option>
              <option value="Garantia">🛡️ Garantía</option>
              <option value="Listo">⏰ Terminado</option>
              <option value="Rechazado">❌ Rechazado</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Lista de reparaciones */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orden</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joya</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Presupuesto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fechas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No hay reparaciones activas</p>
                    <button
                      onClick={() => navigate('/nueva-recepcion')}
                      className="mt-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      + Registrar primera recepción
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const isOverdue = order.estimated_date && new Date(order.estimated_date) < new Date() && order.status !== 'Listo' && order.status !== 'Entregado';
                  const isReady = order.status === 'Listo';
                  const isRejected = order.status === 'Rechazado';
                  
                  const showRejectButton = order.budget_status === 'pendiente' && order.budget && order.status === 'Presupuestado';
                  
                  return (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-gray-50 transition-colors ${
                        isOverdue ? 'bg-red-50' : 
                        isReady ? 'bg-green-50' : 
                        isRejected ? 'bg-red-100' : ''
                      }`}
                    >
                      {/* 👇 NÚMERO DE ORDEN CLICABLE */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <button
                            onClick={() => navigate(`/reparacion/${order.id}`)}
                            className={`font-mono text-sm font-medium hover:underline hover:text-blue-600 transition-colors ${isRejected ? 'text-gray-500 cursor-not-allowed' : 'text-gray-900'}`}
                            title="Ver detalles de la reparación"
                            disabled={isRejected}
                          >
                            {order.order_number || order.id.slice(-6)}
                          </button>
                          {isOverdue && (
                            <AlertCircle className="w-4 h-4 text-red-500 ml-2" title="Retrasado" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-8 w-8 ${isRejected ? 'bg-gray-200' : 'bg-primary-100'} rounded-full flex items-center justify-center`}>
                            <User className={`h-4 w-4 ${isRejected ? 'text-gray-500' : 'text-primary-600'}`} />
                          </div>
                          <div className="ml-3">
                            <p className={`text-sm font-medium ${isRejected ? 'text-gray-500' : 'text-gray-900'}`}>
                              {order.client_name}
                            </p>
                            <p className={`text-xs flex items-center ${isRejected ? 'text-gray-400' : 'text-gray-500'}`}>
                              <Phone className="w-3 h-3 mr-1" />
                              {order.client_phone}
                            </p>
                          </div>
                        </div>
                       </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className={`text-sm font-medium ${isRejected ? 'text-gray-500' : 'text-gray-900'}`}>
                            {order.item_type || 'Joya'}
                          </p>
                          <p className={`text-xs line-clamp-1 ${isRejected ? 'text-gray-400' : 'text-gray-500'}`}>
                            {order.material} · {order.description?.substring(0, 30)}...
                          </p>
                        </div>
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openStatusModal(order, order.status)}
                          className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(order.status)} hover:opacity-80 transition-opacity flex items-center space-x-1`}
                          disabled={isUpdating}
                        >
                          <span>{order.status === 'Listo' ? 'Terminado' : order.status}</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.budget ? (
                          <>
                            <p className={`text-sm font-bold ${isRejected ? 'text-gray-500' : 'text-gray-900'}`}>{order.budget}€</p>
                            {order.budget_status === 'pendiente' && (
                              <p className="text-xs text-amber-600">Pendiente</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-gray-400">Sin presupuesto</p>
                        )}
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center text-xs ${isRejected ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Calendar className="w-3 h-3 mr-1" />
                          <span>Entrada: {new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePrintReceipt(order)}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Imprimir comprobante"
                          >
                            <Printer className="w-4 h-4 text-gray-600" />
                          </button>
                          
                          <button
                            onClick={() => navigate(`/reparacion/${order.id}`)}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Ver detalles"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          
                          {isReady && (
                            <button
                              onClick={() => handleMarkAsReady(order)}
                              className="p-1 hover:bg-green-100 rounded-lg transition-colors"
                              title="Marcar como listo"
                              disabled={isUpdating}
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </button>
                          )}

                          {showRejectButton && (
                            <button
                              onClick={() => handleMarkAsRejected(order)}
                              className="p-1 hover:bg-red-100 rounded-lg transition-colors"
                              title="Rechazar presupuesto"
                              disabled={isUpdating}
                            >
                              <XCircle className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                        </div>
                       </td>
                    </tr>
                  );
                })
              )}
            </tbody>
           </table>
        </div>
        
        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedOrders.length)} de {sortedOrders.length} reparaciones
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded-lg text-sm ${
                      currentPage === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de cambio de estado */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full animate-slide-up">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center">
                <ArrowRight className="w-5 h-5 mr-2 text-primary-500" />
                Cambiar estado de reparación
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-gray-800">{selectedOrder.client_name}</p>
                <p className="text-xs text-gray-600">{selectedOrder.item_type} · {selectedOrder.material}</p>
                <p className="text-xs text-gray-500 mt-1">Orden: {selectedOrder.order_number}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado actual: <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedOrder.status)}`}>{selectedOrder.status}</span>
                </label>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nuevo estado *
                </label>
                <select
  value={newStatus || selectedOrder.status}
  onChange={(e) => setNewStatus(e.target.value)}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
  autoFocus
  disabled={isUpdating}
>
  <option value="Recibido">📦 Recibido</option>
  <option value="En análisis">🔍 En análisis</option>
  <option value="Presupuestado">💰 Presupuestado</option>
  <option value="Aceptado">✅ Aceptado</option>
  <option value="En reparación">🔧 En reparación</option>
  <option value="Garantia">🛡️ Garantía</option>
  <option value="pendiente_de_recoger" className="text-amber-600">📦 Pendiente de recoger</option>  {/* 👈 AÑADIR */}
  <option value="Listo">⏰ Terminado</option>
  <option value="Rechazado" className="text-red-600">❌ Rechazado</option>
  <option value="Entregado" className="text-green-600">🏁 Entregado</option>
</select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nota / Comentario (opcional)
                </label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Añadir observación sobre este cambio..."
                  disabled={isUpdating}
                />
              </div>

              {newStatus === 'Rechazado' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Rechazar presupuesto</p>
                    <p className="text-xs text-red-700">
                      Al rechazar, el presupuesto se marcará como rechazado pero la reparación seguirá activa.
                    </p>
                  </div>
                </div>
              )}

              {selectedOrder.status_history && selectedOrder.status_history.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Últimos cambios:</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {selectedOrder.status_history.slice(-3).map((change, idx) => (
                      <div key={idx} className="text-xs text-gray-600">
                        <span className="text-gray-400">{new Date(change.date).toLocaleDateString()}:</span>
                        {change.from} → {change.to}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedOrder(null);
                  setNewStatus('');
                  setStatusNote('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isUpdating}
              >
                Cancelar
              </button>
              
              <button
                onClick={confirmStatusChange}
                disabled={!newStatus || newStatus === selectedOrder.status || isUpdating}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Actualizando...</span>
                  </>
                ) : (
                  <span>Confirmar cambio</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReparacionesActivas;