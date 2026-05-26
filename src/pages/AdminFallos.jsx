import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertTriangle,
  Package,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function AdminFallos() {
  const navigate = useNavigate();
  const [fallos, setFallos] = useState([]);
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

  // Estado para nuevo fallo
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevoFallo, setNuevoFallo] = useState({ 
    familia_id: '', 
    nombre: '', 
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
      
      // Cargar familias de fallos
      const { data: familiasData, error: familiasError } = await supabase
        .from('familias_fallos')
        .select('*')
        .order('orden');

      if (familiasError) throw familiasError;
      setFamilias(familiasData || []);

      // Cargar fallos
      const { data: fallosData, error: fallosError } = await supabase
        .from('fallos_predefinidos')
        .select('*')
        .order('nombre');

      if (fallosError) throw fallosError;
      setFallos(fallosData || []);

    } catch (error) {
      console.error('Error cargando datos:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Verificar duplicados
  const esDuplicado = (nombre, familiaId, excludeId = null) => {
    return fallos.some(f => 
      f.nombre?.toLowerCase() === nombre.toLowerCase() &&
      f.familia_id === familiaId &&
      f.id !== excludeId
    );
  };

  // Filtrar fallos
  const fallosFiltrados = fallos.filter(fallo => {
    const matchesSearch = 
      fallo.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fallo.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFamilia = filterFamilia === 'todas' || fallo.familia_id === filterFamilia;
    
    const matchesActivo = filterActivo === 'todos' || 
      (filterActivo === 'activo' && fallo.activo) ||
      (filterActivo === 'inactivo' && !fallo.activo);
    
    return matchesSearch && matchesFamilia && matchesActivo;
  });

  // Paginación
  const totalPages = Math.ceil(fallosFiltrados.length / itemsPerPage);
  const fallosPaginados = fallosFiltrados.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterFamilia, filterActivo]);

  const crearFallo = async () => {
    if (!nuevoFallo.nombre || !nuevoFallo.familia_id) {
      setError('Nombre y familia son obligatorios');
      return;
    }

    if (esDuplicado(nuevoFallo.nombre, nuevoFallo.familia_id)) {
      setError('Ya existe un fallo con este nombre en la misma familia');
      return;
    }

    setCreando(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('fallos_predefinidos')
        .insert([{ 
          familia_id: nuevoFallo.familia_id,
          nombre: nuevoFallo.nombre,
          descripcion: nuevoFallo.descripcion || '',
          activo: true
        }])
        .select()
        .single();

      if (error) throw error;

      setFallos([...fallos, data]);
      setNuevoFallo({ familia_id: '', nombre: '', descripcion: '', activo: true });
      setMostrarForm(false);
      setSuccessMessage('Fallo creado correctamente');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error creando fallo:', error);
      setError(error.message);
    } finally {
      setCreando(false);
    }
  };

  const actualizarFallo = async (id) => {
    const datos = editandoData[id];
    if (!datos) return;

    if (!datos.nombre || !datos.familia_id) {
      setError('Nombre y familia son obligatorios');
      return;
    }

    if (esDuplicado(datos.nombre, datos.familia_id, id)) {
      setError('Ya existe un fallo con este nombre en la misma familia');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('fallos_predefinidos')
        .update({
          nombre: datos.nombre,
          familia_id: datos.familia_id,
          descripcion: datos.descripcion
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setFallos(fallos.map(f => f.id === id ? data : f));
      setEditandoId(null);
      setEditandoData({});
      setSuccessMessage('Fallo actualizado');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error actualizando fallo:', error);
      setError(error.message);
    }
  };

  const eliminarFallo = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar el fallo "${nombre}"?`)) return;

    try {
      const { error } = await supabase
        .from('fallos_predefinidos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFallos(fallos.filter(f => f.id !== id));
      setSuccessMessage('Fallo eliminado');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error eliminando fallo:', error);
      setError(error.message);
    }
  };

  const toggleActivo = async (fallo) => {
    try {
      const { data, error } = await supabase
        .from('fallos_predefinidos')
        .update({ activo: !fallo.activo })
        .eq('id', fallo.id)
        .select()
        .single();

      if (error) throw error;

      setFallos(fallos.map(f => f.id === fallo.id ? data : f));
      setSuccessMessage(fallo.activo ? 'Fallo desactivado' : 'Fallo activado');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error cambiando estado:', error);
      setError(error.message);
    }
  };

  const iniciarEdicion = (fallo) => {
    setEditandoId(fallo.id);
    setEditandoData({
      [fallo.id]: {
        nombre: fallo.nombre,
        familia_id: fallo.familia_id,
        descripcion: fallo.descripcion || ''
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
          <h1 className="text-2xl font-bold text-gray-800">Catálogo de Fallos</h1>
          <p className="text-sm text-gray-500">
            Gestiona los fallos predefinidos para reparaciones
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setMostrarForm(true)}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo fallo</span>
          </button>
          <button
            onClick={() => navigate('/admin-familias-fallos')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <Package className="w-4 h-4" />
            <span>Gestionar familias</span>
          </button>
        </div>
      </div>

      {/* Formulario nuevo fallo */}
      {mostrarForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="font-medium text-gray-800 mb-4">Nuevo fallo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Familia *
              </label>
              <select
                value={nuevoFallo.familia_id}
                onChange={(e) => setNuevoFallo({...nuevoFallo, familia_id: e.target.value})}
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
                Nombre del fallo *
              </label>
              <input
                type="text"
                value={nuevoFallo.nombre}
                onChange={(e) => setNuevoFallo({...nuevoFallo, nombre: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                placeholder="Ej: Piedra floja"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <input
                type="text"
                value={nuevoFallo.descripcion}
                onChange={(e) => setNuevoFallo({...nuevoFallo, descripcion: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                placeholder="Descripción detallada del fallo"
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
              onClick={crearFallo}
              disabled={creando}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              {creando ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Guardar fallo</span>
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

      {/* Tabla de fallos */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Familia</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fallosPaginados.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No hay fallos registrados</p>
                    <button
                      onClick={() => setMostrarForm(true)}
                      className="mt-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
                    >
                      + Añadir primer fallo
                    </button>
                   </td>
                 </tr>
              ) : (
                fallosPaginados.map((fallo) => (
                  <tr key={fallo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {editandoId === fallo.id ? (
                        <input
                          type="text"
                          value={editandoData[fallo.id]?.nombre || ''}
                          onChange={(e) => handleEditChange(fallo.id, 'nombre', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                        />
                      ) : (
                        <span className="font-medium text-gray-900">{fallo.nombre}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editandoId === fallo.id ? (
                        <select
                          value={editandoData[fallo.id]?.familia_id || ''}
                          onChange={(e) => handleEditChange(fallo.id, 'familia_id', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                        >
                          {familias.map(f => (
                            <option key={f.id} value={f.id}>{f.nombre}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-600">{getFamiliaNombre(fallo.familia_id)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editandoId === fallo.id ? (
                        <input
                          type="text"
                          value={editandoData[fallo.id]?.descripcion || ''}
                          onChange={(e) => handleEditChange(fallo.id, 'descripcion', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                          placeholder="Descripción"
                        />
                      ) : (
                        <span className="text-gray-500 text-sm">{fallo.descripcion || '-'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        fallo.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {fallo.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        {editandoId === fallo.id ? (
                          <>
                            <button
                              onClick={() => actualizarFallo(fallo.id)}
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
                              onClick={() => iniciarEdicion(fallo)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => eliminarFallo(fallo.id, fallo.nombre)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleActivo(fallo)}
                              className={`p-1 rounded transition-colors ${
                                fallo.activo ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'
                              }`}
                              title={fallo.activo ? 'Desactivar' : 'Activar'}
                            >
                              {fallo.activo ? (
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
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, fallosFiltrados.length)} de {fallosFiltrados.length} fallos
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

export default AdminFallos;