import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, User, Phone, Mail, Gem, Camera, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const tiposJoya = [
  'Anillo', 'Collar', 'Pendientes', 'Pulsera', 'Reloj',
  'Medalla/Religiosa', 'Broche', 'Cadenas', 'Gargantilla',
  'Diadema', 'Juego completo', 'Otro'
];

const tiposMaterial = [
  'Oro amarillo 18k', 'Oro blanco 18k', 'Oro rosa 18k',
  'Oro 14k', 'Oro 9k', 'Oro 24k', 'Plata 925', 'Plata ley',
  'Acero inoxidable', 'Titanio', 'Bronce', 'Cobre', 'Latón',
  'Rodio', 'Paladio', 'Platino', 'Acero quirúrgico',
  'Madera', 'Resina', 'Cuero', 'Otro'
];

function NewOrderModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { createClient, createOrder } = useApp();
  const [step, setStep] = useState(1);
  const [cliente, setCliente] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [recepcion, setRecepcion] = useState({
    itemType: '',
    material: '',
    description: '',
    observations: ''
  });

  if (!isOpen) return null;

  const generarNumeroRecepcion = () => {
    const fecha = new Date();
    const año = fecha.getFullYear().toString().slice(-2);
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `R-${año}${mes}${dia}-${random}`;
  };

  const handleGuardarRecepcion = () => {
    const newClient = createClient({
      name: cliente.name,
      phone: cliente.phone,
      email: cliente.email,
      address: cliente.address,
      createdAt: new Date().toISOString()
    });

    const orderNumber = generarNumeroRecepcion();
    const newOrder = createOrder({
      orderNumber,
      clientId: newClient.id,
      clientName: cliente.name,
      clientPhone: cliente.phone,
      clientEmail: cliente.email,
      itemType: recepcion.itemType,
      material: recepcion.material,
      description: recepcion.description,
      observations: recepcion.observations,
      status: 'Recibido',
      budget: null,
      budgetStatus: 'pendiente',
      createdAt: new Date().toISOString(),
      photos: []
    });

    onClose();
    navigate(`/reparacion/${newOrder.id}`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Nueva Recepción</h2>
            <p className="text-sm text-gray-500">Paso {step} de 2</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700 flex items-center">
                <User className="w-4 h-4 mr-2 text-primary-500" />
                Datos del cliente
              </h3>
              
              <input
                type="text"
                placeholder="Nombre completo *"
                value={cliente.name}
                onChange={(e) => setCliente({...cliente, name: e.target.value})}
                className="input-field"
              />
              
              <input
                type="tel"
                placeholder="Teléfono *"
                value={cliente.phone}
                onChange={(e) => setCliente({...cliente, phone: e.target.value})}
                className="input-field"
              />
              
              <input
                type="email"
                placeholder="Email (opcional)"
                value={cliente.email}
                onChange={(e) => setCliente({...cliente, email: e.target.value})}
                className="input-field"
              />
              
              <input
                type="text"
                placeholder="Dirección (opcional)"
                value={cliente.address}
                onChange={(e) => setCliente({...cliente, address: e.target.value})}
                className="input-field"
              />

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={!cliente.name || !cliente.phone}
                  className="btn-primary"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700 flex items-center">
                <Gem className="w-4 h-4 mr-2 text-primary-500" />
                Datos de la joya
              </h3>

              <select
                value={recepcion.itemType}
                onChange={(e) => setRecepcion({...recepcion, itemType: e.target.value})}
                className="input-field"
              >
                <option value="">Tipo de joya *</option>
                {tiposJoya.map(tipo => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>

              <select
                value={recepcion.material}
                onChange={(e) => setRecepcion({...recepcion, material: e.target.value})}
                className="input-field"
              >
                <option value="">Material *</option>
                {tiposMaterial.map(material => (
                  <option key={material} value={material}>{material}</option>
                ))}
              </select>

              <textarea
                value={recepcion.description}
                onChange={(e) => setRecepcion({...recepcion, description: e.target.value})}
                rows="4"
                className="input-field"
                placeholder="Descripción del problema / Trabajo a realizar *"
              />

              <textarea
                value={recepcion.observations}
                onChange={(e) => setRecepcion({...recepcion, observations: e.target.value})}
                rows="2"
                className="input-field"
                placeholder="Observaciones adicionales (opcional)"
              />

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep(1)}
                  className="btn-secondary"
                >
                  Atrás
                </button>
                <button
                  onClick={handleGuardarRecepcion}
                  disabled={!recepcion.itemType || !recepcion.material || !recepcion.description}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar recepción</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NewOrderModal;