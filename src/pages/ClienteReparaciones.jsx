import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Wrench,
  Eye,
  FileText,
  Search,
  Filter,
  ChevronDown,
  X,
  Gem
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function ClienteReparaciones() {
  const { clienteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [cliente, setCliente] = useState(null);
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todas');

  // Colores por estado
  const getStatusColor = (status) => {
    const colors = {
      'Recibido': 'bg-purple-100 text-purple-700',
      'En análisis': 'bg-blue-100 text-blue-700',
      'Presupuestado': 'bg-amber-100 text-amber-700',
      'Aceptado': 'bg-green-100 text-green-700',
      'En reparación': 'bg-orange-100 text-orange-700',
      'Listo': 'bg-green-100 text-green-700',
      'Rechazado': 'bg-red-100 text-red-700',
      'Entregado': 'bg-gray-100 text-gray-700',
      'Archivado': 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  // Icono por estado
  const getStatusIcon = (status) => {
    switch(status) {
      case 'Recibido': return <Package className="w-4 h-4" />;
      case 'En análisis': return <Search className="w-4 h-4" />;
      case 'Presupuestado': return <FileText className="w-4 h-4" />;
      case 'Aceptado': return <CheckCircle className="w-4 h-4" />;
      case 'En reparación': return <Wrench className="w-4 h-4" />;
      case 'Listo': return <CheckCircle className="w-4 h-4" />;
      case 'Entregado': return <Package className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [clienteId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar datos del cliente
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .single();

      if (clienteError) throw clienteError;
      setCliente(clienteData);

      // Cargar todas las órdenes del cliente
      const { data: ordenesData, error: ordenesError } = await supabase
        .from('ordenes')
        .select('*')
        .eq('client_id', clienteId)
        .order('created_at', { ascending: false });

      if (ordenesError) throw ordenesError;
      setOrdenes(ordenesData || []);

    } catch (error) {
      console.error('Error cargando datos:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar órdenes
  const ordenesFiltradas = ordenes.filter(orden => {
    const matchesSearch = 
      orden.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orden.item_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orden.material?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'todas' || orden.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  // Estadísticas
  const totalOrdenes = ordenes.length;
  const ordenesActivas = ordenes.filter(o => 
    o.status !== 'Entregado' && o.status !== 'Rechazado' && o.status !== 'Archivado'
  ).length;
  const ordenesCompletadas = ordenes.filter(o => o.status === 'Entregado').length;
  const totalGastado = ordenes.reduce((sum, o) => sum + (o.budget || 0), 0);

  const handleVerReparacion = (ordenId) => {
    navigate(`/reparacion/${ordenId}`);
  };

  const handleVerPresupuesto = (ordenId, e) => {
    e.stopPropagation();
    navigate(`/presupuesto/ver/${ordenId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800">Cliente no encontrado</h1>
          <p className="text-gray-500 mt-2">{error || 'El cliente no existe'}</p>
          <button onClick={() => navigate('/clientes')} className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg">
            Volver a clientes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón volver */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/clientes')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Historial del cliente</h1>
          <p className="text-sm text-gray-500">
            Todas las reparaciones realizadas por {cliente.name}
          </p>
        </div>
      </div>

      {/* Tarjetas de información del cliente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Datos personales */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-gray-600" />
            Datos personales
          </h3>
          <div className="space-y-3">
            <p className="text-gray-800">
              <span className="font-medium">Nombre:</span> {cliente.name}
            </p>
            <p className="text-gray-600 flex items-center">
              <Phone className="w-4 h-4 mr-2 text-gray-400" />
              {cliente.phone}
            </p>
            {cliente.email && (
              <p className="text-gray-600 flex items-center">
                <Mail className="w-4 h-4 mr-2 text-gray-400" />
                {cliente.email}
              </p>
            )}
            {cliente.address && (
              <p className="text-gray-600 flex items-center">
                <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                {cliente.address}
              </p>
            )}
            {cliente.nif && (
              <p className="text-gray-600">
                <span className="font-medium">NIF/CIF:</span> {cliente.nif}
              </p>
            )}
          </div>
        </div>

        {/* Estadísticas */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
            <Gem className="w-5 h-5 mr-2 text-gray-600" />
            Resumen de actividad
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-800">{totalOrdenes}</p>
              <p className="text-xs text-gray-500">Total reparaciones</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{ordenesActivas}</p>
              <p className="text-xs text-blue-600">En curso</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{ordenesCompletadas}</p>
              <p className="text-xs text-green-600">Completadas</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-600">{totalGastado}€</p>
              <p className="text-xs text-amber-600">Total gastado</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por número de orden, tipo de joya o material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
          <div className="sm:w-48 relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 appearance-none bg-white"
            >
              <option value="todas">Todos los estados</option>
              <option value="Recibido">📦 Recibido</option>
              <option value="En análisis">🔍 En análisis</option>
              <option value="Presupuestado">💰 Presupuestado</option>
              <option value="Aceptado">✅ Aceptado</option>
              <option value="En reparación">🔧 En reparación</option>
              <option value="Listo">⏰ Listo</option>
              <option value="Entregado">🏁 Entregado</option>
              <option value="Rechazado">❌ Rechazado</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Lista de reparaciones */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {ordenesFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay reparaciones que coincidan con la búsqueda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº Orden</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joya</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha entrada</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha entrega</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Importe</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ordenesFiltradas.map((orden) => {
                  const fechaEntrada = new Date(orden.created_at).toLocaleDateString();
                  const fechaEntrega = orden.delivered_at 
                    ? new Date(orden.delivered_at).toLocaleDateString() 
                    : '-';
                  
                  return (
                    <tr 
                      key={orden.id} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleVerReparacion(orden.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {orden.order_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{orden.item_type}</p>
                          <p className="text-xs text-gray-500">{orden.material}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          {fechaEntrada}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="w-4 h-4 mr-2 text-gray-400" />
                          {fechaEntrega}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {orden.budget ? (
                          <p className="text-sm font-bold text-gray-900">{orden.budget}€</p>
                        ) : (
                          <p className="text-xs text-gray-400">-</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(orden.status)}`}>
                          {getStatusIcon(orden.status)}
                          <span>{orden.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-2">
                          {orden.budget > 0 && (
                            <button
                              onClick={(e) => handleVerPresupuesto(orden.id, e)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Ver presupuesto"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleVerReparacion(orden.id)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClienteReparaciones;