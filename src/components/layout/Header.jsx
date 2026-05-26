import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Bell, 
  Search, 
  User, 
  LogOut, 
  Settings, 
  HelpCircle,
  ChevronDown,
  X,
  Menu,
  Gem,
  Package,
  Users,
  Receipt,
  FileText,
  CheckCircle,
  XCircle,
  Plus
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useNotifications } from '../../context/NotificationContext';
import { supabase } from '../../lib/supabaseClient';

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orders, clients } = useApp();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const searchRef = useRef(null);

  // Cargar logo desde Supabase
  useEffect(() => {
    const loadLogo = async () => {
      try {
        const { data: config, error } = await supabase
          .from('configuracion')
          .select('logo_url')
          .single();

        if (!error && config?.logo_url) {
          setLogoUrl(config.logo_url);
        }
      } catch (error) {
        console.log('No se pudo cargar el logo');
      }
    };
    loadLogo();
  }, []);

  // Cerrar menús al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Buscar en órdenes y clientes
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const orderResults = orders
      .filter(o => 
        o.order_number?.toLowerCase().includes(term) ||
        o.client_name?.toLowerCase().includes(term) ||
        o.item_type?.toLowerCase().includes(term)
      )
      .slice(0, 5)
      .map(o => ({
        type: 'orden',
        id: o.id,
        title: o.order_number,
        subtitle: `${o.client_name} - ${o.item_type}`,
        path: `/reparacion/${o.id}`,
        icon: Package
      }));

    const clientResults = clients
      .filter(c => 
        c.name?.toLowerCase().includes(term) ||
        c.phone?.includes(term)
      )
      .slice(0, 3)
      .map(c => ({
        type: 'cliente',
        id: c.id,
        title: c.name,
        subtitle: c.phone,
        path: `/clientes?cliente=${c.id}`,
        icon: Users
      }));

    setSearchResults([...orderResults, ...clientResults]);
    setShowSearchResults(true);
  }, [searchTerm, orders, clients]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.length >= 2) {
      navigate(`/reparaciones-activas?buscar=${encodeURIComponent(searchTerm)}`);
      setShowSearchResults(false);
    }
  };

  const handleResultClick = (result) => {
    navigate(result.path);
    setShowSearchResults(false);
    setSearchTerm('');
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (notification.orderId) {
      navigate(`/reparacion/${notification.orderId}`);
    }
    setShowNotifications(false);
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('session_active');
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleNewReception = () => {
    navigate('/nueva-recepcion');
  };

  const getNotificationIcon = (type) => {
    if (type === 'success') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (type === 'error') return <XCircle className="w-4 h-4 text-red-500" />;
    return <Bell className="w-4 h-4 text-gray-500" />;
  };

  const formatNotificationDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    if (days < 7) return `Hace ${days} d`;
    return date.toLocaleDateString();
  };

  const getUserInitials = () => {
    return 'L';
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="px-4 md:px-6 py-3 flex items-center justify-between">
        {/* Logo + Buscador */}
        <div className="flex items-center flex-1 max-w-2xl">
          {/* Logo - Nueva posición a la izquierda */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 mr-4 hover:opacity-80 transition-opacity"
          >
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="h-6 w-auto object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="flex items-center space-x-2">
                <Gem className="w-8 h-8 text-gray-800" />
                <span className="text-xl font-bold tracking-tight text-gray-800 hidden sm:inline">TALLER</span>
              </div>
            )}
          </button>

          {/* Buscador */}
          <div className="relative flex-1 max-w-md" ref={searchRef}>
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar órdenes, clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:bg-white transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            {/* Resultados de búsqueda */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                {searchResults.map((result, index) => {
                  const Icon = result.icon;
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleResultClick(result)}
                      className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-0"
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-4 h-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{result.title}</p>
                        <p className="text-xs text-gray-500">{result.subtitle}</p>
                      </div>
                      <span className="text-xs text-gray-400 capitalize">{result.type}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Acciones derecha */}
        <div className="flex items-center space-x-2 md:space-x-3">
          {/* Botón Nueva Recepción */}
          <button
            onClick={handleNewReception}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
            title="Nueva recepción"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Nueva</span>
          </button>

          {/* Notificaciones */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Panel de notificaciones */}
            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-800">Notificaciones</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      Marcar todas
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {!notifications || notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No hay notificaciones</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${
                          !notif.read ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notif.type)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notif.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatNotificationDate(notif.timestamp)}
                            </p>
                          </div>
                          {!notif.read && (
                            <div className="w-2 h-2 bg-gray-500 rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
                {notifications && notifications.length > 0 && (
                  <div className="border-t border-gray-200 p-2 bg-gray-50">
                    <button
                      onClick={() => {
                        navigate('/notificaciones');
                        setShowNotifications(false);
                      }}
                      className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-1"
                    >
                      Ver todas las notificaciones
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Menú de usuario */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">{getUserInitials()}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Menú desplegable */}
            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <p className="text-sm font-medium text-gray-800">Administrador</p>
                  <p className="text-xs text-gray-500">tallersanchinarro@rubiorelojeros.com</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate('/configuracion');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Configuración</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate('/ayuda');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-700">Ayuda</span>
                  </button>
                  <div className="border-t border-gray-200 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-2.5 hover:bg-red-50 transition-colors text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Cerrar sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;