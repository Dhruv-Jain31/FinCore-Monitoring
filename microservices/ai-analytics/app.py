from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib
import asyncio
import aiohttp
import logging
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from fastapi.responses import Response
import time
import json
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter('ai_analytics_requests_total', 'Total AI analytics requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('ai_analytics_request_duration_seconds', 'Request duration')
ACTIVE_CONNECTIONS = Gauge('ai_analytics_active_connections', 'Active connections')
PREDICTIONS_COUNT = Counter('ai_analytics_predictions_total', 'Total predictions made', ['type'])
MODEL_ACCURACY = Gauge('ai_analytics_model_accuracy', 'Model accuracy score', ['model_type'])

app = FastAPI(
    title="FinCore AI Analytics Service",
    description="AI-powered analytics and predictive modeling for microservices monitoring",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class MetricPoint(BaseModel):
    timestamp: datetime
    service: str
    metric_name: str
    value: float
    labels: Optional[Dict[str, str]] = {}

class PredictionRequest(BaseModel):
    service: str
    metric_name: str
    prediction_horizon: int = Field(default=60, description="Minutes to predict ahead")
    confidence_level: float = Field(default=0.95, description="Confidence level for prediction intervals")

class PredictionResponse(BaseModel):
    service: str
    metric_name: str
    predictions: List[Dict[str, Any]]
    confidence_intervals: List[Dict[str, Any]]
    model_accuracy: float
    prediction_horizon: int
    generated_at: datetime

class AnomalyDetectionRequest(BaseModel):
    service: str
    metric_name: str
    lookback_hours: int = Field(default=24, description="Hours of historical data to analyze")

class AnomalyResponse(BaseModel):
    service: str
    metric_name: str
    anomalies: List[Dict[str, Any]]
    anomaly_score: float
    threshold: float
    analysis_period: str
    detected_at: datetime

class SystemHealthPrediction(BaseModel):
    overall_health_score: float
    predicted_issues: List[Dict[str, Any]]
    recommendations: List[str]
    confidence: float
    prediction_horizon: int
    generated_at: datetime

class CapacityPlanningRequest(BaseModel):
    service: str
    growth_rate: float = Field(default=0.1, description="Expected growth rate (10% = 0.1)")
    planning_horizon_days: int = Field(default=30, description="Days to plan ahead")

class CapacityPlanningResponse(BaseModel):
    service: str
    current_capacity: Dict[str, float]
    predicted_capacity_needs: Dict[str, float]
    scaling_recommendations: List[str]
    cost_implications: Dict[str, Any]
    timeline: List[Dict[str, Any]]
    generated_at: datetime

# In-memory storage for metrics and models
metrics_storage = []
trained_models = {}
anomaly_detectors = {}
prediction_cache = {}

# AI Model Classes
class TimeSeriesPredictor:
    def __init__(self, service: str, metric_name: str):
        self.service = service
        self.metric_name = metric_name
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        self.accuracy = 0.0
        
    def prepare_features(self, data: pd.DataFrame, lookback_window: int = 10):
        """Prepare time series features for training"""
        features = []
        targets = []
        
        # Sort by timestamp
        data = data.sort_values('timestamp')
        values = data['value'].values
        
        for i in range(lookback_window, len(values)):
            # Use previous values as features
            feature_window = values[i-lookback_window:i]
            target = values[i]
            
            # Add time-based features
            timestamp = data.iloc[i]['timestamp']
            hour = timestamp.hour
            day_of_week = timestamp.weekday()
            
            # Combine features
            combined_features = np.concatenate([
                feature_window,
                [hour, day_of_week, i]  # time features and trend
            ])
            
            features.append(combined_features)
            targets.append(target)
            
        return np.array(features), np.array(targets)
    
    def train(self, data: pd.DataFrame):
        """Train the prediction model"""
        if len(data) < 20:  # Need minimum data points
            return False
            
        try:
            X, y = self.prepare_features(data)
            if len(X) == 0:
                return False
                
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train model
            self.model.fit(X_train_scaled, y_train)
            
            # Calculate accuracy
            y_pred = self.model.predict(X_test_scaled)
            mae = mean_absolute_error(y_test, y_pred)
            mse = mean_squared_error(y_test, y_pred)
            
            # Calculate accuracy as 1 - normalized MAE
            mean_actual = np.mean(y_test)
            self.accuracy = max(0, 1 - (mae / (mean_actual + 1e-8)))
            
            self.is_trained = True
            logger.info(f"Model trained for {self.service}/{self.metric_name} - Accuracy: {self.accuracy:.3f}")
            return True
            
        except Exception as e:
            logger.error(f"Training failed for {self.service}/{self.metric_name}: {str(e)}")
            return False
    
    def predict(self, data: pd.DataFrame, steps_ahead: int = 10):
        """Make predictions"""
        if not self.is_trained:
            return None, None
            
        try:
            # Prepare last window for prediction
            data = data.sort_values('timestamp').tail(10)
            if len(data) < 10:
                return None, None
                
            predictions = []
            confidence_intervals = []
            
            # Use last 10 points as starting window
            current_window = data['value'].values[-10:]
            last_timestamp = data['timestamp'].iloc[-1]
            
            for step in range(steps_ahead):
                # Prepare features for current prediction
                future_timestamp = last_timestamp + timedelta(minutes=step + 1)
                hour = future_timestamp.hour
                day_of_week = future_timestamp.weekday()
                trend = len(data) + step
                
                features = np.concatenate([current_window, [hour, day_of_week, trend]])
                features_scaled = self.scaler.transform([features])
                
                # Make prediction
                pred = self.model.predict(features_scaled)[0]
                predictions.append({
                    'timestamp': future_timestamp,
                    'predicted_value': float(pred),
                    'step_ahead': step + 1
                })
                
                # Simple confidence interval (can be improved with quantile regression)
                std_dev = np.std(current_window)
                confidence_intervals.append({
                    'timestamp': future_timestamp,
                    'lower_bound': float(pred - 1.96 * std_dev),
                    'upper_bound': float(pred + 1.96 * std_dev),
                    'confidence_level': 0.95
                })
                
                # Update window for next prediction
                current_window = np.append(current_window[1:], pred)
                
            return predictions, confidence_intervals
            
        except Exception as e:
            logger.error(f"Prediction failed for {self.service}/{self.metric_name}: {str(e)}")
            return None, None

class AnomalyDetector:
    def __init__(self, service: str, metric_name: str):
        self.service = service
        self.metric_name = metric_name
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        self.threshold = -0.5
        
    def train(self, data: pd.DataFrame):
        """Train anomaly detection model"""
        if len(data) < 10:
            return False
            
        try:
            # Prepare features
            features = self.prepare_anomaly_features(data)
            if len(features) == 0:
                return False
                
            # Scale and train
            features_scaled = self.scaler.fit_transform(features)
            self.model.fit(features_scaled)
            self.is_trained = True
            
            logger.info(f"Anomaly detector trained for {self.service}/{self.metric_name}")
            return True
            
        except Exception as e:
            logger.error(f"Anomaly training failed for {self.service}/{self.metric_name}: {str(e)}")
            return False
    
    def prepare_anomaly_features(self, data: pd.DataFrame):
        """Prepare features for anomaly detection"""
        data = data.sort_values('timestamp')
        features = []
        
        for i in range(1, len(data)):
            current_value = data.iloc[i]['value']
            prev_value = data.iloc[i-1]['value']
            timestamp = data.iloc[i]['timestamp']
            
            # Calculate features
            rate_of_change = (current_value - prev_value) / (prev_value + 1e-8)
            hour = timestamp.hour
            day_of_week = timestamp.weekday()
            
            features.append([current_value, rate_of_change, hour, day_of_week])
            
        return np.array(features)
    
    def detect_anomalies(self, data: pd.DataFrame):
        """Detect anomalies in the data"""
        if not self.is_trained:
            return []
            
        try:
            features = self.prepare_anomaly_features(data)
            if len(features) == 0:
                return []
                
            features_scaled = self.scaler.transform(features)
            anomaly_scores = self.model.decision_function(features_scaled)
            anomaly_labels = self.model.predict(features_scaled)
            
            anomalies = []
            for i, (score, label) in enumerate(zip(anomaly_scores, anomaly_labels)):
                if label == -1:  # Anomaly detected
                    anomalies.append({
                        'timestamp': data.iloc[i+1]['timestamp'],
                        'value': data.iloc[i+1]['value'],
                        'anomaly_score': float(score),
                        'severity': 'high' if score < -0.8 else 'medium' if score < -0.5 else 'low'
                    })
                    
            return anomalies
            
        except Exception as e:
            logger.error(f"Anomaly detection failed for {self.service}/{self.metric_name}: {str(e)}")
            return []

# Middleware for metrics
@app.middleware("http")
async def add_process_time_header(request, call_next):
    start_time = time.time()
    ACTIVE_CONNECTIONS.inc()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    REQUEST_DURATION.observe(process_time)
    REQUEST_COUNT.labels(method=request.method, endpoint=request.url.path).inc()
    ACTIVE_CONNECTIONS.dec()
    
    return response

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "service": "ai-analytics", 
        "timestamp": datetime.now(),
        "models_trained": len(trained_models),
        "anomaly_detectors": len(anomaly_detectors)
    }

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type="text/plain; version=0.0.4; charset=utf-8")

