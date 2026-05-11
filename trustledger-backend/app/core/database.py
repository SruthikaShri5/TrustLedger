from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings

# MongoDB client (initialized on startup)
client: AsyncIOMotorClient = None


async def connect_to_mongo():
    """Connect to MongoDB and initialize Beanie ODM"""
    global client
    from app.models.mongo_models import (
        User, Transaction, FraudScore, MarketData,
        ComplianceCheck, Document, Notification, SystemLog
    )

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    await init_beanie(
        database=db,
        document_models=[
            User,
            Transaction,
            FraudScore,
            MarketData,
            ComplianceCheck,
            Document,
            Notification,
            SystemLog,
        ]
    )
    print(f"✅ Connected to MongoDB: {settings.MONGODB_URL}/{settings.MONGODB_DB_NAME}")


async def close_mongo_connection():
    """Close MongoDB connection"""
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")


def get_database():
    """Get the MongoDB database instance"""
    return client[settings.MONGODB_DB_NAME]
