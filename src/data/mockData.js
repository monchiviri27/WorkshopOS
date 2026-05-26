// Datos de ejemplo para el taller de joyería
export const mockOrders = [
  {
    id: 'ORD-001',
    client: 'María García',
    clientId: 'CLI-001',
    item: 'Anillo de compromiso',
    description: 'Reengarzar diamante central y limpieza profunda',
    status: 'En reparación',
    priority: 'Alta',
    createdAt: '2026-03-01',
    estimatedDelivery: '2026-03-08',
    timeLeft: '2 días',
    materials: ['Oro blanco 18k', 'Diamante 0.5ct'],
    photos: ['/api/placeholder/100/100'],
    price: 350,
    paid: false
  },
  {
    id: 'ORD-002',
    client: 'Juan Pérez',
    clientId: 'CLI-002',
    item: 'Collar de perlas',
    description: 'Cambiar cierre y reemplazar 3 perlas',
    status: 'Esperando pieza',
    priority: 'Media',
    createdAt: '2026-02-28',
    estimatedDelivery: '2026-03-10',
    timeLeft: '5 días',
    materials: ['Cierre oro 14k', 'Perlas cultivadas'],
    photos: ['/api/placeholder/100/100'],
    price: 180,
    paid: true
  },
  {
    id: 'ORD-003',
    client: 'Ana López',
    clientId: 'CLI-003',
    item: 'Pendientes antiguos',
    description: 'Soldadura de gancho y baño de rodio',
    status: 'Presupuestado',
    priority: 'Baja',
    createdAt: '2026-03-02',
    estimatedDelivery: '2026-03-09',
    timeLeft: '3 días',
    materials: ['Rodio'],
    photos: ['/api/placeholder/100/100'],
    price: 95,
    paid: false
  },
  {
    id: 'ORD-004',
    client: 'Carlos Ruiz',
    clientId: 'CLI-004',
    item: 'Reloj de pulsera',
    description: 'Cambiar pila y ajustar correa',
    status: 'Listo',
    priority: 'Media',
    createdAt: '2026-02-25',
    estimatedDelivery: '2026-03-05',
    timeLeft: 'Hoy',
    materials: ['Pila Renata'],
    photos: ['/api/placeholder/100/100'],
    price: 45,
    paid: false
  },
  {
    id: 'ORD-005',
    client: 'Laura Martínez',
    clientId: 'CLI-005',
    item: 'Pulsera de plata',
    description: 'Acortar y grabar iniciales',
    status: 'Recibido',
    priority: 'Baja',
    createdAt: '2026-03-03',
    estimatedDelivery: '2026-03-10',
    timeLeft: '7 días',
    materials: ['Plata 925'],
    photos: ['/api/placeholder/100/100'],
    price: 60,
    paid: true
  }
];

export const mockClients = [
  {
    id: 'CLI-001',
    name: 'María García',
    email: 'maria.garcia@email.com',
    phone: '+34 612 345 678',
    address: 'Calle Mayor 123, Madrid',
    totalOrders: 5,
    totalSpent: 1250,
    lastOrder: '2026-03-01',
    favoriteJewelry: ['Anillos', 'Collares'],
    notes: 'Cliente VIP, prefiere oro blanco'
  },
  {
    id: 'CLI-002',
    name: 'Juan Pérez',
    email: 'juan.perez@email.com',
    phone: '+34 623 456 789',
    address: 'Av. Diagonal 456, Barcelona',
    totalOrders: 2,
    totalSpent: 320,
    lastOrder: '2026-02-28',
    favoriteJewelry: ['Relojes'],
    notes: 'Siempre pide presupuesto primero'
  },
  {
    id: 'CLI-003',
    name: 'Ana López',
    email: 'ana.lopez@email.com',
    phone: '+34 634 567 890',
    address: 'Plaza Nueva 78, Sevilla',
    totalOrders: 8,
    totalSpent: 2100,
    lastOrder: '2026-03-02',
    favoriteJewelry: ['Pendientes', 'Anillos'],
    notes: 'Colecciona joyas vintage'
  }
];

export const mockInventory = [
  {
    id: 'INV-001',
    name: 'Cierres de oro 14k',
    category: 'Cierres',
    stock: 12,
    minStock: 5,
    price: 8.50,
    supplier: 'Joyas Suministros SL'
  },
  {
    id: 'INV-002',
    name: 'Cierres de plata',
    category: 'Cierres',
    stock: 3,
    minStock: 10,
    price: 3.20,
    supplier: 'Plata Industrial'
  },
  {
    id: 'INV-003',
    name: 'Pilas Renata',
    category: 'Relojería',
    stock: 25,
    minStock: 10,
    price: 2.90,
    supplier: 'Relojes Suministros'
  },
  {
    id: 'INV-004',
    name: 'Perlas cultivadas 6mm',
    category: 'Perlas',
    stock: 8,
    minStock: 15,
    price: 12.00,
    supplier: 'Perlas del Sur'
  }
];

export const statsData = {
  activeOrders: 24,
  newClients: 12,
  monthlyRevenue: 3450,
  readyForPickup: 8,
  pendingApproval: 5,
  lowStock: 3
};