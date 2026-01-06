"""
Settings Router
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, date
from decimal import Decimal
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
from app.services.tcmb import TCMBService, CryptoRateService

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


# ============ TCMB INTEGRATION ============
# NOT: Bu endpoint'ler dinamik path'ten ÖNCE tanımlanmalı

@router.get("/exchange-rates/tcmb/current")
async def get_tcmb_current_rates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Güncel TCMB kurlarını getir"""
    rates = db.query(ExchangeRate).filter(
        ExchangeRate.is_current == True,
        ExchangeRate.source == "tcmb"
    ).all()
    
    result = {}
    for rate in rates:
        result[rate.from_currency] = {
            "buying": float(rate.buying_rate) if rate.buying_rate else None,
            "selling": float(rate.selling_rate) if rate.selling_rate else None,
            "rate": float(rate.rate),
            "date": rate.rate_date.strftime("%Y-%m-%d") if rate.rate_date else None
        }
    
    return result


@router.post("/exchange-rates/tcmb/update")
async def update_tcmb_rates(
    req: Request,
    current_user: User = Depends(require_permission("settings", "create")),
    db: Session = Depends(get_db)
):
    """TCMB'den güncel kurları çek ve kaydet"""
    rates = await TCMBService.fetch_today_rates()
    
    if not rates or not rates.get("currencies"):
        raise HTTPException(status_code=503, detail="TCMB'den kur alınamadı")
    
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
                # Güncelle
                existing.buying_rate = Decimal(str(buying)) / unit
                existing.selling_rate = Decimal(str(selling)) / unit if selling else None
                existing.rate = Decimal(str(buying)) / unit
                existing.is_current = True
            else:
                # Yeni kayıt
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
    
    # Audit log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        module="exchange_rates",
        record_type="ExchangeRate",
        description=f"TCMB kurları güncellendi ({saved_count} para birimi)",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return {
        "message": f"TCMB kurları güncellendi",
        "date": str(rate_date),
        "count": saved_count,
        "currencies": list(rates["currencies"].keys())
    }


@router.post("/exchange-rates/tcmb/fetch-history")
async def fetch_tcmb_history(
    req: Request,
    start_date: str = None,  # YYYY-MM-DD format
    end_date: str = None,    # YYYY-MM-DD format
    current_user: User = Depends(require_permission("settings", "create")),
    db: Session = Depends(get_db)
):
    """Belirli bir tarih aralığındaki TCMB kurlarını çek ve kaydet"""
    from datetime import timedelta
    import asyncio
    
    # Varsayılan: yıl başından bugüne
    if not start_date:
        start = date(date.today().year, 1, 1)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d").date()
    
    if not end_date:
        end = date.today()
    else:
        end = datetime.strptime(end_date, "%Y-%m-%d").date()
    
    if start > end:
        raise HTTPException(status_code=400, detail="Başlangıç tarihi bitiş tarihinden büyük olamaz")
    
    # Maksimum 365 gün
    if (end - start).days > 365:
        raise HTTPException(status_code=400, detail="Maksimum 365 günlük veri çekilebilir")
    
    total_saved = 0
    total_days = 0
    skipped_days = 0
    errors = []
    
    current_date = start
    while current_date <= end:
        # Hafta sonu kontrolü (TCMB hafta sonları kur yayınlamaz)
        if current_date.weekday() >= 5:  # 5=Cumartesi, 6=Pazar
            current_date += timedelta(days=1)
            skipped_days += 1
            continue
        
        # Bu tarih için zaten kayıt var mı kontrol et
        existing = db.query(ExchangeRate).filter(
            ExchangeRate.source == "tcmb",
            ExchangeRate.rate_date == datetime.combine(current_date, datetime.min.time())
        ).first()
        
        if existing:
            current_date += timedelta(days=1)
            skipped_days += 1
            continue
        
        try:
            rates = await TCMBService.fetch_rates_by_date(current_date)
            
            if rates and rates.get("currencies"):
                rate_date = rates.get("date") or current_date
                
                for code, data in rates["currencies"].items():
                    buying = data.get("forex_buying")
                    selling = data.get("forex_selling")
                    unit = data.get("unit", 1)
                    
                    if buying:
                        rate = ExchangeRate(
                            from_currency=code,
                            to_currency="TRY",
                            buying_rate=Decimal(str(buying)) / unit,
                            selling_rate=Decimal(str(selling)) / unit if selling else None,
                            rate=Decimal(str(buying)) / unit,
                            rate_date=datetime.combine(rate_date, datetime.min.time()),
                            source="tcmb",
                            is_current=False
                        )
                        db.add(rate)
                        total_saved += 1
                
                total_days += 1
            else:
                errors.append(f"{current_date}: Veri bulunamadı")
                
        except Exception as e:
            errors.append(f"{current_date}: {str(e)}")
        
        current_date += timedelta(days=1)
        
        # Rate limiting - her istek arasında 0.5 saniye bekle
        await asyncio.sleep(0.5)
    
    # Commit
    db.commit()
    
    # En güncel tarihi is_current yap
    latest_date = db.query(ExchangeRate.rate_date).filter(
        ExchangeRate.source == "tcmb"
    ).order_by(ExchangeRate.rate_date.desc()).first()
    
    if latest_date:
        db.query(ExchangeRate).filter(
            ExchangeRate.source == "tcmb",
            ExchangeRate.is_current == True
        ).update({"is_current": False})
        
        db.query(ExchangeRate).filter(
            ExchangeRate.source == "tcmb",
            ExchangeRate.rate_date == latest_date[0]
        ).update({"is_current": True})
        
        db.commit()
    
    # Audit log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        module="exchange_rates",
        record_type="ExchangeRate",
        description=f"TCMB geçmiş kurları çekildi ({start} - {end}): {total_days} gün, {total_saved} kayıt",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return {
        "message": "TCMB geçmiş kurları çekildi",
        "start_date": str(start),
        "end_date": str(end),
        "total_days": total_days,
        "total_records": total_saved,
        "skipped_days": skipped_days,
        "errors": errors[:10] if errors else []  # İlk 10 hata
    }


@router.get("/exchange-rates/tcmb/history")
async def get_tcmb_history(
    currency: str = "USD",
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Belirli bir para biriminin geçmiş kurlarını getir"""
    from datetime import timedelta
    
    start_date = datetime.combine(date.today() - timedelta(days=days), datetime.min.time())
    
    rates = db.query(ExchangeRate).filter(
        ExchangeRate.from_currency == currency,
        ExchangeRate.to_currency == "TRY",
        ExchangeRate.source == "tcmb",
        ExchangeRate.rate_date >= start_date
    ).order_by(ExchangeRate.rate_date.asc()).all()
    
    return [{
        "date": rate.rate_date.strftime("%Y-%m-%d"),
        "buying": float(rate.buying_rate) if rate.buying_rate else None,
        "selling": float(rate.selling_rate) if rate.selling_rate else None,
        "rate": float(rate.rate)
    } for rate in rates]


@router.get("/exchange-rates/tcmb/by-date")
async def get_rates_by_date(
    rate_date: str,  # YYYY-MM-DD format
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Belirli bir tarihteki tüm kurları getir"""
    try:
        target_date = datetime.strptime(rate_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Geçersiz tarih formatı. YYYY-MM-DD kullanın.")
    
    rates = db.query(ExchangeRate).filter(
        ExchangeRate.to_currency == "TRY",
        ExchangeRate.source == "tcmb",
        ExchangeRate.rate_date == datetime.combine(target_date, datetime.min.time())
    ).all()
    
    result = {}
    for rate in rates:
        result[rate.from_currency] = {
            "buying": float(rate.buying_rate) if rate.buying_rate else None,
            "selling": float(rate.selling_rate) if rate.selling_rate else None,
            "rate": float(rate.rate),
            "date": rate.rate_date.strftime("%Y-%m-%d")
        }
    
    return result


@router.get("/exchange-rates/tcmb/available-dates")
async def get_available_dates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Kur verisi olan tarihleri getir"""
    from sqlalchemy import func
    
    dates = db.query(func.distinct(ExchangeRate.rate_date)).filter(
        ExchangeRate.source == "tcmb"
    ).order_by(ExchangeRate.rate_date.desc()).all()
    
    result = []
    for d in dates:
        date_val = d[0]
        if isinstance(date_val, str):
            # SQLite returns string
            result.append(date_val.split(" ")[0])
        else:
            # PostgreSQL returns datetime
            result.append(date_val.strftime("%Y-%m-%d"))
    
    return result


@router.get("/exchange-rates/tcmb/stats")
async def get_tcmb_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """TCMB kur istatistiklerini getir"""
    from sqlalchemy import func
    
    # Toplam kayıt sayısı
    total_count = db.query(func.count(ExchangeRate.id)).filter(
        ExchangeRate.source == "tcmb"
    ).scalar()
    
    # En eski tarih
    oldest = db.query(func.min(ExchangeRate.rate_date)).filter(
        ExchangeRate.source == "tcmb"
    ).scalar()
    
    # En yeni tarih
    newest = db.query(func.max(ExchangeRate.rate_date)).filter(
        ExchangeRate.source == "tcmb"
    ).scalar()
    
    # Benzersiz para birimi sayısı
    currency_count = db.query(func.count(func.distinct(ExchangeRate.from_currency))).filter(
        ExchangeRate.source == "tcmb"
    ).scalar()
    
    # Benzersiz gün sayısı
    day_count = db.query(func.count(func.distinct(ExchangeRate.rate_date))).filter(
        ExchangeRate.source == "tcmb"
    ).scalar()
    
    return {
        "total_records": total_count,
        "oldest_date": oldest.strftime("%Y-%m-%d") if oldest else None,
        "newest_date": newest.strftime("%Y-%m-%d") if newest else None,
        "currency_count": currency_count,
        "day_count": day_count
    }


# Dinamik path - TCMB endpoint'lerinden SONRA tanımlanmalı
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


@router.post("/exchange-rates/crypto/update")
async def update_crypto_rates(
    req: Request,
    current_user: User = Depends(require_permission("settings", "create")),
    db: Session = Depends(get_db)
):
    """Kripto kurlarını güncelle (USDT)"""
    crypto_rates = await CryptoRateService.fetch_usdt_rate()
    
    if not crypto_rates or "USDT" not in crypto_rates:
        raise HTTPException(status_code=503, detail="Kripto kurları alınamadı")
    
    usdt = crypto_rates["USDT"]
    now = datetime.now()
    
    # Önceki USDT kurlarını pasif yap
    db.query(ExchangeRate).filter(
        ExchangeRate.from_currency == "USDT",
        ExchangeRate.is_current == True
    ).update({"is_current": False})
    
    # USDT/TRY
    if usdt.get("TRY"):
        rate = ExchangeRate(
            from_currency="USDT",
            to_currency="TRY",
            rate=Decimal(str(usdt["TRY"])),
            buying_rate=Decimal(str(usdt["TRY"])),
            selling_rate=Decimal(str(usdt["TRY"])),
            rate_date=now,
            source="crypto_api",
            is_current=True
        )
        db.add(rate)
    
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        module="exchange_rates",
        record_type="ExchangeRate",
        description="Kripto kurları güncellendi (USDT)",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return {
        "message": "Kripto kurları güncellendi",
        "USDT": usdt
    }


@router.get("/exchange-rates/convert")
async def convert_currency(
    amount: float,
    from_currency: str,
    to_currency: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Para birimi dönüşümü yap"""
    if from_currency == to_currency:
        return {"amount": amount, "rate": 1.0, "converted": amount}
    
    # Direkt kur var mı?
    rate = db.query(ExchangeRate).filter(
        ExchangeRate.from_currency == from_currency,
        ExchangeRate.to_currency == to_currency,
        ExchangeRate.is_current == True
    ).first()
    
    if rate:
        converted = amount * float(rate.rate)
        return {
            "amount": amount,
            "from": from_currency,
            "to": to_currency,
            "rate": float(rate.rate),
            "converted": round(converted, 4)
        }
    
    # TRY üzerinden çapraz kur
    if to_currency == "TRY":
        from_rate = db.query(ExchangeRate).filter(
            ExchangeRate.from_currency == from_currency,
            ExchangeRate.to_currency == "TRY",
            ExchangeRate.is_current == True
        ).first()
        
        if from_rate:
            converted = amount * float(from_rate.rate)
            return {
                "amount": amount,
                "from": from_currency,
                "to": "TRY",
                "rate": float(from_rate.rate),
                "converted": round(converted, 4)
            }
    
    elif from_currency == "TRY":
        to_rate = db.query(ExchangeRate).filter(
            ExchangeRate.from_currency == to_currency,
            ExchangeRate.to_currency == "TRY",
            ExchangeRate.is_current == True
        ).first()
        
        if to_rate:
            converted = amount / float(to_rate.rate)
            return {
                "amount": amount,
                "from": "TRY",
                "to": to_currency,
                "rate": 1 / float(to_rate.rate),
                "converted": round(converted, 4)
            }
    
    # Çapraz kur (X -> TRY -> Y)
    from_rate = db.query(ExchangeRate).filter(
        ExchangeRate.from_currency == from_currency,
        ExchangeRate.to_currency == "TRY",
        ExchangeRate.is_current == True
    ).first()
    
    to_rate = db.query(ExchangeRate).filter(
        ExchangeRate.from_currency == to_currency,
        ExchangeRate.to_currency == "TRY",
        ExchangeRate.is_current == True
    ).first()
    
    if from_rate and to_rate:
        cross_rate = float(from_rate.rate) / float(to_rate.rate)
        converted = amount * cross_rate
        return {
            "amount": amount,
            "from": from_currency,
            "to": to_currency,
            "rate": round(cross_rate, 6),
            "converted": round(converted, 4),
            "via": "TRY"
        }
    
    raise HTTPException(status_code=404, detail=f"Kur bulunamadı: {from_currency} -> {to_currency}")


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

