"""
Transaction Schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class TransactionItemBase(BaseModel):
    product_id: Optional[int] = None
    warehouse_id: Optional[int] = None
    sub_warehouse_id: Optional[int] = None
    description: Optional[str] = None
    quantity: Decimal = Decimal("1")
    unit_price: Decimal
    cost_price: Decimal = Decimal("0")
    discount_percent: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")
    tax_percent: Decimal = Decimal("0")
    tax_amount: Decimal = Decimal("0")


class TransactionItemCreate(TransactionItemBase):
    pass


class TransactionItemSchema(TransactionItemBase):
    id: int
    transaction_id: int
    total_amount: Decimal
    profit: Decimal
    profit_margin: Decimal
    created_at: datetime
    
    class Config:
        from_attributes = True


class TransactionBase(BaseModel):
    transaction_type: str  # sale, purchase, sale_return, purchase_return
    company_id: int
    contact_id: Optional[int] = None
    transaction_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    currency: str = "TRY"
    exchange_rate: Decimal = Decimal("1")
    notes: Optional[str] = None


class TransactionCreate(TransactionBase):
    external_id: Optional[str] = None
    items: List[TransactionItemCreate]


class TransactionUpdate(BaseModel):
    contact_id: Optional[int] = None
    transaction_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    currency: Optional[str] = None
    exchange_rate: Optional[Decimal] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class TransactionSchema(TransactionBase):
    id: int
    transaction_no: str
    external_id: Optional[str]
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    is_paid: bool
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class TransactionWithItems(TransactionSchema):
    items: List[TransactionItemSchema] = []


class TransactionSummary(BaseModel):
    total_sales: Decimal
    total_purchases: Decimal
    total_profit: Decimal
    transaction_count: int
    period_start: datetime
    period_end: datetime

