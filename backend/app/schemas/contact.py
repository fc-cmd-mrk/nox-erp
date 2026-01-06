"""
Contact Schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# Brief schemas for nested display (avoid circular imports)
class PaymentBrief(BaseModel):
    """Ödeme özet bilgisi"""
    id: int
    payment_no: str
    payment_type: str
    payment_channel: str
    currency: str
    amount: Decimal
    payment_date: datetime
    description: Optional[str]
    
    class Config:
        from_attributes = True


class TransactionBrief(BaseModel):
    """İşlem özet bilgisi"""
    id: int
    transaction_no: str
    transaction_type: str
    currency: str
    total_amount: Decimal
    transaction_date: Optional[datetime]
    status: str
    
    class Config:
        from_attributes = True


class ContactAccountBase(BaseModel):
    currency: str
    balance: Decimal = Decimal("0")


class ContactAccountCreate(ContactAccountBase):
    contact_id: int


class ContactAccountUpdate(BaseModel):
    balance: Optional[Decimal] = None


class ContactAccountSchema(ContactAccountBase):
    id: int
    contact_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class ContactBase(BaseModel):
    code: str
    name: str
    contact_type: str = "both"  # customer, supplier, both


class ContactCreate(ContactBase):
    company_name: Optional[str] = None
    tax_number: Optional[str] = None
    tax_office: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    payment_term_days: int = 0
    credit_limit: Decimal = Decimal("0")
    default_currency: str = "TRY"
    notes: Optional[str] = None
    company_ids: List[int] = []  # Bağlı şirketler


class ContactUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    contact_type: Optional[str] = None
    company_name: Optional[str] = None
    tax_number: Optional[str] = None
    tax_office: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    payment_term_days: Optional[int] = None
    credit_limit: Optional[Decimal] = None
    default_currency: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    company_ids: Optional[List[int]] = None  # Bağlı şirketler


class CompanyBrief(BaseModel):
    """Şirket özet bilgisi"""
    id: int
    code: str
    name: str
    country: Optional[str]
    
    class Config:
        from_attributes = True


class ContactSchema(ContactBase):
    id: int
    company_name: Optional[str]
    tax_number: Optional[str]
    tax_office: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    mobile: Optional[str]
    address: Optional[str]
    city: Optional[str]
    country: Optional[str]
    payment_term_days: int
    credit_limit: Decimal
    default_currency: str
    notes: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class ContactWithCompanies(ContactSchema):
    """Şirket ilişkileri ile birlikte cari"""
    companies: List[CompanyBrief] = []


class ContactWithAccounts(ContactSchema):
    accounts: List[ContactAccountSchema] = []
    companies: List[CompanyBrief] = []


class ContactDetail(ContactWithAccounts):
    """Cari detay görünümü - ödemeler ve işlemler dahil"""
    payments: List[PaymentBrief] = []
    transactions: List[TransactionBrief] = []

