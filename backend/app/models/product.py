"""
Product Models
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ProductCategory(Base):
    """Product categories"""
    __tablename__ = "product_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    parent_id = Column(Integer, ForeignKey("product_categories.id"), nullable=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    products = relationship("Product", back_populates="category")
    children = relationship("ProductCategory", backref="parent", remote_side=[id])


class Product(Base):
    """Products"""
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    model_code = Column(String(50), unique=True, nullable=False, index=True)  # ep398451470
    name = Column(String(200), nullable=False, index=True)
    
    category_id = Column(Integer, ForeignKey("product_categories.id"), nullable=True)
    
    # Pricing
    default_sale_price = Column(Numeric(18, 4), default=0)
    default_currency = Column(String(10), default="TRY")
    
    # Stock tracking
    track_stock = Column(Boolean, default=False)  # For digital products usually False
    current_stock = Column(Integer, default=0)
    
    # Product info
    description = Column(Text, nullable=True)
    barcode = Column(String(50), nullable=True)
    unit = Column(String(20), default="Adet")
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    category = relationship("ProductCategory", back_populates="products")
    costs = relationship("ProductCost", back_populates="product", cascade="all, delete-orphan")
    transaction_items = relationship("TransactionItem", back_populates="product")


class ProductCost(Base):
    """Product costs by supplier"""
    __tablename__ = "product_costs"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    
    cost = Column(Numeric(18, 4), nullable=False)
    currency = Column(String(10), default="TRY")
    
    # Validity period
    valid_from = Column(DateTime(timezone=True), nullable=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="costs")
    supplier = relationship("Contact", back_populates="product_costs")

