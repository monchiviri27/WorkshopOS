import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  Gem,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle,
  Printer,
  Copy,
  Search,
  X,
  MapPin,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus,
  Trash2,
  Package
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { generateReceptionPDF } from '../utils/pdfGenerator';

// Códigos de país con banderas
const phoneCodes = [
  { code: '+34', country: 'España', flag: 'https://flagcdn.com/es.svg', prefix: '+34' },
  { code: '+1', country: 'EE.UU./Canadá', flag: 'https://flagcdn.com/us.svg', prefix: '+1' },
  { code: '+52', country: 'México', flag: 'https://flagcdn.com/mx.svg', prefix: '+52' },
  { code: '+54', country: 'Argentina', flag: 'https://flagcdn.com/ar.svg', prefix: '+54' },
  { code: '+57', country: 'Colombia', flag: 'https://flagcdn.com/co.svg', prefix: '+57' },
  { code: '+56', country: 'Chile', flag: 'https://flagcdn.com/cl.svg', prefix: '+56' },
  { code: '+51', country: 'Perú', flag: 'https://flagcdn.com/pe.svg', prefix: '+51' },
  { code: '+58', country: 'Venezuela', flag: 'https://flagcdn.com/ve.svg', prefix: '+58' },
  { code: '+593', country: 'Ecuador', flag: 'https://flagcdn.com/ec.svg', prefix: '+593' },
  { code: '+591', country: 'Bolivia', flag: 'https://flagcdn.com/bo.svg', prefix: '+591' },
  { code: '+595', country: 'Paraguay', flag: 'https://flagcdn.com/py.svg', prefix: '+595' },
  { code: '+598', country: 'Uruguay', flag: 'https://flagcdn.com/uy.svg', prefix: '+598' },
  { code: '+502', country: 'Guatemala', flag: 'https://flagcdn.com/gt.svg', prefix: '+502' },
  { code: '+503', country: 'El Salvador', flag: 'https://flagcdn.com/sv.svg', prefix: '+503' },
  { code: '+504', country: 'Honduras', flag: 'https://flagcdn.com/hn.svg', prefix: '+504' },
  { code: '+505', country: 'Nicaragua', flag: 'https://flagcdn.com/ni.svg', prefix: '+505' },
  { code: '+506', country: 'Costa Rica', flag: 'https://flagcdn.com/cr.svg', prefix: '+506' },
  { code: '+507', country: 'Panamá', flag: 'https://flagcdn.com/pa.svg', prefix: '+507' },
  { code: '+53', country: 'Cuba', flag: 'https://flagcdn.com/cu.svg', prefix: '+53' },
  { code: '+1809', country: 'Rep. Dominicana', flag: 'https://flagcdn.com/do.svg', prefix: '+1809' },
  { code: '+33', country: 'Francia', flag: 'https://flagcdn.com/fr.svg', prefix: '+33' },
  { code: '+49', country: 'Alemania', flag: 'https://flagcdn.com/de.svg', prefix: '+49' },
  { code: '+44', country: 'Reino Unido', flag: 'https://flagcdn.com/gb.svg', prefix: '+44' },
  { code: '+39', country: 'Italia', flag: 'https://flagcdn.com/it.svg', prefix: '+39' },
  { code: '+351', country: 'Portugal', flag: 'https://flagcdn.com/pt.svg', prefix: '+351' },
  { code: '+55', country: 'Brasil', flag: 'https://flagcdn.com/br.svg', prefix: '+55' }
];

// Valores por defecto (fallback si no hay datos en BD)
const tiposJoyaDefault = [
  'Anillo', 'Collar', 'Pendientes', 'Pulsera', 'Reloj',
  'Medalla/Religiosa', 'Broche', 'Cadena', 'Gargantilla',
  'Diadema', 'Pulsera Pandora', 'Cadena Aristocrazy', 'Anillo Multiple',
  'Charm', 'Cadena con Colgante', 'Otro'
];

