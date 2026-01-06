"""
Accounts Router
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from datetime import datetime
from app.database import get_db
from app.auth import require_permission
from app.models.user import User
from app.models.account import Account, AccountTransaction
from app.models.audit_log import AuditLog
from app.schemas.account import (
    AccountSchema, AccountCreate, AccountUpdate, AccountWithTransactions,
    AccountTransactionSchema, AccountTransactionCreate
)

router = APIRouter(prefix="/accounts", tags=["Accounts"])


@router.get("", response_model=List[AccountSchema])
async def list_accounts(
    company_id: Optional[int] = None,
    account_type: Optional[str] = None,
    current_user: User = Depends(require_permission("accounts", "view")),
    db: Session = Depends(get_db)
):
    """List all accounts"""
    query = db.query(Account)
    
    if company_id:
        query = query.filter(Account.company_id == company_id)
    
    if account_type:
        query = query.filter(Account.account_type == account_type)
    
    accounts = query.all()
    return accounts


@router.get("/{account_id}", response_model=AccountWithTransactions)
async def get_account(
    account_id: int,
    current_user: User = Depends(require_permission("accounts", "view")),
    db: Session = Depends(get_db)
):
    """Get account by ID with transactions"""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı")
    return account


@router.post("", response_model=AccountSchema)
async def create_account(
    account_data: AccountCreate,
    req: Request,
    current_user: User = Depends(require_permission("accounts", "create")),
    db: Session = Depends(get_db)
):
    """Create new account"""
    account = Account(**account_data.model_dump())
    db.add(account)
    db.commit()
    db.refresh(account)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        module="accounts",
        record_id=account.id,
        record_type="Account",
        new_values={"code": account.code, "name": account.name},
        description=f"Hesap oluşturuldu: {account.name}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return account


@router.put("/{account_id}", response_model=AccountSchema)
async def update_account(
    account_id: int,
    account_data: AccountUpdate,
    req: Request,
    current_user: User = Depends(require_permission("accounts", "edit")),
    db: Session = Depends(get_db)
):
    """Update account"""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı")
    
    for field, value in account_data.model_dump(exclude_unset=True).items():
        setattr(account, field, value)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="update",
        module="accounts",
        record_id=account.id,
        record_type="Account",
        description=f"Hesap güncellendi: {account.name}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    db.refresh(account)
    
    return account


@router.delete("/{account_id}")
async def delete_account(
    account_id: int,
    req: Request,
    current_user: User = Depends(require_permission("accounts", "delete")),
    db: Session = Depends(get_db)
):
    """Delete account"""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı")
    
    name = account.name
    db.delete(account)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        module="accounts",
        record_id=account_id,
        record_type="Account",
        old_values={"name": name},
        description=f"Hesap silindi: {name}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return {"message": "Hesap silindi"}


# ============ ACCOUNT TRANSACTIONS ============

@router.post("/{account_id}/transactions", response_model=AccountTransactionSchema)
async def create_account_transaction(
    account_id: int,
    trans_data: AccountTransactionCreate,
    req: Request,
    current_user: User = Depends(require_permission("accounts", "edit")),
    db: Session = Depends(get_db)
):
    """Create account transaction (deposit/withdrawal)"""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı")
    
    # Update balance
    if trans_data.transaction_type in ["deposit", "transfer_in"]:
        account.balance += trans_data.amount
    else:  # withdrawal, transfer_out
        account.balance -= trans_data.amount
    
    # Create transaction record
    trans_dict = trans_data.model_dump()
    trans_dict["account_id"] = account_id
    trans_dict["balance_after"] = account.balance
    
    if not trans_dict.get("transaction_date"):
        trans_dict["transaction_date"] = datetime.utcnow()
    
    trans = AccountTransaction(**trans_dict)
    db.add(trans)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        module="account_transactions",
        record_id=trans.id,
        record_type="AccountTransaction",
        new_values={"type": trans_data.transaction_type, "amount": float(trans_data.amount)},
        description=f"Hesap hareketi: {account.name} - {trans_data.transaction_type}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    db.refresh(trans)
    
    return trans


@router.get("/{account_id}/transactions", response_model=List[AccountTransactionSchema])
async def list_account_transactions(
    account_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_permission("accounts", "view")),
    db: Session = Depends(get_db)
):
    """List account transactions"""
    transactions = db.query(AccountTransaction).filter(
        AccountTransaction.account_id == account_id
    ).order_by(AccountTransaction.transaction_date.desc()).offset(skip).limit(limit).all()
    
    return transactions


# ============ TRANSFER ============

@router.post("/transfer")
async def transfer_between_accounts(
    from_account_id: int,
    to_account_id: int,
    amount: Decimal,
    description: Optional[str] = None,
    req: Request = None,
    current_user: User = Depends(require_permission("accounts", "edit")),
    db: Session = Depends(get_db)
):
    """Transfer money between accounts"""
    from_account = db.query(Account).filter(Account.id == from_account_id).first()
    to_account = db.query(Account).filter(Account.id == to_account_id).first()
    
    if not from_account or not to_account:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı")
    
    if from_account.currency != to_account.currency:
        raise HTTPException(status_code=400, detail="Farklı para birimli hesaplar arası transfer için kur belirtilmeli")
    
    if from_account.balance < amount:
        raise HTTPException(status_code=400, detail="Yetersiz bakiye")
    
    # Withdraw from source
    from_account.balance -= amount
    from_trans = AccountTransaction(
        account_id=from_account_id,
        transaction_type="transfer_out",
        amount=amount,
        balance_after=from_account.balance,
        reference_type="transfer",
        reference_id=to_account_id,
        description=f"Transfer to {to_account.name}: {description or ''}",
        transaction_date=datetime.utcnow()
    )
    db.add(from_trans)
    
    # Deposit to target
    to_account.balance += amount
    to_trans = AccountTransaction(
        account_id=to_account_id,
        transaction_type="transfer_in",
        amount=amount,
        balance_after=to_account.balance,
        reference_type="transfer",
        reference_id=from_account_id,
        description=f"Transfer from {from_account.name}: {description or ''}",
        transaction_date=datetime.utcnow()
    )
    db.add(to_trans)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="transfer",
        module="accounts",
        description=f"Transfer: {from_account.name} -> {to_account.name}, {amount}",
        ip_address=req.client.host if req and req.client else None
    )
    db.add(log)
    db.commit()
    
    return {
        "message": "Transfer başarılı",
        "from_balance": float(from_account.balance),
        "to_balance": float(to_account.balance)
    }

