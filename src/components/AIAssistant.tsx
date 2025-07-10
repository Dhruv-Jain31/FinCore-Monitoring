import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User, AlertCircle, TrendingUp, Activity, Zap } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantProps {
  onClose: () => void;
  services: any[];
  metrics: any;
  alerts: any[];
  systemOverview: any;
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  onClose,
  services,
  metrics,
  alerts,
  systemOverview
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hello! I'm your FinCore AI Assistant. I can help you understand system metrics, troubleshoot issues, and provide insights about your microservices. What would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // System status queries
    if (message.includes('status') || message.includes('health')) {
      const healthyServices = services.filter(s => s.status === 'healthy').length;
      const warningServices = services.filter(s => s.status === 'warning').length;
      const errorServices = services.filter(s => s.status === 'error').length;
      
      return `System Status Overview:
      
✅ Healthy Services: ${healthyServices}
⚠️ Warning Services: ${warningServices}
❌ Error Services: ${errorServices}

Current system metrics:
• Total Requests: ${systemOverview.totalRequests.toLocaleString()}
• Active Connections: ${systemOverview.activeConnections}
• Error Rate: ${(systemOverview.errorRate * 100).toFixed(2)}%

${warningServices > 0 ? 'Some services need attention. Check the alerts section for details.' : 'All systems are operating normally.'}`;
    }

    // Performance queries
    if (message.includes('performance') || message.includes('slow') || message.includes('latency')) {
      const avgResponseTime = services.reduce((sum, s) => sum + s.responseTime, 0) / services.length;
      const slowestService = services.reduce((prev, current) => 
        prev.responseTime > current.responseTime ? prev : current
      );
      
      return `Performance Analysis:

📊 Average Response Time: ${avgResponseTime.toFixed(0)}ms
🐌 Slowest Service: ${slowestService.name} (${slowestService.responseTime}ms)

Recommendations:
• Monitor ${slowestService.name} for potential bottlenecks
• Consider scaling if response times consistently exceed 100ms
• Check database query performance
• Review memory usage patterns`;
    }

    // Error rate queries
    if (message.includes('error') || message.includes('failure')) {
      const totalErrors = services.reduce((sum, s) => sum + s.errorRate, 0);
      const highestErrorService = services.reduce((prev, current) => 
        prev.errorRate > current.errorRate ? prev : current
      );
      
      return `Error Analysis:

🚨 System Error Rate: ${(systemOverview.errorRate * 100).toFixed(2)}%
📈 Highest Error Service: ${highestErrorService.name} (${(highestErrorService.errorRate * 100).toFixed(2)}%)

Active Alerts: ${alerts.filter(a => !a.resolved).length}

Troubleshooting Steps:
1. Check service logs for error patterns
2. Verify database connections
3. Monitor resource utilization
4. Review recent deployments`;
    }

    // Alerts queries
    if (message.includes('alert') || message.includes('issue')) {
      const activeAlerts = alerts.filter(a => !a.resolved);
      const criticalAlerts = activeAlerts.filter(a => a.type === 'critical');
      
      if (activeAlerts.length === 0) {
        return "🎉 Great news! There are currently no active alerts. All systems are operating within normal parameters.";
      }
      
      return `Alert Summary:

🚨 Active Alerts: ${activeAlerts.length}
⚠️ Critical: ${criticalAlerts.length}
📊 Warning: ${activeAlerts.filter(a => a.type === 'warning').length}

Recent Issues:
${activeAlerts.slice(0, 3).map(alert => 
  `• ${alert.service}: ${alert.message}`
).join('\n')}

Recommended Actions:
1. Address critical alerts first
2. Check service logs for root cause
3. Monitor affected services closely`;
    }

    // Metrics queries
    if (message.includes('metric') || message.includes('prometheus')) {
      return `Prometheus Metrics Overview:

📊 Key Metrics Being Collected:

**Payments Service:**
• payments_requests_total - Request counts
• payments_request_duration_seconds - Response times
• payments_active_connections - Connection pool
• payments_amount_dollars - Transaction volumes

**Investments Service:**
• investments_portfolio_value_dollars - Portfolio values
• investments_trades_total - Trade counts
• investments_request_duration_seconds - API performance

**Accounts Service:**
• accounts_total - Total account count
• accounts_created_total - Account creation rate
• accounts_request_duration_seconds - Service performance

All metrics include labels for detailed filtering and analysis.`;
    }

    // Scaling queries
    if (message.includes('scale') || message.includes('capacity')) {
      const totalConnections = services.reduce((sum, s) => sum + s.metrics.active_connections, 0);
      const avgCpu = services.reduce((sum, s) => sum + s.metrics.cpu, 0) / services.length;
      
      return `Scaling Analysis:

📈 Current Load:
• Total Active Connections: ${totalConnections}
• Average CPU Usage: ${avgCpu.toFixed(1)}%
• Request Rate: ${systemOverview.totalRequests.toLocaleString()} total

Scaling Recommendations:
${avgCpu > 70 ? '🔴 High CPU usage detected - consider horizontal scaling' : '🟢 CPU usage is within normal range'}
${totalConnections > 200 ? '🔴 High connection count - monitor connection pooling' : '🟢 Connection count is healthy'}

Consider auto-scaling when:
• CPU usage > 70% for 5+ minutes
• Response time > 200ms consistently
• Error rate > 5%`;
    }

    // Help queries
    if (message.includes('help') || message.includes('what can you do')) {
      return `I can help you with:

🔍 **System Monitoring:**
• "What's the system status?"
• "Show me performance metrics"
• "Are there any alerts?"

📊 **Performance Analysis:**
• "Why is the system slow?"
• "Which service has the highest error rate?"
• "Show me response times"

🚨 **Troubleshooting:**
• "Help me debug issues"
• "What alerts are active?"
• "How to improve performance?"

📈 **Scaling Insights:**
• "Should I scale my services?"
• "What's the current load?"
• "Capacity planning advice"

💡 **Best Practices:**
• "Monitoring best practices"
• "Alert configuration tips"
• "Performance optimization"

Just ask me anything about your FinCore microservices!`;
    }

    // Default response
    return `I understand you're asking about "${userMessage}". 

Here are some things I can help you with:

🔍 **Try asking:**
• "What's the system status?"
• "Show me performance metrics"
• "Are there any active alerts?"
• "Help me troubleshoot issues"
• "Should I scale my services?"

Or ask me anything specific about your FinCore microservices - I'm here to help analyze your monitoring data and provide insights!`;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const response = generateResponse(inputValue);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickActions = [
    { label: "System Status", query: "What's the system status?" },
    { label: "Performance", query: "Show me performance metrics" },
    { label: "Active Alerts", query: "Are there any active alerts?" },
    { label: "Scaling Advice", query: "Should I scale my services?" }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold">FinCore AI Assistant</h2>
              <p className="text-sm opacity-90">Your intelligent monitoring companion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-b bg-gray-50">
          <p className="text-sm text-gray-600 mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => setInputValue(action.query)}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-2 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-purple-100 text-purple-600'
                }`}>
                  {message.type === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  <div className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2 max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your system metrics, alerts, or performance..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isTyping}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;