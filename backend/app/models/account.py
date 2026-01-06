"""
Account Models (Bank, Cash, Crypto)
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class AccountType(enum.Enum):
    BANK = "bank"
    CASH = "cash"
    CRYPTO = "crypto"
    PAYMENT_GATEWAY = "payment_gateway"  # PayTR, GPay, etc.


class Account(Base):
    """Financial accounts (Bank, Cash, Crypto wallets)"""
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    code = Column(String(50), nullable=False)
    name = Column(String(100), nullable=False)
    account_type = Column(String(30), nullable=False)  # bank, cash, crypto, payment_gateway
    
    currency = Column(String(10), nullable=False, default="TRY")
    balance = Column(Numeric(18, 4), default=0)
    
    # Bank specific
    bank_name = Column(String(100), nullable=True)
    iban = Column(String(50), nullable=True)
    account_number = Column(String(50), nullable=True)
    branch_code = Column(String(20), nullable=True)
    
    # Crypto specific
    wallet_address = Column(String(200), nullable=True)
    network = Column(String(50), nullable=True)  # ERC20, TRC20, etc.
    
    # Payment gateway specific
    gateway_name = Column(String(50), nullable=True)  # PayTR, GPay
    merchant_id = Column(String(100), nullable=True)
    
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="accounts")
    transactions = relationship("AccountTransaction", back_populates="account", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="account")


class AccountTransaction(Base):
    """Account movements (deposits, withdrawals, transfers)"""
    __tablename__ = "account_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    
    transaction_type = Column(String(30), nullable=False)  # deposit, withdrawal, transfer_in, transfer_out
    
    amount = Column(Numeric(18, 4), nullable=False)
    balance_after = Column(Numeric(18, 4), nullable=False)
    
    reference_type = Column(String(50), nullable=True)  # payment, manual, transfer
    reference_id = Column(Integer, nullable=True)  # ID of related record
    
    description = Column(Text, nullable=True)
    
    transaction_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    account = relationship("Account", back_populates="transactions")

