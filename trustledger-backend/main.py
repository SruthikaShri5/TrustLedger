"""
TRUSTLEDGER - Real-Time Financial Intelligence Platform
MongoDB + FastAPI Backend
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio
import json
from datetime import datetime, timedelta
import random

from app.api import auth, transactions, fraud, market, ai, compliance, admin
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection
from app.services.websocket_manager import WebSocketManager
from app.api.auth import get_password_hash

app = FastAPI(
    title="TRUSTLEDGER API",
    description="Real-Time Financial Intelligence Platform — MongoDB Backend",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket manager
websocket_manager = WebSocketManager()

# Routers
app.include_router(auth.router,         prefix="/api/auth",         tags=["Authentication"])
app.include_router(transactions.router, prefix="/api/transactions",  tags=["Transactions"])
app.include_router(fraud.router,        prefix="/api/fraud",         tags=["Fraud Detection"])
app.include_router(market.router,       prefix="/api/market",        tags=["Market Analytics"])
app.include_router(ai.router,           prefix="/api/ai",            tags=["AI Assistant"])
app.include_router(compliance.router,   prefix="/api/compliance",    tags=["Compliance"])
app.include_router(admin.router,        prefix="/api/admin",         tags=["Admin"])


# ─── Seed Data ──────────────────────────────────────────────────────────────

async def seed_database():
    from app.models.mongo_models import (
        User, Transaction, FraudScore, ComplianceCheck, SystemLog, Notification
    )

    # Skip if already seeded
    if await User.count() > 0:
        print("✅ Database already seeded. Skipping...")
        return

    print("🌱 Seeding MongoDB with initial data...")

    # Create users
    admin_user = User(
        username="admin",
        email="admin@trustledger.com",
        hashed_password=get_password_hash("admin123"),
        full_name="System Administrator",
        phone="+91-9999999999",
        is_admin=True,
        is_active=True,
    )
    await admin_user.insert()

    demo_user = User(
        username="user",
        email="user@trustledger.com",
        hashed_password=get_password_hash("user123"),
        full_name="Demo User",
        phone="+91-9876543210",
        is_admin=False,
        is_active=True,
    )
    await demo_user.insert()

    for uname, uemail, upass, ufull in [
        ("rahul", "rahul@example.com", "rahul123", "Rahul Sharma"),
        ("priya", "priya@example.com", "priya123", "Priya Patel"),
    ]:
        u = User(
            username=uname, email=uemail,
            hashed_password=get_password_hash(upass),
            full_name=ufull,
        )
        await u.insert()

    # Transactions for demo user
    merchants = [
        ("Amazon India", "Shopping", "Mumbai"),
        ("Swiggy", "Food & Dining", "Mumbai"),
        ("Uber", "Transport", "Mumbai"),
        ("Netflix", "Entertainment", "Online"),
        ("Reliance Fresh", "Groceries", "Mumbai"),
        ("HDFC Mutual Fund", "Investment", "Online"),
        ("Airtel", "Utilities", "Online"),
        ("Flipkart", "Shopping", "Delhi"),
        ("Zomato", "Food & Dining", "Mumbai"),
        ("Indian Oil", "Fuel", "Mumbai"),
        ("BigBasket", "Groceries", "Bangalore"),
        ("BookMyShow", "Entertainment", "Mumbai"),
        ("PhonePe Transfer", "Transfer", "Online"),
        ("SBI Life Insurance", "Insurance", "Online"),
        ("Apollo Pharmacy", "Healthcare", "Mumbai"),
        ("Starbucks", "Food & Dining", "Mumbai"),
        ("Myntra", "Shopping", "Online"),
        ("Ola", "Transport", "Delhi"),
        ("Jio Recharge", "Utilities", "Online"),
        ("DMart", "Groceries", "Mumbai"),
    ]

    cat_amounts = {
        "Shopping": (-2000, -15000), "Food & Dining": (-200, -3000),
        "Transport": (-100, -2000), "Entertainment": (-200, -1500),
        "Groceries": (-500, -5000), "Investment": (-5000, -50000),
        "Utilities": (-200, -2000), "Fuel": (-500, -3000),
        "Transfer": (-1000, -20000), "Insurance": (-2000, -10000),
        "Healthcare": (-500, -5000),
    }

    income_data = [
        ("Salary Credit - TCS", 85000, "Income", "Company credited salary", "Mumbai"),
        ("Freelance Payment", 15000, "Income", "Web development project", "Online"),
        ("Dividend - HDFC", 2500, "Income", "Quarterly dividend", "Online"),
        ("Interest - SBI FD", 1800, "Income", "Fixed deposit interest", "Online"),
        ("Cashback - Amazon", 450, "Income", "Shopping cashback", "Online"),
    ]

    all_txns = []

    for i, (merchant, amount, category, desc, location) in enumerate(income_data):
        txn = Transaction(
            transaction_id=f"TXN{datetime.utcnow().strftime('%Y%m%d')}{1000 + i}",
            user_id=str(demo_user.id),
            merchant=merchant, amount=amount, category=category,
            description=desc, location=location,
            timestamp=datetime.utcnow() - timedelta(days=random.randint(1, 28), hours=random.randint(0, 23)),
        )
        await txn.insert()
        all_txns.append(txn)

    for i, (merchant, category, location) in enumerate(merchants):
        lo, hi = cat_amounts.get(category, (-500, -5000))
        amount = round(random.uniform(lo, hi), 2)
        txn = Transaction(
            transaction_id=f"TXN{datetime.utcnow().strftime('%Y%m%d')}{2000 + i}",
            user_id=str(demo_user.id),
            merchant=merchant, amount=amount, category=category,
            description=f"Payment to {merchant}", location=location,
            timestamp=datetime.utcnow() - timedelta(days=random.randint(0, 28), hours=random.randint(0, 23)),
        )
        await txn.insert()
        all_txns.append(txn)

    # Fraud scores
    for txn in all_txns:
        risk_score = random.uniform(5, 45)
        if txn.merchant in ["PhonePe Transfer", "Flipkart"] or abs(txn.amount) > 30000:
            risk_score = random.uniform(60, 95)

        risk_level = "low"
        if risk_score >= 90: risk_level = "critical"
        elif risk_score >= 70: risk_level = "high"
        elif risk_score >= 40: risk_level = "medium"

        reasons = []
        if risk_score >= 70:
            reasons = ["Unusual transaction pattern detected", "Amount exceeds normal spending range"]
        elif risk_score >= 40:
            reasons = ["Moderate risk - monitoring recommended"]
        else:
            reasons = ["Transaction appears normal"]

        fs = FraudScore(
            transaction_id=str(txn.id),
            user_id=str(demo_user.id),
            risk_score=round(risk_score, 2),
            risk_level=risk_level,
            reasons=reasons,
            geo_risk=risk_score > 60,
            impossible_travel=risk_score > 80,
            behavioral_anomaly=risk_score > 50,
            created_at=txn.timestamp,
        )
        await fs.insert()

    # Compliance checks
    for check_type, score in [("KYC", 92), ("AML", 95), ("Transaction Monitoring", 88), ("FATCA/CRS", 100)]:
        cc = ComplianceCheck(
            user_id=str(demo_user.id),
            check_type=check_type,
            status="passed",
            score=score,
            details={"status": "verified", "last_check": datetime.utcnow().isoformat()},
        )
        await cc.insert()

    # System logs
    for level, message, source in [
        ("INFO", "System started successfully", "system"),
        ("INFO", "MongoDB connected", "database"),
        ("INFO", "Fraud detection engine loaded", "fraud_engine"),
        ("INFO", "AI models initialized", "ai_service"),
        ("WARNING", "High API response time detected", "api_monitor"),
        ("INFO", "Market data feed connected", "market_service"),
        ("INFO", "Compliance check completed for all users", "compliance"),
    ]:
        log = SystemLog(level=level, message=message, source=source, user_id=str(admin_user.id))
        await log.insert()

    # Notifications
    for title, message, ntype, severity in [
        ("Welcome to TrustLedger!", "Your account has been set up successfully.", "info", "low"),
        ("Security Alert", "New login detected from Mumbai, India.", "security", "medium"),
        ("Monthly Report Ready", "Your financial report is ready for download.", "info", "low"),
        ("Fraud Alert", "Suspicious transaction detected on your account.", "fraud", "high"),
    ]:
        notif = Notification(
            user_id=str(demo_user.id),
            title=title, message=message, type=ntype, severity=severity,
        )
        await notif.insert()

    print(f"✅ MongoDB seeded: 4 users, {len(all_txns)} transactions, fraud scores, compliance checks, logs, notifications")


# ─── Startup / Shutdown ─────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    print("\n" + "=" * 60)
    print("🏦 TRUSTLEDGER - Real-Time Financial Intelligence Platform")
    print("   Database: MongoDB")
    print("=" * 60)
    await connect_to_mongo()
    await seed_database()
    print("\n✅ All systems ready!")
    print(f"📚 API Docs: http://localhost:8000/docs")
    print(f"🔗 API Base: http://localhost:8000/api")
    print("=" * 60 + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()


# ─── Routes ─────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "message": "TRUSTLEDGER API - Real-Time Financial Intelligence Platform",
        "version": "3.0.0",
        "database": "MongoDB",
        "status": "active",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "docs": "/docs",
            "auth": "/api/auth",
            "transactions": "/api/transactions",
            "fraud": "/api/fraud",
            "market": "/api/market",
            "ai": "/api/ai",
            "compliance": "/api/compliance",
            "admin": "/api/admin",
        },
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "MongoDB",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "database": "connected",
            "fraud_engine": "active",
            "ai_models": "loaded",
            "market_feed": "connected",
        },
    }


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket_manager.connect(websocket, client_id)
    try:
        while True:
            await asyncio.sleep(10)
            fraud_alert = {
                "type": "fraud_alert",
                "data": {
                    "transaction_id": f"TXN{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    "risk_score": random.randint(30, 90),
                    "reason": random.choice([
                        "Unusual spending pattern detected",
                        "Transaction from new location",
                        "High-value transaction alert",
                        "Rapid successive transactions",
                    ]),
                    "timestamp": datetime.now().isoformat(),
                },
            }
            await websocket_manager.send_personal_message(json.dumps(fraud_alert), client_id)
    except WebSocketDisconnect:
        websocket_manager.disconnect(client_id)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
