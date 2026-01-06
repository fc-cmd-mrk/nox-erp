"""
NOX ERP - Main Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db, engine, SessionLocal
from app.seed import seed_initial_data
import asyncio
import logging

# Import routers
from app.routers import auth, users, companies, contacts, products, transactions, accounts, payments, settings as settings_router, reports, data_import

# Scheduler imports
try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    SCHEDULER_AVAILABLE = True
except ImportError:
    SCHEDULER_AVAILABLE = False
    print("⚠️ APScheduler not installed. Automatic rate updates disabled.")

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = None


async def update_tcmb_rates_job():
    """Background job to update TCMB exchange rates"""
    from app.services.tcmb import TCMBService
    from app.models.settings import ExchangeRate
    from datetime import datetime, date
    from decimal import Decimal
    
    logger.info("🔄 Auto-updating TCMB exchange rates...")
    
    db = SessionLocal()
    try:
        rates = await TCMBService.fetch_today_rates()
        
        if not rates or not rates.get("currencies"):
            logger.warning("⚠️ Could not fetch TCMB rates")
            return
        
        rate_date = rates.get("date") or date.today()
        saved_count = 0
        
        # Önceki güncel kurları pasif yap
        db.query(ExchangeRate).filter(
            ExchangeRate.is_current == True,
            ExchangeRate.source == "tcmb"
        ).update({"is_current": False})
        
        for code, data in rates["currencies"].items():
            buying = data.get("forex_buying")
            selling = data.get("forex_selling")
            unit = data.get("unit", 1)
            
            if buying:
                # Aynı tarih ve para birimi için kayıt var mı kontrol et
                existing = db.query(ExchangeRate).filter(
                    ExchangeRate.from_currency == code,
                    ExchangeRate.to_currency == "TRY",
                    ExchangeRate.source == "tcmb",
                    ExchangeRate.rate_date == datetime.combine(rate_date, datetime.min.time())
                ).first()
                
                if existing:
                    existing.buying_rate = Decimal(str(buying)) / unit
                    existing.selling_rate = Decimal(str(selling)) / unit if selling else None
                    existing.rate = Decimal(str(buying)) / unit
                    existing.is_current = True
                else:
                    rate = ExchangeRate(
                        from_currency=code,
                        to_currency="TRY",
                        buying_rate=Decimal(str(buying)) / unit,
                        selling_rate=Decimal(str(selling)) / unit if selling else None,
                        rate=Decimal(str(buying)) / unit,
                        rate_date=datetime.combine(rate_date, datetime.min.time()),
                        source="tcmb",
                        is_current=True
                    )
                    db.add(rate)
                saved_count += 1
        
        db.commit()
        logger.info(f"✅ TCMB rates updated: {saved_count} currencies for {rate_date}")
        
    except Exception as e:
        logger.error(f"❌ Error updating TCMB rates: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    global scheduler
    
    # Startup
    print("🚀 NOX ERP Starting...")
    init_db()
    
    # Seed initial data
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    
    # Start scheduler for automatic rate updates
    if SCHEDULER_AVAILABLE:
        scheduler = AsyncIOScheduler()
        
        # Her gün saat 16:00'da TCMB kurlarını güncelle (TCMB 15:30'da yayınlar)
        scheduler.add_job(
            update_tcmb_rates_job,
            CronTrigger(hour=16, minute=0),
            id="tcmb_rate_update",
            name="TCMB Daily Rate Update",
            replace_existing=True
        )
        
        scheduler.start()
        print("⏰ Scheduler started - TCMB rates will update daily at 16:00")
    
    print("✅ NOX ERP Ready!")
    yield
    
    # Shutdown
    if scheduler:
        scheduler.shutdown()
        print("⏰ Scheduler stopped")
    print("👋 NOX ERP Shutting down...")


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="NOX ERP - Kurumsal Kaynak Planlama Sistemi",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(companies.router, prefix="/api")
app.include_router(contacts.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(accounts.router, prefix="/api")
app.include_router(payments.router, prefix="/api")
app.include_router(settings_router.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(data_import.router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )

