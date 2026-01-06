"""
Audit Log Model - All system activities
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class AuditLog(Base):
    """Audit log for all system activities"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Who
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String(50), nullable=True)  # Store username for deleted users
    ip_address = Column(String(50), nullable=True)
    
    # What
    action = Column(String(50), nullable=False)  # create, update, delete, login, logout, export, import
    module = Column(String(50), nullable=False)  # users, companies, contacts, products, transactions, payments
    
    # Which record
    record_id = Column(Integer, nullable=True)
    record_type = Column(String(50), nullable=True)
    
    # Details
    old_values = Column(JSON, nullable=True)  # Previous state
    new_values = Column(JSON, nullable=True)  # New state
    
    description = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")

