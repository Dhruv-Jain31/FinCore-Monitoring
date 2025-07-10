from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import uuid
import hashlib
import secrets
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from fastapi.responses import Response
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter('accounts_requests_total', 'Total account requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('accounts_request_duration_seconds', 'Request duration')
ACTIVE_CONNECTIONS = Gauge('accounts_active_connections', 'Active connections')
ACCOUNT_COUNT = Gauge('accounts_total', 'Total number of accounts')
ACCOUNT_CREATION = Counter('accounts_created_total', 'Total accounts created')

app = FastAPI(
    title="FinCore Account Service",
    description="Microservice for automated account services and customer management",
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
class AccountCreate(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    phone: Optional[str] = Field(None, pattern=r'^\+?1?\d{9,15}$')
    date_of_birth: Optional[datetime] = None
    initial_deposit: float = Field(default=0.0, ge=0)

class AccountResponse(BaseModel):
    account_id: str
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    date_of_birth: Optional[datetime]
    account_type: str
    balance: float
    status: str
    created_at: datetime
    last_login: Optional[datetime]

class AccountUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    phone: Optional[str] = Field(None, pattern=r'^\+?1?\d{9,15}$')
    email: Optional[EmailStr] = None

class AccountStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(active|suspended|closed)$")
    reason: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    account_id: str
    email: str
    full_name: str
    token: str
    expires_at: datetime

class AccountActivity(BaseModel):
    activity_id: str
    account_id: str
    activity_type: str
    description: str
    timestamp: datetime
    metadata: Optional[Dict] = None

# In-memory storage (replace with actual database)
accounts_db = {}
account_activities = {}
login_sessions = {}

# Mock existing accounts
mock_accounts = {
    "acc_001": {
        "account_id": "acc_001",
        "email": "john.doe@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "phone": "+1234567890",
        "date_of_birth": datetime(1990, 5, 15),
        "account_type": "checking",
        "balance": 10000.00,
        "status": "active",
        "created_at": datetime.now() - timedelta(days=30),
        "last_login": datetime.now() - timedelta(hours=2)
    },
    "acc_002": {
        "account_id": "acc_002",
        "email": "jane.smith@example.com",
        "first_name": "Jane",
        "last_name": "Smith",
        "phone": "+1234567891",
        "date_of_birth": datetime(1985, 8, 22),
        "account_type": "savings",
        "balance": 5000.00,
        "status": "active",
        "created_at": datetime.now() - timedelta(days=60),
        "last_login": datetime.now() - timedelta(hours=5)
    }
}

# Initialize accounts_db with mock data
accounts_db.update(mock_accounts)

def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    """Generate a secure token"""
    return secrets.token_urlsafe(32)

def log_activity(account_id: str, activity_type: str, description: str, metadata: Optional[Dict] = None):
    """Log account activity"""
    activity_id = str(uuid.uuid4())
    activity = AccountActivity(
        activity_id=activity_id,
        account_id=account_id,
        activity_type=activity_type,
        description=description,
        timestamp=datetime.now(),
        metadata=metadata
    )
    
    if account_id not in account_activities:
        account_activities[account_id] = []
    
    account_activities[account_id].append(activity)
    
    # Keep only last 100 activities per account
    if len(account_activities[account_id]) > 100:
        account_activities[account_id] = account_activities[account_id][-100:]

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
    return {"status": "healthy", "service": "accounts", "timestamp": datetime.now()}

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type="text/plain; version=0.0.4; charset=utf-8")

@app.post("/accounts", response_model=AccountResponse)
async def create_account(account: AccountCreate):
    """Create a new account"""
    try:
        # Check if email already exists
        for existing_account in accounts_db.values():
            if existing_account["email"] == account.email:
                raise HTTPException(status_code=400, detail="Email already registered")
        
        # Create new account
        account_id = f"acc_{str(uuid.uuid4())[:8]}"
        account_data = {
            "account_id": account_id,
            "email": account.email,
            "first_name": account.first_name,
            "last_name": account.last_name,
            "phone": account.phone,
            "date_of_birth": account.date_of_birth,
            "account_type": "checking",  # Default account type
            "balance": account.initial_deposit,
            "status": "active",
            "created_at": datetime.now(),
            "last_login": None
        }
        
        accounts_db[account_id] = account_data
        
        # Log activity
        log_activity(account_id, "account_created", f"Account created for {account.email}")
        
        # Update metrics
        ACCOUNT_COUNT.set(len(accounts_db))
        ACCOUNT_CREATION.inc()
        
        logger.info(f"Account created: {account_id} for {account.email}")
        
        return AccountResponse(**account_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Account creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/accounts/{account_id}", response_model=AccountResponse)
async def get_account(account_id: str):
    """Get account details"""
    if account_id not in accounts_db:
        raise HTTPException(status_code=404, detail="Account not found")
    
    account_data = accounts_db[account_id]
    log_activity(account_id, "account_viewed", "Account details viewed")
    
    return AccountResponse(**account_data)

@app.put("/accounts/{account_id}", response_model=AccountResponse)
async def update_account(account_id: str, account_update: AccountUpdate):
    """Update account details"""
    if account_id not in accounts_db:
        raise HTTPException(status_code=404, detail="Account not found")
    
    account_data = accounts_db[account_id]
    
    # Update fields if provided
    if account_update.first_name is not None:
        account_data["first_name"] = account_update.first_name
    if account_update.last_name is not None:
        account_data["last_name"] = account_update.last_name
    if account_update.phone is not None:
        account_data["phone"] = account_update.phone
    if account_update.email is not None:
        # Check if new email already exists
        for existing_account in accounts_db.values():
            if existing_account["email"] == account_update.email and existing_account["account_id"] != account_id:
                raise HTTPException(status_code=400, detail="Email already registered")
        account_data["email"] = account_update.email
    
    accounts_db[account_id] = account_data
    
    log_activity(account_id, "account_updated", "Account details updated")
    logger.info(f"Account updated: {account_id}")
    
    return AccountResponse(**account_data)

@app.put("/accounts/{account_id}/status", response_model=AccountResponse)
async def update_account_status(account_id: str, status_update: AccountStatusUpdate):
    """Update account status"""
    if account_id not in accounts_db:
        raise HTTPException(status_code=404, detail="Account not found")
    
    account_data = accounts_db[account_id]
    old_status = account_data["status"]
    account_data["status"] = status_update.status
    
    log_activity(
        account_id, 
        "status_changed", 
        f"Account status changed from {old_status} to {status_update.status}",
        {"reason": status_update.reason}
    )
    
    logger.info(f"Account status updated: {account_id} - {old_status} -> {status_update.status}")
    
    return AccountResponse(**account_data)

@app.post("/accounts/login", response_model=LoginResponse)
async def login(login_request: LoginRequest):
    """Authenticate user and create session"""
    # Find account by email
    account = None
    for acc_data in accounts_db.values():
        if acc_data["email"] == login_request.email:
            account = acc_data
            break
    
    if not account:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if account["status"] != "active":
        raise HTTPException(status_code=401, detail="Account is not active")
    
    # In production, verify password hash
    # For demo purposes, we'll accept any password
    
    # Generate session token
    token = generate_token()
    expires_at = datetime.now() + timedelta(hours=24)
    
    login_sessions[token] = {
        "account_id": account["account_id"],
        "expires_at": expires_at
    }
    
    # Update last login
    account["last_login"] = datetime.now()
    accounts_db[account["account_id"]] = account
    
    log_activity(account["account_id"], "login", "User logged in")
    logger.info(f"User logged in: {account['account_id']}")
    
    return LoginResponse(
        account_id=account["account_id"],
        email=account["email"],
        full_name=f"{account['first_name']} {account['last_name']}",
        token=token,
        expires_at=expires_at
    )

@app.post("/accounts/logout")
async def logout(token: str):
    """Logout user and invalidate session"""
    if token not in login_sessions:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    account_id = login_sessions[token]["account_id"]
    del login_sessions[token]
    
    log_activity(account_id, "logout", "User logged out")
    logger.info(f"User logged out: {account_id}")
    
    return {"message": "Logged out successfully"}

@app.get("/accounts", response_model=List[AccountResponse])
async def list_accounts(status: Optional[str] = None, limit: int = 10, offset: int = 0):
    """List accounts with optional filtering"""
    all_accounts = list(accounts_db.values())
    
    # Filter by status if provided
    if status:
        all_accounts = [acc for acc in all_accounts if acc["status"] == status]
    
    # Apply pagination
    paginated_accounts = all_accounts[offset:offset + limit]
    
    return [AccountResponse(**acc) for acc in paginated_accounts]

@app.get("/accounts/{account_id}/activities", response_model=List[AccountActivity])
async def get_account_activities(account_id: str, limit: int = 20):
    """Get account activity history"""
    if account_id not in accounts_db:
        raise HTTPException(status_code=404, detail="Account not found")
    
    activities = account_activities.get(account_id, [])
    # Sort by timestamp (newest first)
    activities.sort(key=lambda x: x.timestamp, reverse=True)
    
    return activities[:limit]

@app.get("/accounts/{account_id}/summary")
async def get_account_summary(account_id: str):
    """Get account summary with key metrics"""
    if account_id not in accounts_db:
        raise HTTPException(status_code=404, detail="Account not found")
    
    account_data = accounts_db[account_id]
    activities = account_activities.get(account_id, [])
    
    # Calculate account age
    account_age_days = (datetime.now() - account_data["created_at"]).days
    
    # Count activities by type
    activity_counts = {}
    for activity in activities:
        activity_type = activity.activity_type
        activity_counts[activity_type] = activity_counts.get(activity_type, 0) + 1
    
    # Calculate last activity
    last_activity = max(activities, key=lambda x: x.timestamp) if activities else None
    
    return {
        "account_id": account_id,
        "account_summary": {
            "email": account_data["email"],
            "full_name": f"{account_data['first_name']} {account_data['last_name']}",
            "account_type": account_data["account_type"],
            "balance": account_data["balance"],
            "status": account_data["status"],
            "account_age_days": account_age_days,
            "last_login": account_data["last_login"],
            "created_at": account_data["created_at"]
        },
        "activity_summary": {
            "total_activities": len(activities),
            "activity_counts": activity_counts,
            "last_activity": {
                "type": last_activity.activity_type if last_activity else None,
                "description": last_activity.description if last_activity else None,
                "timestamp": last_activity.timestamp if last_activity else None
            } if last_activity else None
        }
    }

@app.get("/stats")
async def get_service_stats():
    """Get service statistics"""
    total_accounts = len(accounts_db)
    active_accounts = len([acc for acc in accounts_db.values() if acc["status"] == "active"])
    suspended_accounts = len([acc for acc in accounts_db.values() if acc["status"] == "suspended"])
    closed_accounts = len([acc for acc in accounts_db.values() if acc["status"] == "closed"])
    
    # Calculate total balance across all accounts
    total_balance = sum(acc["balance"] for acc in accounts_db.values())
    
    # Count recent activities (last 24 hours)
    recent_activities = 0
    for activities in account_activities.values():
        recent_activities += len([a for a in activities if a.timestamp > datetime.now() - timedelta(hours=24)])
    
    return {
        "total_accounts": total_accounts,
        "account_status_breakdown": {
            "active": active_accounts,
            "suspended": suspended_accounts,
            "closed": closed_accounts
        },
        "total_balance": total_balance,
        "recent_activities": recent_activities,
        "active_sessions": len(login_sessions),
        "timestamp": datetime.now()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)