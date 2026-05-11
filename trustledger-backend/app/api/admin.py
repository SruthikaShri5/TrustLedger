from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta

from app.models.mongo_models import User, Transaction, FraudScore, SystemLog, Notification
from app.api.auth import get_current_user

router = APIRouter()


async def verify_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


@router.get("/stats")
async def get_admin_stats(admin_user: User = Depends(verify_admin)):
    total_users = await User.count()
    active_users = await User.find(User.is_active == True).count()
    total_transactions = await Transaction.count()
    fraud_cases = await FraudScore.find(FraudScore.risk_score >= 70).count()
    total_fraud_analyzed = await FraudScore.count()

    today = datetime.utcnow().date()
    today_transactions = await Transaction.find(
        Transaction.timestamp >= datetime(today.year, today.month, today.day)
    ).count()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_transactions": total_transactions,
        "today_transactions": today_transactions,
        "fraud_cases": fraud_cases,
        "total_fraud_analyzed": total_fraud_analyzed,
        "system_health": "healthy",
        "uptime": "99.9%",
        "api_response_time": "45ms",
    }


@router.get("/fraud-cases")
async def get_fraud_cases(
    status: str = None,
    admin_user: User = Depends(verify_admin),
):
    query = FraudScore.find(FraudScore.risk_score >= 50)
    if status:
        query = query.find(FraudScore.status == status)

    fraud_scores = await query.sort(-FraudScore.created_at).limit(100).to_list()

    cases = []
    for score in fraud_scores:
        user = await User.find_one(User.id == score.user_id)
        txn = await Transaction.find_one(Transaction.id == score.transaction_id)
        cases.append({
            "id": str(score.id),
            "user_id": score.user_id,
            "username": user.username if user else "Unknown",
            "user_email": user.email if user else "Unknown",
            "transaction_id": txn.transaction_id if txn else "Unknown",
            "merchant": txn.merchant if txn else "Unknown",
            "amount": txn.amount if txn else 0,
            "risk_score": score.risk_score,
            "risk_level": score.risk_level,
            "status": score.status,
            "geo_risk": score.geo_risk,
            "impossible_travel": score.impossible_travel,
            "created_at": score.created_at.isoformat(),
        })
    return cases


@router.put("/fraud-cases/{case_id}/status")
async def update_fraud_case_status(
    case_id: str,
    status: str = "investigating",
    notes: str = None,
    admin_user: User = Depends(verify_admin),
):
    from beanie import PydanticObjectId
    fraud_score = await FraudScore.get(PydanticObjectId(case_id))
    if not fraud_score:
        raise HTTPException(status_code=404, detail="Fraud case not found")

    fraud_score.status = status
    await fraud_score.save()

    log = SystemLog(
        level="INFO",
        message=f"Fraud case {case_id} status updated to '{status}' by admin {admin_user.username}",
        source="admin_panel",
        user_id=str(admin_user.id),
        extra_data={"case_id": case_id, "status": status, "notes": notes or ""},
    )
    await log.insert()

    notif = Notification(
        user_id=fraud_score.user_id,
        title="Fraud Case Update",
        message=f"Your fraud case #{case_id} has been updated to: {status}",
        type="fraud",
        severity="medium",
    )
    await notif.insert()

    return {"message": f"Fraud case {case_id} status updated to '{status}'"}


@router.get("/users")
async def get_users(
    skip: int = 0,
    limit: int = 100,
    admin_user: User = Depends(verify_admin),
):
    users = await User.find_all().skip(skip).limit(limit).to_list()
    result = []
    for user in users:
        txn_count = await Transaction.find(Transaction.user_id == str(user.id)).count()
        fraud_alerts = await FraudScore.find(
            FraudScore.user_id == str(user.id),
            FraudScore.risk_score >= 70,
        ).count()
        result.append({
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "phone": user.phone,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "account_frozen": user.account_frozen,
            "transaction_count": txn_count,
            "fraud_alerts": fraud_alerts,
            "created_at": user.created_at.isoformat(),
        })
    return result


@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    is_active: bool = True,
    admin_user: User = Depends(verify_admin),
):
    from beanie import PydanticObjectId
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = is_active
    await user.save()

    log = SystemLog(
        level="INFO",
        message=f"User {user_id} ({user.username}) {'activated' if is_active else 'blocked'} by admin {admin_user.username}",
        source="admin_panel",
        user_id=str(admin_user.id),
    )
    await log.insert()

    # Notify the user
    notif = Notification(
        user_id=str(user.id),
        title="Account Status Updated",
        message=f"Your account has been {'activated' if is_active else 'blocked'} by an administrator.",
        type="security",
        severity="high" if not is_active else "low",
    )
    await notif.insert()

    return {"message": f"User {user.username} {'activated' if is_active else 'blocked'} successfully"}


@router.get("/logs")
async def get_system_logs(
    level: str = None,
    limit: int = 100,
    admin_user: User = Depends(verify_admin),
):
    query = SystemLog.find_all()
    if level:
        query = SystemLog.find(SystemLog.level == level.upper())

    logs = await query.sort(-SystemLog.timestamp).limit(limit).to_list()
    return [
        {
            "id": str(log.id),
            "level": log.level,
            "message": log.message,
            "source": log.source,
            "user_id": log.user_id,
            "timestamp": log.timestamp.isoformat(),
        }
        for log in logs
    ]


@router.get("/analytics")
async def get_analytics(
    days: int = 30,
    admin_user: User = Depends(verify_admin),
):
    start_date = datetime.utcnow() - timedelta(days=days)

    transactions = await Transaction.find(Transaction.timestamp >= start_date).to_list()
    fraud_cases = await FraudScore.find(
        FraudScore.created_at >= start_date,
        FraudScore.risk_score >= 70,
    ).to_list()
    new_users = await User.find(User.created_at >= start_date).count()

    daily_data: dict = {}
    for t in transactions:
        day = t.timestamp.strftime("%Y-%m-%d")
        if day not in daily_data:
            daily_data[day] = {"count": 0, "amount": 0}
        daily_data[day]["count"] += 1
        daily_data[day]["amount"] += abs(t.amount)

    daily_trend = [{"date": k, **v} for k, v in sorted(daily_data.items())]

    return {
        "period_days": days,
        "transactions": {
            "total": len(transactions),
            "total_amount": round(sum(abs(t.amount) for t in transactions), 2),
            "avg_amount": round(sum(abs(t.amount) for t in transactions) / len(transactions), 2) if transactions else 0,
            "daily_trend": daily_trend[-30:],
        },
        "fraud": {
            "total_cases": len(fraud_cases),
            "avg_risk_score": round(sum(f.risk_score for f in fraud_cases) / len(fraud_cases), 2) if fraud_cases else 0,
            "fraud_rate": round(len(fraud_cases) / len(transactions) * 100, 2) if transactions else 0,
        },
        "users": {
            "new_registrations": new_users,
            "total_active": await User.find(User.is_active == True).count(),
        },
    }


@router.post("/alerts/broadcast")
async def broadcast_alert(
    title: str = "System Alert",
    message: str = "Important system notification",
    severity: str = "info",
    admin_user: User = Depends(verify_admin),
):
    users = await User.find(User.is_active == True).to_list()
    for user in users:
        notif = Notification(
            user_id=str(user.id),
            title=title,
            message=message,
            type="system",
            severity=severity,
        )
        await notif.insert()

    log = SystemLog(
        level="INFO",
        message=f"Admin broadcast: {title} - {message} (to {len(users)} users)",
        source="admin_broadcast",
        user_id=str(admin_user.id),
    )
    await log.insert()

    return {"message": f"Alert broadcasted to {len(users)} users"}
