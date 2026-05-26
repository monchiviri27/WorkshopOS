import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  FolderTree,
  CheckCircle,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

function AdminFamiliasFallos() {
  const navigate = useNavigate();
  const [familias, setFamilias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editandoId, setEditandoId] = useState(null);
  const [editandoData, setEditandoData] = useState({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Estado para nueva familia
  const [nuevaFamilia, setNuevaFamilia] = useState({ nombre: '', descripcion: '', orden: 0 });
  const [mostrarForm, setMostrarForm] = useState(false);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    cargarFamilias();
  }, []);

  const cargarFamilias = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('familias_fallos')
        .select('*')
        .order('orden');

      if (error) throw error;
      setFamilias(data || []);
    } catch (error) {
      console.error('Error cargando familias de fallos:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Verificar duplicados
  const esDuplicado = (nombre, excludeId = null) => {
    return familias.some(f => 
      f.nombre?.toLowerCase() === nombre.toLowerCase() &&
      f.id !== excludeId
    );
  };

  // Filtrar familias por búsqueda
  const familiasFiltradas = familias.filter(familia =>
    familia.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (familia.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Paginación
  const totalPages = Math.ceil(familiasFiltradas.length / itemsPerPage);
  const familiasPaginadas = familiasFiltradas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Resetear página cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const crearFamilia = async () => {
    if (!nuevaFamilia.nombre) {
      setError('El nombre es obligatorio');
      return;
    }

    if (esDuplicado(nuevaFamilia.nombre)) {
      setError('Ya existe una familia con este nombre');
      return;
    }

    setCreando(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('familias_fallos')
        .insert([{ 
          nombre: nuevaFamilia.nombre,
          descripcion: nuevaFamilia.descripcion || null,
          orden: nuevaFamilia.orden || 0 
        }])
        .select()
        .single();

      if (error) throw error;

      setFamilias([...familias, data].sort((a, b) => a.orden - b.orden));
      setNuevaFamilia({ nombre: '', descripcion: '', orden: 0 });
      setMostrarForm(false);
      setSuccessMessage('Familia creada correctamente');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error creando familia:', error);
      setError(error.message);
    } finally {
      setCreando(false);
    }
  };

  const actualizarFamilia = async (id) => {
    const datos = editandoData[id];
    if (!datos) return;

    if (!datos.nombre) {
      setError('El nombre es obligatorio');
      return;
    }

    if (esDuplicado(datos.nombre, id)) {
      setError('Ya existe una familia con este nombre');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('familias_fallos')
        .update({
          nombre: datos.nombre,
          descripcion: datos.descripcion,
          orden: datos.orden
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setFamilias(familias.map(f => f.id === id ? data : f).sort((a, b) => a.orden - b.orden));
      setEditandoId(null);
      setEditandoData({});
      setSuccessMessage('Familia actualizada');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error actualizando familia:', error);
      setError(error.message);
    }
  };

  const eliminarFamilia = async (id, nombre) => {
    // Verificar si tiene fallos asociados
    const { data: fallos, error: checkError } = await supabase
      .from('fallos_predefinidos')
      .select('id')
      .eq('familia_id', id)
      .limit(1);

    if (checkError) {
      setError('Error al verificar fallos asociados');
      return;
    }

    if (fallos && fallos.length > 0) {
      setError('No se puede eliminar una familia con fallos asociados');
      return;
    }

    if (!window.confirm(`¿Estás seguro de eliminar la familia "${nombre}"?`)) return;

    try {
      const { error } = await supabase
        .from('familias_fallos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFamilias(familias.filter(f => f.id !== id));
      setSuccessMessage('Familia eliminada');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error eliminando familia:', error);
      setError(error.message);
    }
  };

  const iniciarEdicion = (familia) => {
    setEditandoId(familia.id);
    setEditandoData({
      [familia.id]: {
        nombre: familia.nombre,
        descripcion: familia.descripcion || '',
        orden: familia.orden
      }
    });
  };

  const handleEditChange = (id, field, value) => {
    setEditandoData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: field === 'orden' ? parseInt(value) || 0 : value
      }
    }));
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
          <h1 className="text-2xl font-bold text-gray-800">Familias de Fallos</h1>
          <p className="text-sm text-gray-500">
            Gestiona las categorías de fallos para reparaciones
          </p>
        </div>
        <button
          onClick={() => setMostrarForm(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva familia</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar familias por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
          />
        </div>
      </div>

      {/* Formulario nueva familia */}
      {mostrarForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="font-medium text-gray-800 mb-4">Nueva familia de fallos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                value={nuevaFamilia.nombre}
                onChange={(e) => setNuevaFamilia({...nuevaFamilia, nombre: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                placeholder="Ej: Engarces, Soldaduras, Cierres..."
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Orden
              </label>
              <input
                type="number"
                value={nuevaFamilia.orden}
                onChange={(e) => setNuevaFamilia({...nuevaFamilia, orden: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Define el orden de aparición (menor número = más arriba)</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción (opcional)
              </label>
              <textarea
                value={nuevaFamilia.descripcion}
                onChange={(e) => setNuevaFamilia({...nuevaFamilia, descripcion: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none"
                rows="2"
                placeholder="Descripción de la familia de fallos"
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
              onClick={crearFamilia}
              disabled={creando}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              {creando ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Guardar familia</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabla de familias */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orden</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {familiasPaginadas.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <FolderTree className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No hay familias de fallos registradas</p>
                    <button
                      onClick={() => setMostrarForm(true)}
                      className="mt-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
                    >
                      + Añadir primera familia
                    </button>
                  </td>
                </tr>
              ) : (
                familiasPaginadas.map((familia) => (
                  <tr key={familia.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      {editandoId === familia.id ? (
                        <input
                          type="number"
                          value={editandoData[familia.id]?.orden || 0}
                          onChange={(e) => handleEditChange(familia.id, 'orden', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                        />
                      ) : (
                        <span className="text-sm text-gray-600">{familia.orden}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editandoId === familia.id ? (
                        <input
                          type="text"
                          value={editandoData[familia.id]?.nombre || ''}
                          onChange={(e) => handleEditChange(familia.id, 'nombre', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                        />
                      ) : (
                        <span className="font-medium text-gray-900">{familia.nombre}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editandoId === familia.id ? (
                        <input
                          type="text"
                          value={editandoData[familia.id]?.descripcion || ''}
                          onChange={(e) => handleEditChange(familia.id, 'descripcion', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
                          placeholder="Descripción"
                        />
                      ) : (
                        <span className="text-gray-500 text-sm">{familia.descripcion || '-'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        {editandoId === familia.id ? (
                          <>
                            <button
                              onClick={() => actualizarFamilia(familia.id)}
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
                              onClick={() => iniciarEdicion(familia)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => eliminarFamilia(familia.id, familia.nombre)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
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
              Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, familiasFiltradas.length)} de {familiasFiltradas.length} familias
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

export default AdminFamiliasFallos;