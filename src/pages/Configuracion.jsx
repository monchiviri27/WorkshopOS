import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Percent,
  Users,
  Shield,
  Database,
  Save,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  Mail,
  Phone,
  MapPin,
  Globe,
  CreditCard,
  Upload,
  Image,
  Trash2,
  Download,
  FileSpreadsheet,
  FileJson,
  Receipt,
  Lock,
  KeyRound,
  UploadCloud,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useNotifications } from '../context/NotificationContext';

function Configuracion() {
  const { showNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState('empresa');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [configPassword, setConfigPassword] = useState('');
  
  const [config, setConfig] = useState({
    empresa: {
      nombre: 'LAM-RELOJEROS S.L',
      cif: 'B-88615489',
      telefono: '672373275',
      email: 'tallersanchinarro@rubiorelojeros.com',
      direccion: 'C/ Margarita, Nº1',
      ciudad: 'Madrid',
      cp: '28050',
      web: 'www.rubiorelojeros.com',
      cuentaBancaria: ''
    },
    impuestos: {
      iva: 21,
      irpf: 0
    },
    notificaciones: {
      email_presupuesto: true,
      email_factura: true,
      email_recordatorio: false
    },
    config_password: ''
  });

  // Cargar la contraseña desde Supabase para validar después
  useEffect(() => {
    const loadPassword = async () => {
      try {
        const { data, error } = await supabase
          .from('configuracion')
          .select('config_password')
          .single();
        
        if (!error && data?.config_password) {
          setConfigPassword(data.config_password);
        }
      } catch (error) {
        console.error('Error cargando contraseña:', error);
      }
    };
    loadPassword();
  }, []);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (password === configPassword) {
      setIsAuthenticated(true);
      setPasswordError('');
      setPassword('');
      loadConfig();
    } else {
      setPasswordError('Contraseña incorrecta');
    }
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('*')
        .single();

      if (!error && data) {
        setConfig(data);
        setConfigPassword(data.config_password || '');
      }
      
      const { data: logoData } = await supabase
        .from('configuracion')
        .select('logo_url')
        .single();
      
      if (logoData?.logo_url) {
        setLogoPreview(logoData.logo_url);
      }
      
    } catch (error) {
      console.log('Usando configuración por defecto');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let logoUrl = logoPreview;
      
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('logos')
            .getPublicUrl(fileName);
          logoUrl = urlData.publicUrl;
        }
      }

      const configToSave = {
        id: 1,
        empresa: config.empresa,
        impuestos: config.impuestos,
        notificaciones: config.notificaciones,
        logo_url: logoUrl,
        config_password: configPassword || config.config_password,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('configuracion')
        .upsert(configToSave);

      if (error) throw error;

      if (configPassword) {
        setConfig(prev => ({ ...prev, config_password: configPassword }));
      }

      showNotification('Configuración guardada correctamente', 'success');
      
    } catch (error) {
      console.error('Error guardando:', error);
      showNotification('Error al guardar la configuración', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  // ========== FUNCIONES DE EXPORTACIÓN ==========
  
  const exportToCSV = (data, filename, headers) => {
    const csvRows = [];
    csvRows.push(headers.map(h => `"${h}"`).join(','));
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header.toLowerCase()] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToJSON = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportClientes = async (format = 'csv') => {
    setExporting(true);
    try {
      const { data: clientes, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (format === 'csv') {
        exportToCSV(clientes, `clientes_${new Date().toISOString().slice(0, 10)}.csv`, ['ID', 'Nombre', 'NIF', 'Teléfono', 'Email', 'Dirección', 'Notas', 'Fecha']);
      } else {
        exportToJSON(clientes, `clientes_${new Date().toISOString().slice(0, 10)}.json`);
      }
      
      showNotification(`Exportados ${clientes.length} clientes`, 'success');
    } catch (error) {
      console.error('Error exportando clientes:', error);
      showNotification('Error al exportar clientes', 'error');
    } finally {
      setExporting(false);
    }
  };

  const exportOrdenes = async (format = 'csv') => {
    setExporting(true);
    try {
      const { data: ordenes, error } = await supabase
        .from('ordenes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (format === 'csv') {
        exportToCSV(ordenes, `ordenes_${new Date().toISOString().slice(0, 10)}.csv`, ['ID', 'Nº Orden', 'Cliente', 'Tipo', 'Material', 'Estado', 'Presupuesto', 'Fecha']);
      } else {
        exportToJSON(ordenes, `ordenes_${new Date().toISOString().slice(0, 10)}.json`);
      }
      
      showNotification(`Exportadas ${ordenes.length} órdenes`, 'success');
    } catch (error) {
      console.error('Error exportando órdenes:', error);
      showNotification('Error al exportar órdenes', 'error');
    } finally {
      setExporting(false);
    }
  };

  const exportFacturas = async (format = 'csv') => {
    setExporting(true);
    try {
      const { data: facturas, error } = await supabase
        .from('facturas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (format === 'csv') {
          exportToCSV([], `facturas_${new Date().toISOString().slice(0, 10)}.csv`, ['ID', 'Nº Factura', 'Cliente', 'Total', 'Fecha']);
        } else {
          exportToJSON([], `facturas_${new Date().toISOString().slice(0, 10)}.json`);
        }
        showNotification('No hay facturas para exportar', 'info');
        return;
      }
      
      if (format === 'csv') {
        exportToCSV(facturas, `facturas_${new Date().toISOString().slice(0, 10)}.csv`, ['ID', 'Nº Factura', 'Cliente', 'Total', 'Fecha']);
      } else {
        exportToJSON(facturas, `facturas_${new Date().toISOString().slice(0, 10)}.json`);
      }
      
      showNotification(`Exportadas ${facturas.length} facturas`, 'success');
    } catch (error) {
      console.error('Error exportando facturas:', error);
      showNotification('Error al exportar facturas', 'error');
    } finally {
      setExporting(false);
    }
  };

  const exportTodo = async () => {
    setExporting(true);
    try {
      const [clientes, ordenes, facturas] = await Promise.all([
        supabase.from('clientes').select('*'),
        supabase.from('ordenes').select('*'),
        supabase.from('facturas').select('*')
      ]);
      
      const exportData = {
        fecha_exportacion: new Date().toISOString(),
        version: '1.0',
        clientes: clientes.data || [],
        ordenes: ordenes.data || [],
        facturas: facturas.data || [],
        configuracion: config
      };
      
      exportToJSON(exportData, `backup_completo_${new Date().toISOString().slice(0, 10)}.json`);
      showNotification('Backup completo exportado correctamente', 'success');
    } catch (error) {
      console.error('Error exportando todo:', error);
      showNotification('Error al exportar backup completo', 'error');
    } finally {
      setExporting(false);
    }
  };

  // ========== FUNCIÓN DE RESTAURACIÓN ==========
  
  const restaurarBackup = async (file) => {
    if (!window.confirm('⚠️ Esta acción sobrescribirá los datos actuales. ¿Estás seguro de continuar?')) {
      return;
    }
    
    setRestoring(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        
        if (!backup.clientes || !backup.ordenes) {
          throw new Error('Archivo de backup no válido');
        }
        
        const resumen = `
          📋 Resumen del backup:
          - Clientes: ${backup.clientes.length}
          - Órdenes: ${backup.ordenes.length}
          - Facturas: ${backup.facturas?.length || 0}
          
          ¿Confirmas la restauración?
        `;
        
        if (!window.confirm(resumen)) {
          setRestoring(false);
          return;
        }
        
        if (backup.configuracion) {
          await supabase.from('configuracion').upsert({ id: 1, ...backup.configuracion });
        }
        
        if (backup.clientes.length > 0) {
          await supabase.from('clientes').upsert(backup.clientes);
        }
        
        if (backup.ordenes.length > 0) {
          await supabase.from('ordenes').upsert(backup.ordenes);
        }
        
        if (backup.facturas && backup.facturas.length > 0) {
          await supabase.from('facturas').upsert(backup.facturas);
        }
        
        showNotification('✅ Backup restaurado correctamente', 'success');
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        
      } catch (error) {
        console.error('Error restaurando backup:', error);
        showNotification(`Error al restaurar: ${error.message}`, 'error');
      } finally {
        setRestoring(false);
      }
    };
    
    reader.onerror = () => {
      showNotification('Error al leer el archivo', 'error');
      setRestoring(false);
    };
    
    reader.readAsText(file);
  };

  const handleRestoreClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      if (e.target.files && e.target.files[0]) {
        restaurarBackup(e.target.files[0]);
      }
    };
    input.click();
  };

  // ========== FUNCIÓN BORRAR DATOS DE PRUEBA ==========
  
  const borrarDatosPrueba = async () => {
    const confirmar = window.confirm(
      '⚠️ ¿ESTÁS SEGURO?\n\n' +
      'Esta acción eliminará TODOS los datos de prueba:\n' +
      '• Clientes\n' +
      '• Órdenes\n' +
      '• Facturas\n' +
      '• Tokens de presupuesto\n\n' +
      'Esta acción NO se puede deshacer.\n\n' +
      '¿Confirmas que quieres continuar?'
    );
    
    if (!confirmar) return;
    
    const confirmar2 = window.prompt(
      '⚠️ CONFIRMACIÓN FINAL\n\n' +
      'Escribe "BORRAR" para confirmar la eliminación de TODOS los datos:'
    );
    
    if (confirmar2 !== 'BORRAR') {
      showNotification('❌ Operación cancelada - Texto incorrecto', 'error');
      return;
    }
    
    setLoading(true);
    
    try {
      await supabase.from('budget_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('ordenes_trabajos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('facturas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('ordenes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('clientes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      showNotification('✅ Todos los datos han sido eliminados correctamente', 'success');
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error borrando datos:', error);
      showNotification('❌ Error al borrar los datos: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'empresa', label: 'Empresa', icon: Building },
    { id: 'impuestos', label: 'Impuestos', icon: Percent },
    { id: 'notificaciones', label: 'Notificaciones', icon: Mail },
    { id: 'datos', label: 'Datos', icon: Database }
  ];

  // Pantalla de autenticación
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 rounded-2xl mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Acceso restringido</h1>
            <p className="text-gray-500 mt-2">Introduce la contraseña para acceder a la configuración</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-500"
                    placeholder="••••••••"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-red-500 text-sm mt-2">{passwordError}</p>
                )}
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
              >
                Acceder
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con botón para cerrar sesión */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <Settings className="w-6 h-6 mr-2 text-gray-800" />
            Configuración
          </h1>
          <p className="text-sm text-gray-500">
            Gestiona los ajustes de tu taller de joyería
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setIsAuthenticated(false);
              setPassword('');
              setPasswordError('');
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2 text-sm"
          >
            <Lock className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Guardar cambios</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-all
                  ${isActive 
                    ? 'border-b-2 border-gray-900 text-gray-900 bg-white' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Empresa */}
          {activeTab === 'empresa' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Building className="w-5 h-5 mr-2 text-gray-600" />
                Datos de la empresa
              </h3>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo de la empresa
                </label>
                <div className="flex items-start space-x-4">
                  <div className="w-32 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <Image className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <label className="cursor-pointer bg-white border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors flex items-center space-x-2">
                        <Upload className="w-4 h-4 text-gray-600" />
                        <span className="text-sm">Subir logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </label>
                      {logoPreview && (
                        <button
                          onClick={handleRemoveLogo}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Formatos: JPG, PNG. Tamaño recomendado: 200x200px
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la empresa
                  </label>
                  <input
                    type="text"
                    value={config.empresa.nombre}
                    onChange={(e) => setConfig({...config, empresa: {...config.empresa, nombre: e.target.value}})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CIF / NIF
                  </label>
                  <input
                    type="text"
                    value={config.empresa.cif}
                    onChange={(e) => setConfig({...config, empresa: {...config.empresa, cif: e.target.value}})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={config.empresa.telefono}
                    onChange={(e) => setConfig({...config, empresa: {...config.empresa, telefono: e.target.value}})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={config.empresa.email}
                    onChange={(e) => setConfig({...config, empresa: {...config.empresa, email: e.target.value}})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={config.empresa.direccion}
                    onChange={(e) => setConfig({...config, empresa: {...config.empresa, direccion: e.target.value}})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={config.empresa.ciudad}
                    onChange={(e) => setConfig({...config, empresa: {...config.empresa, ciudad: e.target.value}})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código Postal
                  </label>
                  <input
                    type="text"
                    value={config.empresa.cp}
                    onChange={(e) => setConfig({...config, empresa: {...config.empresa, cp: e.target.value}})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sitio web
                  </label>
                  <input
                    type="text"
                    value={config.empresa.web}
                    onChange={(e) => setConfig({...config, empresa: {...config.empresa, web: e.target.value}})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cuenta bancaria (IBAN)
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={config.empresa.cuentaBancaria}
                      onChange={(e) => setConfig({...config, empresa: {...config.empresa, cuentaBancaria: e.target.value}})}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                      placeholder="ES00 0000 0000 0000 0000 0000"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    IBAN para facturas
                  </p>
                </div>
                
                {/* Campo para cambiar contraseña - MEJORADO */}
                <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña de acceso a configuración
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={configPassword}
                      onChange={(e) => setConfigPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-2 flex items-center space-x-2">
                    <div className="text-xs text-gray-500">
                      {!configPassword ? (
                        <span className="text-amber-600">⚠️ Actualmente no hay contraseña configurada</span>
                      ) : (
                        <span>🔒 Contraseña configurada actualmente</span>
                      )}
                    </div>
                    {configPassword && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('¿Estás seguro de que quieres eliminar la contraseña?')) {
                            setConfigPassword('');
                            showNotification('Contraseña eliminada. La configuración quedará sin protección.', 'warning');
                          }
                        }}
                        className="text-xs text-red-600 hover:text-red-700 underline"
                      >
                        Eliminar contraseña
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    💡 Deja el campo vacío para mantener la contraseña actual.
                    {!configPassword && <span> Establece una contraseña para proteger esta página.</span>}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Impuestos */}
          {activeTab === 'impuestos' && (
            <div className="space-y-6 max-w-md">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Percent className="w-5 h-5 mr-2 text-gray-600" />
                Configuración de impuestos
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IVA (%)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={config.impuestos.iva}
                    onChange={(e) => setConfig({...config, impuestos: {...config.impuestos, iva: parseFloat(e.target.value) || 0}})}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                    step="0.1"
                  />
                  <span className="text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Porcentaje de IVA aplicado a los presupuestos y facturas
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IRPF (%)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={config.impuestos.irpf}
                    onChange={(e) => setConfig({...config, impuestos: {...config.impuestos, irpf: parseFloat(e.target.value) || 0}})}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
                    step="0.1"
                  />
                  <span className="text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Porcentaje de retención IRPF (opcional)
                </p>
              </div>
            </div>
          )}

          {/* Notificaciones */}
          {activeTab === 'notificaciones' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Mail className="w-5 h-5 mr-2 text-gray-600" />
                Notificaciones
              </h3>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.notificaciones.email_presupuesto}
                    onChange={(e) => setConfig({
                      ...config,
                      notificaciones: {...config.notificaciones, email_presupuesto: e.target.checked}
                    })}
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <span className="text-sm text-gray-700">Enviar email cuando se genere un presupuesto</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.notificaciones.email_factura}
                    onChange={(e) => setConfig({
                      ...config,
                      notificaciones: {...config.notificaciones, email_factura: e.target.checked}
                    })}
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <span className="text-sm text-gray-700">Enviar email cuando se genere una factura</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.notificaciones.email_recordatorio}
                    onChange={(e) => setConfig({
                      ...config,
                      notificaciones: {...config.notificaciones, email_recordatorio: e.target.checked}
                    })}
                    className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <span className="text-sm text-gray-700">Enviar recordatorios de recogida</span>
                </label>
              </div>
            </div>
          )}

          {/* Datos */}
          {activeTab === 'datos' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Database className="w-5 h-5 mr-2 text-gray-600" />
                Gestión de datos
              </h3>
              
              {/* Exportar datos */}
              <div>
                <h4 className="font-medium text-gray-700 mb-3">Exportar datos</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <FileSpreadsheet className="w-8 h-8 text-green-600 mb-2" />
                    <h5 className="font-medium text-gray-800">Clientes</h5>
                    <p className="text-xs text-gray-500 mt-1">Exportar lista de clientes</p>
                    <div className="flex space-x-2 mt-3">
                      <button
                        onClick={() => exportClientes('csv')}
                        disabled={exporting}
                        className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        CSV
                      </button>
                      <button
                        onClick={() => exportClientes('json')}
                        disabled={exporting}
                        className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        JSON
                      </button>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <FileText className="w-8 h-8 text-blue-600 mb-2" />
                    <h5 className="font-medium text-gray-800">Órdenes</h5>
                    <p className="text-xs text-gray-500 mt-1">Exportar todas las reparaciones</p>
                    <div className="flex space-x-2 mt-3">
                      <button
                        onClick={() => exportOrdenes('csv')}
                        disabled={exporting}
                        className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        CSV
                      </button>
                      <button
                        onClick={() => exportOrdenes('json')}
                        disabled={exporting}
                        className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        JSON
                      </button>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <Receipt className="w-8 h-8 text-purple-600 mb-2" />
                    <h5 className="font-medium text-gray-800">Facturas</h5>
                    <p className="text-xs text-gray-500 mt-1">Exportar historial de facturas</p>
                    <div className="flex space-x-2 mt-3">
                      <button
                        onClick={() => exportFacturas('csv')}
                        disabled={exporting}
                        className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        CSV
                      </button>
                      <button
                        onClick={() => exportFacturas('json')}
                        disabled={exporting}
                        className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        JSON
                      </button>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <Download className="w-8 h-8 text-gray-600 mb-2" />
                    <h5 className="font-medium text-gray-800">Backup completo</h5>
                    <p className="text-xs text-gray-500 mt-1">Exportar todos los datos en un solo archivo</p>
                    <button
                      onClick={exportTodo}
                      disabled={exporting}
                      className="w-full mt-3 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      {exporting ? 'Exportando...' : 'Exportar todo'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Restaurar backup */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                  <UploadCloud className="w-4 h-4 mr-2 text-green-600" />
                  Restaurar backup
                </h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h5 className="font-medium text-green-800">Recuperar datos desde un backup</h5>
                  <p className="text-xs text-green-600 mt-1">
                    Selecciona un archivo JSON de backup para restaurar todos los datos.
                    Esta acción sobrescribirá los datos actuales.
                  </p>
                  <button
                    onClick={handleRestoreClick}
                    disabled={restoring}
                    className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {restoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Restaurando...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Seleccionar archivo de backup</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Borrar datos de prueba */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="font-medium text-red-600 mb-3 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Zona peligrosa
                </h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h5 className="font-medium text-red-800">Borrar datos de prueba</h5>
                  <p className="text-xs text-red-600 mt-1">
                    Elimina todos los datos de prueba del sistema. Esta acción no se puede deshacer.
                  </p>
                  <button
                    onClick={borrarDatosPrueba}
                    disabled={loading}
                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Borrando...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Borrar datos de prueba</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Configuracion;