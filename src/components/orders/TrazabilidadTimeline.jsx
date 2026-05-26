import React, { useMemo } from 'react';
import {
  Package,
  Settings,
  DollarSign,
  Wrench,
  CheckCircle,
  XCircle,
  Clock,
  User,
  AlertCircle,
  MapPin
} from 'lucide-react';

function TrazabilidadTimeline({ orden }) {
  // Función segura para formatear fechas
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      return date;
    } catch {
      return null;
    }
  };

  // Generar eventos de forma segura
  const eventos = useMemo(() => {
    const eventosList = [];

    // Evento: Recibido (siempre existe)
    const fechaRecibido = formatDate(orden.created_at);
    if (fechaRecibido) {
      eventosList.push({
        id: 'recibido',
        estado: 'Recibido',
        fecha: fechaRecibido,
        icon: Package,
        color: 'bg-purple-500',
        colorLight: 'bg-purple-100 text-purple-600',
        descripcion: 'Recepción en taller',
        detalle: orden.order_number
      });
    }

    // Evento: En análisis
    const fechaDiagnosis = formatDate(orden.diagnosis_date);
    if (fechaDiagnosis) {
      eventosList.push({
        id: 'analisis',
        estado: 'En análisis',
        fecha: fechaDiagnosis,
        icon: Settings,
        color: 'bg-blue-500',
        colorLight: 'bg-blue-100 text-blue-600',
        descripcion: 'Diagnóstico realizado',
        detalle: orden.diagnosis?.observaciones?.substring(0, 100)
      });
    }

    // Evento: Presupuestado
    const fechaPresupuesto = formatDate(orden.budget_date);
    if (fechaPresupuesto) {
      eventosList.push({
        id: 'presupuestado',
        estado: 'Presupuestado',
        fecha: fechaPresupuesto,
        icon: DollarSign,
        color: 'bg-yellow-500',
        colorLight: 'bg-yellow-100 text-yellow-600',
        descripcion: 'Presupuesto generado',
        estadoCliente: orden.budget_status,
        detalle: orden.budget ? `${orden.budget.toFixed(2)}€` : null
      });
    }

    // Evento: En reparación
    const fechaInicio = formatDate(orden.start_date);
    if (fechaInicio) {
      eventosList.push({
        id: 'reparacion',
        estado: 'En reparación',
        fecha: fechaInicio,
        icon: Wrench,
        color: 'bg-orange-500',
        colorLight: 'bg-orange-100 text-orange-600',
        descripcion: 'Reparación iniciada'
      });
    }

    // Evento: Listo
    const fechaCompletado = formatDate(orden.completed_at);
    if (fechaCompletado) {
      eventosList.push({
        id: 'listo',
        estado: orden.status === 'Listo' ? 'Terminado' : 'Listo',
        fecha: fechaCompletado,
        icon: CheckCircle,
        color: 'bg-green-500',
        colorLight: 'bg-green-100 text-green-600',
        descripcion: 'Reparación finalizada'
      });
    }

    // Evento: Entregado
    const fechaEntregado = formatDate(orden.delivered_at);
    if (fechaEntregado) {
      eventosList.push({
        id: 'entregado',
        estado: 'Entregado',
        fecha: fechaEntregado,
        icon: Package,
        color: 'bg-gray-500',
        colorLight: 'bg-gray-100 text-gray-600',
        descripcion: 'Entregado al cliente'
      });
    }

    // Ordenar por fecha
    return eventosList.sort((a, b) => a.fecha - b.fecha);
  }, [orden]);

  // Determinar estado actual
  const estadoActual = orden.status === 'Listo' ? 'Terminado' : orden.status;
  const estadoActualIndex = eventos.findIndex(e => e.estado === estadoActual);

  const getEstadoClienteBadge = (estado) => {
    switch(estado) {
      case 'aceptado': 
        return (
          <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3 mr-1" />
            Aceptado
          </span>
        );
      case 'rechazado': 
        return (
          <span className="inline-flex items-center text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3 mr-1" />
            Rechazado
          </span>
        );
      default: return null;
    }
  };

  // Obtener badge de estado actual
  const getStatusBadge = (status) => {
    const badges = {
      'Recibido': 'bg-purple-100 text-purple-700',
      'En análisis': 'bg-blue-100 text-blue-700',
      'Presupuestado': 'bg-yellow-100 text-yellow-700',
      'Aceptado': 'bg-green-100 text-green-700',
      'Rechazado': 'bg-red-100 text-red-700',
      'En reparación': 'bg-orange-100 text-orange-700',
      'Garantia': 'bg-purple-100 text-purple-700', 
      'Listo': 'bg-teal-100 text-teal-700',
      'Entregado': 'bg-gray-100 text-gray-700',
      'Archivado': 'bg-gray-100 text-gray-700'
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  if (eventos.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No hay eventos registrados</p>
        <p className="text-xs text-gray-400 mt-1">La línea de tiempo se generará automáticamente</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera con estado actual */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200">
        <div className="flex items-center space-x-3">
          <MapPin className="w-5 h-5 text-gray-500" />
          <span className="text-sm text-gray-600">Estado actual:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(estadoActual)}`}>
            {estadoActual}
          </span>
        </div>
        <div className="text-xs text-gray-400">
          {eventos.length} {eventos.length === 1 ? 'evento' : 'eventos'} registrados
        </div>
      </div>

      {/* Línea de tiempo horizontal (alternativa visual) */}
      {eventos.length > 0 && (
        <div className="hidden md:block">
          <div className="relative pt-8">
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-gray-200"></div>
            <div className="relative flex justify-between">
              {eventos.map((evento, idx) => {
                const Icon = evento.icon;
                const isActive = idx <= estadoActualIndex;
                const isCurrent = evento.estado === estadoActual;
                
                return (
                  <div key={evento.id} className="flex flex-col items-center flex-1">
                    <div 
                      className={`
                        relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all
                        ${isActive ? evento.color : 'bg-gray-200 text-gray-400'}
                        ${isCurrent ? 'ring-4 ring-offset-2 ring-gray-300 scale-110' : ''}
                        shadow-md
                      `}
                      title={evento.estado}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                    <div className="mt-2 text-center">
                      <p className={`text-xs font-medium ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                        {evento.estado === 'Listo' ? 'Terminado' : evento.estado}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {evento.fecha.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Línea de tiempo vertical (versión móvil/detallada) */}
      <div className="space-y-6 md:hidden">
        {eventos.map((evento, index) => {
          const Icon = evento.icon;
          const isLast = index === eventos.length - 1;
          const isCurrent = evento.estado === estadoActual;
          
          return (
            <div key={evento.id} className="relative flex items-start space-x-4">
              {/* Línea conectora */}
              {!isLast && (
                <div className="absolute left-5 top-8 bottom-0 w-0.5 bg-gray-200"></div>
              )}
              
              {/* Icono */}
              <div className={`relative z-10 w-10 h-10 ${evento.color} rounded-full flex items-center justify-center text-white shadow-md ${isCurrent ? 'ring-4 ring-offset-2 ring-gray-300 scale-110' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              
              {/* Contenido */}
              <div className="flex-1 pb-6">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-800">{evento.estado === 'Listo' ? 'Terminado' : evento.estado}</h4>
                    {isCurrent && (
                      <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                        Actual
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {evento.fecha.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{evento.descripcion}</p>
                
                {/* Detalle adicional */}
                {evento.detalle && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center space-x-1">
                    <span>📋</span>
                    <span>{evento.detalle}</span>
                  </p>
                )}
                
                {/* Badge de aceptación/rechazo */}
                {evento.estadoCliente && (
                  <div className="mt-2">
                    {getEstadoClienteBadge(evento.estadoCliente)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Versión desktop detallada */}
      <div className="hidden md:block space-y-4">
        {eventos.map((evento, index) => {
          const Icon = evento.icon;
          const isCurrent = evento.estado === estadoActual;
          
          return (
            <div key={evento.id} className={`flex items-start space-x-4 p-3 rounded-lg transition-all ${isCurrent ? 'bg-gray-50 border border-gray-200' : ''}`}>
              <div className={`w-10 h-10 ${evento.color} rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-800">{evento.estado === 'Listo' ? 'Terminado' : evento.estado}</h4>
                    {isCurrent && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                        Actual
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {evento.fecha.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{evento.descripcion}</p>
                {evento.detalle && (
                  <p className="text-xs text-gray-400 mt-1">{evento.detalle}</p>
                )}
                {evento.estadoCliente && (
                  <div className="mt-2">
                    {getEstadoClienteBadge(evento.estadoCliente)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Historial adicional de cambios de estado */}
      {orden.status_history && orden.status_history.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-700 mb-3 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-gray-500" />
            Historial completo de cambios
            <span className="text-xs text-gray-400 ml-2">
              ({orden.status_history.length} {orden.status_history.length === 1 ? 'cambio' : 'cambios'})
            </span>
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {orden.status_history.slice().reverse().map((entry, idx) => {
              const fecha = formatDate(entry.date);
              if (!fecha) return null;
              
              return (
                <div key={idx} className="text-xs flex items-start space-x-2 bg-gray-50 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0">
                    <Clock className="w-3 h-3 text-gray-400 mt-0.5" />
                  </div>
                  <span className="text-gray-500 whitespace-nowrap">
                    {fecha.toLocaleString()}:
                  </span>
                  <span className="flex-1">
                    <span className="font-medium text-gray-700">
  {entry.from === 'Listo' ? 'Terminado' : (entry.from || 'Inicio')}
</span>
<span className="text-gray-400"> → </span>
<span className="font-medium text-gray-700">
  {entry.to === 'Listo' ? 'Terminado' : entry.to}
</span>
                    {entry.user && (
                      <span className="text-gray-400 ml-2">
                        <User className="w-3 h-3 inline mr-0.5" />
                        {entry.user}
                      </span>
                    )}
                    {entry.note && (
                      <span className="text-gray-500 ml-2 italic">({entry.note})</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Indicador de tiempo transcurrido */}
      {eventos.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center">
          <p className="text-xs text-blue-700">
            📅 Desde la recepción: {Math.ceil((new Date() - eventos[0].fecha) / (1000 * 60 * 60 * 24))} días
          </p>
        </div>
      )}
    </div>
  );
}

export default TrazabilidadTimeline;