"""
Transaction Models (Sales & Purchases)
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class TransactionType(enum.Enum):
    SALE = "sale"
    PURCHASE = "purchase"
    SALE_RETURN = "sale_return"
    PURCHASE_RETURN = "purchase_return"


class Transaction(Base):
    """Sales and Purchase transactions"""
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Transaction identifiers
    transaction_no = Column(String(50), unique=True, nullable=False, index=True)
    external_id = Column(String(50), nullable=True, index=True)  # ID from external system (epinid, siparisid)
    
    transaction_type = Column(String(20), nullable=False)  # sale, purchase, sale_return, purchase_return
    
    # Related entities
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    
    # Dates
    transaction_date = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    due_date = Column(DateTime(timezone=True), nullable=True)  # For credit sales/purchases
    
    # Amounts
    currency = Column(String(10), default="TRY")
    subtotal = Column(Numeric(18, 4), default=0)
    tax_amount = Column(Numeric(18, 4), default=0)
    discount_amount = Column(Numeric(18, 4), default=0)
    total_amount = Column(Numeric(18, 4), default=0)
    
    # Payment status
    paid_amount = Column(Numeric(18, 4), default=0)
    is_paid = Column(Boolean, default=False)
    
    # Exchange rate at transaction time
    exchange_rate = Column(Numeric(18, 6), default=1)  # To base currency
    
    notes = Column(Text, nullable=True)
    
    status = Column(String(20), default="completed")  # draft, completed, cancelled
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="transactions")
    contact = relationship("Contact", back_populates="transactions")
    items = relationship("TransactionItem", back_populates="transaction", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="transaction")


class TransactionItem(Base):
    """Transaction line items"""
    __tablename__ = "transaction_items"
    
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    
    # Warehouse tracking
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=True)
    sub_warehouse_id = Column(Integer, ForeignKey("sub_warehouses.id"), nullable=True)
    
    # Item details
    description = Column(String(200), nullable=True)
    quantity = Column(Numeric(18, 4), default=1)
    unit_price = Column(Numeric(18, 4), nullable=False)
    cost_price = Column(Numeric(18, 4), default=0)  # For profit calculation
    
    discount_percent = Column(Numeric(5, 2), default=0)
    discount_amount = Column(Numeric(18, 4), default=0)
    tax_percent = Column(Numeric(5, 2), default=0)
    tax_amount = Column(Numeric(18, 4), default=0)
    
    total_amount = Column(Numeric(18, 4), default=0)
    
    # Profit tracking
    profit = Column(Numeric(18, 4), default=0)  # unit_price - cost_price
    profit_margin = Column(Numeric(8, 4), default=0)  # profit percentage
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    transaction = relationship("Transaction", back_populates="items")
    product = relationship("Product", back_populates="transaction_items")
    warehouse = relationship("Warehouse", back_populates="transaction_items")
    sub_warehouse = relationship("SubWarehouse", back_populates="transaction_items")

