"""
Contacts Router
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.auth import require_permission, get_current_user
from app.models.user import User
from app.models.contact import Contact, ContactAccount
from app.models.company import Company
from app.models.audit_log import AuditLog
from app.schemas.contact import (
    ContactSchema, ContactCreate, ContactUpdate, ContactWithAccounts,
    ContactAccountSchema, ContactAccountCreate, ContactWithCompanies, ContactDetail
)
from app.services.vkn_query import query_tax_info, validate_vkn, validate_tckn

router = APIRouter(prefix="/contacts", tags=["Contacts"])


# ============ VKN/TC SORGULAMA ============

@router.get("/query/tax-info/{tax_number}")
async def query_tax_information(
    tax_number: str,
    current_user: User = Depends(get_current_user)
):
    """
    VKN veya TC Kimlik Numarası ile firma/kişi bilgilerini sorgular
    """
    # Numara doğrulama
    clean_number = ''.join(filter(str.isdigit, tax_number))
    
    if len(clean_number) == 10:
        if not validate_vkn(clean_number):
            raise HTTPException(status_code=400, detail="Geçersiz VKN formatı")
    elif len(clean_number) == 11:
        if not validate_tckn(clean_number):
            raise HTTPException(status_code=400, detail="Geçersiz TC Kimlik Numarası formatı")
    else:
        raise HTTPException(status_code=400, detail="VKN 10 hane, TCKN 11 hane olmalıdır")
    
    result = await query_tax_info(clean_number)
    
    if not result.get("success"):
        # Hata durumunda da dönelim ama success=false ile
        return result
    
    return result


@router.get("", response_model=List[ContactWithAccounts])
async def list_contacts(
    skip: int = 0,
    limit: int = 100,
    contact_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_permission("contacts", "view")),
    db: Session = Depends(get_db)
):
    """List all contacts"""
    query = db.query(Contact)
    
    if contact_type:
        query = query.filter(Contact.contact_type == contact_type)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Contact.name.ilike(search_term)) | 
            (Contact.code.ilike(search_term)) |
            (Contact.company_name.ilike(search_term))
        )
    
    contacts = query.offset(skip).limit(limit).all()
    return contacts


@router.get("/suppliers", response_model=List[ContactSchema])
async def list_suppliers(
    current_user: User = Depends(require_permission("contacts", "view")),
    db: Session = Depends(get_db)
):
    """List suppliers only"""
    contacts = db.query(Contact).filter(
        Contact.contact_type.in_(["supplier", "both"])
    ).all()
    return contacts


@router.get("/customers", response_model=List[ContactSchema])
async def list_customers(
    current_user: User = Depends(require_permission("contacts", "view")),
    db: Session = Depends(get_db)
):
    """List customers only"""
    contacts = db.query(Contact).filter(
        Contact.contact_type.in_(["customer", "both"])
    ).all()
    return contacts


@router.get("/{contact_id}", response_model=ContactDetail)
async def get_contact(
    contact_id: int,
    current_user: User = Depends(require_permission("contacts", "view")),
    db: Session = Depends(get_db)
):
    """Get contact by ID with payments and transactions"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Cari bulunamadı")
    
    # Eager load payments and transactions if not already loaded
    # The ORM relationships should handle this
    return contact


@router.post("", response_model=ContactWithCompanies)
async def create_contact(
    contact_data: ContactCreate,
    req: Request,
    current_user: User = Depends(require_permission("contacts", "create")),
    db: Session = Depends(get_db)
):
    """Create new contact"""
    if db.query(Contact).filter(Contact.code == contact_data.code).first():
        raise HTTPException(status_code=400, detail="Bu cari kodu zaten kullanılıyor")
    
    # company_ids ayrı al
    company_ids = contact_data.company_ids
    contact_dict = contact_data.model_dump(exclude={"company_ids"})
    
    contact = Contact(**contact_dict)
    db.add(contact)
    db.flush()
    
    # Şirket ilişkilerini ekle
    if company_ids:
        companies = db.query(Company).filter(Company.id.in_(company_ids)).all()
        contact.companies = companies
    
    # Create default account with default currency
    account = ContactAccount(
        contact_id=contact.id,
        currency=contact.default_currency,
        balance=0
    )
    db.add(account)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        module="contacts",
        record_id=contact.id,
        record_type="Contact",
        new_values={"code": contact.code, "name": contact.name, "companies": company_ids},
        description=f"Cari oluşturuldu: {contact.name}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    db.refresh(contact)
    
    return contact


