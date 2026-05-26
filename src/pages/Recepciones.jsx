import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  Search,
  Calendar,
  User,
  Phone,
  Package,
  CheckCircle,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Truck,
  Clock,
  FileText,
  X,
  Info,
  Send,
  Wrench
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../context/AppContext';

function Recepciones() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [recepciones, setRecepciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [updating, setUpdating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecepcion, setSelectedRecepcion] = useState(null);
  const [showEntregarTodasModal, setShowEntregarTodasModal] = useState(false);
  const [recepcionParaEntregar, setRecepcionParaEntregar] = useState(null);
  
  // 👇 NUEVO: Modal para entrega individual
  const [showEntregarOrdenModal, setShowEntregarOrdenModal] = useState(false);
  const [ordenParaEntregar, setOrdenParaEntregar] = useState(null);
  const [recepcionNumberParaEntrega, setRecepcionNumberParaEntrega] = useState('');
  
  // 👇 Modal para gestión de estados múltiple
  const [showEstadoMultipleModal, setShowEstadoMultipleModal] = useState(false);
  const [recepcionParaEstado, setRecepcionParaEstado] = useState(null);
  const [nuevoEstadoMultiple, setNuevoEstadoMultiple] = useState('');
  const [enviarWhatsApp, setEnviarWhatsApp] = useState(true);
  
  const itemsPerPage = 10;

  // Opciones de estado disponibles
  const estadosOpciones = [
    { value: 'En reparación', label: '🔧 En reparación', color: 'bg-orange-100 text-orange-700', mensajeWhatsApp: 'Sus joyas han entrado en reparación.' },
    { value: 'Listo', label: '⏰ Listo para recoger', color: 'bg-teal-100 text-teal-700', mensajeWhatsApp: 'Sus joyas ya están TERMINADAS y listas para ser recogidas.' },
    { value: 'Entregado', label: '🏁 Entregado', color: 'bg-green-100 text-green-700', mensajeWhatsApp: 'Sus joyas ya han sido entregadas.' }
  ];

  useEffect(() => {
    cargarRecepciones();
  }, []);

  const cargarRecepciones = async () => {
    try {
      setLoading(true);
      
      const { data: recepcionesData, error: recepcionesError } = await supabase
        .from('recepciones')
        .select('*')
        .order('created_at', { ascending: false });

      if (recepcionesError) throw recepcionesError;

      if (!recepcionesData || recepcionesData.length === 0) {
        setRecepciones([]);
        return;
      }

      const recepcionIds = recepcionesData.map(r => r.id);

      const { data: todasOrdenes, error: ordenesError } = await supabase
        .from('ordenes')
        .select('*')
        .in('recepcion_id', recepcionIds);

      if (ordenesError) throw ordenesError;

      const clientIds = [...new Set(recepcionesData.map(r => r.client_id))];
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select('*')
        .in('id', clientIds);

      if (clientesError) throw clientesError;

      const ordenesPorRecepcion = {};
      todasOrdenes?.forEach(orden => {
        if (!ordenesPorRecepcion[orden.recepcion_id]) {
          ordenesPorRecepcion[orden.recepcion_id] = [];
        }
        ordenesPorRecepcion[orden.recepcion_id].push(orden);
      });

      const clientesMap = {};
      clientesData?.forEach(cliente => {
        clientesMap[cliente.id] = cliente;
      });

      const recepcionesActivas = recepcionesData
        .map(recepcion => {
          const ordenes = ordenesPorRecepcion[recepcion.id] || [];
          const cliente = clientesMap[recepcion.client_id];
          
          if (ordenes.length < 2) return null;
          
          const ordenesActivas = ordenes.filter(o => 
            o.status !== 'Entregado' && o.status !== 'Rechazado' && o.status !== 'Archivado'
          );
          
          if (ordenesActivas.length === 0) return null;
          
          return {
            ...recepcion,
            ordenesActivas: ordenesActivas || [],
            ordenesEntregadas: ordenes.filter(o => o.status === 'Entregado'),
            cliente: cliente || { name: 'Cliente no encontrado', phone: '' },
            ordenesActivasCount: ordenesActivas.length || 0,
            ordenesEntregadasCount: ordenes.filter(o => o.status === 'Entregado').length,
            totalOrdenes: ordenes.length || 0
          };
        })
        .filter(r => r !== null);

      setRecepciones(recepcionesActivas || []);
      
    } catch (error) {
      console.error('Error cargando recepciones:', error);
      setRecepciones([]);
    } finally {
      setLoading(false);
    }
  };

  const verDetalleOrden = (ordenId) => {
    if (ordenId) {
      navigate(`/reparacion/${ordenId}`);
    }
  };

  // 👇 NUEVO: Abrir modal de entrega individual
  const handleEntregarOrdenClick = (orden, recepcionNumber) => {
    setOrdenParaEntregar(orden);
    setRecepcionNumberParaEntrega(recepcionNumber);
    setShowEntregarOrdenModal(true);
    setModalOpen(false);
  };

  // 👇 NUEVO: Confirmar entrega individual
  const confirmarEntregarOrden = async () => {
    if (!ordenParaEntregar) return;
    
    setUpdating(true);
    
    try {
      const { error } = await supabase
        .from('ordenes')
        .update({ 
          status: 'Entregado',
          delivered_at: new Date().toISOString(),
          paid: true,
          status_history: [
            ...(ordenParaEntregar.status_history || []),
            {
              from: ordenParaEntregar.status,
              to: 'Entregado',
              date: new Date().toISOString(),
              note: `Entregado desde recepciones múltiples (resguardo ${recepcionNumberParaEntrega})`,
              user: user?.email || 'taller'
            }
          ]
        })
        .eq('id', ordenParaEntregar.id);

      if (error) throw error;

      setSuccessMessage(`✅ Orden ${ordenParaEntregar.order_number} entregada`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
      setShowEntregarOrdenModal(false);
      setOrdenParaEntregar(null);
      await cargarRecepciones();
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error al entregar la orden: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleEntregarTodas = (recepcion) => {
    setModalOpen(false);
    setSelectedRecepcion(null);
    setRecepcionParaEntregar(recepcion);
    setShowEntregarTodasModal(true);
  };

  const confirmarEntregarTodas = async () => {
    if (!recepcionParaEntregar) return;
    
    if (updating || !recepcionParaEntregar.ordenesActivas || recepcionParaEntregar.ordenesActivas.length === 0) {
      setShowEntregarTodasModal(false);
      setRecepcionParaEntregar(null);
      return;
    }

    setUpdating(true);
    
    try {
      const ordenesActivasIds = recepcionParaEntregar.ordenesActivas.map(o => o.id);
      
      const { error } = await supabase
        .from('ordenes')
        .update({ 
          status: 'Entregado',
          delivered_at: new Date().toISOString(),
          paid: true,
          status_history: [
            {
              from: 'Pendiente',
              to: 'Entregado',
              date: new Date().toISOString(),
              note: `Entrega múltiple desde resguardo ${recepcionParaEntregar.recepcion_number}`,
              user: user?.email || 'taller'
            }
          ]
        })
        .in('id', ordenesActivasIds);

      if (error) throw error;

      setSuccessMessage(`✅ Resguardo ${recepcionParaEntregar.recepcion_number} completado`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
      setShowEntregarTodasModal(false);
      setRecepcionParaEntregar(null);
      
      await cargarRecepciones();
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error al entregar el resguardo: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const cerrarModalEntregarTodas = () => {
    setShowEntregarTodasModal(false);
    setRecepcionParaEntregar(null);
  };

  const abrirModalEstadoMultiple = (recepcion) => {
    setRecepcionParaEstado(recepcion);
    setNuevoEstadoMultiple('');
    setEnviarWhatsApp(true);
    setShowEstadoMultipleModal(true);
  };

  const cambiarEstadoMultiple = async () => {
    if (!recepcionParaEstado || !nuevoEstadoMultiple) return;
    
    setUpdating(true);
    
    try {
      const ordenesActivasIds = recepcionParaEstado.ordenesActivas.map(o => o.id);
      const estadoSeleccionado = estadosOpciones.find(e => e.value === nuevoEstadoMultiple);
      
      const updates = {
        status: nuevoEstadoMultiple,
        status_history: [
          {
            from: 'Pendiente',
            to: nuevoEstadoMultiple,
            date: new Date().toISOString(),
            note: `Cambio masivo desde recepción ${recepcionParaEstado.recepcion_number}`,
            user: user?.email || 'taller'
          }
        ]
      };
      
      if (nuevoEstadoMultiple === 'Listo') {
        updates.completed_at = new Date().toISOString();
      }
      
      if (nuevoEstadoMultiple === 'Entregado') {
        updates.delivered_at = new Date().toISOString();
        updates.paid = true;
      }
      
      if (nuevoEstadoMultiple === 'En reparación') {
        updates.start_date = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('ordenes')
        .update(updates)
        .in('id', ordenesActivasIds);
      
      if (error) throw error;
      
      if (enviarWhatsApp && estadoSeleccionado?.mensajeWhatsApp) {
        const cliente = recepcionParaEstado.cliente;
        const joyasTexto = recepcionParaEstado.ordenesActivasCount === 1 
          ? 'su joya' 
          : `sus ${recepcionParaEstado.ordenesActivasCount} joyas`;
        
        const mensaje = `Estimado/a ${cliente?.name},\n\n${estadoSeleccionado.mensajeWhatsApp}\n\n📋 Resguardo: ${recepcionParaEstado.recepcion_number}\n\n${nuevoEstadoMultiple === 'Listo' ? '📋 IMPORTANTE: Presentar el resguardo para la recogida.\n\n' : ''}Un saludo.\n\nTaller de Relojería El Corte Inglés Sanchinarro`;
        
        const telefonoLimpio = cliente?.phone?.replace(/\s+/g, '').replace(/^\+/, '');
        if (telefonoLimpio) {
          const url = `https://web.whatsapp.com/send/?phone=${telefonoLimpio}&text=${encodeURIComponent(mensaje)}&app_absent=0`;
          window.open(url, '_blank');
        }
      }
      
      setSuccessMessage(`✅ ${recepcionParaEstado.ordenesActivasCount} órdenes cambiadas a "${nuevoEstadoMultiple}"`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
      setShowEstadoMultipleModal(false);
      setModalOpen(false);
      await cargarRecepciones();
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cambiar estados: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const abrirModal = (recepcion) => {
    setSelectedRecepcion(recepcion);
    setModalOpen(true);
  };

  const cerrarModalOrdenes = () => {
    setModalOpen(false);
    setSelectedRecepcion(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const recepcionesFiltradas = (recepciones || []).filter(recepcion => {
    if (!recepcion) return false;
    const matchesSearch = 
      recepcion.recepcion_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recepcion.cliente?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recepcion.cliente?.phone?.includes(searchTerm);
    
    return matchesSearch;
  });

  const totalPages = Math.ceil(recepcionesFiltradas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const recepcionesPaginadas = recepcionesFiltradas.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* MODAL DE ENTREGA INDIVIDUAL */}
      {showEntregarOrdenModal && ordenParaEntregar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-scale-up">
            <div className="bg-green-50 p-6 rounded-t-2xl border-b border-green-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Entregar joya</h3>
                  <p className="text-sm text-gray-600">Confirmación de entrega individual</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-sm text-gray-500">Resguardo</span>
                  <span className="font-mono font-bold text-gray-800">{recepcionNumberParaEntrega}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-sm text-gray-500">Orden</span>
                  <span className="font-mono font-bold text-gray-800">{ordenParaEntregar.order_number}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Joya</span>
                  <span className="font-medium text-gray-800">{ordenParaEntregar.item_type}</span>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-3 border-l-4 border-yellow-500">
                <p className="text-sm text-yellow-800">
                  ⚠️ Se entregará SOLO esta joya. El resguardo seguirá pendiente para las demás.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-700 flex items-start">
                  <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  Esta acción marcará la orden como <strong>Entregado</strong> y <strong>Pagado</strong>. No se podrá deshacer.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEntregarOrdenModal(false);
                  setOrdenParaEntregar(null);
                }}
                className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEntregarOrden}
                disabled={updating}
                className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center space-x-2 font-medium disabled:opacity-50"
              >
                {updating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Entregando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirmar entrega</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CAMBIO DE ESTADO MÚLTIPLE */}
      {showEstadoMultipleModal && recepcionParaEstado && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-scale-up">
            <div className="bg-blue-50 p-6 rounded-t-2xl border-b border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Layers className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Cambiar estado múltiple</h3>
                  <p className="text-sm text-gray-600">Resguardo: {recepcionParaEstado.recepcion_number}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-sm text-gray-500">Cliente</span>
                  <span className="font-medium">{recepcionParaEstado.cliente?.name}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm text-gray-500">Joyas a procesar</span>
                  <span className="text-lg font-bold text-blue-600">{recepcionParaEstado.ordenesActivasCount}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nuevo estado *
                </label>
                <select
                  value={nuevoEstadoMultiple}
                  onChange={(e) => setNuevoEstadoMultiple(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar estado...</option>
                  {estadosOpciones.map(estado => (
                    <option key={estado.value} value={estado.value}>
                      {estado.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="enviarWhatsApp"
                  checked={enviarWhatsApp}
                  onChange={(e) => setEnviarWhatsApp(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <label htmlFor="enviarWhatsApp" className="text-sm text-gray-700">
                  Enviar notificación por WhatsApp al cliente
                </label>
              </div>

              <div className="bg-amber-50 rounded-lg p-3 border-l-4 border-amber-500">
                <p className="text-sm text-amber-800">
                  ⚠️ Se aplicará el mismo estado a todas las joyas pendientes de este resguardo.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end space-x-3">
              <button
                onClick={() => setShowEstadoMultipleModal(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={cambiarEstadoMultiple}
                disabled={!nuevoEstadoMultiple || updating}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {updating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Aplicando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Aplicar a {recepcionParaEstado.ordenesActivasCount} joyas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA ENTREGAR TODAS */}
      {showEntregarTodasModal && recepcionParaEntregar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-scale-up">
            <div className="bg-green-50 p-6 rounded-t-2xl border-b border-green-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Entregar resguardo completo</h3>
                  <p className="text-sm text-gray-600">Confirmación de entrega múltiple</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-sm text-gray-500">Resguardo</span>
                  <span className="font-mono font-bold text-gray-800">{recepcionParaEntregar.recepcion_number}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                  <span className="text-sm text-gray-500">Cliente</span>
                  <span className="font-medium text-gray-800">{recepcionParaEntregar.cliente?.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Joyas pendientes</span>
                  <span className="text-lg font-bold text-orange-600">{recepcionParaEntregar.ordenesActivasCount}</span>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-3 border-l-4 border-yellow-500">
                <p className="text-sm text-yellow-800">
                  ⚠️ Se entregarán TODAS las joyas pendientes de este resguardo a la vez.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-700 flex items-start">
                  <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  Esta acción marcará todas las órdenes como <strong>Entregado</strong> y <strong>Pagado</strong>. No se podrá deshacer.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end space-x-3">
              <button
                onClick={cerrarModalEntregarTodas}
                className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEntregarTodas}
                disabled={updating}
                className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center space-x-2 font-medium disabled:opacity-50"
              >
                {updating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Entregando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirmar entrega</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ÓRDENES ASOCIADAS */}
      {modalOpen && selectedRecepcion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Órdenes del resguardo</h3>
                <p className="text-sm text-gray-500">{selectedRecepcion.recepcion_number}</p>
              </div>
              <button
                onClick={cerrarModalOrdenes}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{selectedRecepcion.cliente?.name}</p>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Phone className="w-3 h-3 mr-1" />
                      {selectedRecepcion.cliente?.phone || 'Sin teléfono'}
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {formatDate(selectedRecepcion.created_at)}
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Joyas pendientes en este resguardo:</p>
                <div className="grid grid-cols-1 gap-2">
                  {selectedRecepcion.ordenesActivas.map((orden) => (
                    <div
                      key={orden.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm font-bold text-gray-800">
                              {orden.order_number}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                              {orden.item_type || 'Joya'}
                            </span>
                            {orden.budget > 0 && orden.budget_status === 'pendiente' && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                Ppto pendiente
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {orden.material} · {orden.description?.substring(0, 80)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          <button
                            onClick={() => {
                              cerrarModalOrdenes();
                              verDetalleOrden(orden.id);
                            }}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {orden.budget > 0 && (
                            <button
                              onClick={() => {
                                cerrarModalOrdenes();
                                navigate(`/presupuesto/ver/${orden.id}`);
                              }}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"
                              title="Ver presupuesto"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              handleEntregarOrdenClick(orden, selectedRecepcion.recepcion_number);
                            }}
                            disabled={updating}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                            title="Entregar esta joya"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {selectedRecepcion.ordenesEntregadasCount > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">
                      Joyas ya entregadas: {selectedRecepcion.ordenesEntregadasCount}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedRecepcion.ordenesEntregadas?.map((orden) => (
                        <span
                          key={orden.id}
                          className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full"
                        >
                          {orden.order_number}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between">
              <button
                onClick={() => abrirModalEstadoMultiple(selectedRecepcion)}
                disabled={updating || selectedRecepcion.ordenesActivas.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Wrench className="w-4 h-4" />
                <span>Cambiar estado</span>
              </button>
              
              <button
                onClick={() => handleEntregarTodas(selectedRecepcion)}
                disabled={updating || selectedRecepcion.ordenesActivas.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Package className="w-4 h-4" />
                <span>Entregar todas</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de éxito */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slide-down">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <Layers className="w-6 h-6 mr-2 text-gray-800" />
            Recepciones Múltiples Activas
          </h1>
          <p className="text-sm text-gray-500">
            Resguardos con 2 o más joyas pendientes de entrega
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={cargarRecepciones} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={() => navigate('/nueva-recepcion')} className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center space-x-2">
            <Package className="w-4 h-4" />
            <span>Nueva recepción</span>
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por número de resguardo, cliente o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
          />
        </div>
      </div>

      {/* Lista de recepciones */}
      {recepcionesPaginadas.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No hay recepciones múltiples activas</h3>
          <p className="text-gray-500 mb-4">Las recepciones con 2 o más joyas pendientes aparecerán aquí</p>
          <button onClick={() => navigate('/nueva-recepcion')} className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
            <Package className="w-4 h-4 mr-2" />
            Crear nueva recepción
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {recepcionesPaginadas.map((recepcion) => (
            <div
              key={recepcion.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => abrirModal(recepcion)}
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Resguardo</p>
                    <p className="font-mono font-bold text-gray-900">{recepcion.recepcion_number}</p>
                  </div>
                  <div className="h-8 w-px bg-gray-200" />
                  <div>
                    <p className="text-xs text-gray-500">Cliente</p>
                    <p className="font-medium text-gray-800">{recepcion.cliente?.name}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Joyas pendientes</p>
                    <p className="text-xl font-bold text-orange-600">{recepcion.ordenesActivasCount}</p>
                  </div>
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl shadow-sm">
              <div className="text-sm text-gray-500">
                Mostrando {startIndex + 1} - {Math.min(endIndex, recepcionesFiltradas.length)} de {recepcionesFiltradas.length} recepciones
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Recepciones;