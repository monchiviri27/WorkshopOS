import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  X,
  Euro,
  Edit2,
  AlertCircle,
  Check
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

function TrabajosPorFamilia({ ordenId, onTrabajosChange, trabajosIniciales = [], readOnly = false }) {
  const [familias, setFamilias] = useState([]);
  const [trabajos, setTrabajos] = useState({});
  const [trabajosSeleccionados, setTrabajosSeleccionados] = useState(() => trabajosIniciales);
  const [familiaSeleccionada, setFamiliaSeleccionada] = useState(null);
  const [editandoPrecio, setEditandoPrecio] = useState(null);
  const [editandoValue, setEditandoValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [modoVista, setModoVista] = useState('selector');
  const inputRef = useRef(null);

  // ⚠️ ELIMINAR ESTE useEffect - CAUSA EL BUCLE INFINITO
  // useEffect(() => {
  //   setTrabajosSeleccionados(trabajosIniciales);
  // }, [trabajosIniciales]);

  // Función para notificar cambios al padre (memoizada)
  const notificarCambio = useCallback((nuevosTrabajos) => {
    onTrabajosChange?.(nuevosTrabajos);
  }, [onTrabajosChange]);

  // Actualizar estado local y notificar al padre (un solo lugar)
  const actualizarTrabajos = useCallback((updater) => {
    setTrabajosSeleccionados(prev => {
      const nuevos = typeof updater === 'function' ? updater(prev) : updater;
      notificarCambio(nuevos);
      return nuevos;
    });
  }, [notificarCambio]);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (editandoPrecio && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editandoPrecio]);

  const cargarDatos = async () => {
    try {
      const { data: familiasData } = await supabase
        .from('familias_trabajos')
        .select('*')
        .order('orden');

      setFamilias(familiasData || []);

      const { data: trabajosData } = await supabase
        .from('trabajos_predefinidos')
        .select('*')
        .eq('activo', true);

      const trabajosPorFamilia = {};
      trabajosData?.forEach(t => {
        if (!trabajosPorFamilia[t.familia_id]) {
          trabajosPorFamilia[t.familia_id] = [];
        }
        trabajosPorFamilia[t.familia_id].push(t);
      });
      
      setTrabajos(trabajosPorFamilia);

      if (familiasData?.length > 0 && !familiaSeleccionada) {
        setFamiliaSeleccionada(familiasData[0].id);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const contadoresPorFamilia = useMemo(() => {
    const contadores = {};
    trabajosSeleccionados.forEach(t => {
      contadores[t.familia_id] = (contadores[t.familia_id] || 0) + 1;
    });
    return contadores;
  }, [trabajosSeleccionados]);

  const toggleTrabajo = useCallback((trabajo) => {
    if (readOnly) return;
    
    actualizarTrabajos(prev => {
      const existe = prev.find(t => t.trabajo_id === trabajo.id);
      
      if (existe) {
        return prev.filter(t => t.trabajo_id !== trabajo.id);
      } else {
        const tarifaInicial = parseFloat(trabajo.tarifa_base) || 0;
        
        const nuevoTrabajo = {
          id: `${trabajo.id}_${Date.now()}_${Math.random()}`,
          trabajo_id: trabajo.id,
          familia_id: trabajo.familia_id,
          nombre: trabajo.nombre,
          tarifa_base: tarifaInicial,
          tarifa_aplicada: tarifaInicial,
          descuento: 0,
          cantidad: 1,
          opcional: false,
          total: tarifaInicial
        };
        return [...prev, nuevoTrabajo];
      }
    });
  }, [readOnly, actualizarTrabajos]);

  const eliminarTrabajo = useCallback((trabajoId) => {
    if (readOnly) return;
    
    actualizarTrabajos(prev => 
      prev.filter(t => t.id !== trabajoId && t.trabajo_id !== trabajoId)
    );
  }, [readOnly, actualizarTrabajos]);

  const iniciarEdicionPrecio = useCallback((trabajoId, precioActual) => {
    if (readOnly) return;
    setEditandoPrecio(trabajoId);
    setEditandoValue(precioActual.toString());
  }, [readOnly]);

  const guardarPrecio = useCallback((trabajoId) => {
    const nuevoPrecio = parseFloat(editandoValue);
    if (isNaN(nuevoPrecio) || nuevoPrecio < 0) {
      setEditandoPrecio(null);
      setEditandoValue('');
      return;
    }
    
    actualizarTrabajos(prev => 
      prev.map(t => {
        if (t.trabajo_id === trabajoId) {
          const precio = nuevoPrecio;
          return { 
            ...t, 
            tarifa_aplicada: precio,
            total: precio * (t.cantidad || 1) * (1 - (t.descuento || 0) / 100)
          };
        }
        return t;
      })
    );
    
    setEditandoPrecio(null);
    setEditandoValue('');
  }, [editandoValue, actualizarTrabajos]);

  const cancelarEdicion = useCallback(() => {
    setEditandoPrecio(null);
    setEditandoValue('');
  }, []);

  const handleKeyDown = useCallback((e, trabajoId) => {
    if (e.key === 'Enter') {
      guardarPrecio(trabajoId);
    } else if (e.key === 'Escape') {
      cancelarEdicion();
    }
  }, [guardarPrecio, cancelarEdicion]);

  const actualizarCantidad = useCallback((trabajoId, nuevaCantidad) => {
    if (readOnly) return;
    
    actualizarTrabajos(prev => 
      prev.map(t => {
        if (t.trabajo_id === trabajoId) {
          const cantidad = parseInt(nuevaCantidad) || 1;
          return { 
            ...t, 
            cantidad,
            total: (t.tarifa_aplicada || 0) * cantidad * (1 - (t.descuento || 0) / 100)
          };
        }
        return t;
      })
    );
  }, [readOnly, actualizarTrabajos]);

  const actualizarDescuento = useCallback((trabajoId, nuevoDescuento) => {
    if (readOnly) return;
    
    actualizarTrabajos(prev => 
      prev.map(t => {
        if (t.trabajo_id === trabajoId) {
          const descuento = parseFloat(nuevoDescuento) || 0;
          return { 
            ...t, 
            descuento,
            total: (t.tarifa_aplicada || 0) * (t.cantidad || 1) * (1 - descuento / 100)
          };
        }
        return t;
      })
    );
  }, [readOnly, actualizarTrabajos]);

  const actualizarOpcional = useCallback((trabajoId, esOpcional) => {
    if (readOnly) return;
    
    actualizarTrabajos(prev => 
      prev.map(t => 
        t.trabajo_id === trabajoId ? { ...t, opcional: esOpcional } : t
      )
    );
  }, [readOnly, actualizarTrabajos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const trabajosDeFamilia = trabajos[familiaSeleccionada] || [];
  const familiaActual = familias.find(f => f.id === familiaSeleccionada);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 flex">
          <button
            onClick={() => setModoVista('selector')}
            className={`
              px-6 py-3 text-sm font-medium border-b-2 transition-colors
              ${modoVista === 'selector'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }
            `}
          >
            🔍 Seleccionar trabajos
          </button>
          <button
            onClick={() => setModoVista('tabla')}
            className={`
              px-6 py-3 text-sm font-medium border-b-2 transition-colors
              ${modoVista === 'tabla'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }
            `}
          >
            📋 Tabla de trabajos ({trabajosSeleccionados.length})
          </button>
        </div>

        <div className="p-4">
          {modoVista === 'selector' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Familias de trabajos</h3>
                <div className="flex flex-wrap gap-2">
                  {familias.map((familia) => (
                    <button
                      key={familia.id}
                      onClick={() => setFamiliaSeleccionada(familia.id)}
                      className={`
                        flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                        ${familiaSeleccionada === familia.id
                          ? 'bg-gray-900 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      <span>{familia.nombre}</span>
                      {contadoresPorFamilia[familia.id] > 0 && (
                        <span className={`
                          ml-1 px-2 py-0.5 rounded-full text-xs
                          ${familiaSeleccionada === familia.id
                            ? 'bg-white text-gray-900'
                            : 'bg-gray-600 text-white'
                          }
                        `}>
                          {contadoresPorFamilia[familia.id]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {familiaActual && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="font-medium text-gray-700">
                      Trabajos de {familiaActual.nombre}
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {trabajosDeFamilia.length > 0 ? (
                      trabajosDeFamilia.map(trabajo => {
                        const seleccionado = trabajosSeleccionados.find(t => t.trabajo_id === trabajo.id);
                        const editando = editandoPrecio === trabajo.id;
                        
                        return (
                          <div key={trabajo.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1">
                                {!readOnly && (
                                  <input
                                    type="checkbox"
                                    checked={!!seleccionado}
                                    onChange={() => toggleTrabajo(trabajo)}
                                    className="w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                                  />
                                )}
                                <span className="text-gray-800 font-medium">{trabajo.nombre}</span>
                              </div>
                              
                              {seleccionado ? (
                                <div className="flex items-center space-x-3">
                                  {editando ? (
                                    <div className="relative">
                                      <input
                                        ref={inputRef}
                                        type="number"
                                        value={editandoValue}
                                        onChange={(e) => setEditandoValue(e.target.value)}
                                        onBlur={() => guardarPrecio(trabajo.id)}
                                        onKeyDown={(e) => handleKeyDown(e, trabajo.id)}
                                        className="w-28 text-right px-2 py-1 border-2 border-amber-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                                        step="0.01"
                                        min="0"
                                      />
                                      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-2 group">
                                      <button
                                        onClick={() => iniciarEdicionPrecio(trabajo.id, seleccionado.tarifa_aplicada)}
                                        className="flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors group"
                                        title="Doble clic o clic para editar precio"
                                      >
                                        <span className="text-gray-900 font-medium">
                                          {seleccionado.tarifa_aplicada?.toFixed(2)}€
                                        </span>
                                        <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">
                                  {parseFloat(trabajo.tarifa_base).toFixed(2)}€
                                </span>
                              )}
                            </div>
                            
                            {seleccionado && !readOnly && (
                              <div className="flex items-center space-x-4 mt-3 ml-8">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-500">Cantidad:</span>
                                  <input
                                    type="number"
                                    value={seleccionado.cantidad}
                                    onChange={(e) => actualizarCantidad(seleccionado.trabajo_id, e.target.value)}
                                    className="w-16 text-center px-2 py-1 border rounded text-sm"
                                    min="1"
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-500">Descuento:</span>
                                  <input
                                    type="number"
                                    value={seleccionado.descuento || 0}
                                    onChange={(e) => actualizarDescuento(seleccionado.trabajo_id, e.target.value)}
                                    className="w-16 text-center px-2 py-1 border rounded text-sm"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                  />
                                  <span className="text-xs text-gray-500">%</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs text-gray-500">Opcional:</span>
                                  <input
                                    type="checkbox"
                                    checked={seleccionado.opcional || false}
                                    onChange={(e) => actualizarOpcional(seleccionado.trabajo_id, e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                    title="Marcar como trabajo opcional"
                                  />
                                </div>
                              </div>
                            )}
                            
                            {seleccionado && readOnly && (
                              <div className="flex items-center space-x-4 mt-3 ml-8 text-xs text-gray-500">
                                <span>Cantidad: {seleccionado.cantidad || 1}</span>
                                {seleccionado.descuento > 0 && (
                                  <span>Descuento: {seleccionado.descuento}%</span>
                                )}
                                {seleccionado.opcional && (
                                  <span className="text-amber-600">⚠️ Opcional</span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12">
                        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No hay trabajos en esta familia</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {modoVista === 'tabla' && (
            <div className="space-y-4">
              {trabajosSeleccionados.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trabajo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Familia</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Precio</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Dto %</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cant</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Opcional</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        {!readOnly && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {trabajosSeleccionados.map((trabajo) => {
                        const familia = familias.find(f => f.id === trabajo.familia_id);
                        const editando = editandoPrecio === trabajo.trabajo_id;
                        
                        return (
                          <tr key={trabajo.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {trabajo.nombre}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {familia?.nombre || 'Sin familia'}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {editando ? (
                                <div className="relative inline-block">
                                  <input
                                    ref={inputRef}
                                    type="number"
                                    value={editandoValue}
                                    onChange={(e) => setEditandoValue(e.target.value)}
                                    onBlur={() => guardarPrecio(trabajo.trabajo_id)}
                                    onKeyDown={(e) => handleKeyDown(e, trabajo.trabajo_id)}
                                    className="w-24 text-right px-2 py-1 border-2 border-amber-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    step="0.01"
                                    min="0"
                                  />
                                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end space-x-2 group">
                                  <span className="text-gray-900 font-medium">
                                    {trabajo.tarifa_aplicada?.toFixed(2)}€
                                  </span>
                                  {!readOnly && (
                                    <button
                                      onClick={() => iniciarEdicionPrecio(trabajo.trabajo_id, trabajo.tarifa_aplicada)}
                                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors opacity-0 group-hover:opacity-100"
                                      title="Editar precio"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {readOnly ? (
                                <span>{trabajo.descuento || 0}%</span>
                              ) : (
                                <input
                                  type="number"
                                  value={trabajo.descuento || 0}
                                  onChange={(e) => actualizarDescuento(trabajo.trabajo_id, e.target.value)}
                                  className="w-16 text-right px-2 py-1 border rounded text-sm"
                                  step="0.1"
                                  min="0"
                                  max="100"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right">
                              {readOnly ? (
                                <span>{trabajo.cantidad || 1}</span>
                              ) : (
                                <input
                                  type="number"
                                  value={trabajo.cantidad || 1}
                                  onChange={(e) => actualizarCantidad(trabajo.trabajo_id, e.target.value)}
                                  className="w-16 text-right px-2 py-1 border rounded text-sm"
                                  min="1"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {readOnly ? (
                                trabajo.opcional ? (
                                  <span className="text-amber-600 text-xs">Opcional</span>
                                ) : (
                                  <span className="text-gray-400 text-xs">Obligatorio</span>
                                )
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={trabajo.opcional || false}
                                  onChange={(e) => actualizarOpcional(trabajo.trabajo_id, e.target.checked)}
                                  className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                              {(trabajo.total || 0).toFixed(2)}€
                            </td>
                            {!readOnly && (
                              <td className="px-4 py-3 text-sm text-center">
                                <button
                                  onClick={() => eliminarTrabajo(trabajo.id)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                      <tr>
                        <td colSpan={readOnly ? "6" : "7"} className="px-4 py-3 text-right font-bold text-gray-700">
                          TOTAL TRABAJOS:
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          {trabajosSeleccionados.reduce((sum, t) => sum + (t.total || 0), 0).toFixed(2)}€
                        </td>
                        {!readOnly && <td></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No hay trabajos seleccionados</p>
                  <p className="text-sm text-gray-400 mt-1">Ve a "Seleccionar trabajos" para añadir trabajos</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {trabajosSeleccionados.length > 0 && modoVista === 'selector' && !readOnly && (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-700 flex items-center">
              <Euro className="w-4 h-4 mr-2 text-gray-500" />
              Trabajos seleccionados ({trabajosSeleccionados.length})
            </h4>
            <button onClick={() => setModoVista('tabla')} className="text-xs text-gray-600 hover:text-gray-800">
              Ver detalles
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {trabajosSeleccionados.map((trabajo) => (
              <span key={trabajo.id} className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs bg-white border border-gray-200 text-gray-700">
                <span>{trabajo.nombre}</span>
                <span className="font-bold ml-1">{trabajo.tarifa_aplicada?.toFixed(2)}€</span>
                {trabajo.cantidad > 1 && <span className="text-xs">(x{trabajo.cantidad})</span>}
                {trabajo.descuento > 0 && <span className="text-xs">-{trabajo.descuento}%</span>}
                {trabajo.opcional && <span className="text-amber-600 text-xs ml-1">(Opcional)</span>}
                <button onClick={() => eliminarTrabajo(trabajo.id)} className="ml-1 hover:bg-gray-100 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs bg-gray-100 text-gray-700 font-bold">
              Total: {trabajosSeleccionados.reduce((sum, t) => sum + (t.total || 0), 0).toFixed(2)}€
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrabajosPorFamilia;