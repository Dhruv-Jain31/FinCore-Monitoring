# 📊 Complete Grafana & Prometheus Configuration Guide

## Step-by-Step Setup Process

### 🚀 Step 1: Start All Services
```bash
# Make sure Docker is running
docker info

# Start all services
chmod +x start-services.sh
./start-services.sh

# Verify services are running
docker-compose ps
```

### 📈 Step 2: Access Prometheus (Verify Data Collection)

1. **Open Prometheus**: http://localhost:9090
2. **Check Targets**: Go to Status → Targets
   - You should see all 3 microservices listed as "UP"
   - If any show as "DOWN", check the service logs

3. **Test Queries**: In the query box, try these:
   ```promql
   # Check if services are up
   up
   
   # Request rates
   rate(payments_requests_total[5m])
   rate(investments_requests_total[5m])
   rate(accounts_requests_total[5m])
   
   # Response times
   payments_request_duration_seconds
   
   # Business metrics
   accounts_total
   investments_portfolio_value_dollars
   ```

### 🎨 Step 3: Configure Grafana Dashboard

#### 3.1 Initial Login
1. **Open Grafana**: http://localhost:3000
2. **Login**: Username: `admin`, Password: `admin`
3. **Skip password change** (for development)

#### 3.2 Verify Data Source
1. Go to **Configuration** → **Data Sources**
2. You should see **Prometheus** already configured
3. Click **Test** to verify connection
4. If not working, add manually:
   - URL: `http://prometheus:9090`
   - Access: `Server (default)`

#### 3.3 Import Pre-built Dashboard
1. Go to **Create** → **Import**
2. **Upload JSON file**: Use the `fincore-overview.json` file created above
3. **Configure**:
   - Name: "FinCore Microservices Overview"
   - Folder: General
   - Data Source: Prometheus
4. Click **Import**

#### 3.4 Create Custom Dashboard (Manual Method)

**Option A: Quick Dashboard Creation**
1. Click **Create** → **Dashboard**
2. Click **Add new panel**
3. **Configure each panel**:

**Panel 1: Service Uptime**
```promql
Query: up{job=~".*-service"}
Visualization: Gauge
Title: Service Uptime
```

**Panel 2: Request Rate**
```promql
Query: rate(payments_requests_total[5m])
Legend: Payments
Add Query: rate(investments_requests_total[5m])
Legend: Investments
Add Query: rate(accounts_requests_total[5m])
Legend: Accounts
Visualization: Time series
Title: Request Rate per Service
```

**Panel 3: Response Time**
```promql
Query: histogram_quantile(0.95, rate(payments_request_duration_seconds_bucket[5m]))
Legend: Payments 95th percentile
Visualization: Time series
Title: Response Time (95th Percentile)
```

**Panel 4: Business Metrics**
```promql
Query: accounts_total
Legend: Total Accounts
Visualization: Stat
Title: Total Accounts
```

### 🚨 Step 4: Configure Alerting

#### 4.1 Prometheus Alerts (Already Configured)
The `alert_rules.yml` file contains pre-configured alerts:
- High Error Rate (>10%)
- High Latency (>500ms)
- Service Down
- High Memory Usage (>500MB)
- Low Account Balance

#### 4.2 Grafana Alerts
1. **Go to Alerting** → **Alert Rules**
2. **Create New Rule**:
   - **Query**: `rate(payments_requests_total{status=~"5.."}[5m]) > 0.1`
   - **Condition**: IS ABOVE 0.1
   - **Evaluation**: Every 1m for 5m
   - **Summary**: High error rate in payments service

3. **Create Notification Channel**:
   - Go to **Alerting** → **Notification channels**
   - Add webhook, email, or Slack integration

### 🧪 Step 5: Generate Test Data

#### 5.1 Create Test Traffic
```bash
# Generate payments
for i in {1..10}; do
  curl -X POST http://localhost:8001/payments \
    -H "Content-Type: application/json" \
    -d "{
      \"from_account\": \"acc_001\",
      \"to_account\": \"acc_002\",
      \"amount\": $((RANDOM % 1000 + 100)),
      \"description\": \"Test payment $i\"
    }"
  sleep 2
done

# Get portfolio data
curl http://localhost:8002/portfolio/user_001

# Create accounts
curl -X POST http://localhost:8003/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "initial_deposit": 1000.00
  }'
```

