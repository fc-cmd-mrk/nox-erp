"""
User Schemas
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# Role Schemas
class RoleBase(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class RoleSchema(RoleBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Permission Schemas
class PermissionSchema(BaseModel):
    id: int
    module: str
    action: str
    name: str
    display_name: str
    
    class Config:
        from_attributes = True


class RolePermissionSchema(BaseModel):
    id: int
    role_id: int
    permission_id: int
    permission: PermissionSchema
    
    class Config:
        from_attributes = True


class RoleWithPermissions(RoleSchema):
    permissions: List[RolePermissionSchema] = []


# User Schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str
    role_id: int
    company_id: Optional[int] = None
    is_superuser: bool = False


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role_id: Optional[int] = None
    company_id: Optional[int] = None
    is_active: Optional[bool] = None


class UserSchema(UserBase):
    id: int
    role_id: int
    company_id: Optional[int]
    is_active: bool
    is_superuser: bool
    last_login: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserWithRole(UserSchema):
    role: RoleSchema


# Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserSchema


class TokenData(BaseModel):
    username: Optional[str] = None

