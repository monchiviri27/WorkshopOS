import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      
      // Verificar si hay una sesión activa en sessionStorage
      const sessionActive = sessionStorage.getItem('session_active') === 'true';
      
      if (!sessionActive) {
        // Si no hay sesión activa en sessionStorage, hacer logout
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Obtener la sesión actual de Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setUser(null);
        sessionStorage.removeItem('session_active');
      } else {
        setUser(session.user);
      }
      setLoading(false);
    };
    
    checkSession();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        sessionStorage.removeItem('session_active');
        setUser(null);
      } else {
        setUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;