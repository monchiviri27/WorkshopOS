import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Package,
  Clock,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  Gem,
  AlertCircle,
  CheckCircle,
  Eye,
  MoreVertical,
  Download,
  Filter,
  CreditCard,
  LayoutGrid,
  Table
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useNotifications } from '../context/NotificationContext';

function Clientes() {
  const navigate = useNavigate();
  const { clients, orders, createClient, updateClient, deleteClient } = useApp();
  const { showNotification } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterActive, setFilterActive] = useState(false);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [formData, setFormData] = useState({
    name: '',
    nif: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  // ============================================
  // FUNCIONES DE VALIDACIÓN
  // ============================================
  
  const validateNIF = (nif) => {
    if (!nif) return true;
    const nifRegex = /^[0-9]{8}[A-Z]$|^[XYZ][0-9]{7}[A-Z]$|^[A-HJ-NP-SUVW][0-9]{7}[0-9A-J]$/i;
    return nifRegex.test(nif.toUpperCase());
  };

  const validateEmail = (email) => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 6;
  };

  const checkDuplicate = (field, value, excludeId = null) => {
    if (!value) return false;
    return clients.some(c => 
      c[field]?.toLowerCase() === value.toLowerCase() && 
      c.id !== excludeId
    );
  };

  // ============================================
  // FUNCIONES DE OBTENCIÓN DE DATOS
  // ============================================

  // Todas las órdenes del cliente
  const getClientOrders = useCallback((clientId) => {
    return orders.filter(o => o.client_id === clientId);
  }, [orders]);

  // Órdenes activas (no entregadas, no rechazadas, no archivadas)
  const getClientActiveOrders = useCallback((clientId) => {
    return orders.filter(o => 
      o.client_id === clientId && 
      o.status !== 'Entregado' && 
      o.status !== 'Rechazado' &&
      o.status !== 'Archivado'
    );
  }, [orders]);

  const getActiveOrdersCount = useCallback((clientId) => {
    return orders.filter(o => 
      o.client_id === clientId && 
      o.status !== 'Entregado' && 
      o.status !== 'Rechazado'
    ).length;
  }, [orders]);

  const getLastOrderDate = useCallback((clientId) => {
    const clientOrders = orders.filter(o => o.client_id === clientId);
    if (clientOrders.length === 0) return null;
    const lastOrder = clientOrders.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    )[0];
    return lastOrder.created_at;
  }, [orders]);

  // Función para navegar a las reparaciones del cliente
  const handleClientClick = (clientId, clientName) => {
    navigate(`/cliente/${clientId}/reparaciones`, { state: { clientName } });
  };

  // ============================================
  // FILTRADO, ORDENACIÓN Y PAGINACIÓN
  // ============================================

  const filteredClients = useMemo(() => {
    let result = clients.filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm) ||
      (client.nif && client.nif.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (filterActive) {
      result = result.filter(client => getActiveOrdersCount(client.id) > 0);
    }

    result.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'nif':
          aValue = a.nif?.toLowerCase() || '';
          bValue = b.nif?.toLowerCase() || '';
          break;
        case 'date':
          aValue = new Date(getLastOrderDate(a.id) || 0).getTime();
          bValue = new Date(getLastOrderDate(b.id) || 0).getTime();
          break;
        case 'orders':
          aValue = getClientOrders(a.id).length;
          bValue = getClientOrders(b.id).length;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      if (sortOrder === 'asc') return aValue > bValue ? 1 : -1;
      else return aValue < bValue ? 1 : -1;
    });

    return result;
  }, [clients, searchTerm, filterActive, sortBy, sortOrder, getActiveOrdersCount, getClientOrders, getLastOrderDate]);

  // Paginación
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(start, start + itemsPerPage);
  }, [filteredClients, currentPage]);

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterActive, sortBy, sortOrder]);

  // ============================================
  // CRUD OPERACIONES
  // ============================================

  const handleSaveClient = async () => {
    if (!formData.name || !formData.phone) {
      setError('Nombre y teléfono son obligatorios');
      return;
    }

    if (!validatePhone(formData.phone)) {
      setError('El teléfono debe tener al menos 6 dígitos');
      return;
    }

    if (formData.email && !validateEmail(formData.email)) {
      setError('El email no tiene un formato válido');
      return;
    }

    if (formData.nif && !validateNIF(formData.nif)) {
      setError('El NIF/CIF no tiene un formato válido (ej: 12345678A)');
      return;
    }

    if (checkDuplicate('phone', formData.phone, isEditing ? selectedClient?.id : null)) {
      setError('Ya existe un cliente con este número de teléfono');
      return;
    }

    if (formData.email && checkDuplicate('email', formData.email, isEditing ? selectedClient?.id : null)) {
      setError('Ya existe un cliente con este email');
      return;
    }

    if (formData.nif && checkDuplicate('nif', formData.nif, isEditing ? selectedClient?.id : null)) {
      setError('Ya existe un cliente con este NIF/CIF');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && selectedClient) {
        await updateClient(selectedClient.id, formData);
        showNotification('Cliente actualizado correctamente', 'success');
      } else {
        await createClient(formData);
        showNotification('Cliente creado correctamente', 'success');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      setError(error.message);
      showNotification('Error al guardar el cliente', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!deleteConfirm) return;
    const { id, name } = deleteConfirm;
    
    // Verificar si tiene órdenes ACTIVAS (no entregadas)
    const clientActiveOrders = getClientActiveOrders(id);

    if (clientActiveOrders.length > 0) {
      showNotification('No se puede eliminar un cliente con órdenes activas', 'warning');
      setDeleteConfirm(null);
      return;
    }

    setLoading(true);
    try {
      await deleteClient(id);
      showNotification(`Cliente ${name} eliminado`, 'success');
      setDeleteConfirm(null);
    } catch (error) {
      showNotification('Error al eliminar: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setFormData({
      name: client.name,
      nif: client.nif || '',
      phone: client.phone,
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || ''
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleNewClient = () => {
    resetForm();
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: '', nif: '', phone: '', email: '', address: '', notes: '' });
    setSelectedClient(null);
    setError(null);
  };

  const handleViewClient = (client) => {
    navigate(`/reparaciones-activas?cliente=${client.id}`);
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
          <p className="text-sm text-gray-500">
            Total: {clients.length} clientes registrados
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title={viewMode === 'table' ? 'Vista de tarjetas' : 'Vista de tabla'}
          >
            {viewMode === 'table' ? (
              <LayoutGrid className="w-4 h-4 text-gray-600" />
            ) : (
              <Table className="w-4 h-4 text-gray-600" />
            )}
          </button>
          <button
            onClick={handleNewClient}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
            disabled={loading}
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo cliente</span>
          </button>
        </div>
      </div>

      {/* Buscador y filtros */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, NIF, teléfono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilterActive(!filterActive)}
              className={`px-3 py-2 border rounded-lg flex items-center space-x-2 transition-colors ${
                filterActive ? 'bg-gray-100 border-gray-400 text-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Con órdenes activas</span>
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <option value="name">Ordenar por nombre</option>
              <option value="nif">Ordenar por NIF</option>
              <option value="date">Ordenar por última actividad</option>
              <option value="orders">Ordenar por nº de órdenes</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay clientes que coincidan con la búsqueda</p>
            <button
              onClick={handleNewClient}
              className="mt-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              + Añadir nuevo cliente
            </button>
          </div>
        ) : viewMode === 'table' ? (
          // Vista de tabla
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NIF/CIF</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Órdenes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última actividad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedClients.map((client) => {
                  const clientOrders = getClientOrders(client.id);
                  const activeOrders = getActiveOrdersCount(client.id);
                  const hasActiveOrders = getClientActiveOrders(client.id).length > 0;
                  const lastOrderDate = getLastOrderDate(client.id);
                  
                  return (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <Gem className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            {/* 👇 NOMBRE CLICABLE */}
                            <button
                              onClick={() => handleClientClick(client.id, client.name)}
                              className="font-medium text-gray-900 hover:text-blue-600 hover:underline text-left"
                            >
                              {client.name}
                            </button>
                            {client.notes && (
                              <p className="text-xs text-gray-500 line-clamp-1">{client.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {client.nif || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600 flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            {client.phone}
                          </p>
                          {client.email && (
                            <p className="text-sm text-gray-600 flex items-center">
                              <Mail className="w-4 h-4 mr-2 text-gray-400" />
                              {client.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-900">
                            {clientOrders.length}
                          </span>
                          {activeOrders > 0 && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              {activeOrders} activas
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {lastOrderDate ? new Date(lastOrderDate).toLocaleDateString() : 'Sin actividad'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewClient(client)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Ver reparaciones activas"
                          >
                            <Package className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleEditClient(client)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                            title="Editar"
                            disabled={loading}
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ id: client.id, name: client.name })}
                            className={`p-1 rounded transition-colors ${
                              hasActiveOrders ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:bg-red-100'
                            }`}
                            title={hasActiveOrders ? 'No se puede eliminar (tiene órdenes activas)' : 'Eliminar'}
                            disabled={loading || hasActiveOrders}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Paginación - Tabla */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredClients.length)} de {filteredClients.length} clientes
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ←
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Vista de tarjetas
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {paginatedClients.map((client) => {
                const clientOrders = getClientOrders(client.id);
                const activeOrders = getActiveOrdersCount(client.id);
                const hasActiveOrders = getClientActiveOrders(client.id).length > 0;
                const lastOrderDate = getLastOrderDate(client.id);
                return (
                  <div key={client.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <Gem className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          {/* 👇 NOMBRE CLICABLE */}
                          <button
                            onClick={() => handleClientClick(client.id, client.name)}
                            className="font-medium text-gray-900 hover:text-blue-600 hover:underline text-left"
                          >
                            {client.name}
                          </button>
                          {client.nif && <p className="text-xs text-gray-500">NIF: {client.nif}</p>}
                        </div>
                      </div>
                      {activeOrders > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {activeOrders} activas
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 flex items-center mb-1">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      {client.phone}
                    </p>
                    {client.email && (
                      <p className="text-sm text-gray-600 flex items-center mb-2">
                        <Mail className="w-4 h-4 mr-2 text-gray-400" />
                        {client.email}
                      </p>
                    )}
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                      <span>Órdenes: {clientOrders.length}</span>
                      <span>Última: {lastOrderDate ? new Date(lastOrderDate).toLocaleDateString() : 'Nunca'}</span>
                    </div>
                    <div className="flex justify-end space-x-2 border-t pt-3">
                      <button
                        onClick={() => handleViewClient(client)}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Ver reparaciones activas"
                      >
                        <Package className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleEditClient(client)}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({ id: client.id, name: client.name })}
                        className={`p-2 rounded transition-colors ${
                          hasActiveOrders ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:bg-red-100'
                        }`}
                        title={hasActiveOrders ? 'No se puede eliminar (tiene órdenes activas)' : 'Eliminar'}
                        disabled={hasActiveOrders}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Paginación - Tarjetas */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredClients.length)} de {filteredClients.length} clientes
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ←
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center space-x-3 text-red-600 mb-4">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Confirmar eliminación</h3>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que deseas eliminar a <span className="font-bold">{deleteConfirm.name}</span>? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteClient}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                disabled={loading}
              >
                {loading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full animate-scale-up">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                {isEditing ? 'Editar cliente' : 'Nuevo cliente'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="Ej: María García"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NIF / CIF
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={formData.nif}
                    onChange={(e) => setFormData({...formData, nif: e.target.value})}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                    placeholder="12345678A / B12345678"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Obligatorio para emitir facturas. Formato: 12345678A</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="+34 612 345 678"
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo 6 dígitos</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="cliente@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  placeholder="Calle, ciudad..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
                  placeholder="Información adicional..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveClient}
                disabled={loading || !formData.name || !formData.phone}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isEditing ? 'Actualizar' : 'Crear'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clientes;