const tiposMaterialDefault = [
  'Oro amarillo 18k', 'Oro Amarillo', 'Oro blanco 18k', 'Oro rosa 18k',
  'Oro 14k', 'Oro 9k', 'Oro 24k','SMV', 'Plata 925', 'Perlas',
  'Titanio', 'Bronce', 'Cobre', 'Latón',
  'Rodio', 'Paladio', 'Platino', 'Acero',
  'Madera', 'Resina', 'Cuero', 'Pelo de Elefante', 'Otro'
];

function NuevaRecepcion() {
  const navigate = useNavigate();
  const { clients, orders, createClient, createOrder } = useApp();
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedPhoneCode, setSelectedPhoneCode] = useState(phoneCodes[0]);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cliente, setCliente] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  
  // Array de joyas para recepción múltiple
  const [joyas, setJoyas] = useState([
    { itemType: '', material: '', description: '', observations: '' }
  ]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [recepcionData, setRecepcionData] = useState(null);
  const [ordenesCreadas, setOrdenesCreadas] = useState([]);

  // Estados para tipos dinámicos
  const [tiposJoya, setTiposJoya] = useState(tiposJoyaDefault);
  const [tiposMaterial, setTiposMaterial] = useState(tiposMaterialDefault);
  const [showNuevoTipoModal, setShowNuevoTipoModal] = useState(false);
  const [showNuevoMaterialModal, setShowNuevoMaterialModal] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState('');
  const [nuevoMaterial, setNuevoMaterial] = useState('');
  const [cargandoTipos, setCargandoTipos] = useState(false);
  
  // Modales profesionales
  const [errorModal, setErrorModal] = useState(null);
  const [successModal, setSuccessModal] = useState(null);

  // Cargar tipos desde Supabase
  const cargarTiposJoya = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_joya')
        .select('nombre')
        .eq('activo', true)
        .order('nombre');
      
      if (!error && data && data.length > 0) {
        setTiposJoya(data.map(t => t.nombre));
      }
    } catch (error) {
      console.error('Error cargando tipos de joya:', error);
    }
  };

  const cargarTiposMaterial = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_material')
        .select('nombre')
        .eq('activo', true)
        .order('nombre');
      
      if (!error && data && data.length > 0) {
        setTiposMaterial(data.map(t => t.nombre));
      }
    } catch (error) {
      console.error('Error cargando materiales:', error);
    }
  };

  // Agregar nuevos tipos
  const agregarNuevoTipo = async () => {
    if (!nuevoTipo.trim()) {
      setErrorModal('Por favor, ingrese un nombre para el nuevo tipo de joya');
      return;
    }
    
    setCargandoTipos(true);
    try {
      const { data: existente, error: checkError } = await supabase
        .from('tipos_joya')
        .select('nombre')
        .eq('nombre', nuevoTipo.trim())
        .maybeSingle();
      
      if (existente) {
        setErrorModal(`El tipo "${nuevoTipo}" ya existe`);
        setCargandoTipos(false);
        return;
      }
      
      const { error } = await supabase
        .from('tipos_joya')
        .insert([{ nombre: nuevoTipo.trim() }]);
      
      if (error) throw error;
      
      await cargarTiposJoya();
      setNuevoTipo('');
      setShowNuevoTipoModal(false);
      setSuccessModal(`Tipo "${nuevoTipo}" añadido correctamente`);
      
    } catch (error) {
      console.error('Error al añadir tipo:', error);
      setErrorModal('Error al añadir el tipo de joya. Inténtalo de nuevo.');
    } finally {
      setCargandoTipos(false);
    }
  };

  const agregarNuevoMaterial = async () => {
    if (!nuevoMaterial.trim()) {
      setErrorModal('Por favor, ingrese un nombre para el nuevo material');
      return;
    }
    
    setCargandoTipos(true);
    try {
      const { data: existente, error: checkError } = await supabase
        .from('tipos_material')
        .select('nombre')
        .eq('nombre', nuevoMaterial.trim())
        .maybeSingle();
      
      if (existente) {
        setErrorModal(`El material "${nuevoMaterial}" ya existe`);
        setCargandoTipos(false);
        return;
      }
      
      const { error } = await supabase
        .from('tipos_material')
        .insert([{ nombre: nuevoMaterial.trim() }]);
      
      if (error) throw error;
      
      await cargarTiposMaterial();
      setNuevoMaterial('');
      setShowNuevoMaterialModal(false);
      setSuccessModal(`Material "${nuevoMaterial}" añadido correctamente`);
      
    } catch (error) {
      console.error('Error al añadir material:', error);
      setErrorModal('Error al añadir el material. Inténtalo de nuevo.');
    } finally {
      setCargandoTipos(false);
    }
  };

  // Cargar tipos al montar el componente
  useEffect(() => {
    cargarTiposJoya();
    cargarTiposMaterial();
  }, []);

  // Actualizar el teléfono completo cuando cambia el código o el número
  useEffect(() => {
    const fullPhone = phoneNumber ? `${selectedPhoneCode.prefix} ${phoneNumber}` : '';
    setCliente(prev => ({ ...prev, phone: fullPhone }));
  }, [selectedPhoneCode, phoneNumber]);

  // Generar número de recepción
  const generarNumeroRecepcion = async () => {
    try {
      const { data: lastRecepcion, error } = await supabase
        .from('recepciones')
        .select('recepcion_number')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error && error.code !== '42P01') throw error;

      let lastNumber = 0;
      
      if (lastRecepcion && lastRecepcion.length > 0 && lastRecepcion[0].recepcion_number) {
        const match = lastRecepcion[0].recepcion_number.match(/(?:BM|R-\d+-)\/?(\d+)/);
        if (match) {
          lastNumber = parseInt(match[1]);
        }
      }
      
      const newNumber = lastNumber + 1;
      return `BM/${newNumber}`;
    } catch (error) {
      console.error('Error generando número de recepción:', error);
      return `BM/1`;
    }
  };

  // Generar número de orden
  const generarNumeroOrden = async () => {
    const { data: lastOrder, error } = await supabase
      .from('ordenes')
      .select('order_number')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    let lastNumber = 0;
    
    if (lastOrder && lastOrder.length > 0 && lastOrder[0].order_number) {
      const match = lastOrder[0].order_number.match(/(?:LAM|B)\/(\d+)/);
      if (match) {
        lastNumber = parseInt(match[1]);
      }
    }
    
    const newNumber = lastNumber + 1;
    return `B/${newNumber}`;
  };

  // Funciones para manejar joyas
  const addJoya = () => {
    setJoyas([...joyas, { itemType: '', material: '', description: '', observations: '' }]);
  };

  const removeJoya = (index) => {
    if (joyas.length === 1) {
      setError('Debe haber al menos una joya');
      return;
    }
    const nuevasJoyas = joyas.filter((_, i) => i !== index);
    setJoyas(nuevasJoyas);
  };

  const updateJoya = (index, field, value) => {
    const nuevasJoyas = [...joyas];
    nuevasJoyas[index][field] = value;
    setJoyas(nuevasJoyas);
  };

  const areAllJoyasComplete = () => {
    return joyas.every(joya => 
      joya.itemType && joya.material && joya.description
    );
  };

  const isValidPhone = () => {
    const digits = phoneNumber.replace(/\D/g, '');
    return digits.length >= 6;
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm) ||
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, 5);

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    const phoneMatch = phoneCodes.find(c => client.phone.startsWith(c.prefix));
    if (phoneMatch) {
      setSelectedPhoneCode(phoneMatch);
      const numberPart = client.phone.replace(phoneMatch.prefix, '').trim();
      setPhoneNumber(numberPart);
    } else {
      setPhoneNumber(client.phone);
    }
    setCliente({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      address: client.address || ''
    });
    setShowClientSearch(false);
    setStep(2);
  };

  // Guardar recepción
  const handleGuardarRecepcion = async () => {
    if (!areAllJoyasComplete()) {
      setError('Complete todos los datos de las joyas');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let clientId = selectedClient?.id;
      if (!clientId) {
        const newClient = await createClient({
          name: cliente.name,
          phone: cliente.phone,
          email: cliente.email || null,
          address: cliente.address || null,
          notes: ''
        });
        clientId = newClient.id;
      }

      if (joyas.length === 1) {
        const orderNumber = await generarNumeroOrden();
        const newOrder = await createOrder({
          order_number: orderNumber,
          recepcion_id: null,
          client_id: clientId,
          client_name: cliente.name,
          client_phone: cliente.phone,
          client_email: cliente.email || null,
          item_type: joyas[0].itemType,
          material: joyas[0].material,
          description: joyas[0].description,
          observations: joyas[0].observations || null,
          status: 'Recibido',
          budget: null,
          budget_status: 'pendiente',
          photos: [],
          diagnosis: null,
          priority: 'Normal'
        });

        setRecepcionData(null);
        setOrdenesCreadas([newOrder]);
      } else {
        const recepcionNumber = await generarNumeroRecepcion();
        const { data: recepcion, error: recepcionError } = await supabase
          .from('recepciones')
          .insert([{
            recepcion_number: recepcionNumber,
            client_id: clientId,
            observaciones: joyas.some(j => j.observations) ? joyas.map(j => j.observations).filter(Boolean).join(' | ') : null,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (recepcionError) throw recepcionError;

        const ordenes = [];
        for (const joya of joyas) {
          const orderNumber = await generarNumeroOrden();
          const newOrder = await createOrder({
            order_number: orderNumber,
            recepcion_id: recepcion.id,
            client_id: clientId,
            client_name: cliente.name,
            client_phone: cliente.phone,
            client_email: cliente.email || null,
            item_type: joya.itemType,
            material: joya.material,
            description: joya.description,
            observations: joya.observations || null,
            status: 'Recibido',
            budget: null,
            budget_status: 'pendiente',
            photos: [],
            diagnosis: null,
            priority: 'Normal'
          });
          ordenes.push(newOrder);
        }

        setRecepcionData(recepcion);
        setOrdenesCreadas(ordenes);
      }

      setStep(3);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error guardando:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintClientPDF = () => {
    if (ordenesCreadas.length > 0 && (selectedClient || cliente)) {
      generateReceptionPDF(recepcionData, ordenesCreadas, cliente, 'cliente');
    }
  };

  const handlePrintWorkshopPDF = () => {
    if (ordenesCreadas.length > 0 && (selectedClient || cliente)) {
      generateReceptionPDF(recepcionData, ordenesCreadas, cliente, 'taller');
    }
  };

  const isStep1Complete = cliente.name && isValidPhone();
  const isStep2Complete = areAllJoyasComplete();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Nueva Recepción</h1>
            <p className="text-sm text-gray-500">Registrar entrada de joya(s) para análisis</p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            {['Cliente', 'Joyas', 'Resguardo'].map((label, idx) => (
              <div key={label} className="flex items-center flex-1">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
                  ${step > idx ? 'bg-gray-900 text-white' : step === idx + 1 ? 'border-2 border-gray-900 text-gray-900' : 'bg-gray-100 text-gray-400'}
                `}>
                  {step > idx ? <CheckCircle className="w-4 h-4" /> : idx + 1}
                </div>
                <span className={`ml-2 text-sm font-medium ${step >= idx + 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                  {label}
                </span>
                {idx < 2 && <div className="flex-1 h-px bg-gray-200 mx-4" />}
              </div>
            ))}
          </div>
        </div>
      </div>

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

      {showSuccess && (
        <div className="fixed top-4 right-4 z-50 animate-slide-down">
          <div className="bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>Recepción guardada</span>
          </div>
        </div>
      )}

      {/* PASO 1: Cliente */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <User className="w-5 h-5 mr-2 text-gray-700" />
            Datos del Cliente
          </h2>

          <div>
            <button
              onClick={() => setShowClientSearch(!showClientSearch)}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium flex items-center"
            >
              <Search className="w-4 h-4 mr-1" />
              {showClientSearch ? 'Cancelar búsqueda' : 'Buscar cliente existente'}
            </button>

            {showClientSearch && (
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Buscar por nombre, teléfono o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  autoFocus
                />
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                  {filteredClients.length > 0 ? (
                    filteredClients.map(client => (
                      <div
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="font-medium text-gray-800">{client.name}</p>
                          <p className="text-sm text-gray-500">{client.phone}</p>
                          {client.email && <p className="text-xs text-gray-400">{client.email}</p>}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">No se encontraron clientes</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-500 mb-4">O ingresa un cliente nuevo:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Nombre completo *"
                  value={cliente.name}
                  onChange={(e) => setCliente({...cliente, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                />
              </div>
              
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono *
                </label>
                <div className="flex">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowPhoneDropdown(!showPhoneDropdown)}
                      className="flex items-center space-x-2 px-3 py-2 border border-gray-200 rounded-l-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <img 
                        src={selectedPhoneCode.flag} 
                        alt={selectedPhoneCode.country}
                        className="w-5 h-5 object-cover rounded-sm"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <span className="text-sm font-medium">{selectedPhoneCode.prefix}</span>
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </button>
                    
                    {showPhoneDropdown && (
                      <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                        {phoneCodes.map((code) => (
                          <button
                            key={code.prefix}
                            onClick={() => {
                              setSelectedPhoneCode(code);
                              setShowPhoneDropdown(false);
                            }}
                            className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 text-left transition-colors"
                          >
                            <img 
                              src={code.flag} 
                              alt={code.country}
                              className="w-6 h-4 object-cover rounded-sm"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                            <span className="text-sm font-medium">{code.prefix}</span>
                            <span className="text-xs text-gray-500">{code.country}</span>
                            {selectedPhoneCode.prefix === code.prefix && (
                              <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <input
                    type="tel"
                    placeholder="612 345 678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-200 border-l-0 rounded-r-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  />
                </div>
                {phoneNumber && !isValidPhone() && (
                  <p className="text-xs text-red-500 mt-1">Mínimo 6 dígitos</p>
                )}
              </div>
              
              <input
                type="email"
                placeholder="Email (opcional)"
                value={cliente.email}
                onChange={(e) => setCliente({...cliente, email: e.target.value})}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Dirección (opcional)"
                value={cliente.address}
                onChange={(e) => setCliente({...cliente, address: e.target.value})}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent md:col-span-2"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!isStep1Complete}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>Continuar</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PASO 2: Múltiples Joyas */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Package className="w-5 h-5 mr-2 text-gray-700" />
              Joyas a reparar
            </h2>
            <button
              onClick={addJoya}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir joya</span>
            </button>
          </div>

          <div className="space-y-6">
            {joyas.map((joya, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 relative">
                {joyas.length > 1 && (
                  <button
                    onClick={() => removeJoya(index)}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Eliminar joya"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                
                <h3 className="font-medium text-gray-700 mb-3 text-sm">
                  Joya {index + 1} {joyas.length > 1 && `de ${joyas.length}`}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <select
                      value={joya.itemType}
                      onChange={(e) => updateJoya(index, 'itemType', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent pr-12"
                    >
                      <option value="">Tipo de joya *</option>
                      {tiposJoya.map(tipo => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNuevoTipoModal(true)}
                      className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Añadir nuevo tipo de joya"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="relative">
                    <select
                      value={joya.material}
                      onChange={(e) => updateJoya(index, 'material', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent pr-12"
                    >
                      <option value="">Material *</option>
                      {tiposMaterial.map(material => (
                        <option key={material} value={material}>{material}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNuevoMaterialModal(true)}
                      className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      title="Añadir nuevo material"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <textarea
                    value={joya.description}
                    onChange={(e) => updateJoya(index, 'description', e.target.value)}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    placeholder="Descripción del problema *"
                  />
                </div>

                <div className="mt-4">
                  <textarea
                    value={joya.observations}
                    onChange={(e) => updateJoya(index, 'observations', e.target.value)}
                    rows="1"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                    placeholder="Observaciones (opcional)"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-gray-600 flex-shrink-0" />
            <p className="text-sm text-gray-600">
              {joyas.length === 1 
                ? 'La joya recibirá su número de orden (B/X).'
                : 'Cada joya recibirá su propio número de orden (B/X) y todas estarán en el mismo resguardo (BM/X).'}
            </p>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
              <ChevronLeft className="w-4 h-4" />
              <span>Atrás</span>
            </button>
            <button
              onClick={handleGuardarRecepcion}
              disabled={!isStep2Complete || loading}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar recepción</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: Resguardo */}
      {step === 3 && ordenesCreadas.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-gray-700" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">¡Recepción completada!</h2>
            {recepcionData && (
              <p className="text-gray-500 mt-1">Nº de resguardo: {recepcionData.recepcion_number}</p>
            )}
            <p className="text-sm text-gray-400 mt-1">
              {ordenesCreadas.length} {ordenesCreadas.length === 1 ? 'joya registrada' : 'joyas registradas'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-3">Resumen</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Cliente:</span> {cliente.name}</p>
              <p><span className="text-gray-500">Teléfono:</span> {cliente.phone}</p>
              {recepcionData && (
                <p><span className="text-gray-500">Nº de resguardo:</span> {recepcionData.recepcion_number}</p>
              )}
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">JOYAS REGISTRADAS:</p>
              <div className="space-y-2">
                {ordenesCreadas.map((orden, idx) => (
                  <div key={orden.id} className="bg-white rounded p-2 text-sm">
                    <span className="font-mono text-xs text-gray-500">{orden.order_number}</span>
                    <p className="font-medium">{orden.item_type} · {orden.material}</p>
                    <p className="text-xs text-gray-500 line-clamp-1">{orden.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handlePrintClientPDF}
              className="w-full py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir resguardo cliente</span>
            </button>

            <button
              onClick={handlePrintWorkshopPDF}
              className="w-full py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>Imprimir copia taller</span>
            </button>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <button
              onClick={() => {
                setStep(1);
                setSelectedClient(null);
                setSelectedPhoneCode(phoneCodes[0]);
                setPhoneNumber('');
                setCliente({ name: '', phone: '', email: '', address: '' });
                setJoyas([{ itemType: '', material: '', description: '', observations: '' }]);
                setRecepcionData(null);
                setOrdenesCreadas([]);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Nueva recepción
            </button>
            <button
              onClick={() => navigate('/reparaciones-activas')}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              Ver reparaciones
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Nuevo tipo de joya */}
      {showNuevoTipoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="bg-gray-50 p-6 rounded-t-2xl border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Gem className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Nuevo tipo de joya</h3>
                  <p className="text-sm text-gray-600">Añade una nueva categoría</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <input
                type="text"
                value={nuevoTipo}
                onChange={(e) => setNuevoTipo(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Ej: Colgante, Broche, Llavero..."
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && agregarNuevoTipo()}
              />
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end space-x-3">
              <button
                onClick={() => setShowNuevoTipoModal(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={agregarNuevoTipo}
                disabled={!nuevoTipo.trim() || cargandoTipos}
                className="px-5 py-2.5 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {cargandoTipos ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nuevo material */}
      {showNuevoMaterialModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="bg-gray-50 p-6 rounded-t-2xl border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Gem className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Nuevo material</h3>
                  <p className="text-sm text-gray-600">Añade un nuevo tipo de material</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <input
                type="text"
                value={nuevoMaterial}
                onChange={(e) => setNuevoMaterial(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                placeholder="Ej: Platino, Titanio, Resina..."
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && agregarNuevoMaterial()}
              />
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end space-x-3">
              <button
                onClick={() => setShowNuevoMaterialModal(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={agregarNuevoMaterial}
                disabled={!nuevoMaterial.trim() || cargandoTipos}
                className="px-5 py-2.5 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {cargandoTipos ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ERROR PROFESIONAL */}
      {errorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-scale-up">
            <div className="bg-red-50 p-6 rounded-t-2xl border-b border-red-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Error</h3>
                  <p className="text-sm text-gray-600">No se pudo completar la acción</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700">{errorModal}</p>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setErrorModal(null)}
                className="px-5 py-2.5 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ÉXITO PROFESIONAL */}
      {successModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-scale-up">
            <div className="bg-green-50 p-6 rounded-t-2xl border-b border-green-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Completado</h3>
                  <p className="text-sm text-gray-600">Acción realizada con éxito</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700">{successModal}</p>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end">
              <button
                onClick={() => setSuccessModal(null)}
                className="px-5 py-2.5 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NuevaRecepcion;