@router.put("/{contact_id}", response_model=ContactWithCompanies)
async def update_contact(
    contact_id: int,
    contact_data: ContactUpdate,
    req: Request,
    current_user: User = Depends(require_permission("contacts", "edit")),
    db: Session = Depends(get_db)
):
    """Update contact"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Cari bulunamadı")
    
    old_values = {"code": contact.code, "name": contact.name}
    
    update_data = contact_data.model_dump(exclude_unset=True)
    
    # company_ids ayrı işle
    company_ids = update_data.pop("company_ids", None)
    
    for field, value in update_data.items():
        setattr(contact, field, value)
    
    # Şirket ilişkilerini güncelle
    if company_ids is not None:
        companies = db.query(Company).filter(Company.id.in_(company_ids)).all()
        contact.companies = companies
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="update",
        module="contacts",
        record_id=contact.id,
        record_type="Contact",
        old_values=old_values,
        new_values={"code": contact.code, "name": contact.name},
        description=f"Cari güncellendi: {contact.name}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    db.refresh(contact)
    
    return contact


# ============ COMPANY RELATIONS ============

@router.post("/{contact_id}/companies/{company_id}")
async def add_company_to_contact(
    contact_id: int,
    company_id: int,
    current_user: User = Depends(require_permission("contacts", "edit")),
    db: Session = Depends(get_db)
):
    """Cariye şirket ekle"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Cari bulunamadı")
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Şirket bulunamadı")
    
    if company in contact.companies:
        raise HTTPException(status_code=400, detail="Bu şirket zaten ekli")
    
    contact.companies.append(company)
    db.commit()
    
    return {"message": f"{company.name} şirketi cariye eklendi"}


@router.delete("/{contact_id}/companies/{company_id}")
async def remove_company_from_contact(
    contact_id: int,
    company_id: int,
    current_user: User = Depends(require_permission("contacts", "edit")),
    db: Session = Depends(get_db)
):
    """Cariden şirket çıkar"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Cari bulunamadı")
    
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Şirket bulunamadı")
    
    if company not in contact.companies:
        raise HTTPException(status_code=400, detail="Bu şirket zaten ekli değil")
    
    contact.companies.remove(company)
    db.commit()
    
    return {"message": f"{company.name} şirketi cariden çıkarıldı"}


@router.get("/{contact_id}/companies")
async def get_contact_companies(
    contact_id: int,
    current_user: User = Depends(require_permission("contacts", "view")),
    db: Session = Depends(get_db)
):
    """Carinin bağlı şirketlerini getir"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Cari bulunamadı")
    
    return [
        {"id": c.id, "code": c.code, "name": c.name, "country": c.country}
        for c in contact.companies
    ]


@router.delete("/{contact_id}")
async def delete_contact(
    contact_id: int,
    req: Request,
    current_user: User = Depends(require_permission("contacts", "delete")),
    db: Session = Depends(get_db)
):
    """Delete contact"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Cari bulunamadı")
    
    name = contact.name
    db.delete(contact)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        module="contacts",
        record_id=contact_id,
        record_type="Contact",
        old_values={"name": name},
        description=f"Cari silindi: {name}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return {"message": "Cari silindi"}


# ============ CONTACT ACCOUNTS ============

@router.post("/{contact_id}/accounts", response_model=ContactAccountSchema)
async def add_contact_account(
    contact_id: int,
    currency: str,
    current_user: User = Depends(require_permission("contacts", "edit")),
    db: Session = Depends(get_db)
):
    """Add new currency account to contact"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Cari bulunamadı")
    
    # Check if account exists
    existing = db.query(ContactAccount).filter(
        ContactAccount.contact_id == contact_id,
        ContactAccount.currency == currency
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Bu para birimi hesabı zaten var")
    
    account = ContactAccount(
        contact_id=contact_id,
        currency=currency,
        balance=0
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    
    return account


@router.get("/{contact_id}/balance")
async def get_contact_balance(
    contact_id: int,
    current_user: User = Depends(require_permission("contacts", "view")),
    db: Session = Depends(get_db)
):
    """Get contact balances in all currencies"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Cari bulunamadı")
    
    balances = {}
    for account in contact.accounts:
        balances[account.currency] = float(account.balance)
    
    return {
        "contact_id": contact_id,
        "contact_name": contact.name,
        "balances": balances
    }

