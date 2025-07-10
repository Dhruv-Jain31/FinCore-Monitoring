#!/bin/bash

echo "🚀 Starting FinCore Microservices with Monitoring..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Build and start all services
echo "📦 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check service health
echo "🔍 Checking service health..."

services=("payments:8001" "investments:8002" "accounts:8003" "prometheus:9090" "grafana:3000")

for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if curl -f -s "http://localhost:$port/health" > /dev/null 2>&1 || curl -f -s "http://localhost:$port" > /dev/null 2>&1; then
        echo "✅ $name service is healthy on port $port"
    else
        echo "⚠️  $name service may not be ready yet on port $port"
    fi
done

echo ""
echo "🎉 FinCore Services Started Successfully!"
echo ""
echo "📊 Access your services:"
echo "   • Frontend Dashboard: http://localhost:5173"
echo "   • Payments Service: http://localhost:8001"
echo "   • Investments Service: http://localhost:8002"
echo "   • Accounts Service: http://localhost:8003"
echo "   • Prometheus: http://localhost:9090"
echo "   • Grafana: http://localhost:3000 (admin/admin)"
echo ""
echo "📈 API Documentation:"
echo "   • Payments API: http://localhost:8001/docs"
echo "   • Investments API: http://localhost:8002/docs"
echo "   • Accounts API: http://localhost:8003/docs"
echo ""
echo "🔧 To stop services: docker-compose down"
echo "📝 To view logs: docker-compose logs -f [service-name]"