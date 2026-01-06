"""
Account Schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


class AccountTransactionBase(BaseModel):
    transaction_type: str  # deposit, withdrawal, transfer_in, transfer_out
    amount: Decimal
    description: Optional[str] = None
    transaction_date: Optional[datetime] = None


class AccountTransactionCreate(AccountTransactionBase):
    account_id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None


class AccountTransactionSchema(AccountTransactionBase):
    id: int
    account_id: int
    balance_after: Decimal
    reference_type: Optional[str]
    reference_id: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True


class AccountBase(BaseModel):
    code: str
    name: str
    account_type: str  # bank, cash, crypto, payment_gateway
    currency: str = "TRY"


class AccountCreate(AccountBase):
    company_id: int
    balance: Decimal = Decimal("0")
    bank_name: Optional[str] = None
    iban: Optional[str] = None
    account_number: Optional[str] = None
    branch_code: Optional[str] = None
    wallet_address: Optional[str] = None
    network: Optional[str] = None
    gateway_name: Optional[str] = None
    merchant_id: Optional[str] = None
    is_default: bool = False


class AccountUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    account_type: Optional[str] = None
    currency: Optional[str] = None
    bank_name: Optional[str] = None
    iban: Optional[str] = None
    account_number: Optional[str] = None
    branch_code: Optional[str] = None
    wallet_address: Optional[str] = None
    network: Optional[str] = None
    gateway_name: Optional[str] = None
    merchant_id: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class AccountSchema(AccountBase):
    id: int
    company_id: int
    balance: Decimal
    bank_name: Optional[str]
    iban: Optional[str]
    account_number: Optional[str]
    branch_code: Optional[str]
    wallet_address: Optional[str]
    network: Optional[str]
    gateway_name: Optional[str]
    merchant_id: Optional[str]
    is_default: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class AccountWithTransactions(AccountSchema):
    transactions: List[AccountTransactionSchema] = []


class CashFlowSummary(BaseModel):
    account_id: int
    account_name: str
    currency: str
    opening_balance: Decimal
    total_in: Decimal
    total_out: Decimal
    closing_balance: Decimal
    period_start: datetime
    period_end: datetime