#### 5.2 Generate Load (Optional)
```bash
# Install Apache Bench (if not installed)
# Ubuntu/Debian: sudo apt-get install apache2-utils
# macOS: brew install httpie

# Generate continuous load
while true; do
  curl -s http://localhost:8001/health > /dev/null
  curl -s http://localhost:8002/health > /dev/null
  curl -s http://localhost:8003/health > /dev/null
  sleep 1
done
```

### 📊 Step 6: Advanced Dashboard Configuration

#### 6.1 Dashboard Variables
1. **Go to Dashboard Settings** → **Variables**
2. **Add Variable**:
   - Name: `service`
   - Type: Query
   - Query: `label_values(up, job)`
   - Multi-value: Yes

#### 6.2 Advanced Queries
```promql
# Memory usage by service
process_resident_memory_bytes / 1024 / 1024

# Request duration histogram
histogram_quantile(0.50, rate(payments_request_duration_seconds_bucket[5m]))
histogram_quantile(0.95, rate(payments_request_duration_seconds_bucket[5m]))
histogram_quantile(0.99, rate(payments_request_duration_seconds_bucket[5m]))

# Error rate percentage
(rate(payments_requests_total{status=~"5.."}[5m]) / rate(payments_requests_total[5m])) * 100

# Active connections
payments_active_connections
investments_active_connections
accounts_active_connections
```

### 🔍 Step 7: Troubleshooting

#### 7.1 Common Issues

**Services not appearing in Prometheus:**
```bash
# Check service health
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health

# Check metrics endpoints
curl http://localhost:8001/metrics
curl http://localhost:8002/metrics
curl http://localhost:8003/metrics

# Check Prometheus config
curl http://localhost:9090/api/v1/targets
```

**Grafana not showing data:**
1. Check data source connection
2. Verify time range (last 1 hour)
3. Check query syntax
4. Verify metric names in Prometheus

**No metrics appearing:**
```bash
# Restart services
docker-compose restart

# Check logs
docker-compose logs prometheus
docker-compose logs grafana
docker-compose logs payments
```

#### 7.2 Useful Commands
```bash
# View all metrics from a service
curl http://localhost:8001/metrics | grep -E "^[a-zA-Z]"

# Check Prometheus configuration
docker exec -it $(docker-compose ps -q prometheus) cat /etc/prometheus/prometheus.yml

# Grafana logs
docker-compose logs grafana

# Restart specific service
docker-compose restart payments
```

### 📈 Step 8: Dashboard Best Practices

#### 8.1 Panel Organization
- **Top Row**: High-level KPIs (uptime, request rate, error rate)
- **Middle Row**: Performance metrics (response time, throughput)
- **Bottom Row**: Business metrics (accounts, payments, portfolio value)

#### 8.2 Time Ranges
- **Default**: Last 1 hour
- **Refresh**: Every 30 seconds
- **Auto-refresh**: Enable for live monitoring

#### 8.3 Alert Thresholds
- **Error Rate**: > 5% (warning), > 10% (critical)
- **Response Time**: > 200ms (warning), > 500ms (critical)
- **Memory Usage**: > 80% (warning), > 90% (critical)

### 🎯 Step 9: Verification Checklist

- [ ] All services show as "UP" in Prometheus targets
- [ ] Grafana dashboard displays live data
- [ ] Metrics update in real-time
- [ ] Alerts are configured and working
- [ ] Test data generation works
- [ ] All panels show meaningful data

### 🚀 Step 10: Next Steps

1. **Production Setup**:
   - Configure persistent storage for Grafana
   - Set up proper authentication
   - Configure notification channels

2. **Advanced Monitoring**:
   - Add custom business metrics
   - Set up log aggregation
   - Implement distributed tracing

3. **Scaling**:
   - Configure service discovery
   - Add more microservices
   - Set up multi-environment monitoring

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all services are running: `docker-compose ps`
3. Check service logs: `docker-compose logs [service-name]`
4. Ensure ports are not conflicting: `lsof -i :9090` and `lsof -i :3000`