import React from 'react';

interface MetricPoint {
  timestamp: string;
  value: number;
}

interface MetricsChartProps {
  title: string;
  data: MetricPoint[];
  color: string;
  unit: string;
  maxValue?: number;
}

const MetricsChart: React.FC<MetricsChartProps> = ({
  title,
  data,
  color,
  unit,
  maxValue = 100
}) => {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return { bg: 'bg-blue-100', bar: 'bg-blue-500' };
      case 'green':
        return { bg: 'bg-green-100', bar: 'bg-green-500' };
      case 'yellow':
        return { bg: 'bg-yellow-100', bar: 'bg-yellow-500' };
      case 'red':
        return { bg: 'bg-red-100', bar: 'bg-red-500' };
      case 'purple':
        return { bg: 'bg-purple-100', bar: 'bg-purple-500' };
      default:
        return { bg: 'bg-gray-100', bar: 'bg-gray-500' };
    }
  };

  const colors = getColorClasses(color);
  const latestValue = data[data.length - 1]?.value || 0;
  const trend = data.length > 1 ? 
    ((latestValue - data[data.length - 2].value) / data[data.length - 2].value * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {latestValue.toFixed(unit === 'ms' ? 0 : 2)}{unit}
          </div>
          <div className={`text-sm ${trend > 0 ? 'text-red-500' : trend < 0 ? 'text-green-500' : 'text-gray-500'}`}>
            {trend !== 0 && (trend > 0 ? '↑' : '↓')} {Math.abs(trend).toFixed(1)}%
          </div>
        </div>
      </div>
      
      <div className="h-48 flex items-end space-x-1 relative">
        {data.map((point, index) => {
          const height = Math.max((point.value / maxValue) * 100, 2);
          return (
            <div
              key={index}
              className={`flex-1 ${colors.bg} rounded-t-sm relative group cursor-pointer`}
              style={{ height: `${height}%` }}
            >
              <div className={`w-full ${colors.bar} rounded-t-sm transition-all duration-300 hover:opacity-80`} style={{ height: '100%' }}></div>
              
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                {point.value.toFixed(unit === 'ms' ? 0 : 2)}{unit}
                <div className="text-xs opacity-75">
                  {new Date(point.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Real-time indicator */}
        <div className="absolute top-2 right-2">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Live</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{data.length > 0 ? new Date(data[0].timestamp).toLocaleTimeString() : ''}</span>
        <span className="text-green-600 font-medium">Real-time data</span>
        <span>Now</span>
      </div>
    </div>
  );
};

export default MetricsChart;