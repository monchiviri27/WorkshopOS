import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Gem,
  Phone,
  Mail,
  ThumbsUp,
  ThumbsDown,
  Loader,
  Wrench,
  AlertTriangle,
  Euro,
  Calendar,
  User,
  Package,
  FileText,
  Shield,
  Percent,
  Building,
  MapPin
} from 'lucide-react';

function PresupuestoPublico() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);
  const [client, setClient] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [actionTaken, setActionTaken] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [updating, setUpdating] = useState(false);
  const [empresaConfig, setEmpresaConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);
  
  // Estado para trabajos opcionales seleccionados por el cliente (inicialmente vacío)
  const [opcionalesSeleccionados, setOpcionalesSeleccionados] = useState([]);

  const IVA_PORCENTAJE = 21;

  // 👇 NUEVA VARIABLE: Detectar si es presupuesto no realizable
  const esNoRealizable = order?.status === 'Rechazado' && order?.budget === 0;

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data: config, error } = await supabase
          .from('configuracion')
          .select('*')
          .single();

        if (!error && config) {
          const empresa = config.empresa || {};
          const direccionCompleta = `${empresa.direccion || ''}${empresa.cp ? `, ${empresa.cp}` : ''}`;
          
          setEmpresaConfig({
            nombre: empresa.nombre || 'LAM-RELOJEROS S.L',
            logo_url: config.logo_url || null,
            telefono: empresa.telefono || '672373275',
            email: empresa.email || 'tallersanchinarro@rubiorelojeros.com',
            direccionCompleta: direccionCompleta,
            ciudad: empresa.ciudad || 'Madrid',
            cif: empresa.cif || 'B-88615489'
          });
        }
      } catch (error) {
        console.error('Error cargando configuración:', error);
      } finally {
        setConfigLoading(false);
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    if (token) {
      loadBudgetData();
    }
  }, [token]);

  const loadBudgetData = async () => {
    try {
      try {
        await supabase.rpc('set_app_current_token', { token_value: token });
      } catch (rpcError) {
        console.warn('RPC falló, intentando método alternativo:', rpcError);
        await supabase.query(`SET app.current_token = '${token}'`);
      }

      const { data: tokenData, error: tokenError } = await supabase
        .from('budget_tokens')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (tokenError || !tokenData) {
        throw new Error('Enlace no válido');
      }

      if (new Date(tokenData.expires_at) < new Date()) {
        throw new Error('Este enlace ha expirado (válido 7 días)');
      }

      setTokenInfo(tokenData);

      await supabase
        .from('budget_tokens')
        .update({ 
          viewed_at: new Date().toISOString(),
          user_agent: navigator.userAgent.substring(0, 255)
        })
        .eq('id', tokenData.id);

      const { data: orderData, error: orderError } = await supabase
        .from('ordenes')
        .select('*')
        .eq('id', tokenData.order_id)
        .maybeSingle();

      if (orderError || !orderData) {
        throw new Error('Error al cargar el presupuesto');
      }
      setOrder(orderData);

      // 👇 CORREGIDO: Inicializar como vacío (el cliente debe marcar si quiere incluir opcionales)
      setOpcionalesSeleccionados([]);

      const { data: clientData, error: clientError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', orderData.client_id)
        .maybeSingle();

      if (!clientError && clientData) {
        setClient(clientData);
      }

      if (tokenData.client_action) {
        setActionTaken(true);
        setActionMessage(tokenData.client_action === 'aceptado' 
          ? '✅ Ya has aceptado este presupuesto. Gracias por confiar en nuestro taller.' 
          : '❌ Ya has rechazado este presupuesto. Si cambias de opinión, contáctanos.');
      }

    } catch (error) {
      console.error('Error loading budget:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClientResponse = async (response) => {
    if (actionTaken || updating) return;

    setUpdating(true);

    try {
      await supabase.rpc('set_app_current_token', { token_value: token });

      const { error: tokenError } = await supabase
        .from('budget_tokens')
        .update({ 
          client_action: response,
          action_date: new Date().toISOString()
        })
        .eq('id', tokenInfo.id);

      if (tokenError) throw tokenError;

      const trabajosObligatorios = order.trabajos?.filter(t => !t.opcional) || [];
      const trabajosOpcionalesSeleccionados = order.trabajos?.filter(t => 
        t.opcional && opcionalesSeleccionados.includes(t.trabajo_id)
      ) || [];
      const trabajosFinales = [...trabajosObligatorios, ...trabajosOpcionalesSeleccionados];
      
      const nuevoTotal = trabajosFinales.reduce((sum, t) => sum + (t.total || 0), 0);
      const nuevoDescuento = order.budget_discount || 0;
      const nuevoTotalConDescuento = nuevoTotal - nuevoDescuento;

      const { error: orderError } = await supabase
        .from('ordenes')
        .update({ 
          budget_status: response,
          status: response === 'aceptado' ? 'Aceptado' : 'Rechazado',
          budget: nuevoTotalConDescuento,
          trabajos: trabajosFinales
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      setActionTaken(true);
      setActionMessage(response === 'aceptado' 
        ? '✅ ¡Presupuesto aceptado! En breve nos pondremos con la reparación.'
        : '❌ Presupuesto rechazado. Si tienes alguna duda, no dudes en contactarnos.');

    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar tu respuesta. Por favor, inténtalo de nuevo o contáctanos.');
    } finally {
      setUpdating(false);
    }
  };

  const toggleOpcional = (trabajoId) => {
    if (opcionalesSeleccionados.includes(trabajoId)) {
      setOpcionalesSeleccionados(opcionalesSeleccionados.filter(id => id !== trabajoId));
    } else {
      setOpcionalesSeleccionados([...opcionalesSeleccionados, trabajoId]);
    }
  };

  const calcularTotalesDinamicos = () => {
    if (!order) return null;
    
    const trabajosObligatorios = order.trabajos?.filter(t => !t.opcional) || [];
    const totalObligatorio = trabajosObligatorios.reduce((sum, t) => sum + (t.total || 0), 0);
    
    const trabajosOpcionalesSeleccionados = order.trabajos?.filter(t => 
      t.opcional && opcionalesSeleccionados.includes(t.trabajo_id)
    ) || [];
    const totalOpcional = trabajosOpcionalesSeleccionados.reduce((sum, t) => sum + (t.total || 0), 0);
    
    const subtotalConIVA = totalObligatorio + totalOpcional;
    const descuento = order.budget_discount || 0;
    const totalConIVA = subtotalConIVA - descuento;
    const baseImponible = totalConIVA / (1 + IVA_PORCENTAJE / 100);
    const iva = totalConIVA - baseImponible;
    
    return {
      totalConIVA,
      descuento,
      baseImponible,
      iva,
      subtotalConIVA,
      totalObligatorio,
      totalOpcional
    };
  };

  const totales = calcularTotalesDinamicos();

  if (loading || configLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-200 border-t-gray-600 mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg">Cargando presupuesto...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">Enlace no válido</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a href="/" className="inline-flex items-center px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors">
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header con logo y datos de empresa */}
        <div className="bg-white rounded-t-2xl shadow-xl p-8 border-b border-gray-200">
          <div className="flex justify-center mb-6">
            {empresaConfig?.logo_url ? (
              <img 
                src={empresaConfig.logo_url} 
                alt="Logo" 
                className="h-16 w-auto object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center shadow-lg">
                <Gem className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          
          <div className="text-center mb-6">
            <br></br>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {empresaConfig?.direccionCompleta || 'C/ Margarita de Parma Nº1' }
              </span>
              <span className="flex items-center">
                <Phone className="w-3 h-3 mr-1" />
                {empresaConfig?.telefono || '672373275'}
              </span>
              <span className="flex items-center">
                <Mail className="w-3 h-3 mr-1" />
                {empresaConfig?.email || 'tallersanchinarro@rubiorelojeros.com'}
              </span>
              <span className="flex items-center">
                <Building className="w-3 h-3 mr-1" />
                {empresaConfig?.cif || 'B-88615489'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Presupuesto</h1>
              <p className="text-sm text-gray-500 flex items-center mt-1">
                <FileText className="w-4 h-4 mr-1" />
                Referencia: {order?.order_number || 'N/A'}
              </p>
            </div>
            <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-xl">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Válido hasta</p>
                <p className="font-medium text-gray-800">
                  {tokenInfo?.expires_at ? new Date(tokenInfo.expires_at).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  }) : 'No disponible'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {actionTaken ? (
          <div className="bg-white rounded-b-2xl shadow-xl p-12 text-center">
            <div className={`w-24 h-24 ${actionMessage.includes('aceptado') ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-6`}>
              {actionMessage.includes('aceptado') ? (
                <CheckCircle className="w-12 h-12 text-green-600" />
              ) : (
                <XCircle className="w-12 h-12 text-red-600" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {actionMessage.includes('aceptado') ? '¡Gracias por confiar en nosotros!' : 'Entendido'}
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">{actionMessage}</p>
          </div>
        ) : (
          <div className="bg-white rounded-b-2xl shadow-xl p-8 space-y-6">
            
            {/* Información del cliente */}
            {client && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-gray-600" />
                  Tus datos
                </h3>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900 text-lg">{client.name}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                      <span className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-1 text-gray-400" />
                        {client.phone}
                      </span>
                      {client.email && (
                        <span className="flex items-center text-sm text-gray-600">
                          <Mail className="w-4 h-4 mr-1 text-gray-400" />
                          {client.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Información de la joya */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2 text-gray-600" />
                Tu joya
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Tipo</p>
                  <p className="font-medium text-gray-800">{order?.item_type || 'No especificado'}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Material</p>
                  <p className="font-medium text-gray-800">{order?.material || 'No especificado'}</p>
                </div>
              </div>
              <div className="mt-4 bg-white rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Descripción</p>
                <p className="text-gray-700">{order?.description || 'Sin descripción'}</p>
              </div>
            </div>

            {/* Fallos detectados */}
            {order?.fallos && order.fallos.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2 text-gray-600" />
                  Fallos detectados
                </h3>
                <div className="space-y-3">
                  {order.fallos.map((fallo, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <AlertTriangle className="w-3 h-3 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{fallo.nombre}</p>
                            {fallo.observaciones && (
                              <p className="text-sm text-gray-500 mt-1">📝 {fallo.observaciones}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trabajos a realizar - CON OPCIONALES */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
                <Wrench className="w-5 h-5 mr-2 text-gray-600" />
                Trabajos a realizar
              </h3>
              
              {order?.trabajos && order.trabajos.length > 0 ? (
                <div className="space-y-3">
                  {order.trabajos.map((trabajo, index) => {
                    const esOpcional = trabajo.opcional === true;
                    const estaSeleccionado = opcionalesSeleccionados.includes(trabajo.trabajo_id);
                    
                    return (
                      <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Wrench className="w-3 h-3 text-gray-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-gray-800">{trabajo.nombre}</p>
                                {esOpcional && (
                                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                    Opcional
                                  </span>
                                )}
                              </div>
                              {trabajo.cantidad > 1 && (
                                <p className="text-xs text-gray-500">Cantidad: {trabajo.cantidad}</p>
                              )}
                              {trabajo.descuento > 0 && (
                                <p className="text-xs text-green-600">Descuento: {trabajo.descuento}%</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 sm:space-x-6 pl-9 sm:pl-0">
                            <div className="text-right">
                              <p className="text-sm text-gray-500">Precio</p>
                              <p className="font-medium text-gray-800">{trabajo.tarifa_aplicada?.toFixed(2)}€</p>
                            </div>
                            {trabajo.cantidad > 1 && (
                              <div className="text-right">
                                <p className="text-sm text-gray-500">Subtotal</p>
                                <p className="font-medium text-gray-800">{(trabajo.total || 0).toFixed(2)}€</p>
                              </div>
                            )}
                            {esOpcional && (
                              <div className="text-right">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={estaSeleccionado}
                                    onChange={() => toggleOpcional(trabajo.trabajo_id)}
                                    className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                                  />
                                  <span className="text-sm text-gray-600">Incluir</span>
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                        {esOpcional && !estaSeleccionado && (
                          <div className="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                            💡 Si quieres incluir este trabajo opcional, marca la casilla "Incluir"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white rounded-lg p-8 text-center border-2 border-dashed border-gray-200">
                  <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No se han especificado trabajos</p>
                </div>
              )}
            </div>

            {/* Resumen de trabajos opcionales seleccionados */}
            {totales?.totalOpcional > 0 && (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <h4 className="font-medium text-amber-800 text-sm mb-2 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Trabajos adicionales seleccionados
                </h4>
                <p className="text-amber-700 text-sm">
                  Has añadido <strong>{totales.totalOpcional.toFixed(2)}€</strong> en trabajos opcionales.
                </p>
              </div>
            )}

            {/* Totales DINÁMICOS */}
            {totales && (
              <div className="bg-gray-100 rounded-xl p-6 border border-gray-300">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Trabajos obligatorios</span>
                    <span className="font-medium">{totales.totalObligatorio.toFixed(2)}€</span>
                  </div>
                  {totales.totalOpcional > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Trabajos adicionales</span>
                      <span className="font-medium text-amber-600">{totales.totalOpcional.toFixed(2)}€</span>
                    </div>
                  )}
                  {totales.descuento > 0 && (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">{totales.subtotalConIVA.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-green-600">
                        <span>Descuento</span>
                        <span>- {totales.descuento.toFixed(2)}€</span>
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                    <span className="text-gray-600">Base imponible</span>
                    <span className="font-medium">{totales.baseImponible.toFixed(2)}€</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 flex items-center">
                      <Percent className="w-3 h-3 mr-1" />
                      IVA ({IVA_PORCENTAJE}%)
                    </span>
                    <span>{totales.iva.toFixed(2)}€</span>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t-2 border-gray-400 mt-2">
                    <span className="font-bold text-gray-800 text-lg">TOTAL (IVA incluido)</span>
                    <span className="text-2xl font-bold text-green-600">{totales.totalConIVA.toFixed(2)}€</span>
                  </div>
                </div>
                
                {order?.budget_notes && (
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <p className="text-sm text-gray-600 flex items-start">
                      <Shield className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0 mt-0.5" />
                      <span>📋 {order.budget_notes}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 👇 MODIFICADO: Botones de acción SOLO si NO es no realizable */}
            {!esNoRealizable && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <button
                  onClick={() => handleClientResponse('aceptado')}
                  disabled={updating}
                  className="bg-green-600 text-white py-4 rounded-xl hover:bg-green-700 transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center justify-center space-x-3 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {updating ? (
                    <Loader className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <ThumbsUp className="w-6 h-6" />
                      <span>Aceptar presupuesto</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleClientResponse('rechazado')}
                  disabled={updating}
                  className="bg-red-600 text-white py-4 rounded-xl hover:bg-red-700 transition-all transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center justify-center space-x-3 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {updating ? (
                    <Loader className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <ThumbsDown className="w-6 h-6" />
                      <span>Rechazar presupuesto</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 👇 NUEVO: Mensaje para presupuesto no realizable */}
            {esNoRealizable && (
              <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-xl text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-red-800 mb-2">Trabajo no realizable</h3>
                <p className="text-red-700">
                  Lamentamos informarle que, tras evaluar su {order?.item_type || 'joya'},<br />
                  no es posible realizar la reparación solicitada.
                </p>
                <p className="text-red-600 mt-4 text-sm">
                  Por favor, póngase en contacto con nuestro taller para más información.
                </p>
                <div className="mt-6 pt-4 border-t border-red-200">
                  <p className="text-sm text-gray-600">
                    <strong>Teléfono:</strong> {empresaConfig?.telefono || '672373275'}<br />
                    <strong>Email:</strong> {empresaConfig?.email || 'tallersanchinarro@rubiorelojeros.com'}
                  </p>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center mt-4">
              ⚡ Al aceptar, confirmas que estás de acuerdo con el presupuesto presentado.
              {totales?.totalOpcional > 0 && ' Los trabajos adicionales seleccionados se incluirán en la reparación.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PresupuestoPublico;