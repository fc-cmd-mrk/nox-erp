"""
Companies Router
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.auth import require_permission
from app.models.user import User
from app.models.company import Company, Warehouse, SubWarehouse
from app.models.audit_log import AuditLog
from app.schemas.company import (
    CompanySchema, CompanyCreate, CompanyUpdate, CompanyWithWarehouses,
    WarehouseSchema, WarehouseCreate, WarehouseUpdate, WarehouseWithSubs,
    SubWarehouseSchema, SubWarehouseCreate, SubWarehouseUpdate
)

router = APIRouter(prefix="/companies", tags=["Companies"])


# ============ COMPANIES ============

@router.get("", response_model=List[CompanyWithWarehouses])
async def list_companies(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_permission("companies", "view")),
    db: Session = Depends(get_db)
):
    """List all companies"""
    companies = db.query(Company).offset(skip).limit(limit).all()
    return companies


@router.get("/{company_id}", response_model=CompanyWithWarehouses)
async def get_company(
    company_id: int,
    current_user: User = Depends(require_permission("companies", "view")),
    db: Session = Depends(get_db)
):
    """Get company by ID"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Şirket bulunamadı")
    return company


@router.post("", response_model=CompanySchema)
async def create_company(
    company_data: CompanyCreate,
    req: Request,
    current_user: User = Depends(require_permission("companies", "create")),
    db: Session = Depends(get_db)
):
    """Create new company"""
    if db.query(Company).filter(Company.code == company_data.code).first():
        raise HTTPException(status_code=400, detail="Bu şirket kodu zaten kullanılıyor")
    
    company = Company(**company_data.model_dump())
    db.add(company)
    db.commit()
    db.refresh(company)
    
    # Create default warehouse
    warehouse = Warehouse(
        company_id=company.id,
        code="MAIN",
        name="Ana Depo",
        is_default=True
    )
    db.add(warehouse)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        module="companies",
        record_id=company.id,
        record_type="Company",
        new_values={"code": company.code, "name": company.name},
        description=f"Şirket oluşturuldu: {company.name}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return company


@router.put("/{company_id}", response_model=CompanySchema)
async def update_company(
    company_id: int,
    company_data: CompanyUpdate,
    req: Request,
    current_user: User = Depends(require_permission("companies", "edit")),
    db: Session = Depends(get_db)
):
    """Update company"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Şirket bulunamadı")
    
    old_values = {"code": company.code, "name": company.name}
    
    for field, value in company_data.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="update",
        module="companies",
        record_id=company.id,
        record_type="Company",
        old_values=old_values,
        new_values={"code": company.code, "name": company.name},
        description=f"Şirket güncellendi: {company.name}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    db.refresh(company)
    
    return company


@router.delete("/{company_id}")
async def delete_company(
    company_id: int,
    req: Request,
    current_user: User = Depends(require_permission("companies", "delete")),
    db: Session = Depends(get_db)
):
    """Delete company"""
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Şirket bulunamadı")
    
    name = company.name
    db.delete(company)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        module="companies",
        record_id=company_id,
        record_type="Company",
        old_values={"name": name},
        description=f"Şirket silindi: {name}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return {"message": "Şirket silindi"}


# ============ WAREHOUSES ============

@router.get("/{company_id}/warehouses", response_model=List[WarehouseWithSubs])
async def list_warehouses(
    company_id: int,
    current_user: User = Depends(require_permission("companies", "view")),
    db: Session = Depends(get_db)
):
    """List warehouses for a company"""
    warehouses = db.query(Warehouse).filter(Warehouse.company_id == company_id).all()
    return warehouses


@router.post("/warehouses", response_model=WarehouseSchema)
async def create_warehouse(
    warehouse_data: WarehouseCreate,
    req: Request,
    current_user: User = Depends(require_permission("companies", "create")),
    db: Session = Depends(get_db)
):
    """Create new warehouse"""
    warehouse = Warehouse(**warehouse_data.model_dump())
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        module="warehouses",
        record_id=warehouse.id,
        record_type="Warehouse",
        new_values={"code": warehouse.code, "name": warehouse.name},
        description=f"Depo oluşturuldu: {warehouse.name}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return warehouse


@router.put("/warehouses/{warehouse_id}", response_model=WarehouseSchema)
async def update_warehouse(
    warehouse_id: int,
    warehouse_data: WarehouseUpdate,
    current_user: User = Depends(require_permission("companies", "edit")),
    db: Session = Depends(get_db)
):
    """Update warehouse"""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Depo bulunamadı")
    
    for field, value in warehouse_data.model_dump(exclude_unset=True).items():
        setattr(warehouse, field, value)
    
    db.commit()
    db.refresh(warehouse)
    return warehouse


@router.delete("/warehouses/{warehouse_id}")
async def delete_warehouse(
    warehouse_id: int,
    current_user: User = Depends(require_permission("companies", "delete")),
    db: Session = Depends(get_db)
):
    """Delete warehouse"""
    warehouse = db.query(Warehouse).filter(Warehouse.id == warehouse_id).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Depo bulunamadı")
    
    db.delete(warehouse)
    db.commit()
    return {"message": "Depo silindi"}


# ============ SUB-WAREHOUSES ============

@router.post("/warehouses/sub", response_model=SubWarehouseSchema)
async def create_sub_warehouse(
    sub_data: SubWarehouseCreate,
    current_user: User = Depends(require_permission("companies", "create")),
    db: Session = Depends(get_db)
):
    """Create sub-warehouse"""
    sub = SubWarehouse(**sub_data.model_dump())
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.put("/warehouses/sub/{sub_id}", response_model=SubWarehouseSchema)
async def update_sub_warehouse(
    sub_id: int,
    sub_data: SubWarehouseUpdate,
    current_user: User = Depends(require_permission("companies", "edit")),
    db: Session = Depends(get_db)
):
    """Update sub-warehouse"""
    sub = db.query(SubWarehouse).filter(SubWarehouse.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Alt depo bulunamadı")
    
    for field, value in sub_data.model_dump(exclude_unset=True).items():
        setattr(sub, field, value)
    
    db.commit()
    db.refresh(sub)
    return sub


@router.delete("/warehouses/sub/{sub_id}")
async def delete_sub_warehouse(
    sub_id: int,
    current_user: User = Depends(require_permission("companies", "delete")),
    db: Session = Depends(get_db)
):
    """Delete sub-warehouse"""
    sub = db.query(SubWarehouse).filter(SubWarehouse.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Alt depo bulunamadı")
    
    db.delete(sub)
    db.commit()
    return {"message": "Alt depo silindi"}

