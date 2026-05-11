"""
TrustLedger - MongoDB Models using Beanie ODM
"""
from beanie import Document as BeanieDocument, Indexed
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId


# ─────────────────────────────────────────────
# USER
# ─────────────────────────────────────────────
class User(BeanieDocument):
    username: Indexed(str, unique=True)
    email: Indexed(str, unique=True)
    hashed_password: str
    full_name: str = ""
    phone: str = ""
    is_active: bool = True
    is_admin: bool = False
    account_frozen: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Accessibility settings
    large_text: bool = False
    high_contrast: bool = False
    voice_mode: bool = False
    simple_mode: bool = False

    class Settings:
        name = "users"


# ─────────────────────────────────────────────
# TRANSACTION
# ─────────────────────────────────────────────
class Transaction(BeanieDocument):
    transaction_id: Indexed(str, unique=True)
    user_id: str                          # stores User ObjectId as string
    merchant: str
    amount: float
    category: str = "Other"
    description: str = ""
    location: str = ""
    status: str = "completed"            # completed | pending | failed
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "transactions"


# ─────────────────────────────────────────────
# FRAUD SCORE
# ─────────────────────────────────────────────
class FraudScore(BeanieDocument):
    transaction_id: str                  # stores Transaction ObjectId as string
    user_id: str
    risk_score: float                    # 0-100
    risk_level: str = "low"             # low | medium | high | critical
    reasons: List[str] = []
    geo_risk: bool = False
    impossible_travel: bool = False
    behavioral_anomaly: bool = False
    status: str = "open"                # open | investigating | resolved | dismissed | reported
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "fraud_scores"


# ─────────────────────────────────────────────
# MARKET DATA
# ─────────────────────────────────────────────
class MarketData(BeanieDocument):
    symbol: str
    price: float
    change: float = 0
    change_percent: float = 0
    volume: int = 0
    volatility: float = 0
    risk_score: float = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "market_data"


# ─────────────────────────────────────────────
# COMPLIANCE CHECK
# ─────────────────────────────────────────────
class ComplianceCheck(BeanieDocument):
    user_id: str
    check_type: str                      # KYC | AML | Transaction Monitoring | FATCA/CRS
    status: str                          # passed | failed | pending
    score: float
    details: dict = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "compliance_checks"


# ─────────────────────────────────────────────
# DOCUMENT (for RAG / compliance uploads)
# ─────────────────────────────────────────────
class Document(BeanieDocument):
    filename: str
    content: str = ""
    document_type: str = "regulatory"   # regulatory | policy | kyc | other
    uploaded_by: str                     # User ObjectId as string
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "documents"


# ─────────────────────────────────────────────
# NOTIFICATION
# ─────────────────────────────────────────────
class Notification(BeanieDocument):
    user_id: str
    title: str
    message: str
    type: str = "info"                  # fraud | security | compliance | info | system
    severity: str = "low"              # low | medium | high | critical
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "notifications"


# ─────────────────────────────────────────────
# SYSTEM LOG
# ─────────────────────────────────────────────
class SystemLog(BeanieDocument):
    level: str                           # INFO | WARNING | ERROR | CRITICAL
    message: str
    source: str = "system"
    user_id: Optional[str] = None
    extra_data: dict = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "system_logs"
