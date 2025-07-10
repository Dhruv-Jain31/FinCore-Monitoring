import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, Target, BarChart3, Zap, Clock, Shield } from 'lucide-react';

interface Prediction {
  timestamp: string;
  predicted_value: number;
  step_ahead: number;
}

interface Anomaly {
  timestamp: string;
  value: number;
  anomaly_score: number;
  severity: 'low' | 'medium' | 'high';
}

interface AIInsight {
  type: 'prediction' | 'anomaly' | 'capacity' | 'health';
  title: string;
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  recommendations: string[];
  data?: any;
}

interface AIAnalyticsProps {
  services: any[];
  metrics: any;
}

const AIAnalytics: React.FC<AIAnalyticsProps> = ({ services, metrics }) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);

  // Simulate AI analysis
  useEffect(() => {
    generateAIInsights();
    const interval = setInterval(generateAIInsights, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [services, metrics]);

  const generateAIInsights = async () => {
    setIsLoading(true);
    
    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newInsights: AIInsight[] = [];
    
    // Performance Prediction Insight
    const avgResponseTime = services.reduce((sum, s) => sum + s.responseTime, 0) / services.length;
    if (avgResponseTime > 60) {
      newInsights.push({
        type: 'prediction',
        title: 'Performance Degradation Predicted',
        description: `AI models predict a 15% increase in response times over the next hour based on current trends.`,
        confidence: 0.87,
        severity: 'medium',
        recommendations: [
          'Consider preemptive scaling of high-load services',
          'Review database connection pools',
          'Monitor memory usage patterns'
        ],
        data: {
          predicted_increase: 15,
          timeframe: '1 hour',
          affected_services: ['payments', 'investments']
        }
      });
    }

    // Anomaly Detection Insight
    const errorRates = services.map(s => s.errorRate);
    const avgErrorRate = errorRates.reduce((sum, rate) => sum + rate, 0) / errorRates.length;
    if (avgErrorRate > 0.03) {
      newInsights.push({
        type: 'anomaly',
        title: 'Unusual Error Pattern Detected',
        description: `Machine learning models detected anomalous error patterns in the last 20 minutes.`,
        confidence: 0.92,
        severity: 'high',
        recommendations: [
          'Investigate recent deployments',
          'Check external service dependencies',
          'Review error logs for common patterns'
        ],
        data: {
          anomaly_score: 0.85,
          affected_timeframe: '20 minutes',
          pattern_type: 'spike'
        }
      });
    }

    // Capacity Planning Insight
    const totalConnections = services.reduce((sum, s) => sum + s.metrics.active_connections, 0);
    if (totalConnections > 150) {
      newInsights.push({
        type: 'capacity',
        title: 'Capacity Scaling Recommended',
        description: `Predictive models suggest scaling requirements will increase by 25% in the next 48 hours.`,
        confidence: 0.78,
        severity: 'medium',
        recommendations: [
          'Prepare horizontal scaling for payments service',
          'Increase connection pool limits',
          'Consider load balancer optimization'
        ],
        data: {
          predicted_growth: 25,
          timeframe: '48 hours',
          scaling_trigger: 'connection_threshold'
        }
      });
    }

    // System Health Prediction
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const healthScore = healthyServices / services.length;
    
    if (healthScore < 1.0) {
      newInsights.push({
        type: 'health',
        title: 'System Health Risk Assessment',
        description: `AI health models indicate a ${((1 - healthScore) * 100).toFixed(0)}% risk of service degradation.`,
        confidence: 0.83,
        severity: healthScore < 0.7 ? 'high' : 'medium',
        recommendations: [
          'Monitor warning services closely',
          'Prepare rollback procedures',
          'Increase monitoring frequency'
        ],
        data: {
          health_score: healthScore,
          risk_level: healthScore < 0.7 ? 'high' : 'medium',
          affected_services: services.filter(s => s.status !== 'healthy').map(s => s.name)
        }
      });
    }

    // Positive insights when system is healthy
    if (newInsights.length === 0) {
      newInsights.push({
        type: 'health',
        title: 'System Operating Optimally',
        description: 'AI analysis shows all systems are performing within expected parameters with no predicted issues.',
        confidence: 0.95,
        severity: 'low',
        recommendations: [
          'Maintain current monitoring levels',
          'Continue regular health checks',
          'Consider performance optimization opportunities'
        ],
        data: {
          health_score: 0.98,
          optimization_opportunities: ['cache optimization', 'query performance']
        }
      });
    }

    setInsights(newInsights);
    setIsLoading(false);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'prediction': return <TrendingUp className="w-5 h-5" />;
      case 'anomaly': return <AlertTriangle className="w-5 h-5" />;
      case 'capacity': return <Target className="w-5 h-5" />;
      case 'health': return <Shield className="w-5 h-5" />;
      default: return <Brain className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 border-red-200 text-red-800';
      case 'medium': return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      case 'low': return 'bg-green-100 border-green-200 text-green-800';
      default: return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">AI Analytics & Predictions</h2>
            <p className="text-sm text-gray-500">Machine learning insights and predictive analysis</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isLoading && (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm">Analyzing...</span>
            </div>
          )}
          <div className="text-sm text-gray-500">
            Last analysis: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* AI Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`bg-white rounded-xl shadow-sm p-6 border cursor-pointer hover:shadow-md transition-shadow ${getSeverityColor(insight.severity)}`}
            onClick={() => setSelectedInsight(insight)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${insight.type === 'prediction' ? 'bg-blue-100 text-blue-600' : 
                  insight.type === 'anomaly' ? 'bg-red-100 text-red-600' :
                  insight.type === 'capacity' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-green-100 text-green-600'}`}>
                  {getInsightIcon(insight.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                  <p className="text-sm text-gray-600 capitalize">{insight.type} Analysis</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${getConfidenceColor(insight.confidence)}`}>
                  {(insight.confidence * 100).toFixed(0)}% confidence
                </div>
                <div className="text-xs text-gray-500">AI Score</div>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-4">{insight.description}</p>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Key Recommendations:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {insight.recommendations.slice(0, 2).map((rec, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
              {insight.recommendations.length > 2 && (
                <p className="text-xs text-gray-500">+{insight.recommendations.length - 2} more recommendations</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* AI Model Status */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Model Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-lg font-bold text-gray-900">3</div>
            <div className="text-sm text-gray-500">Prediction Models</div>
            <div className="text-xs text-green-600 mt-1">Active</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div className="text-lg font-bold text-gray-900">3</div>
            <div className="text-sm text-gray-500">Anomaly Detectors</div>
            <div className="text-xs text-green-600 mt-1">Trained</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 bg-yellow-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="text-lg font-bold text-gray-900">87%</div>
            <div className="text-sm text-gray-500">Model Accuracy</div>
            <div className="text-xs text-green-600 mt-1">High</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
              <Zap className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-lg font-bold text-gray-900">2.3s</div>
            <div className="text-sm text-gray-500">Analysis Time</div>
            <div className="text-xs text-green-600 mt-1">Fast</div>
          </div>
        </div>
      </div>

      {/* Detailed Insight Modal */}
      {selectedInsight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${selectedInsight.type === 'prediction' ? 'bg-blue-100 text-blue-600' : 
                  selectedInsight.type === 'anomaly' ? 'bg-red-100 text-red-600' :
                  selectedInsight.type === 'capacity' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-green-100 text-green-600'}`}>
                  {getInsightIcon(selectedInsight.type)}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedInsight.title}</h2>
                  <p className="text-sm text-gray-500">AI {selectedInsight.type} Analysis</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInsight(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Analysis Details</h3>
                  <p className="text-gray-700">{selectedInsight.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">Confidence Score</div>
                    <div className={`text-2xl font-bold ${getConfidenceColor(selectedInsight.confidence)}`}>
                      {(selectedInsight.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">Severity Level</div>
                    <div className={`text-2xl font-bold capitalize ${
                      selectedInsight.severity === 'high' ? 'text-red-600' :
                      selectedInsight.severity === 'medium' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {selectedInsight.severity}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Recommendations</h3>
                  <ul className="space-y-2">
                    {selectedInsight.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start space-x-3">
                        <span className="text-blue-500 mt-1">•</span>
                        <span className="text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedInsight.data && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Technical Details</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(selectedInsight.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalytics;