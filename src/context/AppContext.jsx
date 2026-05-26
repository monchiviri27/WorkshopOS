import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  
  const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';

  // Obtener usuario actual al cargar
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN') {
        fetchClients();
        fetchOrders();
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Cargar datos cuando hay usuario
  useEffect(() => {
    if (user) {
      fetchClients();
      fetchOrders();
    }
  }, [user]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching clients:', error.message);
      setError('Error al cargar clientes');
    }
  };

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('ordenes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      setOrders(data || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching orders:', error.message);
      setError('Error al cargar órdenes');
    } finally {
      setLoading(false);
    }
  };

  // Polling para producción (Vercel) - SOLO en listas, NO en detalle
  useEffect(() => {
    if (!user || !isProduction) return;
    
    // No hacer polling en página de detalle para no perder estado local
    if (window.location.pathname.includes('/reparacion/')) {
      console.log('📄 En página de detalle, polling desactivado');
      return;
    }
    
    console.log('🔄 Polling activado (cada 5 segundos) - Modo Vercel');
    
    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from('ordenes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (!error && data) {
        setOrders(data);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [user, isProduction]);

  const getActiveOrders = useCallback(() => {
    return orders.filter(o => o.status !== 'Entregado' && o.status !== 'Archivado');
  }, [orders]);

  const getCompletedOrders = useCallback(() => {
    return orders.filter(o => o.status === 'Entregado' || o.status === 'Archivado');
  }, [orders]);

  const fetchFullHistory = async (filters = {}) => {
    try {
      let query = supabase
        .from('ordenes')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching history:', error.message);
      throw error;
    }
  };

  const addStatusHistory = async (orderId, oldStatus, newStatus, userId) => {
    const historyEntry = {
      from: oldStatus,
      to: newStatus,
      date: new Date().toISOString(),
      user: userId || 'system'
    };

    const { data: order } = await supabase
      .from('ordenes')
      .select('status_history')
      .eq('id', orderId)
      .single();

    const currentHistory = order?.status_history || [];
    const updatedHistory = [...currentHistory, historyEntry];

    await supabase
      .from('ordenes')
      .update({ status_history: updatedHistory })
      .eq('id', orderId);
  };

  // Suscripciones en tiempo real - SOLO para desarrollo local (NO en Vercel)
  useEffect(() => {
    // En Vercel, NO usar WebSockets (solo polling)
    if (isProduction) {
      console.log('🌍 Modo Vercel: WebSockets deshabilitados, usando polling cada 5s');
      return;
    }
    
    if (!user) return;

    console.log('🔌 Modo local: Iniciando WebSockets en tiempo real...');

    const ordenesSubscription = supabase
      .channel('cambios-ordenes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes' }, (payload) => {
        console.log('🔄 Cambio detectado en tiempo real:', payload.eventType);
        if (payload.eventType === 'INSERT') {
          setOrders(prev => [payload.new, ...prev]);
        }
        if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(order => 
            order.id === payload.new.id ? payload.new : order
          ));
        }
        if (payload.eventType === 'DELETE') {
          setOrders(prev => prev.filter(order => order.id !== payload.old.id));
        }
      })
      .subscribe();

    const clientesSubscription = supabase
      .channel('cambios-clientes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setClients(prev => [payload.new, ...prev]);
        }
        if (payload.eventType === 'UPDATE') {
          setClients(prev => prev.map(client => 
            client.id === payload.new.id ? payload.new : client
          ));
        }
        if (payload.eventType === 'DELETE') {
          setClients(prev => prev.filter(client => client.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      console.log('🔌 Cerrando WebSockets (modo local)');
      supabase.removeChannel(ordenesSubscription);
      supabase.removeChannel(clientesSubscription);
    };
  }, [user, isProduction]);

  const generateBudgetLink = async (orderId) => {
    try {
      const { data: existingToken, error: checkError } = await supabase
        .from('budget_tokens')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (checkError) throw checkError;

      if (existingToken && existingToken.length > 0) {
        const token = existingToken[0];
        if (new Date(token.expires_at) > new Date()) {
          return {
            token: token.token,
            url: `${window.location.origin}/presupuesto/${token.token}`,
            expires_at: token.expires_at
          };
        }
      }

      const { data: newToken, error } = await supabase
        .from('budget_tokens')
        .insert([{ order_id: orderId }])
        .select()
        .single();

      if (error) throw error;

      return {
        token: newToken.token,
        url: `${window.location.origin}/presupuesto/${newToken.token}`,
        expires_at: newToken.expires_at
      };

    } catch (error) {
      console.error('Error generating budget link:', error);
      throw error;
    }
  };

  const uploadPhoto = async (file, orderId) => {
    try {
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('La foto no puede superar los 5MB');
      }
      
      if (!file.type.startsWith('image/')) {
        throw new Error('El archivo debe ser una imagen');
      }
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('ordenes-fotos')
        .upload(fileName, file);
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('ordenes-fotos')
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (error) {
      console.error('Error subiendo foto:', error);
      throw error;
    }
  };

  const deletePhoto = async (photoUrl) => {
    try {
      const urlParts = photoUrl.split('/');
      const fileName = urlParts.slice(urlParts.indexOf('ordenes-fotos') + 1).join('/');
      
      const { error } = await supabase.storage
        .from('ordenes-fotos')
        .remove([fileName]);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error eliminando foto:', error);
      throw error;
    }
  };

  const uploadMultiplePhotos = async (files, orderId) => {
    const results = [];
    const errors = [];
    
    for (const file of files) {
      try {
        const photoUrl = await uploadPhoto(file, orderId);
        results.push(photoUrl);
      } catch (error) {
        errors.push({ file: file.name, error: error.message });
      }
    }
    
    return { results, errors };
  };

  const createClient = async (clientData) => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert([{
          ...clientData,
          created_at: new Date().toISOString(),
          activo: true
        }])
        .select()
        .single();

      if (error) throw error;
      
      setClients(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating client:', error.message);
      throw error;
    }
  };

  const updateClient = async (clientId, updates) => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', clientId)
        .select()
        .single();

      if (error) throw error;
      
      setClients(prev => prev.map(client => 
        client.id === clientId ? { ...client, ...data } : client
      ));
      return data;
    } catch (error) {
      console.error('Error updating client:', error.message);
      throw error;
    }
  };

  const deleteClient = async (clientId) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ activo: false })
        .eq('id', clientId);

      if (error) throw error;
      
      setClients(prev => prev.filter(c => c.id !== clientId));
      return true;
    } catch (error) {
      console.error('Error deleting client:', error.message);
      throw error;
    }
  };

  const createOrder = async (orderData) => {
    try {
      const { data, error } = await supabase
        .from('ordenes')
        .insert([{
          ...orderData,
          created_at: new Date().toISOString(),
          status_history: [{
            from: null,
            to: orderData.status || 'Recibido',
            date: new Date().toISOString(),
            user: user?.id
          }]
        }])
        .select()
        .single();

      if (error) throw error;
      
      setOrders(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error creating order:', error.message);
      throw error;
    }
  };

  const updateOrder = async (orderId, updates) => {
    try {
      let finalUpdates = { ...updates };
      
      if (updates.status) {
        const currentOrder = orders.find(o => o.id === orderId);
        if (currentOrder && currentOrder.status !== updates.status) {
          await addStatusHistory(orderId, currentOrder.status, updates.status, user?.id);
        }
      }

      const { data, error } = await supabase
        .from('ordenes')
        .update(finalUpdates)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, ...data } : order
      ));
      
      return data;
    } catch (error) {
      console.error('Error updating order:', error.message);
      throw error;
    }
  };

  const getStats = useCallback(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const activeOrdersList = getActiveOrders();

    return {
      activeOrders: activeOrdersList.filter(o => o.status !== 'Rechazado').length,
      newClients: clients.filter(c => {
        const d = new Date(c.created_at);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      }).length,
      monthlyRevenue: orders
        .filter(o => o.status === 'Entregado' && o.paid === true)
        .reduce((sum, o) => sum + (o.budget || 0), 0),
      readyForPickup: orders.filter(o => o.status === 'Listo').length,
      pendingBudget: orders.filter(o => o.status === 'Presupuestado').length,
      inAnalysis: orders.filter(o => o.status === 'En análisis').length,
      inRepair: orders.filter(o => o.status === 'En reparación').length
    };
  }, [orders, clients, getActiveOrders]);

  const value = useMemo(() => ({
    orders,
    clients,
    loading,
    error,
    user,
    getActiveOrders,
    getCompletedOrders,
    createClient,
    updateClient,
    deleteClient,
    createOrder,
    updateOrder,
    getStats,
    generateBudgetLink,
    uploadPhoto,
    deletePhoto,
    uploadMultiplePhotos,
    fetchFullHistory,
    refreshData: () => {
      fetchClients();
      fetchOrders();
    }
  }), [orders, clients, loading, error, user, getActiveOrders, getCompletedOrders, getStats]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp debe usarse dentro de AppProvider');
  return context;
};