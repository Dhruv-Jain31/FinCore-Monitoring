from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import uuid
import random
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from fastapi.responses import Response
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter('investments_requests_total', 'Total investment requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('investments_request_duration_seconds', 'Request duration')
ACTIVE_CONNECTIONS = Gauge('investments_active_connections', 'Active connections')
PORTFOLIO_VALUE = Gauge('investments_portfolio_value_dollars', 'Portfolio values', ['user_id'])
TRADES_COUNT = Counter('investments_trades_total', 'Total trades', ['type'])

app = FastAPI(
    title="FinCore Investment Service",
    description="Microservice for personalized investment tracking and portfolio management",
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
class StockPosition(BaseModel):
    symbol: str
    quantity: int
    average_price: float
    current_price: float
    total_value: float
    gain_loss: float
    gain_loss_percent: float

class Portfolio(BaseModel):
    user_id: str
    total_value: float
    total_gain_loss: float
    total_gain_loss_percent: float
    positions: List[StockPosition]
    last_updated: datetime

class TradeRequest(BaseModel):
    user_id: str
    symbol: str
    quantity: int = Field(..., gt=0)
    trade_type: str = Field(..., pattern="^(buy|sell)$")
    price: Optional[float] = None

class TradeResponse(BaseModel):
    trade_id: str
    user_id: str
    symbol: str
    quantity: int
    trade_type: str
    price: float
    total_amount: float
    timestamp: datetime
    status: str

class MarketData(BaseModel):
    symbol: str
    price: float
    change: float
    change_percent: float
    volume: int
    last_updated: datetime

# Mock data
mock_stock_prices = {
    "AAPL": 175.50,
    "GOOGL": 2800.00,
    "MSFT": 380.25,
    "AMZN": 3200.00,
    "TSLA": 850.75,
    "META": 320.50,
    "NVDA": 450.00,
    "NFLX": 400.25
}

# In-memory storage
portfolios_db = {}
trades_db = {}
user_positions = {
    "user_001": {
        "AAPL": {"quantity": 50, "average_price": 170.00},
        "GOOGL": {"quantity": 5, "average_price": 2750.00},
        "MSFT": {"quantity": 25, "average_price": 375.00}
    },
    "user_002": {
        "TSLA": {"quantity": 10, "average_price": 800.00},
        "META": {"quantity": 15, "average_price": 310.00}
    }
}

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

def generate_mock_price(base_price: float) -> float:
    """Generate mock price with some volatility"""
    change_percent = random.uniform(-0.05, 0.05)  # ±5% change
    return round(base_price * (1 + change_percent), 2)

def calculate_portfolio_value(user_id: str) -> Portfolio:
    """Calculate portfolio value for a user"""
    if user_id not in user_positions:
        raise HTTPException(status_code=404, detail="User portfolio not found")
    
    positions = []
    total_value = 0
    total_cost = 0
    
    for symbol, position in user_positions[user_id].items():
        current_price = generate_mock_price(mock_stock_prices.get(symbol, 100))
        quantity = position["quantity"]
        average_price = position["average_price"]
        
        total_position_value = quantity * current_price
        total_position_cost = quantity * average_price
        gain_loss = total_position_value - total_position_cost
        gain_loss_percent = (gain_loss / total_position_cost) * 100 if total_position_cost > 0 else 0
        
        stock_position = StockPosition(
            symbol=symbol,
            quantity=quantity,
            average_price=average_price,
            current_price=current_price,
            total_value=total_position_value,
            gain_loss=gain_loss,
            gain_loss_percent=gain_loss_percent
        )
        positions.append(stock_position)
        
        total_value += total_position_value
        total_cost += total_position_cost
    
    total_gain_loss = total_value - total_cost
    total_gain_loss_percent = (total_gain_loss / total_cost) * 100 if total_cost > 0 else 0
    
    portfolio = Portfolio(
        user_id=user_id,
        total_value=total_value,
        total_gain_loss=total_gain_loss,
        total_gain_loss_percent=total_gain_loss_percent,
        positions=positions,
        last_updated=datetime.now()
    )
    
    # Update metrics
    PORTFOLIO_VALUE.labels(user_id=user_id).set(total_value)
    
    return portfolio

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "investments", "timestamp": datetime.now()}

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type="text/plain; version=0.0.4; charset=utf-8")