@app.post("/metrics/ingest")
async def ingest_metrics(metrics: List[MetricPoint]):
    """Ingest metrics data for analysis"""
    try:
        for metric in metrics:
            metrics_storage.append(metric.dict())
            
        # Keep only last 10000 metrics to manage memory
        if len(metrics_storage) > 10000:
            metrics_storage[:] = metrics_storage[-10000:]
            
        logger.info(f"Ingested {len(metrics)} metric points")
        return {"status": "success", "ingested_count": len(metrics)}
        
    except Exception as e:
        logger.error(f"Metrics ingestion failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Metrics ingestion failed")

@app.post("/models/train")
async def train_models(background_tasks: BackgroundTasks):
    """Train AI models on available data"""
    background_tasks.add_task(train_all_models)
    return {"status": "training_started", "message": "Models are being trained in the background"}

async def train_all_models():
    """Train models for all service/metric combinations"""
    try:
        # Group metrics by service and metric name
        df = pd.DataFrame(metrics_storage)
        if df.empty:
            logger.warning("No metrics data available for training")
            return
            
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        grouped = df.groupby(['service', 'metric_name'])
        
        for (service, metric_name), group in grouped:
            if len(group) < 20:  # Skip if insufficient data
                continue
                
            # Train prediction model
            model_key = f"{service}_{metric_name}_predictor"
            if model_key not in trained_models:
                trained_models[model_key] = TimeSeriesPredictor(service, metric_name)
                
            success = trained_models[model_key].train(group)
            if success:
                MODEL_ACCURACY.labels(model_type="predictor").set(trained_models[model_key].accuracy)
                
            # Train anomaly detector
            detector_key = f"{service}_{metric_name}_anomaly"
            if detector_key not in anomaly_detectors:
                anomaly_detectors[detector_key] = AnomalyDetector(service, metric_name)
                
            anomaly_detectors[detector_key].train(group)
            
        logger.info(f"Training completed. Models: {len(trained_models)}, Detectors: {len(anomaly_detectors)}")
        
    except Exception as e:
        logger.error(f"Model training failed: {str(e)}")

