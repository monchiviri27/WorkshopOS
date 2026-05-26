import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  FileText,
  Download,
  Search,
  Euro,
  CheckCircle,
  AlertCircle,
  Eye,
  X,
  Loader,
  DollarSign,
  Printer,
  User,
  Phone,
  Mail,
  MapPin,
  Building
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { generateFacturaPDF } from '../utils/pdfGeneratorFactura';

function Facturacion() {
  const navigate = useNavigate();
  const { orders, clients, updateOrder } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [previewClient, setPreviewClient] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Estados para el modal de éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Órdenes entregadas que se pueden facturar
  const deliveredOrders = orders.filter(o => 
    o.status === 'Entregado' && !o.invoiced && o.budget > 0
  );

  // Filtrar órdenes
  const filteredOrders = deliveredOrders.filter(order => {
    const client = clients.find(c => c.id === order.client_id);
    return (
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.item_type?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Cargar facturas existentes
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('facturas')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setInvoices(data || []);
      } catch (error) {
        console.error('Error cargando facturas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, []);

  const generarFactura = async () => {
    if (!selectedOrder) return;
    
    setGenerating(true);
    setError(null);
    
    try {
      const client = clients.find(c => c.id === selectedOrder.client_id);
      
      // 🔧 NUEVO FORMATO DE FACTURA: LAM/{numero_orden}-{año}
      const orderNumberMatch = selectedOrder.order_number.match(/LAM\/(\d+)/);
      const orderNum = orderNumberMatch ? orderNumberMatch[1] : '0';
      const añoActual = new Date().getFullYear();
      const numeroFactura = `B/${orderNum}-${añoActual}`;
      
      // Calcular base imponible e IVA
      const totalConIVA = selectedOrder.budget;
      const baseImponible = totalConIVA / 1.21;
      const iva = totalConIVA - baseImponible;
      
      const facturaData = {
        order_id: selectedOrder.id,
        numero: numeroFactura,
        fecha: new Date().toISOString(),
        cliente_nombre: client?.name || selectedOrder.client_name,
        cliente_nif: client?.nif || '',
        cliente_direccion: client?.address || '',
        cliente_email: client?.email || selectedOrder.client_email,
        concepto: `Reparación de ${selectedOrder.item_type} - ${selectedOrder.order_number}`,
        base_imponible: baseImponible,
        iva: iva,
        total: totalConIVA,
        estado: 'pagada'
      };

      // Guardar en Supabase
      const { data, error } = await supabase
        .from('facturas')
        .insert([facturaData])
        .select();

      if (error) throw error;

      // Marcar orden como facturada
      await updateOrder(selectedOrder.id, { invoiced: true });

      // Actualizar lista de facturas
      setInvoices([facturaData, ...invoices]);
      
      setShowInvoiceModal(false);
      setSelectedOrder(null);
      
      // Mostrar modal en lugar de alert
      setSuccessMessage('Factura generada correctamente');
      setShowSuccessModal(true);
      
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
      alert('Error al generar la factura: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  // Función para descargar PDF de factura
  const descargarFacturaPDF = async (factura) => {
    setDownloading(true);
    try {
      const order = orders.find(o => o.id === factura.order_id);
      const client = clients.find(c => c.id === order?.client_id) || {
        name: factura.cliente_nombre,
        phone: '',
        email: factura.cliente_email || '',
        address: factura.cliente_direccion || '',
        nif: factura.cliente_nif || ''
      };
      
      await generateFacturaPDF(factura, order, client);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF de la factura');
    } finally {
      setDownloading(false);
    }
  };

  // Función para previsualizar la factura
  const previsualizarFactura = async (factura) => {
    // Buscar la orden asociada
    const order = orders.find(o => o.id === factura.order_id);
    // Buscar el cliente asociado
    const client = clients.find(c => c.id === order?.client_id) || {
      name: factura.cliente_nombre,
      phone: '',
      email: factura.cliente_email || '',
      address: factura.cliente_direccion || '',
      nif: factura.cliente_nif || ''
    };
    
    setPreviewInvoice(factura);
    setPreviewOrder(order);
    setPreviewClient(client);
    setShowPreviewModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No disponible';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
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
      {/* Modal de previsualización de factura */}
      {showPreviewModal && previewInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-up">
            <div className="sticky top-0 bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <Eye className="w-5 h-5 mr-2 text-gray-700" />
                Vista previa de factura
              </h3>
              <button 
                onClick={() => setShowPreviewModal(false)} 
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Cabecera */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">FACTURA</h2>
                  <p className="text-sm text-gray-500">Nº {previewInvoice.numero}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Fecha</p>
                  <p className="font-medium">{formatDate(previewInvoice.fecha)}</p>
                </div>
              </div>

              {/* Datos empresa y cliente */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2 flex items-center">
                    <Building className="w-4 h-4 mr-2 text-gray-500" />
                    EMPRESA
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p className="font-medium">LAM-RELOJEROS S.L</p>
                    <p>C/ Margarita de Parma, 1</p>
                    <p>28050 Madrid</p>
                    <p>CIF: B-88615489</p>
                    <p>Tel: 672373275</p>
                    <p>Email: tallersanchinarro@rubiorelojeros.com</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2 flex items-center">
                    <User className="w-4 h-4 mr-2 text-gray-500" />
                    CLIENTE
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p className="font-medium">{previewClient?.name || previewInvoice.cliente_nombre}</p>
                    {previewClient?.nif && <p>NIF: {previewClient.nif}</p>}
                    {previewClient?.phone && (
                      <p className="flex items-center">
                        <Phone className="w-3 h-3 mr-1 text-gray-400" />
                        {previewClient.phone}
                      </p>
                    )}
                    {previewClient?.email && (
                      <p className="flex items-center">
                        <Mail className="w-3 h-3 mr-1 text-gray-400" />
                        {previewClient.email}
                      </p>
                    )}
                    {previewClient?.address && (
                      <p className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                        {previewClient.address}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Concepto */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-700 mb-2">CONCEPTO</h3>
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {previewInvoice.concepto}
                </div>
              </div>

              {/* Detalle de trabajos */}
              {previewOrder?.trabajos?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">DETALLE DE TRABAJOS</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Trabajo</th>
                          <th className="px-3 py-2 text-center">Cant.</th>
                          <th className="px-3 py-2 text-right">Precio</th>
                          <th className="px-3 py-2 text-right">Dto.</th>
                          <th className="px-3 py-2 text-right">Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewOrder.trabajos.map((t, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="px-3 py-2">{t.nombre}</td>
                            <td className="px-3 py-2 text-center">{t.cantidad || 1}</td>
                            <td className="px-3 py-2 text-right">{t.tarifa_aplicada?.toFixed(2)}€</td>
                            <td className="px-3 py-2 text-center">{t.descuento ? `${t.descuento}%` : '-'}</td>
                            <td className="px-3 py-2 text-right font-medium">{(t.total || 0).toFixed(2)}€</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Fallos detectados */}
              {previewOrder?.fallos?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-3">FALLOS DETECTADOS</h3>
                  <div className="space-y-2">
                    {previewOrder.fallos.map((f, idx) => (
                      <div key={idx} className="bg-gray-50 p-2 rounded-lg text-sm">
                        <span className="font-medium">{f.nombre}</span>
                        {f.observaciones && (
                          <span className="text-xs text-gray-500 ml-2">({f.observaciones})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totales */}
              <div className="flex justify-end">
                <div className="w-64 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Base imponible</span>
                      <span>{previewInvoice.base_imponible?.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">IVA (21%)</span>
                      <span>{previewInvoice.iva?.toFixed(2)}€</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span>TOTAL</span>
                        <span className="text-gray-900">{previewInvoice.total?.toFixed(2)}€</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nota legal */}
              <div className="text-xs text-gray-400 text-center border-t pt-4">
                <p>Documento no válido como factura hasta su pago.</p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 p-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  descargarFacturaPDF(previewInvoice);
                }}
                className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de éxito - NUEVO MODAL QUE REEMPLAZA EL ALERT */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-scale-up">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">¡Factura generada!</h3>
              <p className="text-gray-600">{successMessage}</p>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-center">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <Receipt className="w-6 h-6 mr-2 text-gray-800" />
            Facturación
          </h1>
          <p className="text-sm text-gray-500">
            Genera y gestiona las facturas de tus reparaciones
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Buscador */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por orden, cliente o joya..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
          />
        </div>
      </div>

      {/* Lista de órdenes para facturar */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-700">Órdenes pendientes de facturar</h2>
          <p className="text-sm text-gray-500">{filteredOrders.length} reparaciones entregadas</p>
        </div>
        
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No hay órdenes pendientes de facturar</p>
            <button
              onClick={() => navigate('/historial')}
              className="mt-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Ver historial
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredOrders.map((order) => {
              const client = clients.find(c => c.id === order.client_id);
              return (
                <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {order.order_number}
                        </span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Entregado
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {client?.name || order.client_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.item_type} · {order.material}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Total</p>
                        <p className="text-lg font-bold text-gray-900">{order.budget}€</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowInvoiceModal(true);
                        }}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Facturar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial de facturas */}
      {invoices.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-700">Historial de facturas</h2>
            <p className="text-sm text-gray-500">{invoices.length} facturas emitidas</p>
          </div>
          <div className="divide-y divide-gray-200">
            {invoices.slice(0, 10).map((invoice) => (
              <div key={invoice.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-sm font-medium text-gray-900">
                        {invoice.numero}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(invoice.fecha)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{invoice.cliente_nombre}</p>
                    <p className="text-xs text-gray-500">{invoice.concepto}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <p className="font-bold text-gray-900">{invoice.total?.toFixed(2)}€</p>
                    <button 
                      onClick={() => previsualizarFactura(invoice)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Ver factura"
                    >
                      <Eye className="w-4 h-4 text-gray-500" />
                    </button>
                    <button 
                      onClick={() => descargarFacturaPDF(invoice)}
                      disabled={downloading}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Descargar PDF"
                    >
                      {downloading ? (
                        <Loader className="w-4 h-4 animate-spin text-gray-500" />
                      ) : (
                        <Download className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de confirmación de factura */}
      {showInvoiceModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <Receipt className="w-5 h-5 mr-2 text-gray-700" />
                Generar factura
              </h3>
              <button onClick={() => setShowInvoiceModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Orden</p>
                <p className="font-medium">{selectedOrder.order_number}</p>
                <p className="text-sm text-gray-500 mt-2">Cliente</p>
                <p className="font-medium">
                  {clients.find(c => c.id === selectedOrder.client_id)?.name || selectedOrder.client_name}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Base imponible</span>
                  <span>{(selectedOrder.budget / 1.21).toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IVA (21%)</span>
                  <span>{(selectedOrder.budget - (selectedOrder.budget / 1.21)).toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                  <span className="text-gray-800">Total</span>
                  <span className="text-gray-900">{selectedOrder.budget}€</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={generarFactura}
                disabled={generating}
                className="px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 flex items-center space-x-2 disabled:opacity-50"
              >
                {generating ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span>Generar factura</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Facturacion;