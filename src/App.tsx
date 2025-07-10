import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Users, DollarSign, AlertCircle, CheckCircle, XCircle, Clock, Server, Database, Zap } from 'lucide-react';

// Types
interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  url: string;
  uptime: string;
  responseTime: number;
  errorRate: number;
}

interface MetricData {
  timestamp: string;
  value: number;
}

interface Alert {
  id: string;
  service: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  resolved: boolean;
}

interface SystemOverview {
  totalRequests: number;
  activeConnections: number;
  totalAccounts: number;
  portfolioValue: number;
  paymentsProcessed: number;
  errorRate: number;
}

const App: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [systemOverview, setSystemOverview] = useState<SystemOverview>({
    totalRequests: 0,
    activeConnections: 0,
    totalAccounts: 0,
    portfolioValue: 0,
    paymentsProcessed: 0,
    errorRate: 0
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [metrics, setMetrics] = useState<{ [key: string]: MetricData[] }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for demonstration
  useEffect(() => {
    const mockServices: ServiceStatus[] = [
      {
        name: 'Payments Service',
        status: 'healthy',
        url: 'http://localhost:8001',
        uptime: '99.9%',
        responseTime: 45,
        errorRate: 0.01
      },
      {
        name: 'Investments Service',
        status: 'healthy',
        url: 'http://localhost:8002',
        uptime: '99.8%',
        responseTime: 52,
        errorRate: 0.02
      },
      {
        name: 'Accounts Service',
        status: 'warning',
        url: 'http://localhost:8003',
        uptime: '99.5%',
        responseTime: 85,
        errorRate: 0.05
      }
    ];

    const mockAlerts: Alert[] = [
      {
        id: '1',
        service: 'Accounts Service',
        type: 'warning',
        message: 'High latency detected - 95th percentile above 80ms',
        timestamp: new Date(Date.now() - 10000).toISOString(),
        resolved: false
      },
      {
        id: '2',
        service: 'Payments Service',
        type: 'critical',
        message: 'Error rate spike detected',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        resolved: true
      }
    ];

    const mockSystemOverview: SystemOverview = {
      totalRequests: 125430,
      activeConnections: 342,
      totalAccounts: 15678,
      portfolioValue: 2450000,
      paymentsProcessed: 89234,
      errorRate: 0.028
    };

    // Generate mock metrics data
    const generateMetrics = (baseValue: number, variance: number) => {
      const data: MetricData[] = [];
      for (let i = 0; i < 20; i++) {
        data.push({
          timestamp: new Date(Date.now() - (19 - i) * 60000).toISOString(),
          value: baseValue + Math.random() * variance - variance / 2
        });
      }
      return data;
    };

    const mockMetrics = {
      requestRate: generateMetrics(150, 30),
      responseTime: generateMetrics(50, 20),
      errorRate: generateMetrics(0.02, 0.01),
      memoryUsage: generateMetrics(65, 10)
    };

    setServices(mockServices);
    setAlerts(mockAlerts);
    setSystemOverview(mockSystemOverview);
    setMetrics(mockMetrics);
    setIsLoading(false);
  }, []);

  // Utility functions
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'warning': return <AlertCircle className="w-5 h-5" />;
      case 'error': return <XCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getAlertColor = (type: string): string => {
    switch (type) {
      case 'critical': return 'bg-red-100 border-red-200 text-red-800';
      case 'warning': return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      case 'info': return 'bg-blue-100 border-blue-200 text-blue-800';
      default: return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">FinCore Monitoring</h1>
                <p className="text-sm text-gray-500">Real-time microservices observability</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Live Data</span>
              </div>
              <div className="text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(systemOverview.totalRequests)}</p>
                <p className="text-sm text-green-600 mt-1">+12% from yesterday</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Connections</p>
                <p className="text-2xl font-bold text-gray-900">{systemOverview.activeConnections}</p>
                <p className="text-sm text-green-600 mt-1">+5% from last hour</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Accounts</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(systemOverview.totalAccounts)}</p>
                <p className="text-sm text-green-600 mt-1">+8% this week</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Portfolio Value</p>
                <p className="text-2xl font-bold text-gray-900">${formatNumber(systemOverview.portfolioValue)}</p>
                <p className="text-sm text-green-600 mt-1">+15% this month</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Services Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Service Status</h2>
              <div className="flex items-center space-x-2">
                <Server className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-500">{services.length} services</span>
              </div>
            </div>
            <div className="space-y-4">
              {services.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={getStatusColor(service.status)}>
                      {getStatusIcon(service.status)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{service.name}</h3>
                      <p className="text-sm text-gray-500">{service.url}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{service.uptime}</div>
                    <div className="text-sm text-gray-500">{service.responseTime}ms avg</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Alerts</h2>
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-500">{alerts.filter(a => !a.resolved).length} active</span>
              </div>
            </div>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-4 rounded-lg border ${getAlertColor(alert.type)} ${alert.resolved ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{alert.service}</span>
                        {alert.resolved && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Resolved</span>}
                      </div>
                      <p className="text-sm mt-1">{alert.message}</p>
                      <p className="text-xs mt-2 opacity-75">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Metrics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Request Rate</h2>
            <div className="h-64 flex items-end space-x-2">
              {metrics.requestRate?.map((point, index) => (
                <div key={index} className="flex-1 bg-blue-100 rounded-t-sm" style={{ height: `${(point.value / 200) * 100}%` }}>
                  <div className="w-full bg-blue-500 rounded-t-sm" style={{ height: '100%' }}></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>20 min ago</span>
              <span>{metrics.requestRate?.[metrics.requestRate.length - 1]?.value.toFixed(0)} req/sec</span>
              <span>now</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Response Time</h2>
            <div className="h-64 flex items-end space-x-2">
              {metrics.responseTime?.map((point, index) => (
                <div key={index} className="flex-1 bg-green-100 rounded-t-sm" style={{ height: `${(point.value / 100) * 100}%` }}>
                  <div className="w-full bg-green-500 rounded-t-sm" style={{ height: '100%' }}></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>20 min ago</span>
              <span>{metrics.responseTime?.[metrics.responseTime.length - 1]?.value.toFixed(0)}ms</span>
              <span>now</span>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Performance Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <div className="w-full h-full bg-gray-200 rounded-full"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xl font-bold text-gray-900">
                    {((1 - systemOverview.errorRate) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <h3 className="font-medium text-gray-900">Success Rate</h3>
              <p className="text-sm text-gray-500">Last 24 hours</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <div className="w-full h-full bg-gray-200 rounded-full"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xl font-bold text-gray-900">52ms</div>
                </div>
              </div>
              <h3 className="font-medium text-gray-900">Avg Response Time</h3>
              <p className="text-sm text-gray-500">Across all services</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 relative">
                <div className="w-full h-full bg-gray-200 rounded-full"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xl font-bold text-gray-900">99.7%</div>
                </div>
              </div>
              <h3 className="font-medium text-gray-900">System Uptime</h3>
              <p className="text-sm text-gray-500">This month</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;