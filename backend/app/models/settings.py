"""
System Settings Models
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, Text
from sqlalchemy.sql import func
from app.database import Base


class SystemSettings(Base):
    """Dynamic system settings"""
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)
    value_type = Column(String(20), default="string")  # string, number, boolean, json
    
    category = Column(String(50), nullable=True)  # general, payment, notification, etc.
    description = Column(Text, nullable=True)
    
    is_public = Column(Boolean, default=False)  # Can be viewed by non-admins
    is_editable = Column(Boolean, default=True)  # Can be edited by admins
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Currency(Base):
    """Supported currencies"""
    __tablename__ = "currencies"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False)  # TRY, USD, EUR, USDT
    name = Column(String(50), nullable=False)
    symbol = Column(String(10), nullable=True)  # ₺, $, €
    
    decimal_places = Column(Integer, default=2)
    
    is_crypto = Column(Boolean, default=False)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ExchangeRate(Base):
    """Exchange rates"""
    __tablename__ = "exchange_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    
    from_currency = Column(String(10), nullable=False, index=True)
    to_currency = Column(String(10), nullable=False, index=True)
    
    # TCMB rates
    buying_rate = Column(Numeric(18, 8), nullable=True)   # Döviz Alış
    selling_rate = Column(Numeric(18, 8), nullable=True)  # Döviz Satış
    rate = Column(Numeric(18, 8), nullable=False)         # Kullanılan kur (genellikle buying)
    
    rate_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    source = Column(String(50), nullable=True)  # tcmb, manual, crypto_api
    
    is_current = Column(Boolean, default=True)  # Güncel kur mu?
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

