"""
Company & Warehouse Models
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Company(Base):
    """Companies (different countries/entities)"""
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False)  # AG, DI, PA, etc.
    name = Column(String(100), nullable=False)
    full_name = Column(String(200), nullable=True)
    country = Column(String(50), nullable=False)
    country_code = Column(String(5), nullable=True)  # TR, AE, CY, EE
    
    tax_number = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)
    
    default_currency = Column(String(10), default="TRY")
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    warehouses = relationship("Warehouse", back_populates="company", cascade="all, delete-orphan")
    users = relationship("User", back_populates="company")
    accounts = relationship("Account", back_populates="company")
    transactions = relationship("Transaction", back_populates="company")
    contacts = relationship("Contact", secondary="contact_companies", back_populates="companies")


class Warehouse(Base):
    """Virtual warehouses for each company"""
    __tablename__ = "warehouses"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    code = Column(String(20), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="warehouses")
    sub_warehouses = relationship("SubWarehouse", back_populates="warehouse", cascade="all, delete-orphan")
    transaction_items = relationship("TransactionItem", back_populates="warehouse")


class SubWarehouse(Base):
    """Sub-warehouses under main warehouses"""
    __tablename__ = "sub_warehouses"
    
    id = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False)
    
    code = Column(String(20), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    warehouse = relationship("Warehouse", back_populates="sub_warehouses")
    transaction_items = relationship("TransactionItem", back_populates="sub_warehouse")

