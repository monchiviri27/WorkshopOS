import React from 'react';

function StatsCard({ icon: Icon, label, value, color, trend }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    teal: 'bg-teal-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    indigo: 'bg-indigo-500'
  };

  const getTrendColor = (trend) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`${colorClasses[color]} w-12 h-12 rounded-lg flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            {trend !== undefined && (
              <p className={`text-xs flex items-center mt-1 ${getTrendColor(trend)}`}>
                {trend > 0 ? '↑' : trend < 0 ? '↓' : '•'} 
                <span className="ml-1">{Math.abs(trend)}% vs mes anterior</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsCard;