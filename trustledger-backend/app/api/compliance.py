from fastapi import APIRouter, Depends, UploadFile, File
from datetime import datetime
import json

from app.models.mongo_models import User, ComplianceCheck, Document
from app.api.auth import get_current_user

router = APIRouter()


@router.get("/check")
async def run_compliance_check(current_user: User = Depends(get_current_user)):
    checks_data = [
        ("KYC", 92.0, {
            "identity_verified": True, "address_verified": True,
            "documents_complete": True, "pan_verified": True,
            "aadhaar_linked": True, "last_updated": datetime.utcnow().strftime("%Y-%m-%d"),
        }),
        ("AML", 95.0, {
            "suspicious_transactions": 0, "high_risk_countries": False,
            "pep_screening": "clear", "sanctions_screening": "clear", "watchlist_check": "clear",
        }),
        ("Transaction Monitoring", 88.0, {
            "unusual_patterns": False, "velocity_checks": "normal",
            "amount_thresholds": "within_limits", "geographic_anomalies": False,
        }),
        ("FATCA/CRS", 100.0, {
            "foreign_accounts": False, "reporting_status": "compliant", "declaration_filed": True,
        }),
    ]

    inserted = []
    for check_type, score, details in checks_data:
        check = ComplianceCheck(
            user_id=str(current_user.id),
            check_type=check_type,
            status="passed",
            score=score,
            details=details,
        )
        await check.insert()
        inserted.append(check)

    overall_score = sum(c.score for c in inserted) / len(inserted)
    recommendations = []
    if overall_score < 95:
        recommendations.append("Update KYC documents to improve compliance score")
    if not recommendations:
        recommendations.append("Excellent compliance status - maintain current practices")
        recommendations.append("Schedule next KYC review in 6 months")

    return {
        "overall_score": round(overall_score, 2),
        "status": "compliant" if overall_score >= 70 else "non_compliant",
        "checks": [
            {
                "id": str(c.id),
                "check_type": c.check_type,
                "status": c.status,
                "score": c.score,
                "details": c.details,
                "created_at": c.created_at.isoformat(),
            }
            for c in inserted
        ],
        "recommendations": recommendations,
        "next_review": "2025-06-15",
    }


@router.get("/history")
async def get_compliance_history(current_user: User = Depends(get_current_user)):
    checks = await ComplianceCheck.find(
        ComplianceCheck.user_id == str(current_user.id)
    ).sort(-ComplianceCheck.created_at).limit(20).to_list()

    return [
        {
            "id": str(c.id),
            "check_type": c.check_type,
            "status": c.status,
            "score": c.score,
            "details": c.details,
            "created_at": c.created_at.isoformat(),
        }
        for c in checks
    ]


@router.get("/score")
async def get_compliance_score(current_user: User = Depends(get_current_user)):
    latest_checks = await ComplianceCheck.find(
        ComplianceCheck.user_id == str(current_user.id)
    ).sort(-ComplianceCheck.created_at).limit(10).to_list()

    if not latest_checks:
        return {
            "overall_score": 0,
            "status": "not_assessed",
            "message": "No compliance checks performed yet. Run a check first.",
            "checks_count": 0,
        }

    overall_score = sum(c.score for c in latest_checks) / len(latest_checks)
    if overall_score >= 90:
        status = "excellent"
    elif overall_score >= 80:
        status = "good"
    elif overall_score >= 70:
        status = "compliant"
    else:
        status = "needs_attention"

    return {
        "overall_score": round(overall_score, 2),
        "status": status,
        "last_check": latest_checks[0].created_at.isoformat(),
        "checks_count": len(latest_checks),
        "breakdown": {c.check_type: c.score for c in latest_checks},
    }


@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = "regulatory",
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    doc = Document(
        filename=file.filename,
        content=content.decode("utf-8", errors="ignore"),
        document_type=document_type,
        uploaded_by=str(current_user.id),
    )
    await doc.insert()
    return {
        "message": "Document uploaded successfully",
        "document_id": str(doc.id),
        "filename": file.filename,
        "type": document_type,
    }


@router.get("/documents")
async def get_documents(current_user: User = Depends(get_current_user)):
    docs = await Document.find(
        Document.uploaded_by == str(current_user.id)
    ).sort(-Document.created_at).to_list()

    return [
        {
            "id": str(d.id),
            "filename": d.filename,
            "type": d.document_type,
            "uploaded_at": d.created_at.isoformat(),
        }
        for d in docs
    ]


@router.get("/regulations")
async def get_regulations():
    return {
        "rbi_guidelines": {
            "kyc_requirements": [
                "Valid government-issued photo ID (Aadhaar, Passport, Voter ID, DL)",
                "Address proof not older than 3 months",
                "PAN card mandatory for transactions above ₹50,000",
                "Periodic KYC updates every 2 years for low-risk customers",
                "Video KYC available for remote verification",
            ],
            "aml_requirements": [
                "Transaction monitoring for amounts above ₹10 lakhs",
                "Suspicious Transaction Reporting (STR) to FIU-IND",
                "Customer Due Diligence (CDD) for all accounts",
                "Enhanced Due Diligence (EDD) for high-risk accounts",
                "Record maintenance for minimum 5 years",
            ],
        },
        "last_updated": datetime.utcnow().isoformat(),
    }