@app.post("/predict", response_model=PredictionResponse)
async def predict_metric(request: PredictionRequest):
    """Make predictions for a specific metric"""
    try:
        model_key = f"{request.service}_{request.metric_name}_predictor"
        
        if model_key not in trained_models:
            raise HTTPException(status_code=404, detail="Model not found. Please train models first.")
            
        model = trained_models[model_key]
        if not model.is_trained:
            raise HTTPException(status_code=400, detail="Model not trained yet")
            
        # Get recent data
        df = pd.DataFrame(metrics_storage)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        recent_data = df[
            (df['service'] == request.service) & 
            (df['metric_name'] == request.metric_name)
        ].sort_values('timestamp').tail(50)
        
        if len(recent_data) < 10:
            raise HTTPException(status_code=400, detail="Insufficient recent data for prediction")
            
        # Make predictions
        predictions, confidence_intervals = model.predict(recent_data, request.prediction_horizon)
        
        if predictions is None:
            raise HTTPException(status_code=500, detail="Prediction failed")
            
        PREDICTIONS_COUNT.labels(type="time_series").inc()
        
        return PredictionResponse(
            service=request.service,
            metric_name=request.metric_name,
            predictions=predictions,
            confidence_intervals=confidence_intervals,
            model_accuracy=model.accuracy,
            prediction_horizon=request.prediction_horizon,
            generated_at=datetime.now()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Prediction failed")

@app.post("/anomalies/detect", response_model=AnomalyResponse)
async def detect_anomalies(request: AnomalyDetectionRequest):
    """Detect anomalies in metric data"""
    try:
        detector_key = f"{request.service}_{request.metric_name}_anomaly"
        
        if detector_key not in anomaly_detectors:
            raise HTTPException(status_code=404, detail="Anomaly detector not found. Please train models first.")
            
        detector = anomaly_detectors[detector_key]
        if not detector.is_trained:
            raise HTTPException(status_code=400, detail="Anomaly detector not trained yet")
            
        # Get recent data
        df = pd.DataFrame(metrics_storage)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        cutoff_time = datetime.now() - timedelta(hours=request.lookback_hours)
        recent_data = df[
            (df['service'] == request.service) & 
            (df['metric_name'] == request.metric_name) &
            (df['timestamp'] >= cutoff_time)
        ].sort_values('timestamp')
        
        if len(recent_data) < 10:
            raise HTTPException(status_code=400, detail="Insufficient recent data for anomaly detection")
            
        # Detect anomalies
        anomalies = detector.detect_anomalies(recent_data)
        
        # Calculate overall anomaly score
        anomaly_score = len(anomalies) / len(recent_data) if len(recent_data) > 0 else 0
        
        return AnomalyResponse(
            service=request.service,
            metric_name=request.metric_name,
            anomalies=anomalies,
            anomaly_score=anomaly_score,
            threshold=detector.threshold,
            analysis_period=f"{request.lookback_hours} hours",
            detected_at=datetime.now()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Anomaly detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Anomaly detection failed")

@app.get("/health/predict", response_model=SystemHealthPrediction)
async def predict_system_health():
    """Predict overall system health and potential issues"""
    try:
        df = pd.DataFrame(metrics_storage)
        if df.empty:
            raise HTTPException(status_code=400, detail="No metrics data available")
            
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        recent_cutoff = datetime.now() - timedelta(hours=1)
        recent_data = df[df['timestamp'] >= recent_cutoff]
        
        # Analyze different aspects of system health
        health_scores = []
        predicted_issues = []
        recommendations = []
        
        # Error rate analysis
        error_metrics = recent_data[recent_data['metric_name'].str.contains('error', case=False)]
        if not error_metrics.empty:
            avg_error_rate = error_metrics['value'].mean()
            error_score = max(0, 1 - (avg_error_rate * 10))  # Assume error rates are small decimals
            health_scores.append(error_score)
            
            if avg_error_rate > 0.05:
                predicted_issues.append({
                    'type': 'high_error_rate',
                    'severity': 'high',
                    'description': f'Error rate is {avg_error_rate:.2%}, above 5% threshold',
                    'affected_services': error_metrics['service'].unique().tolist()
                })
                recommendations.append('Investigate error logs and recent deployments')
        
        # Response time analysis
        latency_metrics = recent_data[recent_data['metric_name'].str.contains('duration|latency', case=False)]
        if not latency_metrics.empty:
            avg_latency = latency_metrics['value'].mean()
            latency_score = max(0, 1 - (avg_latency / 1000))  # Assume latency in ms
            health_scores.append(latency_score)
            
            if avg_latency > 500:
                predicted_issues.append({
                    'type': 'high_latency',
                    'severity': 'medium',
                    'description': f'Average response time is {avg_latency:.0f}ms, above 500ms threshold',
                    'affected_services': latency_metrics['service'].unique().tolist()
                })
                recommendations.append('Consider scaling services or optimizing database queries')
        
        # Resource utilization analysis
        cpu_metrics = recent_data[recent_data['metric_name'].str.contains('cpu', case=False)]
        memory_metrics = recent_data[recent_data['metric_name'].str.contains('memory', case=False)]
        
        if not cpu_metrics.empty:
            avg_cpu = cpu_metrics['value'].mean()
            cpu_score = max(0, 1 - (avg_cpu / 100))
            health_scores.append(cpu_score)
            
            if avg_cpu > 70:
                predicted_issues.append({
                    'type': 'high_cpu_usage',
                    'severity': 'high',
                    'description': f'CPU usage is {avg_cpu:.1f}%, above 70% threshold',
                    'affected_services': cpu_metrics['service'].unique().tolist()
                })
                recommendations.append('Scale horizontally or optimize CPU-intensive operations')
        
        # Calculate overall health score
        overall_health = np.mean(health_scores) if health_scores else 0.5
        confidence = min(1.0, len(health_scores) / 5)  # Higher confidence with more metrics
        
        # Add predictive recommendations based on trends
        if overall_health < 0.7:
            recommendations.append('System health is degrading - consider immediate intervention')
        elif overall_health < 0.8:
            recommendations.append('Monitor system closely - potential issues detected')
        else:
            recommendations.append('System is healthy - maintain current monitoring')
            
        return SystemHealthPrediction(
            overall_health_score=overall_health,
            predicted_issues=predicted_issues,
            recommendations=recommendations,
            confidence=confidence,
            prediction_horizon=60,  # 1 hour ahead
            generated_at=datetime.now()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Health prediction failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Health prediction failed")

@app.post("/capacity/plan", response_model=CapacityPlanningResponse)
async def plan_capacity(request: CapacityPlanningRequest):
    """Generate capacity planning recommendations"""
    try:
        df = pd.DataFrame(metrics_storage)
        if df.empty:
            raise HTTPException(status_code=400, detail="No metrics data available")
            
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Filter data for the specific service
        service_data = df[df['service'] == request.service]
        if service_data.empty:
            raise HTTPException(status_code=404, detail=f"No data found for service: {request.service}")
            
        # Analyze current capacity metrics
        recent_cutoff = datetime.now() - timedelta(hours=24)
        recent_data = service_data[service_data['timestamp'] >= recent_cutoff]
        
        current_capacity = {}
        predicted_capacity = {}
        scaling_recommendations = []
        timeline = []
        
        # Analyze key capacity metrics
        capacity_metrics = ['cpu', 'memory', 'connections', 'requests']
        
        for metric_type in capacity_metrics:
            metric_data = recent_data[recent_data['metric_name'].str.contains(metric_type, case=False)]
            
            if not metric_data.empty:
                current_avg = metric_data['value'].mean()
                current_max = metric_data['value'].max()
                
                # Project future needs based on growth rate
                future_avg = current_avg * (1 + request.growth_rate) ** (request.planning_horizon_days / 30)
                future_max = current_max * (1 + request.growth_rate) ** (request.planning_horizon_days / 30)
                
                current_capacity[metric_type] = {
                    'average': current_avg,
                    'peak': current_max,
                    'unit': 'percent' if metric_type in ['cpu', 'memory'] else 'count'
                }
                
                predicted_capacity[metric_type] = {
                    'average': future_avg,
                    'peak': future_max,
                    'growth_factor': future_avg / current_avg
                }
                
                # Generate scaling recommendations
                if future_max > 80 and metric_type in ['cpu', 'memory']:
                    scaling_recommendations.append(
                        f"Scale {metric_type} capacity - projected to reach {future_max:.1f}% in {request.planning_horizon_days} days"
                    )
                elif future_avg > current_avg * 1.5:
                    scaling_recommendations.append(
                        f"Monitor {metric_type} usage - {((future_avg/current_avg - 1) * 100):.1f}% increase expected"
                    )
                    
                # Create timeline milestones
                for week in range(1, min(5, request.planning_horizon_days // 7 + 1)):
                    week_projection = current_avg * (1 + request.growth_rate) ** (week * 7 / 30)
                    timeline.append({
                        'week': week,
                        'metric': metric_type,
                        'projected_value': week_projection,
                        'capacity_utilization': week_projection / 100 if metric_type in ['cpu', 'memory'] else week_projection
                    })
        
        # Cost implications (simplified model)
        current_cost_base = 1000  # Base monthly cost
        growth_multiplier = (1 + request.growth_rate) ** (request.planning_horizon_days / 30)
        
        cost_implications = {
            'current_monthly_cost': current_cost_base,
            'projected_monthly_cost': current_cost_base * growth_multiplier,
            'additional_cost': current_cost_base * (growth_multiplier - 1),
            'cost_per_user_growth': (current_cost_base * (growth_multiplier - 1)) / max(1, request.growth_rate * 100)
        }
        
        return CapacityPlanningResponse(
            service=request.service,
            current_capacity=current_capacity,
            predicted_capacity_needs=predicted_capacity,
            scaling_recommendations=scaling_recommendations,
            cost_implications=cost_implications,
            timeline=timeline,
            generated_at=datetime.now()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Capacity planning failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Capacity planning failed")

@app.get("/insights/summary")
async def get_ai_insights():
    """Get comprehensive AI-powered insights about the system"""
    try:
        insights = {
            'timestamp': datetime.now(),
            'models_status': {
                'trained_models': len(trained_models),
                'anomaly_detectors': len(anomaly_detectors),
                'total_metrics_analyzed': len(metrics_storage)
            },
            'key_findings': [],
            'recommendations': [],
            'risk_assessment': {
                'overall_risk': 'low',
                'risk_factors': []
            }
        }
        
        # Analyze recent patterns
        df = pd.DataFrame(metrics_storage)
        if not df.empty:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            recent_data = df[df['timestamp'] >= datetime.now() - timedelta(hours=24)]
            
            # Service performance analysis
            service_performance = recent_data.groupby('service')['value'].agg(['mean', 'std', 'count'])
            
            for service in service_performance.index:
                perf = service_performance.loc[service]
                if perf['std'] > perf['mean'] * 0.5:  # High variability
                    insights['key_findings'].append(
                        f"{service} shows high performance variability (std: {perf['std']:.2f})"
                    )
                    insights['recommendations'].append(
                        f"Investigate {service} for potential instability"
                    )
            
            # Trend analysis
            hourly_trends = recent_data.groupby([
                recent_data['timestamp'].dt.hour, 'service'
            ])['value'].mean().unstack(fill_value=0)
            
            # Risk assessment
            risk_factors = []
            if len(recent_data) < 100:
                risk_factors.append('Insufficient monitoring data')
            
            error_rate_data = recent_data[recent_data['metric_name'].str.contains('error', case=False)]
            if not error_rate_data.empty and error_rate_data['value'].mean() > 0.05:
                risk_factors.append('Elevated error rates detected')
                insights['risk_assessment']['overall_risk'] = 'medium'
            
            insights['risk_assessment']['risk_factors'] = risk_factors
            
        return insights
        
    except Exception as e:
        logger.error(f"Insights generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Insights generation failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)