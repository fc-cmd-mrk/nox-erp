"""
Company Schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# Warehouse Schemas
class SubWarehouseBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None


class SubWarehouseCreate(SubWarehouseBase):
    warehouse_id: int


class SubWarehouseUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class SubWarehouseSchema(SubWarehouseBase):
    id: int
    warehouse_id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class WarehouseBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None


class WarehouseCreate(WarehouseBase):
    company_id: int
    is_default: bool = False


class WarehouseUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class WarehouseSchema(WarehouseBase):
    id: int
    company_id: int
    is_default: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class WarehouseWithSubs(WarehouseSchema):
    sub_warehouses: List[SubWarehouseSchema] = []


# Company Schemas
class CompanyBase(BaseModel):
    code: str
    name: str
    full_name: Optional[str] = None
    country: str
    country_code: Optional[str] = None


class CompanyCreate(CompanyBase):
    tax_number: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    default_currency: str = "TRY"


class CompanyUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    full_name: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    tax_number: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    default_currency: Optional[str] = None
    is_active: Optional[bool] = None


class CompanySchema(CompanyBase):
    id: int
    tax_number: Optional[str]
    address: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    default_currency: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class CompanyWithWarehouses(CompanySchema):
    warehouses: List[WarehouseWithSubs] = []

