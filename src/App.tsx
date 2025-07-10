import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Users, DollarSign, AlertCircle, CheckCircle, XCircle, Clock, Server, Database, Zap, MessageCircle, X, Send, BarChart3, Cpu, MemoryStick as Memory, Network } from 'lucide-react';
import MetricsChart from './components/MetricsChart';
import ServiceCard from './components/ServiceCard';
import AIAssistant from './components/AIAssistant';
import AIAnalytics from './components/AIAnalytics';

// Types
interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  url: string;
  uptime: string;
  responseTime: number;
  errorRate: number;
  description: string;
  metrics: {
    cpu: number;
    memory: number;
    requests_per_second: number;
    active_connections: number;
  };
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

interface PrometheusMetric {
  name: string;
  description: string;
  type: string;
  labels: string[];
  example_value: string;
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
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showMetricsInfo, setShowMetricsInfo] = useState(false);
  const [showAIAnalytics, setShowAIAnalytics] = useState(false);

  // Prometheus metrics information
  const prometheusMetrics: { [service: string]: PrometheusMetric[] } = {
    payments: [
      {
        name: "payments_requests_total",
        description: "Total number of payment requests",
        type: "Counter",
        labels: ["method", "endpoint", "status"],
        example_value: "payments_requests_total{method=\"POST\",endpoint=\"/payments\",status=\"200\"} 1234"
      },
      {
        name: "payments_request_duration_seconds",
        description: "Payment request duration in seconds",
        type: "Histogram",
        labels: ["method", "endpoint"],
        example_value: "payments_request_duration_seconds_bucket{method=\"POST\",endpoint=\"/payments\",le=\"0.1\"} 890"
      },
      {
        name: "payments_active_connections",
        description: "Number of active connections to payments service",
        type: "Gauge",
        labels: [],
        example_value: "payments_active_connections 45"
      },
      {
        name: "payments_amount_dollars",
        description: "Payment amounts processed in dollars",
        type: "Histogram",
        labels: [],
        example_value: "payments_amount_dollars_sum 125430.50"
      },
      {
        name: "payments_status_total",
        description: "Payment status counts",
        type: "Counter",
        labels: ["status"],
        example_value: "payments_status_total{status=\"completed\"} 1156"
      }
    ],
    investments: [
      {
        name: "investments_requests_total",
        description: "Total number of investment requests",
        type: "Counter",
        labels: ["method", "endpoint", "status"],
        example_value: "investments_requests_total{method=\"GET\",endpoint=\"/portfolio\",status=\"200\"} 567"
      },
      {
        name: "investments_request_duration_seconds",
        description: "Investment request duration in seconds",
        type: "Histogram",
        labels: ["method", "endpoint"],
        example_value: "investments_request_duration_seconds_bucket{method=\"GET\",endpoint=\"/portfolio\",le=\"0.1\"} 445"
      },
      {
        name: "investments_active_connections",
        description: "Number of active connections to investments service",
        type: "Gauge",
        labels: [],
        example_value: "investments_active_connections 23"
      },
      {
        name: "investments_portfolio_value_dollars",
        description: "Portfolio values in dollars per user",
        type: "Gauge",
        labels: ["user_id"],
        example_value: "investments_portfolio_value_dollars{user_id=\"user_001\"} 125430.50"
      },
      {
        name: "investments_trades_total",
        description: "Total number of trades executed",
        type: "Counter",
        labels: ["type"],
        example_value: "investments_trades_total{type=\"buy\"} 234"
      }
    ],
    accounts: [
      {
        name: "accounts_requests_total",
        description: "Total number of account requests",
        type: "Counter",
        labels: ["method", "endpoint", "status"],
        example_value: "accounts_requests_total{method=\"POST\",endpoint=\"/accounts\",status=\"201\"} 89"
      },
      {
        name: "accounts_request_duration_seconds",
        description: "Account request duration in seconds",
        type: "Histogram",
        labels: ["method", "endpoint"],
        example_value: "accounts_request_duration_seconds_bucket{method=\"POST\",endpoint=\"/accounts\",le=\"0.1\"} 67"
      },
      {
        name: "accounts_active_connections",
        description: "Number of active connections to accounts service",
        type: "Gauge",
        labels: [],
        example_value: "accounts_active_connections 12"
      },
      {
        name: "accounts_total",
        description: "Total number of accounts in the system",
        type: "Gauge",
        labels: [],
        example_value: "accounts_total 15678"
      },
      {
        name: "accounts_created_total",
        description: "Total number of accounts created",
        type: "Counter",
        labels: [],
        example_value: "accounts_created_total 15678"
      }
    ]
  };

  // Simulate real-time data updates
  useEffect(() => {
    const generateRealtimeData = () => {
      const now = new Date();
      
      // Generate realistic service data with some variability
      const mockServices: ServiceStatus[] = [
        {
          name: 'Payments Service',
          status: Math.random() > 0.95 ? 'warning' : 'healthy',
          url: 'http://localhost:8001',
          uptime: (99.9 - Math.random() * 0.2).toFixed(2) + '%',
          responseTime: Math.floor(40 + Math.random() * 20),
          errorRate: Math.random() * 0.02,
          description: 'Handles instant payments and transactions',
          metrics: {
            cpu: 15 + Math.random() * 10,
            memory: 45 + Math.random() * 15,
            requests_per_second: 120 + Math.random() * 40,
            active_connections: Math.floor(40 + Math.random() * 20)
          }
        },
        {
          name: 'Investments Service',
          status: Math.random() > 0.98 ? 'warning' : 'healthy',
          url: 'http://localhost:8002',
          uptime: (99.8 - Math.random() * 0.3).toFixed(2) + '%',
          responseTime: Math.floor(45 + Math.random() * 25),
          errorRate: Math.random() * 0.025,
          description: 'Personalized investment tracking and portfolio management',
          metrics: {
            cpu: 20 + Math.random() * 15,
            memory: 55 + Math.random() * 20,
            requests_per_second: 80 + Math.random() * 30,
            active_connections: Math.floor(20 + Math.random() * 15)
          }
        },
        {
          name: 'Accounts Service',
          status: Math.random() > 0.92 ? 'warning' : 'healthy',
          url: 'http://localhost:8003',
          uptime: (99.5 - Math.random() * 0.4).toFixed(2) + '%',
          responseTime: Math.floor(50 + Math.random() * 35),
          errorRate: Math.random() * 0.04,
          description: 'Automated account services and customer management',
          metrics: {
            cpu: 25 + Math.random() * 20,
            memory: 40 + Math.random() * 25,
            requests_per_second: 60 + Math.random() * 25,
            active_connections: Math.floor(15 + Math.random() * 10)
          }
        }
      ];

      // Generate system overview with realistic fluctuations
      const mockSystemOverview: SystemOverview = {
        totalRequests: 125430 + Math.floor(Math.random() * 100),
        activeConnections: 342 + Math.floor(Math.random() * 50 - 25),
        totalAccounts: 15678 + Math.floor(Math.random() * 10),
        portfolioValue: 2450000 + Math.floor(Math.random() * 50000 - 25000),
        paymentsProcessed: 89234 + Math.floor(Math.random() * 20),
        errorRate: 0.028 + (Math.random() * 0.01 - 0.005)
      };

      // Generate alerts with some probability
      const existingAlerts = alerts.filter(a => !a.resolved);
      const newAlerts = [...existingAlerts];
      
      if (Math.random() > 0.95 && newAlerts.length < 5) {
        const alertTypes = ['warning', 'critical', 'info'] as const;
        const services = ['Payments Service', 'Investments Service', 'Accounts Service'];
        const messages = [
          'High latency detected - 95th percentile above threshold',
          'Memory usage approaching limit',
          'Unusual traffic pattern detected',
          'Database connection pool exhausted',
          'Rate limiting activated'
        ];
        
        newAlerts.push({
          id: Date.now().toString(),
          service: services[Math.floor(Math.random() * services.length)],
          type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
          message: messages[Math.floor(Math.random() * messages.length)],
          timestamp: now.toISOString(),
          resolved: false
        });
      }

      // Resolve some alerts randomly
      newAlerts.forEach(alert => {
        if (!alert.resolved && Math.random() > 0.98) {
          alert.resolved = true;
        }
      });

      setServices(mockServices);
      setSystemOverview(mockSystemOverview);
      setAlerts(newAlerts);
      setLastUpdate(now);
    };

    // Generate metrics data
    const generateMetricsData = () => {
      const now = new Date();
      const newMetrics = { ...metrics };

      // Update existing metrics or create new ones
      const metricTypes = ['requestRate', 'responseTime', 'errorRate', 'memoryUsage', 'cpuUsage'];
      
      metricTypes.forEach(metricType => {
        if (!newMetrics[metricType]) {
          newMetrics[metricType] = [];
        }

        // Add new data point
        let baseValue, variance;
        switch (metricType) {
          case 'requestRate':
            baseValue = 150;
            variance = 30;
            break;
          case 'responseTime':
            baseValue = 50;
            variance = 20;
            break;
          case 'errorRate':
            baseValue = 0.02;
            variance = 0.01;
            break;
          case 'memoryUsage':
            baseValue = 65;
            variance = 10;
            break;
          case 'cpuUsage':
            baseValue = 25;
            variance = 15;
            break;
          default:
            baseValue = 50;
            variance = 10;
        }

        newMetrics[metricType].push({
          timestamp: now.toISOString(),
          value: Math.max(0, baseValue + Math.random() * variance - variance / 2)
        });

        // Keep only last 20 data points
        if (newMetrics[metricType].length > 20) {
          newMetrics[metricType] = newMetrics[metricType].slice(-20);
        }
      });

      setMetrics(newMetrics);
    };

    // Initial data load
    generateRealtimeData();
    generateMetricsData();
    setIsLoading(false);

    // Set up real-time updates
    const dataInterval = setInterval(generateRealtimeData, 5000); // Update every 5 seconds
    const metricsInterval = setInterval(generateMetricsData, 3000); // Update metrics every 3 seconds

    return () => {
      clearInterval(dataInterval);
      clearInterval(metricsInterval);
    };
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading real-time data...</p>
        </div>
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
              <button
                onClick={() => setShowMetricsInfo(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm font-medium">Metrics Info</span>
              </button>
              <button
                onClick={() => setShowAIAssistant(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">AI Assistant</span>
              </button>
              <button
                onClick={() => setShowAIAnalytics(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">AI Analytics</span>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">Live Data</span>
              </div>
              <div className="text-sm text-gray-500">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
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

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active Connections</p>
                <p className="text-2xl font-bold text-gray-900">{systemOverview.activeConnections}</p>
                <p className="text-sm text-green-600 mt-1">Real-time</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
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

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
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

        {/* Services Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {services.map((service, index) => (
            <ServiceCard key={index} {...service} />
          ))}
        </div>

        {/* Metrics Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <MetricsChart
            title="Request Rate"
            data={metrics.requestRate || []}
            color="blue"
            unit=" req/s"
            maxValue={200}
          />
          <MetricsChart
            title="Response Time"
            data={metrics.responseTime || []}
            color="green"
            unit="ms"
            maxValue={100}
          />
          <MetricsChart
            title="CPU Usage"
            data={metrics.cpuUsage || []}
            color="yellow"
            unit="%"
            maxValue={100}
          />
          <MetricsChart
            title="Memory Usage"
            data={metrics.memoryUsage || []}
            color="red"
            unit="%"
            maxValue={100}
          />
        </div>

        {/* Alerts Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Alerts</h2>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-500">{alerts.filter(a => !a.resolved).length} active</span>
            </div>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>No alerts - All systems operating normally</p>
              </div>
            ) : (
              alerts.map((alert) => (
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
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Assistant Modal */}
      {showAIAssistant && (
        <AIAssistant
          onClose={() => setShowAIAssistant(false)}
          services={services}
          metrics={metrics}
          alerts={alerts}
          systemOverview={systemOverview}
        />
      )}

      {/* AI Analytics Modal */}
      {showAIAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">AI Analytics & Predictions</h2>
              <button
                onClick={() => setShowAIAnalytics(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[80vh]">
              <AIAnalytics services={services} metrics={metrics} />
            </div>
          </div>
        </div>
      )}

      {/* Metrics Info Modal */}
      {showMetricsInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Prometheus Metrics Information</h2>
              <button
                onClick={() => setShowMetricsInfo(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {Object.entries(prometheusMetrics).map(([service, metrics]) => (
                <div key={service} className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">{service} Service Metrics</h3>
                  <div className="space-y-4">
                    {metrics.map((metric, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{metric.name}</h4>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{metric.type}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{metric.description}</p>
                        {metric.labels.length > 0 && (
                          <div className="mb-2">
                            <span className="text-xs font-medium text-gray-500">Labels: </span>
                            <span className="text-xs text-gray-600">{metric.labels.join(', ')}</span>
                          </div>
                        )}
                        <div className="bg-gray-800 text-green-400 p-2 rounded text-xs font-mono">
                          {metric.example_value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;