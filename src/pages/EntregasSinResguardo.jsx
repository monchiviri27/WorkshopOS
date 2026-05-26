import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileWarning,
  Search,
  Calendar,
  User,
  Phone,
  CreditCard,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Printer,
  Save
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../context/AppContext';

function EntregasSinResguardo() {
  const navigate = useNavigate();
  const { user, orders, clients, updateOrder } = useApp();
  const [entregas, setEntregas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEntrega, setSelectedEntrega] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showNuevaEntregaModal, setShowNuevaEntregaModal] = useState(false);
  
  // Estado para nueva entrega
  const [clientesDisponibles, setClientesDisponibles] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [ordenesDisponibles, setOrdenesDisponibles] = useState([]);
  const [searchClienteTerm, setSearchClienteTerm] = useState('');
  const [cargandoOrdenes, setCargandoOrdenes] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(false);
  
  // 👇 NUEVO: Estado para "Recoge otra persona"
  const [recogeOtraPersona, setRecogeOtraPersona] = useState(false);
  const [datosRecogedor, setDatosRecogedor] = useState({
    nombre: '',
    dni: ''
  });
  
  const [nuevaEntregaData, setNuevaEntregaData] = useState({
    order_id: '',
    cliente_dni: '',
    motivo: 'No presenta resguardo',
    autorizado_por: '',
    observaciones: ''
  });

  const itemsPerPage = 15;

  // Opciones de motivo
  const motivosOptions = [
    'No presenta resguardo',
    'Resguardo ilegible',
    'Resguardo perdido',
    'Cliente habitual - excepción',
    'Autorización de gerente',
    'Otro'
  ];

  useEffect(() => {
    cargarEntregas();
    cargarClientes();
  }, []);

  const cargarEntregas = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('entregas_sin_resguardo')
        .select('*')
        .order('entregado_en', { ascending: false });

      if (error) throw error;
      setEntregas(data || []);
    } catch (error) {
      console.error('Error cargando entregas:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarClientes = async () => {
    try {
      const { data } = await supabase
        .from('clientes')
        .select('id, name, phone')
        .eq('activo', true)
        .limit(100);
      setClientesDisponibles(data || []);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  const cargarOrdenesPendientes = async (clienteId) => {
    setCargandoOrdenes(true);
    try {
      const { data } = await supabase
        .from('ordenes')
        .select('id, order_number, item_type, material, status')
        .eq('client_id', clienteId)
        .not('status', 'in', '("Entregado","Archivado")');
      setOrdenesDisponibles(data || []);
    } catch (error) {
      console.error('Error cargando órdenes:', error);
    } finally {
      setCargandoOrdenes(false);
    }
  };

  const handleSubmitNuevaEntrega = async (e) => {
    e.preventDefault();
    
    if (!clienteSeleccionado) {
      setFormError('Debe seleccionar un cliente');
      return;
    }
    
    if (!nuevaEntregaData.order_id) {
      setFormError('Debe seleccionar una orden');
      return;
    }
    
    if (!nuevaEntregaData.cliente_dni || nuevaEntregaData.cliente_dni.trim() === '') {
      setFormError('El DNI es obligatorio para verificar la identidad');
      return;
    }
    
    // Validar datos del recogedor si aplica
    if (recogeOtraPersona) {
      if (!datosRecogedor.nombre.trim()) {
        setFormError('Debe ingresar el nombre de la persona que recoge');
        return;
      }
      if (!datosRecogedor.dni.trim()) {
        setFormError('Debe ingresar el DNI de la persona que recoge');
        return;
      }
    }
    
    setSubmitLoading(true);
    setFormError(null);
    
    try {
      const ordenSeleccionada = ordenesDisponibles.find(o => o.id === nuevaEntregaData.order_id);
      
      // Construir observaciones con los datos del recogedor si aplica
      let observacionesFinal = nuevaEntregaData.observaciones || '';
      if (recogeOtraPersona && datosRecogedor.nombre) {
        const infoRecogedor = `Recogido por: ${datosRecogedor.nombre} (DNI: ${datosRecogedor.dni})`;
        observacionesFinal = observacionesFinal 
          ? `${infoRecogedor} | ${observacionesFinal}`
          : infoRecogedor;
      }
      
      // 1. Registrar en entregas_sin_resguardo
      const { error: insertError } = await supabase
        .from('entregas_sin_resguardo')
        .insert([{
          order_id: nuevaEntregaData.order_id,
          cliente_nombre: clienteSeleccionado.name,
          cliente_telefono: clienteSeleccionado.phone,
          cliente_dni: nuevaEntregaData.cliente_dni,
          orden_numero: ordenSeleccionada?.order_number,
          motivo: nuevaEntregaData.motivo,
          autorizado_por: nuevaEntregaData.autorizado_por || null,
          observaciones: observacionesFinal,
          entregado_por: user?.email || 'taller',
          entregado_en: new Date().toISOString()
        }]);
      
      if (insertError) throw insertError;
      
      // 2. Actualizar la orden a Entregado
      await updateOrder(nuevaEntregaData.order_id, {
        status: 'Entregado',
        delivered_at: new Date().toISOString(),
        paid: true
      });
      
      setFormSuccess(true);
      
      // Resetear formulario
      setClienteSeleccionado(null);
      setOrdenesDisponibles([]);
      setSearchClienteTerm('');
      setRecogeOtraPersona(false);
      setDatosRecogedor({ nombre: '', dni: '' });
      setNuevaEntregaData({
        order_id: '',
        cliente_dni: '',
        motivo: 'No presenta resguardo',
        autorizado_por: '',
        observaciones: ''
      });
      
      // Recargar listas
      await cargarEntregas();
      
      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        setShowNuevaEntregaModal(false);
        setFormSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Error:', error);
      setFormError(error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Filtrar clientes por búsqueda
  const clientesFiltrados = clientesDisponibles.filter(c =>
    c.name.toLowerCase().includes(searchClienteTerm.toLowerCase()) ||
    c.phone.includes(searchClienteTerm)
  );

  // Filtrar entregas por búsqueda
  const entregasFiltradas = useMemo(() => {
    if (!searchTerm) return entregas;
    
    const term = searchTerm.toLowerCase();
    return entregas.filter(entrega => 
      entrega.cliente_nombre?.toLowerCase().includes(term) ||
      entrega.cliente_telefono?.includes(term) ||
      entrega.cliente_dni?.toLowerCase().includes(term) ||
      entrega.orden_numero?.toLowerCase().includes(term) ||
      entrega.motivo?.toLowerCase().includes(term) ||
      entrega.observaciones?.toLowerCase().includes(term)
    );
  }, [entregas, searchTerm]);

  // Paginación
  const totalPages = Math.ceil(entregasFiltradas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const entregasPaginadas = entregasFiltradas.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const verDetalle = (entrega) => {
    setSelectedEntrega(entrega);
    setShowModal(true);
  };

  const verOrden = (orderId) => {
    if (orderId) {
      navigate(`/reparacion/${orderId}`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modal de detalle */}
      {showModal && selectedEntrega && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-orange-50 p-6 rounded-t-2xl border-b border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <FileWarning className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Entrega sin resguardo</h3>
                    <p className="text-sm text-gray-600">Orden: {selectedEntrega.orden_numero}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Cliente</p>
                  <p className="font-medium text-gray-800">{selectedEntrega.cliente_nombre}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Teléfono</p>
                  <p className="font-medium text-gray-800">{selectedEntrega.cliente_telefono}</p>
                </div>
                {selectedEntrega.cliente_dni && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500">DNI</p>
                    <p className="font-medium text-gray-800">{selectedEntrega.cliente_dni}</p>
                  </div>
                )}
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Fecha de entrega</p>
                  <p className="font-medium text-gray-800">{formatDate(selectedEntrega.entregado_en)}</p>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                <p className="text-sm font-medium text-yellow-800">Motivo</p>
                <p className="text-sm text-yellow-700">{selectedEntrega.motivo}</p>
              </div>

              {selectedEntrega.autorizado_por && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium">Autorizado por</p>
                  <p className="text-sm text-blue-800">{selectedEntrega.autorizado_por}</p>
                </div>
              )}

              {/* Mostrar información de quien recogió si está en observaciones */}
              {selectedEntrega.observaciones && selectedEntrega.observaciones.includes('Recogido por:') && (
                <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-500">
                  <p className="text-xs text-green-600 font-medium">📋 Información de recogida</p>
                  <p className="text-sm text-green-800">{selectedEntrega.observaciones}</p>
                </div>
              )}

              {selectedEntrega.observaciones && !selectedEntrega.observaciones.includes('Recogido por:') && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Observaciones</p>
                  <p className="text-sm text-gray-700">{selectedEntrega.observaciones}</p>
                </div>
              )}

              {selectedEntrega.entregado_por && (
                <div className="text-xs text-gray-400 text-right pt-2">
                  Registrado por: {selectedEntrega.entregado_por}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  verOrden(selectedEntrega.order_id);
                }}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 flex items-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>Ver orden</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de nueva entrega sin resguardo */}
      {showNuevaEntregaModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-orange-50 p-6 rounded-t-2xl border-b border-orange-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileWarning className="w-6 h-6 text-orange-600" />
                  <h3 className="text-xl font-bold text-gray-800">Nueva entrega sin resguardo</h3>
                </div>
                <button 
                  onClick={() => {
                    setShowNuevaEntregaModal(false);
                    setFormError(null);
                    setFormSuccess(false);
                    setClienteSeleccionado(null);
                    setSearchClienteTerm('');
                    setRecogeOtraPersona(false);
                    setDatosRecogedor({ nombre: '', dni: '' });
                  }} 
                  className="p-2 hover:bg-gray-200 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {formSuccess && (
              <div className="m-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <p className="text-green-800">¡Entrega registrada correctamente!</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitNuevaEntrega} className="p-6 space-y-4">
              {/* Buscador de cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                <input
                  type="text"
                  placeholder="Buscar por nombre o teléfono..."
                  value={searchClienteTerm}
                  onChange={(e) => setSearchClienteTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
                {clientesFiltrados.length > 0 && searchClienteTerm && !clienteSeleccionado && (
                  <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
                    {clientesFiltrados.map(c => (
                      <div
                        key={c.id}
                        className="p-2 hover:bg-gray-50 cursor-pointer border-b"
                        onClick={() => {
                          setClienteSeleccionado(c);
                          setSearchClienteTerm('');
                          cargarOrdenesPendientes(c.id);
                        }}
                      >
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-gray-500">{c.phone}</p>
                      </div>
                    ))}
                  </div>
                )}
                {clienteSeleccionado && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-medium">{clienteSeleccionado.name}</p>
                      <p className="text-xs text-gray-500">{clienteSeleccionado.phone}</p>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        setClienteSeleccionado(null);
                        setOrdenesDisponibles([]);
                        setNuevaEntregaData({...nuevaEntregaData, order_id: ''});
                      }} 
                      className="text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Selector de orden */}
              {clienteSeleccionado && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Orden a entregar *</label>
                  {cargandoOrdenes ? (
                    <div className="text-center py-4 text-gray-500">Cargando órdenes...</div>
                  ) : ordenesDisponibles.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No hay órdenes pendientes para este cliente</div>
                  ) : (
                    <select
                      value={nuevaEntregaData.order_id}
                      onChange={(e) => setNuevaEntregaData({...nuevaEntregaData, order_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                      required
                    >
                      <option value="">Seleccionar orden</option>
                      {ordenesDisponibles.map(o => (
                        <option key={o.id} value={o.id}>
                          {o.order_number} - {o.item_type} ({o.status})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* DNI */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DNI del cliente *</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={nuevaEntregaData.cliente_dni}
                    onChange={(e) => setNuevaEntregaData({...nuevaEntregaData, cliente_dni: e.target.value})}
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="Ej: 12345678A"
                    required
                  />
                </div>
              </div>

              {/* 👇 NUEVO: Checkbox "Recoge otra persona" */}
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="recogeOtraPersona"
                  checked={recogeOtraPersona}
                  onChange={(e) => setRecogeOtraPersona(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="recogeOtraPersona" className="text-sm text-gray-700">
                  La persona que recoge NO es el titular
                </label>
              </div>

              {/* Datos de quien recoge (solo si checkbox activado) */}
              {recogeOtraPersona && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                  <p className="text-sm font-medium text-gray-700 flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Datos de la persona que recoge
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nombre completo *</label>
                      <input
                        type="text"
                        value={datosRecogedor.nombre}
                        onChange={(e) => setDatosRecogedor({...datosRecogedor, nombre: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                        placeholder="Nombre de quien recoge"
                        required={recogeOtraPersona}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">DNI *</label>
                      <div className="relative">
                        <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          value={datosRecogedor.dni}
                          onChange={(e) => setDatosRecogedor({...datosRecogedor, dni: e.target.value})}
                          className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                          placeholder="DNI de quien recoge"
                          required={recogeOtraPersona}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <select
                  value={nuevaEntregaData.motivo}
                  onChange={(e) => setNuevaEntregaData({...nuevaEntregaData, motivo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  {motivosOptions.map(motivo => (
                    <option key={motivo} value={motivo}>{motivo}</option>
                  ))}
                </select>
              </div>

              {/* Autorizado por */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Autorizado por</label>
                <input
                  type="text"
                  value={nuevaEntregaData.autorizado_por}
                  onChange={(e) => setNuevaEntregaData({...nuevaEntregaData, autorizado_por: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Nombre de quien autoriza"
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={nuevaEntregaData.observaciones}
                  onChange={(e) => setNuevaEntregaData({...nuevaEntregaData, observaciones: e.target.value})}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Notas adicionales..."
                />
              </div>

              {formError && (
                <div className="bg-red-50 p-3 rounded-lg text-red-700 text-sm flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNuevaEntregaModal(false);
                    setFormError(null);
                    setClienteSeleccionado(null);
                    setSearchClienteTerm('');
                    setRecogeOtraPersona(false);
                    setDatosRecogedor({ nombre: '', dni: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center space-x-2 disabled:opacity-50"
                >
                  {submitLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Registrar entrega</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <FileWarning className="w-6 h-6 mr-2 text-orange-600" />
            Entregas sin resguardo
          </h1>
          <p className="text-sm text-gray-500">
            Historial de entregas realizadas sin presentar el comprobante
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={cargarEntregas}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setShowNuevaEntregaModal(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center space-x-2"
          >
            <FileWarning className="w-4 h-4" />
            <span>Nueva entrega sin resguardo</span>
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono, DNI o número de orden..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total de casos</p>
          <p className="text-2xl font-bold text-gray-800">{entregas.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Este mes</p>
          <p className="text-2xl font-bold text-gray-800">
            {entregas.filter(e => {
              const fecha = new Date(e.entregado_en);
              const ahora = new Date();
              return fecha.getMonth() === ahora.getMonth() && 
                     fecha.getFullYear() === ahora.getFullYear();
            }).length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Última semana</p>
          <p className="text-2xl font-bold text-gray-800">
            {entregas.filter(e => {
              const fecha = new Date(e.entregado_en);
              const ahora = new Date();
              const diffDays = (ahora - fecha) / (1000 * 60 * 60 * 24);
              return diffDays <= 7;
            }).length}
          </p>
        </div>
      </div>

      {/* Lista de entregas */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {entregasPaginadas.length === 0 ? (
          <div className="text-center py-12">
            <FileWarning className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No hay registros de entregas sin resguardo</p>
            <p className="text-sm text-gray-400 mt-1">
              Haga clic en "Nueva entrega sin resguardo" para registrar un caso
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orden</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DNI</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entregado por</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entregasPaginadas.map((entrega) => (
                  <tr key={entrega.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(entrega.entregado_en)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {entrega.orden_numero}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{entrega.cliente_nombre}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-3 h-3 mr-1 text-gray-400" />
                        {entrega.cliente_telefono}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {entrega.cliente_dni ? (
                        <div className="flex items-center text-sm text-gray-600">
                          <CreditCard className="w-3 h-3 mr-1 text-gray-400" />
                          {entrega.cliente_dni}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 max-w-xs truncate block">
                        {entrega.motivo}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{entrega.entregado_por || '—'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => verDetalle(entrega)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => verOrden(entrega.order_id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver orden"
                        >
                          <FileWarning className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-gray-500">
              Mostrando {startIndex + 1} - {Math.min(endIndex, entregasFiltradas.length)} de {entregasFiltradas.length} registros
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </span>
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
    </div>
  );
}

export default EntregasSinResguardo;