import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  User,
  Phone,
  Mail,
  Printer,
  CheckCircle,
  AlertCircle,
  Clock,
  Wrench,
  Edit,
  BarChart,
  MessageCircle,
  FileText,
  Percent,
  Layers,
  Package,
  AlertTriangle,
  X,
  Copy,
  Send,
  Share2,
  Euro,
  FileDown,
  Paperclip,
  Eye,
  Lock,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { generateReceptionPDF } from '../utils/pdfGenerator';
import TrabajosPorFamilia from '../components/orders/TrabajosPorFamilia';
import FallosPorFamilia from '../components/orders/FallosPorFamilia';
import TrazabilidadTimeline from '../components/orders/TrazabilidadTimeline';
import PhotoGallery from '../components/orders/PhotoGallery';
import { supabase } from '../lib/supabaseClient';

// Datos de la empresa
const EMPRESA = {
  nombre: 'LAM-RELOJEROS S.L',
  cif: 'B-88615489',
  telefono: '672373275',
  direccion: 'C/ Margarita de Parma Nº1',
  ciudad: '28050 Madrid'
};

const IVA_PORCENTAJE = 21;

function DetalleReparacion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, clients, updateOrder, generateBudgetLink } = useApp();
  
  const [order, setOrder] = useState(null);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('editar');
  
  const [trabajosSeleccionados, setTrabajosSeleccionados] = useState([]);
  const [fallosSeleccionados, setFallosSeleccionados] = useState([]);
  const [familiasTrabajos, setFamiliasTrabajos] = useState([]);
  
  const [diagnosis, setDiagnosis] = useState({
    observaciones: '',
    recomendaciones: '',
    tiempo_estimado: '',
    urgencia: 'normal'
  });
  
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [budgetDiscount, setBudgetDiscount] = useState(0);
  const [budgetDiscountType, setBudgetDiscountType] = useState('porcentaje');
  const [budgetNotes, setBudgetNotes] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [budgetLink, setBudgetLink] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  // 👇 NUEVO: Estado para presupuesto no realizable
  const [presupuestoNoRealizable, setPresupuestoNoRealizable] = useState(false);
  
  // 👇 NUEVO: Estado para notas internas
  const [internalNotes, setInternalNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  
  // 👇 NUEVO: Estado para cambio rápido en header
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Funciones memoizadas para evitar warnings de render
  const handleTrabajosChange = useCallback((nuevosTrabajos) => {
    setTrabajosSeleccionados(nuevosTrabajos);
  }, []);

  const handleFallosChange = useCallback((nuevosFallos) => {
    setFallosSeleccionados(nuevosFallos);
  }, []);

  const tabs = [
    { id: 'editar', label: 'EDITAR', icon: Edit },
    { id: 'fallos', label: 'FALLOS', icon: AlertTriangle },
    { id: 'trabajos', label: 'TRABAJOS', icon: Wrench },
    { id: 'productos', label: 'PRODUCTOS', icon: Package },
    { id: 'archivos', label: 'ARCHIVOS', icon: FileText },
    { id: 'trazabilidad', label: 'TRAZABILIDAD', icon: BarChart },
    { id: 'conversacion', label: 'CONVERSACIÓN', icon: MessageCircle }
  ];

  useEffect(() => {
    const cargarFamilias = async () => {
      const { data } = await supabase
        .from('familias_trabajos')
        .select('*')
        .order('orden');
      setFamiliasTrabajos(data || []);
    };
    cargarFamilias();
  }, []);

const isFirstLoad = useRef(true);

 useEffect(() => {
  if (orders.length > 0) {
    const foundOrder = orders.find(o => o.id === id);
    if (foundOrder) {
      setOrder(foundOrder);
      const foundClient = clients.find(c => c.id === foundOrder.client_id);
      setClient(foundClient);
      
      // ✅ SOLO cargar en la primera carga
      if (isFirstLoad.current) {
        if (foundOrder.trabajos) setTrabajosSeleccionados(foundOrder.trabajos);
        if (foundOrder.fallos) setFallosSeleccionados(foundOrder.fallos);
        if (foundOrder.diagnosis) setDiagnosis(foundOrder.diagnosis);
        if (foundOrder.internal_notes) setInternalNotes(foundOrder.internal_notes);
        isFirstLoad.current = false;
      }
    }
    setLoading(false);
  }
}, [id, orders, clients]);

  const getStatusColor = (status) => {
    const colors = {
      'Recibido': 'bg-gray-100 text-gray-700 border-gray-200',
      'En análisis': 'bg-gray-100 text-gray-700 border-gray-200',
      'Presupuestado': 'bg-gray-100 text-gray-700 border-gray-200',
      'Aceptado': 'bg-gray-100 text-gray-700 border-gray-200',
      'Rechazado': 'bg-gray-100 text-gray-700 border-gray-200',
      'pendiente_de_recoger': 'bg-amber-100 text-amber-700 border-amber-200',
      'En reparación': 'bg-gray-100 text-gray-700 border-gray-200',
      'Garantia': 'bg-purple-100 text-purple-700 border-purple-200', 
      'Listo': 'bg-gray-100 text-gray-700 border-gray-200',
      'Entregado': 'bg-green-100 text-green-700 border-green-200',
      'Archivado': 'bg-gray-100 text-gray-700 border-gray-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // Verificar si la orden está bloqueada para edición - AHORA INCLUYE PRESUPUESTADO
  const isLocked = order?.status === 'Aceptado' || 
                 order?.status === 'En reparación' || 
                 order?.status === 'Listo' || 
                 order?.status === 'Entregado' || 
                 order?.status === 'Archivado' ||
                 order?.status === 'Presupuestado';
  
  const canEdit = !isLocked;
  const isDelivered = order?.status === 'Entregado';
  const isArchived = order?.status === 'Archivado';
  const hasPendingBudget = order?.status === 'Presupuestado';

  const guardarDiagnostico = async () => {
    if (!canEdit) return;
    
    await updateOrder(order.id, { 
      diagnosis,
      trabajos: trabajosSeleccionados,
      fallos: fallosSeleccionados,
      status: 'En análisis',
      diagnosis_date: new Date().toISOString()
    });
    
    setSuccessMessage('Diagnóstico guardado correctamente');
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  // 👇 NUEVO: Guardar notas internas
  const guardarNotasInternas = async () => {
    setSavingNotes(true);
    try {
      await updateOrder(order.id, { internal_notes: internalNotes });
      setSuccessMessage('✅ Notas internas guardadas');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error guardando notas:', error);
      alert('Error al guardar notas internas');
    } finally {
      setSavingNotes(false);
    }
  };

  // 👇 NUEVO: Cambio rápido de estado desde el header
  const handleQuickStatusChange = async (nuevoEstado) => {
    if (!order || nuevoEstado === order.status) return;
    
    if (!window.confirm(`¿Cambiar estado de "${order.status === 'Listo' ? 'Terminado' : order.status}" a "${nuevoEstado === 'Listo' ? 'Terminado' : nuevoEstado}"?`)) return;
    
    setIsUpdatingStatus(true);
    try {
      const updates = { 
        status: nuevoEstado,
        status_history: [
          ...(order.status_history || []),
          {
            from: order.status,
            to: nuevoEstado,
            date: new Date().toISOString(),
            note: 'Cambio rápido desde el header',
            user: 'taller'
          }
        ]
      };
      
      if (nuevoEstado === 'Listo') {
        updates.completed_at = new Date().toISOString();
      }
      if (nuevoEstado === 'Entregado') {
        updates.delivered_at = new Date().toISOString();
        updates.paid = true;
      }
      if (nuevoEstado === 'En reparación') {
        updates.start_date = new Date().toISOString();
      }
      if (nuevoEstado === 'En análisis') {
        updates.diagnosis_date = new Date().toISOString();
      }
      if (nuevoEstado === 'Rechazado') {
        updates.budget_status = 'rechazado';
      }
      
      await updateOrder(order.id, updates);
      setSuccessMessage(`✅ Estado cambiado a: ${nuevoEstado === 'Listo' ? 'Terminado' : nuevoEstado}`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
      // Recargar la orden
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('Error al cambiar estado');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Calcular totales con IVA (modificado para presupuesto no realizable)
  const calcularTotales = () => {
    // Si es presupuesto no realizable, todo a 0
    if (presupuestoNoRealizable) {
      return {
        trabajos: 0,
        fallos: 0,
        subtotalConIVA: 0,
        descuento: 0,
        totalConIVA: 0,
        baseImponible: 0,
        iva: 0
      };
    }
    
    const trabajosTotal = trabajosSeleccionados.reduce((sum, t) => {
      return sum + (t.total || t.tarifa_aplicada * (t.cantidad || 1) || 0);
    }, 0);
    
    const fallosTotal = fallosSeleccionados.reduce((sum, f) => sum + (f.total || 0), 0);
    const subtotalConIVA = trabajosTotal + fallosTotal;
    
    let descuentoAplicado = 0;
    if (budgetDiscount > 0) {
      if (budgetDiscountType === 'porcentaje') {
        descuentoAplicado = subtotalConIVA * (budgetDiscount / 100);
      } else {
        descuentoAplicado = Math.min(budgetDiscount, subtotalConIVA);
      }
    }
    
    const totalConIVA = subtotalConIVA - descuentoAplicado;
    const baseImponible = totalConIVA / (1 + IVA_PORCENTAJE / 100);
    const iva = totalConIVA - baseImponible;
    
    return {
      trabajos: trabajosTotal,
      fallos: fallosTotal,
      subtotalConIVA,
      descuento: descuentoAplicado,
      totalConIVA,
      baseImponible,
      iva
    };
  };

  const totales = calcularTotales();

  const guardarPresupuesto = async () => {
  if (!canEdit) return;
  
  // ✅ Calcular SOLO los trabajos OBLIGATORIOS para el presupuesto base
  const trabajosObligatorios = trabajosSeleccionados.filter(t => !t.opcional);
  const totalObligatorios = trabajosObligatorios.reduce((sum, t) => sum + (t.total || 0), 0);
  
  // Calcular descuento sobre obligatorios
  let descuentoAplicado = 0;
  if (budgetDiscount > 0 && !presupuestoNoRealizable) {
    if (budgetDiscountType === 'porcentaje') {
      descuentoAplicado = totalObligatorios * (budgetDiscount / 100);
    } else {
      descuentoAplicado = Math.min(budgetDiscount, totalObligatorios);
    }
  }
  
  const totalConDescuento = presupuestoNoRealizable ? 0 : (totalObligatorios - descuentoAplicado);
  
  // Determinar estado final
  const statusFinal = presupuestoNoRealizable ? 'Rechazado' : 'Presupuestado';
  const budgetStatusFinal = presupuestoNoRealizable ? 'rechazado' : 'pendiente';
  
  try {
    await updateOrder(order.id, {
      trabajos: trabajosSeleccionados,  // Guardamos todos (para que el cliente vea opcionales)
      fallos: fallosSeleccionados,
      budget: totalConDescuento,
      budget_discount: descuentoAplicado,
      budget_notes: budgetNotes,
      budget_status: budgetStatusFinal,
      status: statusFinal,
      budget_date: new Date().toISOString()
    });
    
    setShowBudgetModal(false);
    setPresupuestoNoRealizable(false); // Resetear checkbox
    setSuccessMessage(presupuestoNoRealizable ? '✅ Presupuesto no realizable marcado' : '✅ Presupuesto generado correctamente');
    setShowSuccessMessage(true);
    
    setTimeout(() => {
      navigate(`/presupuesto/taller/${order.id}`);
    }, 1500);
    
  } catch (error) {
    console.error('Error guardando presupuesto:', error);
    alert('Error al guardar el presupuesto: ' + error.message);
  }
};

  const handlePreviewBudget = () => {
    setShowBudgetModal(false);
    setShowPreviewModal(true);
  };

  const generatePDF = (type) => {
    if (order && client) {
      generateReceptionPDF(order, client, type);
    }
  };

  const handleViewBudget = () => {
    navigate(`/presupuesto/taller/${order.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando reparación...</p>
        </div>
      </div>
    );
  }

  if (!order || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Reparación no encontrada</h2>
          <p className="text-gray-500 mb-6">La reparación que buscas no existe o ha sido eliminada.</p>
          <button onClick={() => navigate('/reparaciones-activas')} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700">
            Volver a reparaciones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Mensaje de éxito flotante */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slide-down">
          <div className="bg-green-500 text-white px-6 py-4 rounded-xl shadow-lg flex items-center space-x-3">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Header superior */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto">
          {/* Primera línea: Estado y navegación */}
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/reparaciones-activas')}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">Home / Reparaciones /</span>
                <span className="font-bold text-gray-800 bg-gray-100 px-3 py-1 rounded-lg">
                  REPARACIÓN - {order.order_number}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                  {order.status === 'Listo' ? 'Terminado' : order.status}
                </span>
                
                {/* 👇 NUEVO: Selector de cambio de estado rápido */}
                {!isLocked && order?.status !== 'Entregado' && order?.status !== 'Archivado' && (
                  <select
                    value={order.status}
                    onChange={(e) => handleQuickStatusChange(e.target.value)}
                    className="text-xs px-2 py-1.5 rounded-lg border border-gray-300 bg-white focus:ring-2 focus:ring-gray-500"
                    disabled={isUpdatingStatus}
                  >
                    <option value="Recibido">📦 Recibido</option>
                    <option value="En análisis">🔍 En análisis</option>
                    <option value="Presupuestado">💰 Presupuestado</option>
                    <option value="Aceptado">✅ Aceptado</option>
                    <option value="En reparación">🔧 En reparación</option>
                    <option value="Garantia">🛡️ Garantía</option>
                    <option value="pendiente_de_recoger">📦 Pendiente de recoger</option>
                    <option value="Listo">✅ Terminado</option>
                    <option value="Rechazado">❌ Rechazado</option>
                  </select>
                )}
              </div>
              
              {/* Botón Ver Presupuesto - aparece si hay presupuesto generado */}
              {order.budget > 0 && order.budget_status === 'pendiente' && (
                <button
                  onClick={handleViewBudget}
                  className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors flex items-center space-x-1"
                  title="Ver presupuesto enviado al cliente"
                >
                  <FileText className="w-3 h-3" />
                  <span>Ver presupuesto</span>
                </button>
              )}

              {/* Botón Desbloquear - SOLO PARA ESTADO PRESUPUESTADO */}
              {order?.status === 'Presupuestado' && (
                <button
                  onClick={async () => {
                    if (window.confirm('⚠️ ¿DESBLOQUEAR PRESUPUESTO?\n\n' +
                      'Esta acción permitirá modificar los trabajos y generar un nuevo presupuesto.\n\n' +
                      'El estado volverá a "En análisis" y podrás editar libremente.\n\n' +
                      '¿Estás seguro?')) {
                      try {
                        await updateOrder(order.id, { 
                          status: 'En análisis',
                          budget_status: 'pendiente'
                        });
                        setSuccessMessage('✅ Presupuesto desbloqueado. Ahora puedes corregir los trabajos.');
                        setShowSuccessMessage(true);
                        setTimeout(() => window.location.reload(), 1500);
                      } catch (error) {
                        console.error('Error al desbloquear:', error);
                        alert('Error al desbloquear: ' + error.message);
                      }
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors flex items-center space-x-1"
                >
                  <Lock className="w-3 h-3" />
                  <span>Desbloquear presupuesto</span>
                </button>
              )}
            </div>
          </div>

          {/* Tercera línea: Info rápida con icono para ver motivo */}
          <div className="px-6 py-3 flex items-center justify-between bg-gray-50">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-800">{client.name}</p>
                    <button
                      onClick={() => setShowInfoModal(true)}
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="Ver motivo de entrada"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="h-8 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-4 h-4 mr-1 text-gray-400" />
                  {client.phone}
                </div>
                {client.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-1 text-gray-400" />
                    {client.email}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                <Clock className="w-4 h-4 inline mr-1" />
                {new Date(order.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mensaje de bloqueo según estado */}
      {isLocked && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div className={`border-l-4 p-4 rounded-lg ${
            isDelivered ? 'bg-green-50 border-green-400' : 
            isArchived ? 'bg-gray-50 border-gray-400' : 
            order?.status === 'Aceptado' ? 'bg-blue-50 border-blue-400' :
            order?.status === 'En reparación' ? 'bg-purple-50 border-purple-400' :
            order?.status === 'Listo' ? 'bg-teal-50 border-teal-400' :
            order?.status === 'Presupuestado' ? 'bg-amber-50 border-amber-400' :
            'bg-yellow-50 border-yellow-400'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center">
                <Lock className={`w-5 h-5 mr-3 flex-shrink-0 ${
                  isDelivered ? 'text-green-600' : 
                  isArchived ? 'text-gray-600' : 
                  order?.status === 'Aceptado' ? 'text-blue-600' :
                  order?.status === 'En reparación' ? 'text-purple-600' :
                  order?.status === 'Listo' ? 'text-teal-600' :
                  order?.status === 'Presupuestado' ? 'text-amber-600' :
                  'text-yellow-600'
                }`} />
                <p className={`text-sm ${
                  isDelivered ? 'text-green-700' : 
                  isArchived ? 'text-gray-700' : 
                  order?.status === 'Aceptado' ? 'text-blue-700' :
                  order?.status === 'En reparación' ? 'text-purple-700' :
                  order?.status === 'Listo' ? 'text-teal-700' :
                  order?.status === 'Presupuestado' ? 'text-amber-700' :
                  'text-yellow-700'
                }`}>
                  {order?.status === 'Presupuestado' && 'Este presupuesto está bloqueado para evitar modificaciones accidentales. Si necesitas corregirlo, haz clic en "Desbloquear presupuesto".'}
                  {order?.status === 'Aceptado' && 'El cliente ya aceptó el presupuesto. Para añadir más trabajos, debes desbloquear la reparación.'}
                  {order?.status === 'En reparación' && 'La reparación está en curso. Si necesitas añadir trabajos adicionales, desbloquéala.'}
                  {order?.status === 'Listo' && 'La reparación está terminada y esperando recogida. Si necesitas hacer cambios, desbloquéala.'}
                  {isDelivered && 'Esta reparación ya ha sido entregada. Solo se puede visualizar, no modificar.'}
                  {isArchived && 'Esta reparación está archivada. Solo se puede visualizar, no modificar.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Pestañas principales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-200 bg-gray-50/50">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-all
                    ${isActive 
                      ? 'border-b-2 border-gray-900 text-gray-900 bg-white' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-gray-900' : 'text-gray-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
            
            {hasPendingBudget && (
              <button
                onClick={handleViewBudget}
                className="flex items-center space-x-2 px-5 py-4 text-sm font-medium text-gray-900 border-b-2 border-gray-900 hover:bg-gray-50 transition-all ml-auto"
              >
                <Eye className="w-4 h-4" />
                <span>VER PRESUPUESTO</span>
              </button>
            )}
          </div>

          <div className="p-6">
            {/* PESTAÑA TRABAJOS */}
            {activeTab === 'trabajos' && (
              <div className="space-y-6">
                <TrabajosPorFamilia 
                  ordenId={order.id}
                  onTrabajosChange={handleTrabajosChange}
                  trabajosIniciales={trabajosSeleccionados}
                  readOnly={isLocked}
                />
                
                {/* Botones de acción - solo si se puede editar */}
                {!isLocked && (
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={guardarDiagnostico}
                      className="px-6 py-2.5 bg-white border-2 border-gray-800 text-gray-800 rounded-lg hover:bg-gray-50 flex items-center space-x-2 transition-colors font-medium"
                    >
                      <Save className="w-4 h-4" />
                      <span>Guardar diagnóstico</span>
                    </button>
                    
                    {(trabajosSeleccionados.length > 0 || fallosSeleccionados.length > 0) && (
                      <button
                        onClick={() => setShowBudgetModal(true)}
                        className="px-6 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2 transition-all shadow-md hover:shadow-lg font-medium"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Generar presupuesto</span>
                      </button>
                    )}
                  </div>
                )}

                {hasPendingBudget && (
                  <div className="flex justify-end">
                    <button
                      onClick={handleViewBudget}
                      className="px-6 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2 transition-all shadow-md hover:shadow-lg font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Ver presupuesto</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA FALLOS */}
            {activeTab === 'fallos' && (
              <div className="space-y-6">
                <FallosPorFamilia 
                  ordenId={order.id}
                  onFallosChange={handleFallosChange}
                  fallosIniciales={fallosSeleccionados}
                  readOnly={isLocked}
                />
                
                {!isLocked && (
                  <div className="flex justify-end">
                    <button
                      onClick={guardarDiagnostico}
                      className="px-6 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Guardar fallos</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA EDITAR - MEJORADA */}
            {activeTab === 'editar' && (
              <div className="space-y-6">
                {/* Tarjeta de información de la reparación */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="font-medium text-gray-800 flex items-center">
                      <Info className="w-4 h-4 mr-2 text-gray-500" />
                      Información de la reparación
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Nº de orden</p>
                        <p className="font-mono text-sm font-medium text-gray-800">{order.order_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Fecha de entrada</p>
                        <p className="text-sm text-gray-700">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Estado actual</p>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status === 'Listo' ? 'Terminado' : order.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Cliente</p>
                        <p className="text-sm font-medium text-gray-800">{client.name}</p>
                        <p className="text-xs text-gray-500">{client.phone}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tarjeta de la joya */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="font-medium text-gray-800 flex items-center">
                      <Package className="w-4 h-4 mr-2 text-gray-500" />
                      Datos de la joya
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500">Tipo de joya</p>
                        <p className="text-sm font-medium text-gray-800">{order.item_type || 'No especificado'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Material</p>
                        <p className="text-sm font-medium text-gray-800">{order.material || 'No especificado'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Descripción del problema</p>
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg mt-1">{order.description || 'No especificado'}</p>
                    </div>
                    {order.observations && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500">Observaciones adicionales</p>
                        <p className="text-sm text-gray-600 italic mt-1">📝 {order.observations}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tarjeta de trabajos realizados (resumen) */}
                {trabajosSeleccionados.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-medium text-gray-800 flex items-center">
                        <Wrench className="w-4 h-4 mr-2 text-gray-500" />
                        Trabajos realizados
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="space-y-2">
                        {trabajosSeleccionados.map((trabajo, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2">
                            <span className="text-gray-700">{trabajo.nombre}</span>
                            <span className="font-medium text-gray-800">{trabajo.total?.toFixed(2)}€</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center text-sm font-bold pt-2">
                          <span>Total trabajos</span>
                          <span className="text-gray-900">{trabajosSeleccionados.reduce((sum, t) => sum + (t.total || 0), 0).toFixed(2)}€</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tarjeta de fallos detectados (resumen) */}
                {fallosSeleccionados.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-medium text-gray-800 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2 text-gray-500" />
                        Fallos detectados
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {fallosSeleccionados.map((fallo, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded-full">
                            {fallo.nombre}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Campo de observaciones del diagnóstico */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="font-medium text-gray-800 flex items-center">
                      <FileText className="w-4 h-4 mr-2 text-gray-500" />
                      Observaciones del diagnóstico
                    </h3>
                  </div>
                  <div className="p-4">
                    <textarea
                      value={diagnosis.observaciones}
                      onChange={(e) => setDiagnosis({...diagnosis, observaciones: e.target.value})}
                      rows="5"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      placeholder="Añade observaciones sobre la reparación, notas internas, etc..."
                      disabled={isLocked}
                    />
                  </div>
                </div>

                {/* 👇 NUEVO: Notas internas (siempre editable) */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="font-medium text-gray-800 flex items-center">
                      <Lock className="w-4 h-4 mr-2 text-gray-500" />
                      Notas internas (solo taller)
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">El cliente NO ve estas notas</p>
                  </div>
                  <div className="p-4">
                    <textarea
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                      placeholder="Notas internas para el taller (seguimiento, incidencias, recordatorios)..."
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={guardarNotasInternas}
                        disabled={savingNotes}
                        className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                      >
                        {savingNotes ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span>Guardar notas</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Botón guardar diagnóstico */}
                {!isLocked && (
                  <div className="flex justify-end">
                    <button
                      onClick={guardarDiagnostico}
                      className="px-6 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Guardar diagnóstico</span>
                    </button>
                  </div>
                )}

                {/* Mensaje de solo lectura */}
                {isLocked && (
                  <div className="bg-gray-50 rounded-lg p-4 text-center border border-gray-200">
                    <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      {order?.status === 'Presupuestado' 
                        ? 'Este presupuesto está bloqueado. Si necesitas corregirlo, haz clic en "Desbloquear presupuesto" arriba.'
                        : isDelivered 
                          ? 'Esta reparación ya ha sido entregada. Solo se puede visualizar.'
                          : isArchived 
                            ? 'Esta reparación está archivada. Solo se puede visualizar.'
                            : 'Esta reparación está bloqueada. Solo se puede visualizar.'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PESTAÑA TRAZABILIDAD */}
            {activeTab === 'trazabilidad' && (
              <TrazabilidadTimeline orden={order} />
            )}

            {/* PESTAÑA PRODUCTOS */}
            {activeTab === 'productos' && (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Módulo de productos</p>
                <p className="text-sm text-gray-400">Próximamente</p>
              </div>
            )}

            {/* PESTAÑA ARCHIVOS - CON GALERÍA DE FOTOS */}
            {activeTab === 'archivos' && (
              <PhotoGallery 
                orderId={order.id}
                existingPhotos={order.photos || []}
                onPhotosChange={async (newPhotos) => {
                  await updateOrder(order.id, { photos: newPhotos });
                  setOrder({ ...order, photos: newPhotos });
                }}
                readOnly={isLocked}
              />
            )}

            {/* PESTAÑA CONVERSACIÓN */}
            {activeTab === 'conversacion' && (
              <div className="text-center py-16">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">Historial de conversación</p>
                <p className="text-sm text-gray-400">Próximamente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE PRESUPUESTO */}
      {showBudgetModal && !isLocked && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-up">
            <div className="bg-gray-50 p-6 rounded-t-2xl border-b border-gray-200 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Generar presupuesto</h3>
                    <p className="text-sm text-gray-500">Revisa los detalles antes de continuar</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBudgetModal(false)} 
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* SECCIÓN: Motivo de entrada */}
              <div className="bg-amber-50 rounded-xl p-4 border-l-4 border-amber-500">
                <h4 className="font-semibold text-amber-800 text-sm mb-3 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  MOTIVO DE ENTRADA
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-amber-700 text-xs">Tipo de joya</span>
                      <p className="font-medium text-gray-800">{order.item_type || 'No especificado'}</p>
                    </div>
                    <div>
                      <span className="text-amber-700 text-xs">Material</span>
                      <p className="font-medium text-gray-800">{order.material || 'No especificado'}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-amber-700 text-xs">Descripción del problema</span>
                    <p className="text-gray-700 bg-white p-2 rounded-lg mt-1 border border-amber-200">
                      {order.description || 'No especificado'}
                    </p>
                  </div>
                  {order.observations && (
                    <div>
                      <span className="text-amber-700 text-xs">Observaciones adicionales</span>
                      <p className="text-gray-600 text-sm mt-1 italic">📝 {order.observations}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Resumen de trabajos - CON INDICADOR DE OPCIONALES */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700 text-sm flex items-center">
                    <Wrench className="w-4 h-4 mr-1" />
                    Trabajos seleccionados
                  </h4>
                  <span className="text-xs text-gray-500">
                    {trabajosSeleccionados.length} ítems
                    {trabajosSeleccionados.some(t => t.opcional === true) && (
                      <span className="ml-2 text-amber-600">(incluye opcionales)</span>
                    )}
                  </span>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {trabajosSeleccionados.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">No hay trabajos seleccionados</p>
                  ) : (
                    trabajosSeleccionados.slice(0, 6).map((t, i) => {
                      const esOpcional = t.opcional === true;
                      return (
                        <div key={i} className={`flex justify-between text-sm ${esOpcional ? 'bg-amber-50 -mx-2 px-2 py-1 rounded' : ''}`}>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">{t.nombre}</span>
                            {esOpcional && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                                Opcional
                              </span>
                            )}
                          </div>
                          <span className={`font-medium ${esOpcional ? 'text-amber-700' : 'text-gray-800'}`}>
                            {(t.total || t.tarifa_aplicada || 0).toFixed(2)}€
                          </span>
                        </div>
                      );
                    })
                  )}
                  {trabajosSeleccionados.length > 6 && (
                    <p className="text-xs text-gray-400 text-center pt-1">
                      + {trabajosSeleccionados.length - 6} trabajos más
                    </p>
                  )}
                </div>
                {trabajosSeleccionados.some(t => t.opcional === true) && (
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                      Los trabajos marcados como "Opcional" podrán ser elegidos por el cliente al aceptar el presupuesto.
                    </p>
                  </div>
                )}
              </div>

              {/* 👇 NUEVO: Checkbox para presupuesto no realizable */}
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="presupuestoNoRealizable"
                    checked={presupuestoNoRealizable}
                    onChange={(e) => setPresupuestoNoRealizable(e.target.checked)}
                    className="w-5 h-5 rounded border-red-300 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="presupuestoNoRealizable" className="text-sm text-red-700 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    ⚠️ Presupuesto no realizable (0€)
                  </label>
                </div>
                <p className="text-xs text-red-600 mt-2 ml-8">
                  Marca esta opción si no se puede realizar el trabajo. El presupuesto se enviará con importe 0€ y se marcará automáticamente como "Rechazado".
                </p>
              </div>

              {/* Cálculo con IVA */}
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Subtotal (IVA incluido)</span>
                  <span className="font-medium">{totales.subtotalConIVA.toFixed(2)}€</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-600">Descuento</span>
                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => setBudgetDiscountType('porcentaje')}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          budgetDiscountType === 'porcentaje' 
                            ? 'bg-white shadow-sm text-gray-900' 
                            : 'text-gray-500'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setBudgetDiscountType('euros')}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          budgetDiscountType === 'euros' 
                            ? 'bg-white shadow-sm text-gray-900' 
                            : 'text-gray-500'
                        }`}
                      >
                        €
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={budgetDiscount}
                      onChange={(e) => setBudgetDiscount(parseFloat(e.target.value) || 0)}
                      className="w-20 text-right px-2 py-1 border border-gray-200 rounded-lg focus:ring-1 focus:ring-gray-500 text-sm"
                      placeholder="0"
                      min="0"
                      max={budgetDiscountType === 'porcentaje' ? "100" : totales.subtotalConIVA}
                      disabled={presupuestoNoRealizable}
                    />
                    {budgetDiscountType === 'porcentaje' && <span className="text-sm text-gray-500">%</span>}
                  </div>
                </div>
                
                {totales.descuento > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Descuento aplicado</span>
                    <span>- {totales.descuento.toFixed(2)}€</span>
                  </div>
                )}
                
                <div className="border-t border-gray-200 my-2 pt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base imponible</span>
                    <span>{totales.baseImponible.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-gray-600 mt-1">
                    <span>IVA ({IVA_PORCENTAJE}%)</span>
                    <span>{totales.iva.toFixed(2)}€</span>
                  </div>
                </div>
                
                <div className="bg-gray-100 p-4 rounded-xl border border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-lg">TOTAL (IVA incluido)</span>
                    <span className={`text-2xl font-bold ${presupuestoNoRealizable ? 'text-red-600' : 'text-gray-900'}`}>
                      {totales.totalConIVA.toFixed(2)}€
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas para el cliente
                </label>
                <textarea
                  value={budgetNotes}
                  onChange={(e) => setBudgetNotes(e.target.value)}
                  rows="2"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
                  placeholder="Añade información adicional para el cliente (plazo de entrega, condiciones, etc.)..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50 rounded-b-2xl sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => {
                  setShowBudgetModal(false);
                  setPresupuestoNoRealizable(false);
                }}
                className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handlePreviewBudget}
                className="px-5 py-2.5 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>Vista previa</span>
              </button>
              <button
                type="button"
                onClick={guardarPresupuesto}
                disabled={totales.subtotalConIVA <= 0 && !presupuestoNoRealizable}
                className={`px-5 py-2.5 rounded-xl text-white font-medium transition-all flex items-center space-x-2 ${
                  (totales.subtotalConIVA > 0 || presupuestoNoRealizable) 
                    ? 'bg-gray-800 hover:bg-gray-700 shadow-md hover:shadow-lg' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>{presupuestoNoRealizable ? 'Marcar como no realizable' : 'Generar presupuesto'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISTA PREVIA */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-up">
            <div className="sticky top-0 bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Vista previa del presupuesto</h3>
              <button 
                onClick={() => setShowPreviewModal(false)} 
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">PRESUPUESTO</h2>
                  <p className="text-sm text-gray-500">Nº {order.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Fecha</p>
                  <p className="font-medium">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">TALLER</h3>
                  <div className="text-sm text-gray-600">
                    <p>{EMPRESA.nombre}</p>
                    <p>{EMPRESA.direccion}</p>
                    <p>{EMPRESA.ciudad}</p>
                    <p>CIF: {EMPRESA.cif}</p>
                    <p>Tel: {EMPRESA.telefono}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">CLIENTE</h3>
                  <div className="text-sm text-gray-600">
                    <p>{client.name}</p>
                    <p>Tel: {client.phone}</p>
                    {client.email && <p>Email: {client.email}</p>}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-700 mb-2">JOYA A REPARAR</h3>
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <p><strong>Tipo:</strong> {order.item_type}</p>
                  <p><strong>Material:</strong> {order.material}</p>
                  <p><strong>Descripción:</strong> {order.description}</p>
                </div>
              </div>
              
              {fallosSeleccionados.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">FALLOS DETECTADOS</h3>
                  <div className="space-y-2">
                    {fallosSeleccionados.map((f, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg text-sm">
                        <span className="font-medium">{f.nombre}</span>
                        {f.observaciones && (
                          <p className="text-xs text-gray-500 mt-1">📝 {f.observaciones}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {trabajosSeleccionados.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">TRABAJOS A REALIZAR</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Trabajo</th>
                          <th className="px-3 py-2 text-center">Cant.</th>
                          <th className="px-3 py-2 text-right">Precio</th>
                          <th className="px-3 py-2 text-right">Dto.</th>
                          <th className="px-3 py-2 text-right">Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trabajosSeleccionados.map((t, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-3 py-2">{t.nombre}</td>
                            <td className="px-3 py-2 text-center">{t.cantidad || 1}</td>
                            <td className="px-3 py-2 text-right">{t.tarifa_aplicada?.toFixed(2)}€</td>
                            <td className="px-3 py-2 text-center">{t.descuento || 0}%</td>
                                                        <td className="px-3 py-2 text-right font-medium">{(t.total || 0).toFixed(2)}€</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {budgetNotes && (
                <div className="bg-yellow-50 p-3 rounded-lg text-sm">
                  <strong>NOTAS:</strong> {budgetNotes}
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 w-64">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{totales.subtotalConIVA.toFixed(2)}€</span>
                      </div>
                      {totales.descuento > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Descuento:</span>
                          <span>-{totales.descuento.toFixed(2)}€</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Base imponible:</span>
                        <span>{totales.baseImponible.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between">
                        <span>IVA ({IVA_PORCENTAJE}%):</span>
                        <span>{totales.iva.toFixed(2)}€</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-bold">
                          <span>TOTAL:</span>
                          <span className={presupuestoNoRealizable ? 'text-red-600' : 'text-green-600'}>
                            {totales.totalConIVA.toFixed(2)}€
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 p-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setShowBudgetModal(true);
                }}
                className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Editar presupuesto
              </button>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  guardarPresupuesto();
                }}
                className="px-5 py-2.5 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>{presupuestoNoRealizable ? 'Marcar como no realizable' : 'Generar presupuesto'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INFORMACIÓN DE LA JOYA */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-scale-up">
            <div className="bg-gray-50 p-4 rounded-t-2xl border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 flex items-center">
                <Package className="w-5 h-5 mr-2 text-gray-600" />
                Motivo de entrada
              </h3>
              <button 
                onClick={() => setShowInfoModal(false)} 
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 rounded-lg p-4 border-l-4 border-amber-500">
                <h4 className="font-semibold text-amber-800 text-sm mb-3">
                  Información de la reparación
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-amber-700 text-xs font-medium">Nº de orden</span>
                    <p className="font-mono text-gray-800">{order.order_number}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-amber-700 text-xs font-medium">Tipo de joya</span>
                      <p className="text-gray-800">{order.item_type || 'No especificado'}</p>
                    </div>
                    <div>
                      <span className="text-amber-700 text-xs font-medium">Material</span>
                      <p className="text-gray-800">{order.material || 'No especificado'}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-amber-700 text-xs font-medium">Descripción del problema</span>
                    <p className="text-gray-700 bg-white p-2 rounded-lg mt-1 border border-amber-200">
                      {order.description || 'No especificado'}
                    </p>
                  </div>
                  {order.observations && (
                    <div>
                      <span className="text-amber-700 text-xs font-medium">Observaciones</span>
                      <p className="text-gray-600 italic mt-1">📝 {order.observations}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-600">
                  Esta información te ayudará a elaborar el presupuesto correctamente.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-5 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ENLACE */}
      {showLinkModal && budgetLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <Share2 className="w-5 h-5 mr-2 text-gray-600" />
                Compartir presupuesto
              </h3>
              <button onClick={() => setShowLinkModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-700 mb-2 font-medium">🔗 Enlace único:</p>
                <div className="bg-white p-3 rounded-lg border border-gray-200 text-sm break-all font-mono">
                  {budgetLink.url}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(budgetLink.url);
                    setCopySuccess('¡Copiado!');
                    setTimeout(() => setCopySuccess(''), 2000);
                  }}
                  className="py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center space-x-2"
                >
                  {copySuccess ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copySuccess || 'Copiar'}</span>
                </button>

                <a
                  href={`https://wa.me/${client?.phone?.replace(/\s+/g, '')}?text=${encodeURIComponent(
                    `Buenos días, el taller de relojería de El Corte Inglés de Sanchinarro le adjunta el presupuesto solicitado de su ${order.item_type || 'joya'}.\n\nPulse el siguiente enlace para acceder.\n\n${budgetLink.url}\n\nQuedamos a la espera de noticias suyas.\n\nUn saludo.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => generatePDF('cliente')} className="py-3 border-2 border-gray-300 rounded-lg flex items-center justify-center space-x-2">
                  <FileDown className="w-4 h-4" />
                  <span>PDF cliente</span>
                </button>
                <button onClick={() => generatePDF('taller')} className="py-3 border-2 border-gray-300 rounded-lg flex items-center justify-center space-x-2">
                  <FileDown className="w-4 h-4" />
                  <span>PDF taller</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DetalleReparacion;