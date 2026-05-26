import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const NotificationContext = createContext();

// Límite de notificaciones guardadas en localStorage
const MAX_STORED_READ_IDS = 500;

// Detectar si estamos en producción (Vercel)
const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  
  const initialLoadDone = useRef(false);
  const subscriptionRef = useRef(null);

  // Limpiar localStorage antiguo periódicamente
  const cleanOldReadIds = useCallback((readIdsSet) => {
    if (readIdsSet.size > MAX_STORED_READ_IDS) {
      const idsArray = Array.from(readIdsSet);
      const recentIds = idsArray.slice(-MAX_STORED_READ_IDS);
      return new Set(recentIds);
    }
    return readIdsSet;
  }, []);

  // Cargar estado leído de localStorage
  const getReadFromStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem('notifications_read');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Asegurar que es un array
        const idsArray = Array.isArray(parsed) ? parsed : [];
        return new Set(idsArray);
      }
      return new Set();
    } catch (e) {
      console.error('Error leyendo localStorage:', e);
      return new Set();
    }
  }, []);

  const [readIds, setReadIds] = useState(() => getReadFromStorage());

  // Guardar en localStorage cuando cambie (con limpieza)
  useEffect(() => {
    try {
      const cleanedIds = cleanOldReadIds(readIds);
      if (cleanedIds !== readIds) {
        setReadIds(cleanedIds);
        return;
      }
      localStorage.setItem('notifications_read', JSON.stringify([...readIds]));
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
  }, [readIds, cleanOldReadIds]);

  // Función para mostrar toasts
  const showNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToast({ message, type, id });
    // Auto-limpiar después de 3 segundos
    setTimeout(() => {
      setToast(prev => prev?.id === id ? null : prev);
    }, 3000);
  }, []);

  // ============================================
  // NUEVO: Polling para notificaciones en Vercel
  // ============================================
  useEffect(() => {
    if (!isProduction) return;
    
    console.log('🔔 Polling de notificaciones activado (cada 5 segundos)');
    
    const interval = setInterval(async () => {
      try {
        const { data: tokens, error } = await supabase
          .from('budget_tokens')
          .select(`
            id,
            client_action,
            action_date,
            order_id,
            ordenes!inner (
              id,
              order_number,
              item_type,
              budget,
              client_id,
              clientes (
                name,
                phone
              )
            )
          `)
          .not('client_action', 'is', null)
          .order('action_date', { ascending: false })
          .limit(50);

        if (error) throw error;

        if (tokens && tokens.length > 0) {
          const formattedNotifications = tokens.map(token => {
            const orden = token.ordenes;
            const cliente = orden?.clientes;
            
            return {
              id: token.id,
              type: token.client_action === 'aceptado' ? 'success' : 'error',
              title: token.client_action === 'aceptado' 
                ? '✅ Presupuesto aceptado' 
                : '❌ Presupuesto rechazado',
              message: `${cliente?.name || 'Cliente'} ha ${
                token.client_action === 'aceptado' ? 'aceptado' : 'rechazado'
              } el presupuesto para ${orden?.item_type || 'la joya'} (${orden?.budget || 0}€)`,
              orderId: token.order_id,
              orderNumber: orden?.order_number,
              timestamp: token.action_date,
              read: readIds.has(token.id)
            };
          });

          setNotifications(formattedNotifications);
          
          const unread = formattedNotifications.filter(n => !n.read).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error('Error polling notificaciones:', error);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isProduction, readIds]);

  // Cargar notificaciones existentes
  const loadInitialNotifications = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: tokens, error } = await supabase
        .from('budget_tokens')
        .select(`
          id,
          client_action,
          action_date,
          order_id,
          ordenes!inner (
            id,
            order_number,
            item_type,
            budget,
            client_id,
            clientes (
              name,
              phone
            )
          )
        `)
        .not('client_action', 'is', null)
        .order('action_date', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (tokens && tokens.length > 0) {
        const formattedNotifications = tokens.map(token => {
          // Validación segura para evitar errores
          const orden = token.ordenes;
          const cliente = orden?.clientes;
          
          return {
            id: token.id,
            type: token.client_action === 'aceptado' ? 'success' : 'error',
            title: token.client_action === 'aceptado' 
              ? '✅ Presupuesto aceptado' 
              : '❌ Presupuesto rechazado',
            message: `${cliente?.name || 'Cliente'} ha ${
              token.client_action === 'aceptado' ? 'aceptado' : 'rechazado'
            } el presupuesto para ${orden?.item_type || 'la joya'} (${orden?.budget || 0}€)`,
            orderId: token.order_id,
            orderNumber: orden?.order_number,
            timestamp: token.action_date,
            read: readIds.has(token.id)
          };
        });

        setNotifications(formattedNotifications);
        
        const unread = formattedNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
      showNotification('Error al cargar notificaciones', 'error');
    } finally {
      setLoading(false);
    }
  }, [readIds, showNotification]);

  // Configurar suscripción en tiempo real (sin dependencia readIds)
  useEffect(() => {
    if (!initialLoadDone.current) {
      loadInitialNotifications();
      initialLoadDone.current = true;
    }

    // Limpiar suscripción anterior si existe
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    // Crear nueva suscripción
    const subscription = supabase
      .channel('notificaciones')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'budget_tokens',
          filter: 'client_action=neq.null'
        },
        async (payload) => {
          // Ignorar notificaciones antiguas (más de 10 segundos)
          const actionTime = new Date(payload.new.action_date).getTime();
          const now = Date.now();
          if (now - actionTime > 10000) return;
          
          // Ignorar si ya la tenemos en readIds
          if (readIds.has(payload.new.id)) return;
          
          try {
            // Obtener información de la orden con validación
            const { data: orderData, error } = await supabase
              .from('ordenes')
              .select(`
                id,
                order_number,
                item_type,
                budget,
                client_id,
                clientes (
                  name,
                  phone
                )
              `)
              .eq('id', payload.new.order_id)
              .single();

            if (error) throw error;

            const clienteName = orderData.clientes?.name || 'Cliente';
            
            const newNotification = {
              id: payload.new.id,
              type: payload.new.client_action === 'aceptado' ? 'success' : 'error',
              title: payload.new.client_action === 'aceptado' 
                ? '✅ Presupuesto aceptado' 
                : '❌ Presupuesto rechazado',
              message: `${clienteName} ha ${
                payload.new.client_action === 'aceptado' ? 'aceptado' : 'rechazado'
              } el presupuesto para ${orderData.item_type || 'la joya'} (${orderData.budget || 0}€)`,
              orderId: orderData.id,
              orderNumber: orderData.order_number,
              timestamp: payload.new.action_date,
              read: false
            };

            // Añadir notificación al principio
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Mostrar toast
            showNotification(
              newNotification.message,
              newNotification.type === 'success' ? 'success' : 'error'
            );
            
          } catch (error) {
            console.error('Error procesando notificación:', error);
          }
        }
      )
      .subscribe();

    subscriptionRef.current = subscription;

    // Limpiar al desmontar
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [loadInitialNotifications, showNotification, readIds]);

  // Marcar una notificación como leída
  const markAsRead = useCallback((id) => {
    setReadIds(prev => new Set(prev).add(id));
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Marcar una notificación como no leída
  const markAsUnread = useCallback((id) => {
    setReadIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: false } : n)
    );
    setUnreadCount(prev => prev + 1);
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map(n => n.id);
    setReadIds(prev => new Set([...prev, ...allIds]));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [notifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    toast,
    showNotification,
    markAsRead,
    markAsUnread,
    markAllAsRead
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Toast/Notificación flotante */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-down">
          <div className={`
            px-6 py-4 rounded-xl shadow-lg flex items-center space-x-3
            ${toast.type === 'success' ? 'bg-green-500 text-white' : ''}
            ${toast.type === 'error' ? 'bg-red-500 text-white' : ''}
            ${toast.type === 'info' ? 'bg-blue-500 text-white' : ''}
            ${toast.type === 'warning' ? 'bg-yellow-500 text-white' : ''}
          `}>
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {toast.type === 'info' && <Info className="w-5 h-5" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

// Hook personalizado
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications debe usarse dentro de NotificationProvider');
  }
  return context;
};

// Alias por compatibilidad
export const useNotification = useNotifications;