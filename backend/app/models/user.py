"""
User & Authentication Models
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Table, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Role(Base):
    """User roles (Admin, Muhasebe, Satış, etc.)"""
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="role")
    permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")


class Permission(Base):
    """System permissions"""
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    module = Column(String(50), nullable=False)  # companies, contacts, products, etc.
    action = Column(String(50), nullable=False)  # view, create, edit, delete
    name = Column(String(100), nullable=False)   # companies.view
    display_name = Column(String(200), nullable=False)
    
    # Relationships
    role_permissions = relationship("RolePermission", back_populates="permission")


class RolePermission(Base):
    """Role-Permission mapping"""
    __tablename__ = "role_permissions"
    
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission", back_populates="role_permissions")


class User(Base):
    """System users"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)  # Optional company assignment
    
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    role = relationship("Role", back_populates="users")
    company = relationship("Company", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")

