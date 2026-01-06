"""
Contacts Router
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.auth import require_permission
from app.models.user import User
from app.models.contact import Contact, ContactAccount
from app.models.audit_log import AuditLog
from app.schemas.contact import (
    ContactSchema, ContactCreate, ContactUpdate, ContactWithAccounts,
    ContactAccountSchema, ContactAccountCreate
)

router = APIRouter(prefix="/contacts", tags=["Contacts"])


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


@router.get("/{contact_id}", response_model=ContactWithAccounts)
async def get_contact(
    contact_id: int,
    current_user: User = Depends(require_permission("contacts", "view")),
    db: Session = Depends(get_db)
):
    """Get contact by ID"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Cari bulunamadı")
    return contact


@router.post("", response_model=ContactSchema)
async def create_contact(
    contact_data: ContactCreate,
    req: Request,
    current_user: User = Depends(require_permission("contacts", "create")),
    db: Session = Depends(get_db)
):
    """Create new contact"""
    if db.query(Contact).filter(Contact.code == contact_data.code).first():
        raise HTTPException(status_code=400, detail="Bu cari kodu zaten kullanılıyor")
    
    contact = Contact(**contact_data.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)
    
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
        new_values={"code": contact.code, "name": contact.name},
        description=f"Cari oluşturuldu: {contact.name}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return contact


@router.put("/{contact_id}", response_model=ContactSchema)
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
    
    for field, value in contact_data.model_dump(exclude_unset=True).items():
        setattr(contact, field, value)
    
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

