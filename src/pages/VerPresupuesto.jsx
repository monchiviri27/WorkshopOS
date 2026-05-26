import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  Clock,
  AlertCircle,
  Gem,
  Phone,
  Mail,
  Wrench,
  AlertTriangle,
  Percent,
  User,
  Package,
  FileText,
  Shield,
  Building,
  MapPin,
  ArrowLeft
} from 'lucide-react';

function VerPresupuesto() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);
  const [client, setClient] = useState(null);
  const [empresaConfig, setEmpresaConfig] = useState(null);

  const IVA_PORCENTAJE = 21;

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const cargarDatos = async () => {
    try {
      // Cargar orden
      const { data: orderData, error: orderError } = await supabase
        .from('ordenes')
        .select('*')
        .eq('id', id)
        .single();

      if (orderError || !orderData) throw new Error('Presupuesto no encontrado');
      setOrder(orderData);

      // Cargar cliente
      const { data: clientData, error: clientError } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', orderData.client_id)
        .single();

      if (!clientError && clientData) setClient(clientData);

      // Cargar configuración empresa
      const { data: config, error: configError } = await supabase
        .from('configuracion')
        .select('*')
        .single();

      if (!configError && config) {
        const empresa = config.empresa || {};
        setEmpresaConfig({
          nombre: empresa.nombre || 'LAM-RELOJEROS S.L',
          logo_url: config.logo_url || null,
          telefono: empresa.telefono || '672373275',
          email: empresa.email || 'info@lam-relojeros.com',
          direccion: empresa.direccion || 'C/ Margarita de Parma Nº1',
          ciudad: empresa.ciudad || 'Madrid',
          cp: empresa.cp || '28050',
          cif: empresa.cif || 'B-88615489'
        });
      }

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const calcularTotales = () => {
    if (!order) return null;
    
    const totalConIVA = order.budget || 0;
    const descuento = order.budget_discount || 0;
    const baseImponible = totalConIVA / (1 + IVA_PORCENTAJE / 100);
    const iva = totalConIVA - baseImponible;
    const subtotalConIVA = totalConIVA + descuento;
    
    return { totalConIVA, descuento, baseImponible, iva, subtotalConIVA };
  };

  const totales = calcularTotales();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800">Presupuesto no encontrado</h1>
          <p className="text-gray-500 mt-2">{error || 'No se pudo cargar el presupuesto'}</p>
          <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg">
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Botón volver */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>

        {/* Header */}
        <div className="bg-white rounded-t-2xl shadow-xl p-8 border-b border-gray-200">
          <div className="flex justify-center mb-6">
            {empresaConfig?.logo_url ? (
              <img src={empresaConfig.logo_url} alt="Logo" className="h-16 w-auto object-contain" />
            ) : (
              <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center shadow-lg">
                <Gem className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          
          <div className="text-center mb-6">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" />{empresaConfig?.direccion}</span>
              <span className="flex items-center"><Phone className="w-3 h-3 mr-1" />{empresaConfig?.telefono}</span>
              <span className="flex items-center"><Mail className="w-3 h-3 mr-1" />{empresaConfig?.email}</span>
              <span className="flex items-center"><Building className="w-3 h-3 mr-1" />{empresaConfig?.cif}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">PRESUPUESTO</h1>
              <p className="text-sm text-gray-500">Nº {order.order_number}</p>
            </div>
            <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-xl">
              <Clock className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Fecha</p>
                <p className="font-medium text-gray-800">{new Date(order.budget_date || order.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-b-2xl shadow-xl p-8 space-y-6">
          {/* Cliente */}
          {client && (
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-gray-600" />
                Datos del cliente
              </h3>
              <p className="font-medium text-gray-900">{client.name}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center"><Phone className="w-4 h-4 mr-1 text-gray-400" />{client.phone}</span>
                {client.email && <span className="flex items-center"><Mail className="w-4 h-4 mr-1 text-gray-400" />{client.email}</span>}
              </div>
            </div>
          )}

          {/* Joya */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2 text-gray-600" />
              Joya a reparar
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Tipo</p><p className="font-medium">{order.item_type}</p></div>
              <div><p className="text-xs text-gray-500">Material</p><p className="font-medium">{order.material}</p></div>
            </div>
            <div className="mt-3"><p className="text-xs text-gray-500">Descripción</p><p className="text-gray-700">{order.description}</p></div>
          </div>

          {/* Trabajos */}
          {order.trabajos?.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">TRABAJOS REALIZADOS</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="px-3 py-2 text-left">Trabajo</th><th className="px-3 py-2 text-right">Importe</th></tr></thead>
                <tbody>
                  {order.trabajos.map((t, idx) => (
                    <tr key={idx} className="border-b"><td className="px-3 py-2">{t.nombre}</td><td className="px-3 py-2 text-right">{t.total?.toFixed(2)}€</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Fallos */}
          {order.fallos?.length > 0 && (
            <div><h3 className="font-semibold text-gray-700 mb-3">FALLOS DETECTADOS</h3>
              {order.fallos.map((f, idx) => <div key={idx} className="bg-gray-50 p-2 rounded mb-2"><span className="font-medium">{f.nombre}</span>{f.observaciones && <span className="text-xs text-gray-500 ml-2">({f.observaciones})</span>}</div>)}
            </div>
          )}

          {/* Totales */}
          {totales && (
            <div className="bg-gray-100 rounded-xl p-6 border border-gray-300">
              <div className="space-y-2">
                {totales.descuento > 0 && <div className="flex justify-between"><span>Subtotal</span><span>{totales.subtotalConIVA.toFixed(2)}€</span></div>}
                {totales.descuento > 0 && <div className="flex justify-between text-green-600"><span>Descuento</span><span>-{totales.descuento.toFixed(2)}€</span></div>}
                <div className="flex justify-between"><span>Base imponible</span><span>{totales.baseImponible.toFixed(2)}€</span></div>
                <div className="flex justify-between"><span>IVA (21%)</span><span>{totales.iva.toFixed(2)}€</span></div>
                <div className="border-t pt-2 mt-2"><div className="flex justify-between font-bold"><span>TOTAL</span><span className="text-xl">{totales.totalConIVA.toFixed(2)}€</span></div></div>
              </div>
              {order.budget_notes && <p className="mt-3 text-sm text-gray-600">📋 {order.budget_notes}</p>}
            </div>
          )}

          {/* Nota legal */}
          <div className="text-center text-xs text-gray-400 pt-4 border-t">
            <p>Presupuesto generado por LAM-RELOJEROS S.L - Documento informativo</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerPresupuesto;