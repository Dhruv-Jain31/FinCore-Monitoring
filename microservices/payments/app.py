from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid
import asyncio
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from fastapi.responses import Response
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter('payments_requests_total', 'Total payments requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('payments_request_duration_seconds', 'Request duration')
ACTIVE_CONNECTIONS = Gauge('payments_active_connections', 'Active connections')
PAYMENT_AMOUNT = Histogram('payments_amount_dollars', 'Payment amounts in dollars')
PAYMENT_STATUS = Counter('payments_status_total', 'Payment status counts', ['status'])

app = FastAPI(
    title="FinCore Payments Service",
    description="Microservice for handling instant payments and transactions",
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
class PaymentRequest(BaseModel):
    from_account: str = Field(..., description="Source account ID")
    to_account: str = Field(..., description="Destination account ID")
    amount: float = Field(..., gt=0, description="Payment amount")
    currency: str = Field(default="USD", description="Payment currency")
    description: Optional[str] = Field(None, description="Payment description")

class PaymentResponse(BaseModel):
    payment_id: str
    status: str
    amount: float
    currency: str
    from_account: str
    to_account: str
    timestamp: datetime
    description: Optional[str] = None

class PaymentStatus(BaseModel):
    payment_id: str
    status: str
    created_at: datetime
    updated_at: datetime

# In-memory storage (replace with actual database)
payments_db = {}
account_balances = {
    "acc_001": 10000.00,
    "acc_002": 5000.00,
    "acc_003": 15000.00,
    "acc_004": 2500.00
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

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "payments", "timestamp": datetime.now()}

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type="text/plain; version=0.0.4; charset=utf-8")

@app.post("/payments", response_model=PaymentResponse)
async def create_payment(payment: PaymentRequest):
    """Create a new payment transaction"""
    try:
        # Validate accounts exist
        if payment.from_account not in account_balances:
            PAYMENT_STATUS.labels(status="failed").inc()
            raise HTTPException(status_code=404, detail="Source account not found")
        
        if payment.to_account not in account_balances:
            PAYMENT_STATUS.labels(status="failed").inc()
            raise HTTPException(status_code=404, detail="Destination account not found")
        
        # Check sufficient balance
        if account_balances[payment.from_account] < payment.amount:
            PAYMENT_STATUS.labels(status="failed").inc()
            raise HTTPException(status_code=400, detail="Insufficient funds")
        
        # Create payment
        payment_id = str(uuid.uuid4())
        timestamp = datetime.now()
        
        # Simulate payment processing delay
        await asyncio.sleep(0.1)
        
        # Update balances
        account_balances[payment.from_account] -= payment.amount
        account_balances[payment.to_account] += payment.amount
        
        # Store payment
        payment_record = PaymentResponse(
            payment_id=payment_id,
            status="completed",
            amount=payment.amount,
            currency=payment.currency,
            from_account=payment.from_account,
            to_account=payment.to_account,
            timestamp=timestamp,
            description=payment.description
        )
        
        payments_db[payment_id] = payment_record
        
        # Update metrics
        PAYMENT_AMOUNT.observe(payment.amount)
        PAYMENT_STATUS.labels(status="completed").inc()
        
        logger.info(f"Payment created: {payment_id} - ${payment.amount} from {payment.from_account} to {payment.to_account}")
        
        return payment_record
        
    except HTTPException:
        raise
    except Exception as e:
        PAYMENT_STATUS.labels(status="error").inc()
        logger.error(f"Payment creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/payments/{payment_id}", response_model=PaymentResponse)
async def get_payment(payment_id: str):
    """Get payment details by ID"""
    if payment_id not in payments_db:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return payments_db[payment_id]

@app.get("/payments", response_model=List[PaymentResponse])
async def list_payments(limit: int = 10, offset: int = 0):
    """List all payments with pagination"""
    all_payments = list(payments_db.values())
    total_payments = len(all_payments)
    
    # Apply pagination
    paginated_payments = all_payments[offset:offset + limit]
    
    return paginated_payments

@app.get("/accounts/{account_id}/balance")
async def get_account_balance(account_id: str):
    """Get account balance"""
    if account_id not in account_balances:
        raise HTTPException(status_code=404, detail="Account not found")
    
    return {
        "account_id": account_id,
        "balance": account_balances[account_id],
        "currency": "USD",
        "timestamp": datetime.now()
    }

@app.get("/accounts/{account_id}/transactions")
async def get_account_transactions(account_id: str):
    """Get transaction history for an account"""
    transactions = []
    
    for payment in payments_db.values():
        if payment.from_account == account_id or payment.to_account == account_id:
            transaction_type = "debit" if payment.from_account == account_id else "credit"
            transactions.append({
                "payment_id": payment.payment_id,
                "type": transaction_type,
                "amount": payment.amount,
                "currency": payment.currency,
                "timestamp": payment.timestamp,
                "description": payment.description,
                "counterparty": payment.to_account if transaction_type == "debit" else payment.from_account
            })
    
    # Sort by timestamp (newest first)
    transactions.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return {
        "account_id": account_id,
        "transactions": transactions,
        "total_count": len(transactions)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)