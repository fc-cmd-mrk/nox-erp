"""
Payment Schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal


class PaymentBase(BaseModel):
    payment_type: str  # incoming, outgoing
    payment_channel: str  # cash, bank_transfer, paytr, gpay, crypto
    currency: str = "TRY"
    amount: Decimal


class PaymentCreate(PaymentBase):
    transaction_id: Optional[int] = None
    contact_id: Optional[int] = None
    account_id: Optional[int] = None
    external_id: Optional[str] = None
    exchange_rate: Decimal = Decimal("1")
    due_date: Optional[datetime] = None
    is_advance: bool = False
    reference_no: Optional[str] = None
    description: Optional[str] = None
    payment_date: Optional[datetime] = None


class PaymentUpdate(BaseModel):
    payment_type: Optional[str] = None
    payment_channel: Optional[str] = None
    currency: Optional[str] = None
    amount: Optional[Decimal] = None
    exchange_rate: Optional[Decimal] = None
    due_date: Optional[datetime] = None
    is_advance: Optional[bool] = None
    status: Optional[str] = None
    reference_no: Optional[str] = None
    description: Optional[str] = None


class PaymentSchema(PaymentBase):
    id: int
    payment_no: str
    external_id: Optional[str]
    transaction_id: Optional[int]
    contact_id: Optional[int]
    account_id: Optional[int]
    exchange_rate: Decimal
    base_amount: Optional[Decimal]
    due_date: Optional[datetime]
    is_advance: bool
    status: str
    reference_no: Optional[str]
    description: Optional[str]
    payment_date: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class PaymentSummary(BaseModel):
    total_incoming: Decimal
    total_outgoing: Decimal
    net_flow: Decimal
    by_channel: dict
    period_start: datetime
    period_end: datetime

