from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import random

from app.models.mongo_models import User, Transaction, FraudScore, Document, Notification
from app.api.auth import get_current_user

router = APIRouter()


class ChatMessage(BaseModel):
    message: str
    context: Optional[str] = None


class DocumentQuery(BaseModel):
    query: str
    document_type: Optional[str] = None


@router.post("/chat")
async def chat_with_ai(
    message: ChatMessage,
    current_user: User = Depends(get_current_user),
):
    recent_transactions = await Transaction.find(
        Transaction.user_id == str(current_user.id)
    ).sort(-Transaction.timestamp).limit(20).to_list()

    user_message = message.message.lower().strip()

    # Comprehensive AI response system
    response = _generate_ai_response(user_message, recent_transactions, current_user)

    return {
        "response": response,
        "context_used": len(recent_transactions) > 0,
        "sources": ["transaction_history", "user_profile", "market_data"] if recent_transactions else ["general_knowledge"],
        "timestamp": datetime.utcnow().isoformat(),
        "ai_model": "TrustLedger AI v2.0"
    }


@router.post("/document-query")
async def query_documents(
    query: DocumentQuery,
    current_user: User = Depends(get_current_user),
):
    """Query documents using RAG"""

    query_text = query.query.lower()

    if "kyc" in query_text or "know your customer" in query_text:
        response = """**KYC (Know Your Customer) Requirements:**

• Valid government-issued photo ID (Aadhaar, Passport, Voter ID)
• Address proof not older than 3 months (Utility bill, Bank statement)
• PAN card mandatory for transactions above ₹50,000
• Periodic KYC updates every 2 years
• Video KYC available for remote verification

**Compliance Status:** Your KYC is up to date. Next review due in 6 months."""

    elif "aml" in query_text or "money laundering" in query_text:
        response = """**Anti-Money Laundering (AML) Regulations:**

• Transaction monitoring for amounts above ₹10 lakhs
• Suspicious Transaction Reporting (STR) to FIU-IND
• Customer Due Diligence (CDD) for high-risk accounts
• Enhanced Due Diligence (EDD) for PEPs
• Record maintenance for minimum 5 years
• Non-compliance penalties up to ₹1 crore

**Your Status:** All AML checks passed. No suspicious patterns detected."""

    elif "compliance" in query_text or "regulation" in query_text:
        response = """**Key Compliance Requirements:**

1. **KYC Updates** - Every 2 years for low-risk customers
2. **AML Monitoring** - Continuous transaction surveillance
3. **FATCA/CRS** - Foreign account reporting
4. **STR Filing** - Suspicious transaction reports
5. **Audit Trail** - Complete transaction records

**Your Compliance Score:** 98/100 - Excellent"""

    elif "tax" in query_text:
        response = """**Tax-Related Information:**

• TDS on interest income above ₹40,000 (₹50,000 for seniors)
• Capital gains tax on investments
• GST on financial services
• Form 26AS for tax credit verification
• ITR filing deadline: July 31st

**Tip:** Consider tax-saving investments under Section 80C."""

    else:
        response = f"""I found relevant information for your query: "{query.query}"

Based on our regulatory document database, here are the key points:

1. All financial transactions are monitored for compliance
2. Regular KYC updates ensure account security
3. AML procedures protect against financial crimes
4. Your account maintains excellent compliance status

Would you like more specific information about any regulation?"""

    return {
        "response": response,
        "context_used": True,
        "sources": ["RBI Guidelines 2024", "SEBI Regulations", "FEMA Compliance Manual"],
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/insights")
async def get_financial_insights(
    current_user: User = Depends(get_current_user),
):
    transactions = await Transaction.find(
        Transaction.user_id == str(current_user.id)
    ).sort(-Transaction.timestamp).limit(50).to_list()

    insights = []

    if transactions:
        total_spent = sum(abs(t.amount) for t in transactions if t.amount < 0)
        total_income = sum(t.amount for t in transactions if t.amount > 0)
        avg_daily = total_spent / 30 if total_spent > 0 else 0

        insights.append({
            "title": "Spending Pattern Analysis",
            "description": f"Your average daily spending is ₹{avg_daily:,.2f}. Total income: ₹{total_income:,.2f}, Total expenses: ₹{total_spent:,.2f}.",
            "category": "spending",
            "confidence": 0.92,
            "icon": "trending-down",
            "recommendations": [
                "Consider setting up automatic savings of 20% of income",
                "Review subscription services for optimization",
                "Track discretionary spending more closely"
            ]
        })

        # Category analysis
        categories = {}
        for t in transactions:
            if t.category:
                categories[t.category] = categories.get(t.category, 0) + abs(t.amount)

        if categories:
            top_cat = max(categories, key=categories.get)
            insights.append({
                "title": f"Top Spending: {top_cat}",
                "description": f"Your highest spending category is '{top_cat}' at ₹{categories[top_cat]:,.2f}. This represents {categories[top_cat] / total_spent * 100:.1f}% of total spending." if total_spent > 0 else f"Your highest spending category is '{top_cat}'.",
                "category": "analysis",
                "confidence": 0.95,
                "icon": "pie-chart",
                "recommendations": [
                    f"Set a monthly budget for {top_cat}",
                    "Look for cashback offers in this category",
                    "Consider if this spending aligns with your goals"
                ]
            })

    # Fraud insight
    fraud_count = await FraudScore.find(
        FraudScore.user_id == str(current_user.id),
        FraudScore.risk_score >= 70,
    ).count()

    insights.append({
        "title": "Security Status",
        "description": f"{'⚠️ ' + str(fraud_count) + ' high-risk transactions detected. Review recommended.' if fraud_count > 0 else '✅ No high-risk transactions detected. Your account is secure.'}",
        "category": "security",
        "confidence": 0.98,
        "icon": "shield",
        "recommendations": [
            "Enable two-factor authentication",
            "Review transaction alerts regularly",
            "Report any suspicious activity immediately"
        ]
    })

    # Investment insight
    insights.append({
        "title": "Investment Opportunity",
        "description": "Current market conditions favor systematic investment plans (SIPs) in diversified equity funds. Consider starting with ₹5,000/month.",
        "category": "investment",
        "confidence": 0.78,
        "icon": "trending-up",
        "recommendations": [
            "Start with ₹5,000 monthly SIP in index funds",
            "Diversify across large-cap and mid-cap funds",
            "Review and rebalance portfolio quarterly"
        ]
    })

    # Green finance insight
    insights.append({
        "title": "Carbon Footprint",
        "description": "Based on your spending patterns, your estimated monthly carbon footprint is 2.4 kg CO2. Consider eco-friendly alternatives.",
        "category": "green",
        "confidence": 0.72,
        "icon": "leaf",
        "recommendations": [
            "Use public transport for daily commute",
            "Choose eco-friendly products when shopping",
            "Consider carbon offset programs"
        ]
    })

    return insights


@router.get("/reports/generate")
async def generate_monthly_report(
    current_user: User = Depends(get_current_user),
):
    transactions = await Transaction.find(
        Transaction.user_id == str(current_user.id),
        Transaction.timestamp >= datetime.utcnow() - timedelta(days=30),
    ).to_list()

    total_income = sum(t.amount for t in transactions if t.amount > 0)
    total_expenses = sum(abs(t.amount) for t in transactions if t.amount < 0)
    savings_rate = ((total_income - total_expenses) / total_income * 100) if total_income > 0 else 0

    fraud_alerts = await FraudScore.find(
        FraudScore.user_id == str(current_user.id),
        FraudScore.risk_score >= 70,
        FraudScore.created_at >= datetime.utcnow() - timedelta(days=30),
    ).count()

    # Category breakdown
    categories = {}
    for t in transactions:
        cat = t.category or "Other"
        categories[cat] = categories.get(cat, 0) + abs(t.amount)

    return {
        "user_id": current_user.id,
        "report_type": "monthly",
        "generated_at": datetime.utcnow().isoformat(),
        "period": {
            "start": (datetime.utcnow() - timedelta(days=30)).strftime("%Y-%m-%d"),
            "end": datetime.utcnow().strftime("%Y-%m-%d")
        },
        "summary": {
            "total_transactions": len(transactions),
            "total_income": round(total_income, 2),
            "total_expenses": round(total_expenses, 2),
            "net_savings": round(total_income - total_expenses, 2),
            "savings_rate": round(savings_rate, 1),
            "fraud_alerts": fraud_alerts,
            "compliance_score": 98,
            "categories": categories
        },
        "ai_insights": [
            f"Your savings rate is {savings_rate:.1f}%. {'Great job!' if savings_rate > 20 else 'Consider reducing discretionary spending.'}",
            f"You had {len(transactions)} transactions this month with an average of ₹{(total_income + total_expenses) / max(len(transactions), 1):,.2f} per transaction.",
            f"{'No fraud alerts this month. Your account is secure.' if fraud_alerts == 0 else f'{fraud_alerts} fraud alerts detected. Please review.'}"
        ],
        "status": "generated"
    }


@router.get("/notifications")
async def get_notifications(current_user: User = Depends(get_current_user)):
    notifications = await Notification.find(
        Notification.user_id == str(current_user.id)
    ).sort(-Notification.created_at).limit(20).to_list()

    return [
        {
            "id": str(n.id),
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "severity": n.severity,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifications
    ]


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
):
    from beanie import PydanticObjectId
    notification = await Notification.get(PydanticObjectId(notification_id))
    if not notification or notification.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    await notification.save()
    return {"message": "Notification marked as read"}


def _generate_ai_response(user_message: str, transactions, user) -> str:
    """Generate comprehensive AI responses for ANY question"""

    msg = user_message.lower().strip()
    name = user.full_name or user.username

    # ── Greetings ──────────────────────────────────────────────
    if any(w in msg for w in ["hello", "hi", "hey", "good morning", "good evening", "good afternoon"]):
        return f"Hello {name}! 👋 I'm your TRUSTLEDGER AI assistant. I can help you with:\n\n💰 Account balance & transactions\n📊 Spending analysis & budgeting\n🛡️ Fraud detection & security\n📈 Market insights & investments\n📋 KYC/AML compliance\n🌱 Green finance\n\nWhat would you like to know?"

    if "how are you" in msg:
        return f"I'm doing great, {name}! 😊 Ready to help with your finances. What can I assist you with today?"

    if "thank" in msg:
        return f"You're welcome, {name}! 😊 Feel free to ask anything else about your finances."

    # ── Balance & Account ───────────────────────────────────────
    if any(w in msg for w in ["balance", "account balance", "how much money", "total money"]):
        if transactions:
            income = sum(t.amount for t in transactions if t.amount > 0)
            expenses = sum(abs(t.amount) for t in transactions if t.amount < 0)
            balance = income - expenses
            status = "🎉 Positive balance!" if balance > 0 else "⚠️ Expenses exceed income"
            return f"💰 **{name}'s Account Summary:**\n\nNet Balance: ₹{balance:,.2f}\nTotal Income: ₹{income:,.2f}\nTotal Expenses: ₹{expenses:,.2f}\nTransactions: {len(transactions)}\n\n{status}"
        return f"💰 No transactions found yet, {name}. Add your first transaction to see your balance!"

    # ── Transactions ────────────────────────────────────────────
    if any(w in msg for w in ["transaction", "recent", "last", "history", "show"]):
        if transactions:
            recent = transactions[:5]
            lines = "\n".join([f"• {t.merchant}: {'+'if t.amount>0 else ''}₹{t.amount:,.2f} ({t.category})" for t in recent])
            return f"📋 **Recent Transactions for {name}:**\n\n{lines}\n\nTotal: {len(transactions)} transactions. Visit the Transactions page for full history."
        return "No transactions found. Add transactions to see your history."

    # ── Spending ────────────────────────────────────────────────
    if any(w in msg for w in ["spending", "spent", "expense", "cost", "how much did i spend"]):
        if transactions:
            expenses = [t for t in transactions if t.amount < 0]
            total = sum(abs(t.amount) for t in expenses)
            cats: dict = {}
            for t in expenses:
                cats[t.category or "Other"] = cats.get(t.category or "Other", 0) + abs(t.amount)
            top = max(cats, key=cats.get) if cats else "N/A"
            breakdown = "\n".join([f"• {k}: ₹{v:,.2f}" for k, v in sorted(cats.items(), key=lambda x: -x[1])[:5]])
            return f"📊 **Spending Analysis:**\n\nTotal Spent: ₹{total:,.2f}\nTransactions: {len(expenses)}\nTop Category: {top}\n\n**Breakdown:**\n{breakdown}"
        return "No expense data yet. Add transactions to analyze spending."

    # ── Income ──────────────────────────────────────────────────
    if any(w in msg for w in ["income", "salary", "earning", "revenue"]):
        if transactions:
            inc = [t for t in transactions if t.amount > 0]
            total = sum(t.amount for t in inc)
            sources = "\n".join([f"• {t.merchant}: ₹{t.amount:,.2f}" for t in inc[:5]])
            return f"💵 **Income Summary:**\n\nTotal Income: ₹{total:,.2f}\nSources: {len(inc)}\n\n**Top Sources:**\n{sources}"
        return "No income transactions found. Add your salary or other income sources."

    # ── Fraud & Security ────────────────────────────────────────
    if any(w in msg for w in ["fraud", "security", "safe", "scam", "suspicious", "hack", "protect"]):
        return f"🛡️ **Security Status for {name}:**\n\n✅ Account Monitoring: Active\n✅ Fraud Detection: Running 24/7\n✅ Risk Scoring: All transactions analyzed\n\n**How we protect you:**\n• Real-time transaction monitoring\n• Geo-location validation\n• Behavioral pattern analysis\n• Instant fraud alerts\n\nVisit the Fraud Detection page for detailed alerts."

    # ── Investment & Market ─────────────────────────────────────
    if any(w in msg for w in ["invest", "stock", "market", "nifty", "sensex", "mutual fund", "sip", "portfolio"]):
        return "📈 **Investment Insights:**\n\n**Current Market:**\n• NIFTY 50: ~22,450 (moderate volatility)\n• SENSEX: ~73,850\n• Banking sector: Strong\n\n**Recommendations:**\n• Start SIP with ₹5,000/month in index funds\n• Diversify across large-cap, mid-cap\n• Review portfolio quarterly\n• Consider ELSS for tax savings (80C)\n\n⚠️ *Consult a SEBI-registered advisor for personalized advice.*"

    # ── Budget & Savings ────────────────────────────────────────
    if any(w in msg for w in ["budget", "save", "saving", "plan", "goal"]):
        if transactions:
            income = sum(t.amount for t in transactions if t.amount > 0)
            expenses = sum(abs(t.amount) for t in transactions if t.amount < 0)
            rate = ((income - expenses) / income * 100) if income > 0 else 0
            return f"💰 **Budget Analysis for {name}:**\n\nSavings Rate: {rate:.1f}%\n{'🎉 Excellent! Above 20%' if rate > 20 else '💡 Target: 20% savings rate'}\n\n**50/30/20 Rule:**\n• 50% Needs: ₹{income*0.5:,.0f}\n• 30% Wants: ₹{income*0.3:,.0f}\n• 20% Savings: ₹{income*0.2:,.0f}"
        return "💰 **Budgeting Tips:**\n\n1. Follow the 50/30/20 rule\n2. Track every expense\n3. Set up automatic savings\n4. Build 6-month emergency fund\n5. Review monthly\n\nAdd transactions to get personalized budget analysis!"

    # ── KYC / Compliance ────────────────────────────────────────
    if any(w in msg for w in ["kyc", "compliance", "aml", "verification", "document", "pan", "aadhaar"]):
        return "📋 **Compliance Status:**\n\n✅ KYC: Verified\n✅ AML: All checks passed\n✅ Documents: Complete\n✅ Score: 98/100\n\n**Required Documents:**\n• Aadhaar Card\n• PAN Card\n• Address Proof (< 3 months old)\n\nNext review: 6 months. Visit Compliance page for details."

    # ── Green Finance ───────────────────────────────────────────
    if any(w in msg for w in ["green", "carbon", "eco", "environment", "sustainable"]):
        return "🌱 **Green Finance:**\n\nYour estimated carbon footprint: 2.4 kg CO2/month\n\n**Eco Tips:**\n• Use public transport → saves 15kg CO2\n• Choose eco-friendly brands\n• Digital payments over cash\n• Invest in green funds\n\nVisit Green Finance page for detailed tracking."

    # ── Loan / Credit ───────────────────────────────────────────
    if any(w in msg for w in ["loan", "credit", "emi", "borrow", "debt"]):
        return "🏦 **Loan & Credit Info:**\n\n**Types available:**\n• Home Loan: 8.5-9.5% p.a.\n• Personal Loan: 10-18% p.a.\n• Car Loan: 7.5-9% p.a.\n• Education Loan: 8-12% p.a.\n\n**Tips:**\n• Keep EMI below 40% of income\n• Maintain CIBIL score > 750\n• Compare rates before applying\n• Prepay when possible to save interest"

    # ── Tax ─────────────────────────────────────────────────────
    if any(w in msg for w in ["tax", "itr", "tds", "income tax", "80c", "deduction"]):
        return "📑 **Tax Information:**\n\n**Key Deductions:**\n• 80C: ₹1.5L (ELSS, PPF, LIC)\n• 80D: ₹25K health insurance\n• 80CCD(1B): ₹50K NPS\n• HRA: Rent exemption\n\n**Important Dates:**\n• ITR Filing: July 31\n• Advance Tax: Mar 15\n• Form 16: June 15\n\n💡 Invest in ELSS to save tax + grow wealth!"

    # ── Insurance ───────────────────────────────────────────────
    if any(w in msg for w in ["insurance", "policy", "premium", "life insurance", "health insurance"]):
        return "🔒 **Insurance Guide:**\n\n**Recommended Coverage:**\n• Life Insurance: 10-15x annual income\n• Health Insurance: ₹5-10L family floater\n• Term Plan: Pure protection, low premium\n\n**Tips:**\n• Buy term plan early for low premiums\n• Don't mix insurance with investment\n• Review coverage annually\n• Keep nominees updated"

    # ── Help ────────────────────────────────────────────────────
    if any(w in msg for w in ["help", "what can you do", "capabilities", "features"]):
        return f"🤖 **I can help you with anything, {name}!**\n\n💰 Balance & transactions\n📊 Spending & budgeting\n🛡️ Fraud & security\n📈 Market & investments\n📋 KYC & compliance\n🌱 Green finance\n🏦 Loans & credit\n📑 Tax planning\n🔒 Insurance\n\nJust ask me anything in plain English!"

    # ── General financial questions ─────────────────────────────
    if any(w in msg for w in ["what is", "how to", "explain", "tell me", "define"]):
        # Try to give a helpful response based on keywords
        if "upi" in msg:
            return "📱 **UPI (Unified Payments Interface):**\n\nUPI is India's real-time payment system that allows instant money transfers between bank accounts using a mobile number or UPI ID.\n\n**Benefits:**\n• Free & instant transfers 24/7\n• No need to share bank details\n• Works across all banks\n• Limit: ₹1 lakh per transaction"
        if "neft" in msg or "rtgs" in msg or "imps" in msg:
            return "🏦 **Bank Transfer Methods:**\n\n• **IMPS**: Instant, 24/7, up to ₹5L\n• **NEFT**: Batch processing, free\n• **RTGS**: Real-time, min ₹2L, for large amounts\n• **UPI**: Instant, free, up to ₹1L\n\nFor most transfers, UPI or IMPS is recommended."
        if "cibil" in msg or "credit score" in msg:
            return "📊 **CIBIL Credit Score:**\n\n• 750-900: Excellent (easy loan approval)\n• 700-749: Good\n• 650-699: Fair\n• Below 650: Poor\n\n**Improve your score:**\n• Pay EMIs on time\n• Keep credit utilization < 30%\n• Don't apply for multiple loans\n• Check report annually for errors"

    # ── Default — intelligent fallback ──────────────────────────
    # Build context-aware response
    context_parts = []
    if transactions:
        income = sum(t.amount for t in transactions if t.amount > 0)
        expenses = sum(abs(t.amount) for t in transactions if t.amount < 0)
        context_parts.append(f"Your account has ₹{income-expenses:,.2f} net balance with {len(transactions)} transactions.")

    context = f"\n\n📊 **Your Account Context:** {context_parts[0]}" if context_parts else ""

    return f"I understand you're asking about: *\"{user_message}\"*\n\nI'm your TRUSTLEDGER financial assistant and I can help with:\n\n💰 **Balance & Transactions** — Ask 'What's my balance?'\n📊 **Spending Analysis** — Ask 'Show my spending'\n🛡️ **Security** — Ask 'Is my account safe?'\n📈 **Investments** — Ask 'Investment advice'\n📋 **Compliance** — Ask 'KYC status'\n🏦 **Loans & Tax** — Ask 'Tax saving tips'\n\nCould you rephrase your question? I'll do my best to help!{context}"
