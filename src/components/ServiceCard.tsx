import React from 'react';
import { CheckCircle, AlertCircle, XCircle, ExternalLink } from 'lucide-react';

interface ServiceCardProps {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  url: string;
  uptime: string;
  responseTime: number;
  errorRate: number;
  description: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  name,
  status,
  url,
  uptime,
  responseTime,
  errorRate,
  description
}) => {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy': return 'text-green-500 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-500 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-500 bg-red-50 border-red-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertCircle className="w-5 h-5" />;
      case 'error': return <XCircle className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg border ${getStatusColor(status)}`}>
            {getStatusIcon(status)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{name}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{uptime}</div>
          <div className="text-xs text-gray-500">Uptime</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{responseTime}ms</div>
          <div className="text-xs text-gray-500">Response</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{(errorRate * 100).toFixed(2)}%</div>
          <div className="text-xs text-gray-500">Error Rate</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Endpoint:</span>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded">{url}</code>
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;