@app.get("/portfolio/{user_id}", response_model=Portfolio)
async def get_portfolio(user_id: str):
    """Get user's portfolio"""
    try:
        portfolio = calculate_portfolio_value(user_id)
        logger.info(f"Portfolio retrieved for user {user_id}: ${portfolio.total_value:.2f}")
        return portfolio
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get portfolio for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/trades", response_model=TradeResponse)
async def execute_trade(trade: TradeRequest):
    """Execute a trade"""
    try:
        # Get current market price
        current_price = generate_mock_price(mock_stock_prices.get(trade.symbol, 100))
        execution_price = trade.price if trade.price else current_price
        
        # Calculate total amount
        total_amount = trade.quantity * execution_price
        
        # Create trade record
        trade_id = str(uuid.uuid4())
        trade_response = TradeResponse(
            trade_id=trade_id,
            user_id=trade.user_id,
            symbol=trade.symbol,
            quantity=trade.quantity,
            trade_type=trade.trade_type,
            price=execution_price,
            total_amount=total_amount,
            timestamp=datetime.now(),
            status="executed"
        )
        
        trades_db[trade_id] = trade_response
        
        # Update user positions
        if trade.user_id not in user_positions:
            user_positions[trade.user_id] = {}
        
        if trade.trade_type == "buy":
            if trade.symbol in user_positions[trade.user_id]:
                # Update existing position
                existing = user_positions[trade.user_id][trade.symbol]
                total_quantity = existing["quantity"] + trade.quantity
                total_cost = (existing["quantity"] * existing["average_price"]) + total_amount
                new_average_price = total_cost / total_quantity
                
                user_positions[trade.user_id][trade.symbol] = {
                    "quantity": total_quantity,
                    "average_price": new_average_price
                }
            else:
                # Create new position
                user_positions[trade.user_id][trade.symbol] = {
                    "quantity": trade.quantity,
                    "average_price": execution_price
                }
        
        elif trade.trade_type == "sell":
            if trade.symbol in user_positions[trade.user_id]:
                existing = user_positions[trade.user_id][trade.symbol]
                if existing["quantity"] >= trade.quantity:
                    new_quantity = existing["quantity"] - trade.quantity
                    if new_quantity == 0:
                        del user_positions[trade.user_id][trade.symbol]
                    else:
                        user_positions[trade.user_id][trade.symbol]["quantity"] = new_quantity
                else:
                    raise HTTPException(status_code=400, detail="Insufficient shares to sell")
            else:
                raise HTTPException(status_code=400, detail="No position found for this symbol")
        
        # Update metrics
        TRADES_COUNT.labels(type=trade.trade_type).inc()
        
        logger.info(f"Trade executed: {trade_id} - {trade.trade_type} {trade.quantity} {trade.symbol} at ${execution_price}")
        
        return trade_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trade execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/trades/{user_id}", response_model=List[TradeResponse])
async def get_user_trades(user_id: str, limit: int = 20):
    """Get user's trade history"""
    user_trades = [trade for trade in trades_db.values() if trade.user_id == user_id]
    user_trades.sort(key=lambda x: x.timestamp, reverse=True)
    return user_trades[:limit]

@app.get("/market/{symbol}", response_model=MarketData)
async def get_market_data(symbol: str):
    """Get market data for a symbol"""
    if symbol not in mock_stock_prices:
        raise HTTPException(status_code=404, detail="Symbol not found")
    
    base_price = mock_stock_prices[symbol]
    current_price = generate_mock_price(base_price)
    change = current_price - base_price
    change_percent = (change / base_price) * 100
    
    return MarketData(
        symbol=symbol,
        price=current_price,
        change=change,
        change_percent=change_percent,
        volume=random.randint(1000000, 10000000),
        last_updated=datetime.now()
    )

@app.get("/market", response_model=List[MarketData])
async def get_market_overview():
    """Get market overview for all symbols"""
    market_data = []
    for symbol in mock_stock_prices.keys():
        data = await get_market_data(symbol)
        market_data.append(data)
    return market_data

@app.get("/analytics/{user_id}")
async def get_portfolio_analytics(user_id: str):
    """Get portfolio analytics and insights"""
    portfolio = calculate_portfolio_value(user_id)
    
    # Calculate additional analytics
    best_performer = max(portfolio.positions, key=lambda x: x.gain_loss_percent) if portfolio.positions else None
    worst_performer = min(portfolio.positions, key=lambda x: x.gain_loss_percent) if portfolio.positions else None
    
    # Calculate asset allocation
    asset_allocation = {}
    for position in portfolio.positions:
        allocation_percent = (position.total_value / portfolio.total_value) * 100
        asset_allocation[position.symbol] = allocation_percent
    
    return {
        "user_id": user_id,
        "portfolio_summary": {
            "total_value": portfolio.total_value,
            "total_gain_loss": portfolio.total_gain_loss,
            "total_gain_loss_percent": portfolio.total_gain_loss_percent,
            "position_count": len(portfolio.positions)
        },
        "performance": {
            "best_performer": {
                "symbol": best_performer.symbol if best_performer else None,
                "gain_loss_percent": best_performer.gain_loss_percent if best_performer else None
            },
            "worst_performer": {
                "symbol": worst_performer.symbol if worst_performer else None,
                "gain_loss_percent": worst_performer.gain_loss_percent if worst_performer else None
            }
        },
        "asset_allocation": asset_allocation,
        "last_updated": datetime.now()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)