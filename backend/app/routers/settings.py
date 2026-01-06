"""
Settings Router
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.auth import require_permission, get_current_user
from app.models.user import User
from app.models.settings import SystemSettings, Currency, ExchangeRate
from app.models.audit_log import AuditLog
from app.schemas.common import (
    SettingSchema, SettingUpdate,
    CurrencySchema, CurrencyCreate,
    ExchangeRateSchema, ExchangeRateCreate,
    AuditLogSchema
)

router = APIRouter(prefix="/settings", tags=["Settings"])


# ============ SYSTEM SETTINGS ============

@router.get("", response_model=List[SettingSchema])
async def list_settings(
    category: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List system settings"""
    query = db.query(SystemSettings)
    
    if not current_user.is_superuser:
        query = query.filter(SystemSettings.is_public == True)
    
    if category:
        query = query.filter(SystemSettings.category == category)
    
    settings = query.all()
    return settings


@router.get("/{key}", response_model=SettingSchema)
async def get_setting(
    key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get setting by key"""
    setting = db.query(SystemSettings).filter(SystemSettings.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Ayar bulunamadı")
    
    if not setting.is_public and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Bu ayara erişim yetkiniz yok")
    
    return setting


@router.put("/{key}", response_model=SettingSchema)
async def update_setting(
    key: str,
    data: SettingUpdate,
    req: Request,
    current_user: User = Depends(require_permission("settings", "edit")),
    db: Session = Depends(get_db)
):
    """Update setting"""
    setting = db.query(SystemSettings).filter(SystemSettings.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Ayar bulunamadı")
    
    if not setting.is_editable:
        raise HTTPException(status_code=400, detail="Bu ayar değiştirilemez")
    
    old_value = setting.value
    setting.value = data.value
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="update",
        module="settings",
        record_id=setting.id,
        record_type="SystemSettings",
        old_values={"value": old_value},
        new_values={"value": data.value},
        description=f"Ayar güncellendi: {key}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    db.refresh(setting)
    
    return setting


# ============ CURRENCIES ============

@router.get("/currencies/list", response_model=List[CurrencySchema])
async def list_currencies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all currencies"""
    currencies = db.query(Currency).all()
    return currencies


@router.post("/currencies", response_model=CurrencySchema)
async def create_currency(
    currency_data: CurrencyCreate,
    current_user: User = Depends(require_permission("settings", "create")),
    db: Session = Depends(get_db)
):
    """Create new currency"""
    if db.query(Currency).filter(Currency.code == currency_data.code).first():
        raise HTTPException(status_code=400, detail="Bu para birimi zaten var")
    
    currency = Currency(**currency_data.model_dump())
    db.add(currency)
    db.commit()
    db.refresh(currency)
    return currency


@router.delete("/currencies/{currency_id}")
async def delete_currency(
    currency_id: int,
    current_user: User = Depends(require_permission("settings", "delete")),
    db: Session = Depends(get_db)
):
    """Delete currency"""
    currency = db.query(Currency).filter(Currency.id == currency_id).first()
    if not currency:
        raise HTTPException(status_code=404, detail="Para birimi bulunamadı")
    
    db.delete(currency)
    db.commit()
    return {"message": "Para birimi silindi"}


# ============ EXCHANGE RATES ============

@router.get("/exchange-rates/list", response_model=List[ExchangeRateSchema])
async def list_exchange_rates(
    from_currency: str = None,
    to_currency: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List exchange rates"""
    query = db.query(ExchangeRate)
    
    if from_currency:
        query = query.filter(ExchangeRate.from_currency == from_currency)
    
    if to_currency:
        query = query.filter(ExchangeRate.to_currency == to_currency)
    
    rates = query.order_by(ExchangeRate.rate_date.desc()).all()
    return rates


@router.get("/exchange-rates/{from_currency}/{to_currency}")
async def get_exchange_rate(
    from_currency: str,
    to_currency: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get latest exchange rate"""
    rate = db.query(ExchangeRate).filter(
        ExchangeRate.from_currency == from_currency,
        ExchangeRate.to_currency == to_currency
    ).order_by(ExchangeRate.rate_date.desc()).first()
    
    if not rate:
        raise HTTPException(status_code=404, detail="Kur bulunamadı")
    
    return {"rate": float(rate.rate), "date": rate.rate_date}


@router.post("/exchange-rates", response_model=ExchangeRateSchema)
async def create_exchange_rate(
    rate_data: ExchangeRateCreate,
    current_user: User = Depends(require_permission("settings", "create")),
    db: Session = Depends(get_db)
):
    """Create exchange rate"""
    rate = ExchangeRate(**rate_data.model_dump())
    db.add(rate)
    db.commit()
    db.refresh(rate)
    return rate


# ============ AUDIT LOGS ============

@router.get("/audit-logs", response_model=List[AuditLogSchema])
async def list_audit_logs(
    skip: int = 0,
    limit: int = 100,
    module: str = None,
    action: str = None,
    user_id: int = None,
    current_user: User = Depends(require_permission("settings", "view")),
    db: Session = Depends(get_db)
):
    """List audit logs"""
    query = db.query(AuditLog)
    
    if module:
        query = query.filter(AuditLog.module == module)
    
    if action:
        query = query.filter(AuditLog.action == action)
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return logs

