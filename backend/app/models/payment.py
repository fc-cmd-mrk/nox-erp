"""
Payment Models
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class PaymentChannel(enum.Enum):
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    CREDIT_CARD = "credit_card"
    PAYTR = "paytr"
    GPAY = "gpay"
    CRYPTO = "crypto"
    ADVANCE = "advance"  # Avans
    OTHER = "other"


class PaymentStatus(enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class Payment(Base):
    """Payment records"""
    __tablename__ = "payments"
    
    id = Column(Integer, primary_key=True, index=True)
    
    payment_no = Column(String(50), unique=True, nullable=False, index=True)
    external_id = Column(String(50), nullable=True, index=True)  # bakiyeid from external system
    
    # Related entities
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    
    payment_type = Column(String(20), nullable=False)  # incoming, outgoing
    payment_channel = Column(String(30), nullable=False)  # cash, bank_transfer, paytr, gpay, crypto
    
    # Amount details
    currency = Column(String(10), nullable=False, default="TRY")
    amount = Column(Numeric(18, 4), nullable=False)
    
    # Exchange rate if different currency
    exchange_rate = Column(Numeric(18, 6), default=1)
    base_amount = Column(Numeric(18, 4), nullable=True)  # Amount in base currency
    
    # Payment terms
    due_date = Column(DateTime(timezone=True), nullable=True)  # For installments/credit
    is_advance = Column(Boolean, default=False)  # Avans ödemesi
    
    # Status
    status = Column(String(20), default="completed")
    
    # Reference
    reference_no = Column(String(100), nullable=True)  # Bank reference, gateway ID
    description = Column(Text, nullable=True)
    
    payment_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    transaction = relationship("Transaction", back_populates="payments")
    contact = relationship("Contact")
    account = relationship("Account", back_populates="payments")

