"""
NOX ERP - Main Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import init_db, engine, SessionLocal
from app.seed import seed_initial_data

# Import routers
from app.routers import auth, users, companies, contacts, products, transactions, accounts, payments, settings as settings_router, reports, data_import


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 NOX ERP Starting...")
    init_db()
    
    # Seed initial data
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    
    print("✅ NOX ERP Ready!")
    yield
    # Shutdown
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

