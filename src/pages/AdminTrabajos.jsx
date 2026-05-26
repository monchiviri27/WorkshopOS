import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Package,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Search,
  Filter,
  XCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function AdminTrabajos() {
  const navigate = useNavigate();
  const [trabajos, setTrabajos] = useState([]);
  const [familias, setFamilias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editandoId, setEditandoId] = useState(null);
  const [editandoData, setEditandoData] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFamilia, setFilterFamilia] = useState('todas');
  const [filterActivo, setFilterActivo] = useState('todos');
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Estado para nuevo trabajo
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoTrabajo, setNuevoTrabajo] = useState({ 
    familia_id: '', 
    nombre: '', 
    tarifa_base: 0,
    descripcion: '',
    activo: true
  });
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      const { data: familiasData, error: familiasError } = await supabase
        .from('familias_trabajos')
        .select('*')
        .order('orden');

      if (familiasError) throw familiasError;
      setFamilias(familiasData || []);

      const { data: trabajosData, error: trabajosError } = await supabase
        .from('trabajos_predefinidos')
        .select('*')
        .order('nombre');

      if (trabajosError) throw trabajosError;
      setTrabajos(trabajosData || []);

    } catch (error) {
      console.error('Error cargando datos:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Verificar duplicados
  const esDuplicado = (nombre, familiaId, excludeId = null) => {
    return trabajos.some(t => 
      t.nombre?.toLowerCase() === nombre.toLowerCase() &&
      t.familia_id === familiaId &&
      t.id !== excludeId
    );
  };

  // Filtrar trabajos
  const trabajosFiltrados = trabajos.filter(trabajo => {
    const matchesSearch = 
      trabajo.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (trabajo.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFamilia = filterFamilia === 'todas' || trabajo.familia_id === filterFamilia;
    
    const matchesActivo = filterActivo === 'todos' || 
      (filterActivo === 'activo' && trabajo.activo) ||
      (filterActivo === 'inactivo' && !trabajo.activo);
    
    return matchesSearch && matchesFamilia && matchesActivo;
  });

  // Paginación
  const totalPages = Math.ceil(trabajosFiltrados.length / itemsPerPage);
  const trabajosPaginados = trabajosFiltrados.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterFamilia, filterActivo]);

  const crearTrabajo = async () => {
    if (!nuevoTrabajo.nombre || !nuevoTrabajo.familia_id) {
      setError('Nombre y familia son obligatorios');
      return;
    }

    if (esDuplicado(nuevoTrabajo.nombre, nuevoTrabajo.familia_id)) {
      setError('Ya existe un trabajo con este nombre en la misma familia');
      return;
    }

    setCreando(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('trabajos_predefinidos')
        .insert([{ 
          familia_id: nuevoTrabajo.familia_id,
          nombre: nuevoTrabajo.nombre,
          tarifa_base: nuevoTrabajo.tarifa_base || 0,
          descripcion: nuevoTrabajo.descripcion || '',
          activo: true
        }])
        .select()
        .single();

      if (error) throw error;

      setTrabajos([...trabajos, data]);
      setNuevoTrabajo({ familia_id: '', nombre: '', tarifa_base: 0, descripcion: '', activo: true });
      setMostrarForm(false);
      setSuccessMessage('Trabajo creado correctamente');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error creando trabajo:', error);
      setError(error.message);
    } finally {
      setCreando(false);
    }
  };

  const actualizarTrabajo = async (id) => {
    const datos = editandoData[id];
    if (!datos) return;

    if (!datos.nombre || !datos.familia_id) {
      setError('Nombre y familia son obligatorios');
      return;
    }

    if (esDuplicado(datos.nombre, datos.familia_id, id)) {
      setError('Ya existe un trabajo con este nombre en la misma familia');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('trabajos_predefinidos')
        .update({
          nombre: datos.nombre,
          familia_id: datos.familia_id,
          tarifa_base: datos.tarifa_base,
          descripcion: datos.descripcion
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setTrabajos(trabajos.map(t => t.id === id ? data : t));
      setEditandoId(null);
      setEditandoData({});
      setSuccessMessage('Trabajo actualizado');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error actualizando trabajo:', error);
      setError(error.message);
    }
  };

  const eliminarTrabajo = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar el trabajo "${nombre}"?`)) return;

    try {
      const { error } = await supabase
        .from('trabajos_predefinidos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTrabajos(trabajos.filter(t => t.id !== id));
      setSuccessMessage('Trabajo eliminado');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error eliminando trabajo:', error);
      setError(error.message);
    }
  };

  const toggleActivo = async (trabajo) => {
    try {
      const { data, error } = await supabase
        .from('trabajos_predefinidos')
        .update({ activo: !trabajo.activo })
        .eq('id', trabajo.id)
        .select()
        .single();

      if (error) throw error;

      setTrabajos(trabajos.map(t => t.id === trabajo.id ? data : t));
      setSuccessMessage(trabajo.activo ? 'Trabajo desactivado' : 'Trabajo activado');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error cambiando estado:', error);
      setError(error.message);
    }
  };

  const iniciarEdicion = (trabajo) => {
    setEditandoId(trabajo.id);
    setEditandoData({
      [trabajo.id]: {
        nombre: trabajo.nombre,
        familia_id: trabajo.familia_id,
        tarifa_base: trabajo.tarifa_base,
        descripcion: trabajo.descripcion || ''
      }
    });
  };

  const handleEditChange = (id, field, value) => {
    setEditandoData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const getFamiliaNombre = (familiaId) => {
    const familia = familias.find(f => f.id === familiaId);
    return familia?.nombre || 'Sin familia';
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
      {/* Mensajes de éxito/error */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 animate-slide-down">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Catálogo de Trabajos</h1>
          <p className="text-sm text-gray-500">
            Gestiona los trabajos predefinidos para reparaciones
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setMostrarForm(true)}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo trabajo</span>
          </button>
          <button
            onClick={() => navigate('/admin-familias')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <Package className="w-4 h-4" />
            <span>Gestionar familias</span>
          </button>
        </div>
      </div>

      {/* Formulario nuevo trabajo */}
      {mostrarForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="font-medium text-gray-800 mb-4">Nuevo trabajo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Familia *
              </label>
              <select
                value={nuevoTrabajo.familia_id}
                onChange={(e) => setNuevoTrabajo({...nuevoTrabajo, familia_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <option value="">Seleccionar familia</option>
                {familias.map(f => (
                  <option key={f.id} value={f.id}>{f.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del trabajo *
              </label>
              <input
                type="text"
                value={nuevoTrabajo.nombre}
                onChange={(e) => setNuevoTrabajo({...nuevoTrabajo, nombre: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                placeholder="Ej: Reengarzar piedra"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarifa base (€)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="number"
                  value={nuevoTrabajo.tarifa_base}
                  onChange={(e) => setNuevoTrabajo({...nuevoTrabajo, tarifa_base: parseFloat(e.target.value) || 0})}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <input
                type="text"
                value={nuevoTrabajo.descripcion}
                onChange={(e) => setNuevoTrabajo({...nuevoTrabajo, descripcion: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                placeholder="Breve descripción"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={() => setMostrarForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={crearTrabajo}
              disabled={creando}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              {creando ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Guardar trabajo</span>
            </button>
          </div>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
          <div className="sm:w-48 relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={filterFamilia}
              onChange={(e) => setFilterFamilia(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 appearance-none bg-white"
            >
              <option value="todas">Todas las familias</option>
              {familias.map(f => (
                <option key={f.id} value={f.id}>{f.nombre}</option>
              ))}
            </select>
          </div>
          <div className="sm:w-36">
            <select
              value={filterActivo}
              onChange={(e) => setFilterActivo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 appearance-none bg-white"
            >
              <option value="todos">Todos</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de trabajos */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Familia</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Tarifa base</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {trabajosPaginados.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No hay trabajos registrados</p>
                    <button
                      onClick={() => setMostrarForm(true)}
                      className="mt-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
                    >
                      + Añadir primer trabajo
                    </button>
                  </td>
                </tr>
              ) : (
                trabajosPaginados.map((trabajo) => (
                  <tr key={trabajo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {editandoId === trabajo.id ? (
                        <input
                          type="text"
                          value={editandoData[trabajo.id]?.nombre || ''}
                          onChange={(e) => handleEditChange(trabajo.id, 'nombre', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                        />
                      ) : (
                        <span className="font-medium text-gray-900">{trabajo.nombre}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editandoId === trabajo.id ? (
                        <select
                          value={editandoData[trabajo.id]?.familia_id || ''}
                          onChange={(e) => handleEditChange(trabajo.id, 'familia_id', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                        >
                          {familias.map(f => (
                            <option key={f.id} value={f.id}>{f.nombre}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-600">{getFamiliaNombre(trabajo.familia_id)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editandoId === trabajo.id ? (
                        <div className="relative inline-block">
                          <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                          <input
                            type="number"
                            value={editandoData[trabajo.id]?.tarifa_base || 0}
                            onChange={(e) => handleEditChange(trabajo.id, 'tarifa_base', parseFloat(e.target.value) || 0)}
                            className="w-24 pl-7 pr-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 text-right text-sm"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      ) : (
                        <span className="font-medium text-gray-900">{trabajo.tarifa_base}€</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editandoId === trabajo.id ? (
                        <input
                          type="text"
                          value={editandoData[trabajo.id]?.descripcion || ''}
                          onChange={(e) => handleEditChange(trabajo.id, 'descripcion', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                          placeholder="Descripción"
                        />
                      ) : (
                        <span className="text-gray-500 text-sm">{trabajo.descripcion || '-'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        trabajo.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {trabajo.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        {editandoId === trabajo.id ? (
                          <>
                            <button
                              onClick={() => actualizarTrabajo(trabajo.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Guardar"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditandoId(null);
                                setEditandoData({});
                              }}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => iniciarEdicion(trabajo)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => eliminarTrabajo(trabajo.id, trabajo.nombre)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleActivo(trabajo)}
                              className={`p-1 rounded transition-colors ${
                                trabajo.activo ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={trabajo.activo ? 'Desactivar' : 'Activar'}
                            >
                              {trabajo.activo ? (
                                <XCircle className="w-4 h-4" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, trabajosFiltrados.length)} de {trabajosFiltrados.length} trabajos
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

export default AdminTrabajos;