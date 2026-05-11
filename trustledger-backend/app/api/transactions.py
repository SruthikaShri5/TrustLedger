from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import random
import json

from app.models.mongo_models import Transaction, FraudScore, User
from app.api.auth import get_current_user

router = APIRouter()


class TransactionCreate(BaseModel):
    merchant: str
    amount: float
    category: Optional[str] = "Other"
    description: Optional[str] = ""
    location: Optional[str] = ""


def _calculate_fraud_score(amount: float, merchant: str, location: str) -> float:
    score = 0
    if abs(amount) > 100000:
        score += 30
    elif abs(amount) > 50000:
        score += 20
    elif abs(amount) > 20000:
        score += 10
    if abs(amount) % 1000 == 0 and abs(amount) >= 10000:
        score += 5
    risky_merchants = ["crypto", "unknown", "offshore", "cash", "atm"]
    if any(kw in (merchant or "").lower() for kw in risky_merchants):
        score += 20
    risky_locations = ["unknown", "foreign", "international", "offshore"]
    if any(kw in (location or "").lower() for kw in risky_locations):
        score += 15
    return min(score, 100)


def txn_to_dict(t: Transaction, fraud: FraudScore = None) -> dict:
    return {
        "id": str(t.id),
        "transaction_id": t.transaction_id,
        "merchant": t.merchant,
        "amount": t.amount,
        "category": t.category,
        "description": t.description,
        "location": t.location,
        "status": t.status,
        "timestamp": t.timestamp.isoformat(),
        "fraud_score": fraud.risk_score if fraud else 0,
        "risk_level": fraud.risk_level if fraud else "low",
    }


@router.post("/")
async def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
):
    transaction_id = f"TXN{datetime.now().strftime('%Y%m%d%H%M%S')}{random.randint(100, 999)}"

    txn = Transaction(
        transaction_id=transaction_id,
        user_id=str(current_user.id),
        merchant=data.merchant,
        amount=data.amount,
        category=data.category or "Other",
        description=data.description or "",
        location=data.location or "",
        status="completed",
    )
    await txn.insert()

    # Auto fraud analysis
    risk_score = _calculate_fraud_score(data.amount, data.merchant, data.location or "")
    risk_level = "low"
    if risk_score >= 90:
        risk_level = "critical"
    elif risk_score >= 70:
        risk_level = "high"
    elif risk_score >= 40:
        risk_level = "medium"

    reasons = []
    if abs(data.amount) > 50000:
        reasons.append("Large transaction amount")
    if abs(data.amount) > 100000:
        reasons.append("Very high value transaction - requires review")
    if any(kw in (data.merchant or "").lower() for kw in ["crypto", "unknown", "offshore"]):
        reasons.append("Potentially risky merchant")
    if risk_score < 30:
        reasons.append("Transaction appears normal")

    fraud = FraudScore(
        transaction_id=str(txn.id),
        user_id=str(current_user.id),
        risk_score=risk_score,
        risk_level=risk_level,
        reasons=reasons,
        geo_risk=risk_score > 60,
        impossible_travel=risk_score > 80,
        behavioral_anomaly=risk_score > 50,
    )
    await fraud.insert()

    return txn_to_dict(txn, fraud)


@router.get("/")
async def get_transactions(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    query = Transaction.find(Transaction.user_id == str(current_user.id))
    if category:
        query = query.find(Transaction.category == category)

    transactions = await query.sort(-Transaction.timestamp).skip(skip).limit(limit).to_list()

    result = []
    for t in transactions:
        fraud = await FraudScore.find_one(FraudScore.transaction_id == str(t.id))
        result.append(txn_to_dict(t, fraud))
    return result


@router.get("/stats")
async def get_transaction_stats(
    days: int = 30,
    current_user: User = Depends(get_current_user),
):
    start_date = datetime.utcnow() - timedelta(days=days)
    transactions = await Transaction.find(
        Transaction.user_id == str(current_user.id),
        Transaction.timestamp >= start_date,
    ).to_list()

    if not transactions:
        return {
            "total_transactions": 0,
            "total_income": 0,
            "total_expenses": 0,
            "net_balance": 0,
            "avg_transaction": 0,
            "categories": {},
            "daily_spending": [],
        }

    total_income = sum(t.amount for t in transactions if t.amount > 0)
    total_expenses = sum(abs(t.amount) for t in transactions if t.amount < 0)
    net_balance = total_income - total_expenses

    categories: dict = {}
    for t in transactions:
        cat = t.category or "Other"
        categories[cat] = categories.get(cat, 0) + abs(t.amount)

    daily_spending: dict = {}
    for t in transactions:
        day = t.timestamp.strftime("%Y-%m-%d")
        daily_spending[day] = daily_spending.get(day, 0) + abs(t.amount)

    daily_list = [{"date": k, "amount": round(v, 2)} for k, v in sorted(daily_spending.items())]

    return {
        "total_transactions": len(transactions),
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "net_balance": round(net_balance, 2),
        "avg_transaction": round(
            sum(abs(t.amount) for t in transactions) / len(transactions), 2
        ),
        "categories": categories,
        "daily_spending": daily_list[-30:],
    }


@router.get("/categories")
async def get_categories(current_user: User = Depends(get_current_user)):
    transactions = await Transaction.find(
        Transaction.user_id == str(current_user.id)
    ).to_list()
    cats = list({t.category for t in transactions if t.category})
    return cats


@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
):
    txn = await Transaction.find_one(
        Transaction.transaction_id == transaction_id,
        Transaction.user_id == str(current_user.id),
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Delete associated fraud scores
    await FraudScore.find(FraudScore.transaction_id == str(txn.id)).delete()
    await txn.delete()
    return {"message": "Transaction deleted successfully"}


@router.get("/{transaction_id}")
async def get_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
):
    txn = await Transaction.find_one(
        Transaction.transaction_id == transaction_id,
        Transaction.user_id == str(current_user.id),
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    fraud = await FraudScore.find_one(FraudScore.transaction_id == str(txn.id))
    return txn_to_dict(txn, fraud)
