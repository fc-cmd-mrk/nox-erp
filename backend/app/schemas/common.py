"""
Common Schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class ResponseModel(BaseModel):
    """Standard API response"""
    success: bool = True
    message: Optional[str] = None
    data: Optional[Any] = None


class PaginatedResponse(BaseModel):
    """Paginated response"""
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int


class DeleteResponse(BaseModel):
    """Delete response"""
    success: bool = True
    message: str = "Kayıt silindi"


class CurrencySchema(BaseModel):
    id: int
    code: str
    name: str
    symbol: Optional[str]
    decimal_places: int
    is_crypto: bool
    is_default: bool
    is_active: bool
    
    class Config:
        from_attributes = True


class CurrencyCreate(BaseModel):
    code: str
    name: str
    symbol: Optional[str] = None
    decimal_places: int = 2
    is_crypto: bool = False
    is_default: bool = False


class ExchangeRateSchema(BaseModel):
    id: int
    from_currency: str
    to_currency: str
    buying_rate: Optional[float] = None
    selling_rate: Optional[float] = None
    rate: float
    rate_date: datetime
    source: Optional[str]
    is_current: bool = False
    
    class Config:
        from_attributes = True


class ExchangeRateCreate(BaseModel):
    from_currency: str
    to_currency: str
    rate: float
    buying_rate: Optional[float] = None
    selling_rate: Optional[float] = None
    source: Optional[str] = "manual"


class SettingSchema(BaseModel):
    id: int
    key: str
    value: Optional[str]
    value_type: str
    category: Optional[str]
    description: Optional[str]
    is_public: bool
    is_editable: bool
    
    class Config:
        from_attributes = True


class SettingUpdate(BaseModel):
    value: str


class AuditLogSchema(BaseModel):
    id: int
    user_id: Optional[int]
    username: Optional[str]
    ip_address: Optional[str]
    action: str
    module: str
    record_id: Optional[int]
    record_type: Optional[str]
    old_values: Optional[dict]
    new_values: Optional[dict]
    description: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

