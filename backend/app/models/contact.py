"""
Contact (Customer/Supplier) Models
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class ContactType(enum.Enum):
    CUSTOMER = "customer"
    SUPPLIER = "supplier"
    BOTH = "both"


class Contact(Base):
    """Contacts - Customers and Suppliers (Cariler)"""
    __tablename__ = "contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    
    contact_type = Column(String(20), default="both")  # customer, supplier, both
    
    # Company info
    company_name = Column(String(200), nullable=True)
    tax_number = Column(String(50), nullable=True)
    tax_office = Column(String(100), nullable=True)
    
    # Contact details
    email = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    mobile = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(50), nullable=True)
    country = Column(String(50), nullable=True)
    
    # Payment terms
    payment_term_days = Column(Integer, default=0)  # 0 = cash, 30, 60, etc.
    credit_limit = Column(Numeric(18, 2), default=0)
    
    # Default currency for this contact
    default_currency = Column(String(10), default="TRY")
    
    notes = Column(Text, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    accounts = relationship("ContactAccount", back_populates="contact", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="contact")
    product_costs = relationship("ProductCost", back_populates="supplier")


class ContactAccount(Base):
    """Contact accounts in different currencies"""
    __tablename__ = "contact_accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False)
    
    currency = Column(String(10), nullable=False)  # TRY, USD, EUR, USDT
    balance = Column(Numeric(18, 4), default=0)  # Current balance
    
    # Positive = they owe us, Negative = we owe them
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    contact = relationship("Contact", back_populates="accounts")

