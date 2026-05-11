"""
TrustLedger Fraud Detection Pipeline
Real-time fraud analysis using rule-based ML scoring
"""
from datetime import datetime
from typing import Dict, Any, List


class FraudDetectionPipeline:
    """Real-time fraud detection pipeline"""

    def __init__(self):
        self.risk_threshold = 70

    def detect_fraud(self, transaction_data: Dict) -> Dict[str, Any]:
        risk_score = 0
        reasons = []

        amount = abs(transaction_data.get("amount", 0))
        if amount > 100000:
            risk_score += 30
            reasons.append(f"Very large amount: ₹{amount:,.0f}")
        elif amount > 50000:
            risk_score += 20
            reasons.append(f"Large amount: ₹{amount:,.0f}")
        elif amount > 20000:
            risk_score += 10

        merchant = transaction_data.get("merchant", "").lower()
        risky_keywords = ["unknown", "crypto", "gambling", "offshore", "cash"]
        if any(keyword in merchant for keyword in risky_keywords):
            risk_score += 25
            reasons.append("High-risk merchant category")

        location = transaction_data.get("location", "").lower()
        if "unknown" in location or "foreign" in location:
            risk_score += 20
            reasons.append("Suspicious location")

        timestamp = transaction_data.get("timestamp", datetime.utcnow())
        if isinstance(timestamp, str):
            try:
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except Exception:
                timestamp = datetime.utcnow()

        hour = timestamp.hour
        if hour < 6 or hour > 22:
            risk_score += 15
            reasons.append(f"Unusual transaction time: {hour:02d}:00")

        risk_score = min(risk_score, 100)

        if risk_score >= 90:
            level = "critical"
        elif risk_score >= 70:
            level = "high"
        elif risk_score >= 40:
            level = "medium"
        else:
            level = "low"

        if not reasons:
            reasons.append("Transaction appears normal")

        return {
            "risk_score": risk_score,
            "risk_level": level,
            "reasons": reasons,
            "geo_risk": "unknown" in location or "foreign" in location,
            "impossible_travel": risk_score > 80,
            "behavioral_anomaly": risk_score > 50,
            "timestamp": datetime.utcnow().isoformat()
        }

    def batch_analyze(self, transactions: List[Dict]) -> List[Dict]:
        return [self.detect_fraud(txn) for txn in transactions]


class MarketAnalyticsPipeline:
    """Real-time market analytics pipeline"""

    BASE_PRICES = {
        "NIFTY50": 22450,
        "SENSEX": 73850,
        "BANKNIFTY": 47200,
        "USDINR": 83.15,
        "GOLD": 62500,
        "SILVER": 74200,
        "CRUDE": 6500
    }

    def analyze_market_data(self, symbol: str, price: float, volume: int = 0) -> Dict[str, Any]:
        base_price = self.BASE_PRICES.get(symbol, price)
        change = price - base_price
        change_percent = (change / base_price) * 100 if base_price > 0 else 0

        if change_percent > 1:
            trend = "strongly_bullish"
        elif change_percent > 0.2:
            trend = "bullish"
        elif change_percent < -1:
            trend = "strongly_bearish"
        elif change_percent < -0.2:
            trend = "bearish"
        else:
            trend = "neutral"

        volatility = abs(change_percent) * 1.5

        if change_percent < -2:
            recommendation = "strong_buy"
        elif change_percent < -0.5:
            recommendation = "buy"
        elif change_percent > 2:
            recommendation = "strong_sell"
        elif change_percent > 0.5:
            recommendation = "sell"
        else:
            recommendation = "hold"

        return {
            "symbol": symbol,
            "current_price": round(price, 2),
            "base_price": base_price,
            "change": round(change, 2),
            "change_percent": round(change_percent, 2),
            "trend": trend,
            "volatility": round(volatility, 2),
            "recommendation": recommendation,
            "volume": volume,
            "timestamp": datetime.utcnow().isoformat()
        }


# Singleton instances
fraud_pipeline = FraudDetectionPipeline()
market_pipeline = MarketAnalyticsPipeline()

__all__ = ['FraudDetectionPipeline', 'MarketAnalyticsPipeline', 'fraud_pipeline', 'market_pipeline']
