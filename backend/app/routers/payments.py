"""
Payments Router
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from app.database import get_db
from app.auth import require_permission
from app.models.user import User
from app.models.payment import Payment
from app.models.transaction import Transaction
from app.models.contact import ContactAccount
from app.models.account import Account, AccountTransaction
from app.models.audit_log import AuditLog
from app.schemas.payment import PaymentSchema, PaymentCreate, PaymentUpdate

router = APIRouter(prefix="/payments", tags=["Payments"])


def generate_payment_no(db: Session, payment_type: str) -> str:
    """Generate unique payment number"""
    prefix = "PMI" if payment_type == "incoming" else "PMO"
    today = datetime.now().strftime("%Y%m%d")
    
    last = db.query(Payment).filter(
        Payment.payment_no.like(f"{prefix}{today}%")
    ).order_by(Payment.id.desc()).first()
    
    if last:
        last_num = int(last.payment_no[-4:])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}{today}{new_num:04d}"


@router.get("", response_model=List[PaymentSchema])
async def list_payments(
    skip: int = 0,
    limit: int = 100,
    payment_type: Optional[str] = None,
    payment_channel: Optional[str] = None,
    contact_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(require_permission("payments", "view")),
    db: Session = Depends(get_db)
):
    """List all payments"""
    query = db.query(Payment)
    
    if payment_type:
        query = query.filter(Payment.payment_type == payment_type)
    
    if payment_channel:
        query = query.filter(Payment.payment_channel == payment_channel)
    
    if contact_id:
        query = query.filter(Payment.contact_id == contact_id)
    
    if start_date:
        query = query.filter(Payment.payment_date >= start_date)
    
    if end_date:
        query = query.filter(Payment.payment_date <= end_date)
    
    payments = query.order_by(Payment.payment_date.desc()).offset(skip).limit(limit).all()
    return payments


@router.get("/{payment_id}", response_model=PaymentSchema)
async def get_payment(
    payment_id: int,
    current_user: User = Depends(require_permission("payments", "view")),
    db: Session = Depends(get_db)
):
    """Get payment by ID"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Ödeme bulunamadı")
    return payment


@router.post("", response_model=PaymentSchema)
async def create_payment(
    payment_data: PaymentCreate,
    req: Request,
    current_user: User = Depends(require_permission("payments", "create")),
    db: Session = Depends(get_db)
):
    """Create new payment"""
    payment_no = generate_payment_no(db, payment_data.payment_type)
    
    payment_dict = payment_data.model_dump()
    payment_dict["payment_no"] = payment_no
    
    if not payment_dict.get("payment_date"):
        payment_dict["payment_date"] = datetime.utcnow()
    
    # Calculate base amount
    payment_dict["base_amount"] = payment_data.amount * payment_data.exchange_rate
    
    payment = Payment(**payment_dict)
    db.add(payment)
    db.flush()
    
    # Update transaction paid amount
    if payment_data.transaction_id:
        transaction = db.query(Transaction).filter(Transaction.id == payment_data.transaction_id).first()
        if transaction:
            transaction.paid_amount += payment_data.amount
            if transaction.paid_amount >= transaction.total_amount:
                transaction.is_paid = True
    
    # Update contact balance
    if payment_data.contact_id:
        contact_account = db.query(ContactAccount).filter(
            ContactAccount.contact_id == payment_data.contact_id,
            ContactAccount.currency == payment_data.currency
        ).first()
        
        if contact_account:
            if payment_data.payment_type == "incoming":
                contact_account.balance -= payment_data.amount  # They paid us
            else:
                contact_account.balance += payment_data.amount  # We paid them
    
    # Update account balance
    if payment_data.account_id:
        account = db.query(Account).filter(Account.id == payment_data.account_id).first()
        if account:
            if payment_data.payment_type == "incoming":
                account.balance += payment_data.amount
                trans_type = "deposit"
            else:
                account.balance -= payment_data.amount
                trans_type = "withdrawal"
            
            # Create account transaction
            acc_trans = AccountTransaction(
                account_id=account.id,
                transaction_type=trans_type,
                amount=payment_data.amount,
                balance_after=account.balance,
                reference_type="payment",
                reference_id=payment.id,
                description=f"Payment: {payment_no}",
                transaction_date=payment.payment_date
            )
            db.add(acc_trans)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        module="payments",
        record_id=payment.id,
        record_type="Payment",
        new_values={"payment_no": payment_no, "amount": float(payment_data.amount)},
        description=f"Ödeme oluşturuldu: {payment_no}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    db.refresh(payment)
    
    return payment


@router.put("/{payment_id}", response_model=PaymentSchema)
async def update_payment(
    payment_id: int,
    payment_data: PaymentUpdate,
    req: Request,
    current_user: User = Depends(require_permission("payments", "edit")),
    db: Session = Depends(get_db)
):
    """Update payment"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Ödeme bulunamadı")
    
    for field, value in payment_data.model_dump(exclude_unset=True).items():
        setattr(payment, field, value)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="update",
        module="payments",
        record_id=payment.id,
        record_type="Payment",
        description=f"Ödeme güncellendi: {payment.payment_no}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    db.refresh(payment)
    
    return payment


@router.delete("/{payment_id}")
async def delete_payment(
    payment_id: int,
    req: Request,
    current_user: User = Depends(require_permission("payments", "delete")),
    db: Session = Depends(get_db)
):
    """Delete payment"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Ödeme bulunamadı")
    
    # Reverse transaction paid amount
    if payment.transaction_id:
        transaction = db.query(Transaction).filter(Transaction.id == payment.transaction_id).first()
        if transaction:
            transaction.paid_amount -= payment.amount
            transaction.is_paid = False
    
    # Reverse contact balance
    if payment.contact_id:
        contact_account = db.query(ContactAccount).filter(
            ContactAccount.contact_id == payment.contact_id,
            ContactAccount.currency == payment.currency
        ).first()
        
        if contact_account:
            if payment.payment_type == "incoming":
                contact_account.balance += payment.amount
            else:
                contact_account.balance -= payment.amount
    
    # Reverse account balance
    if payment.account_id:
        account = db.query(Account).filter(Account.id == payment.account_id).first()
        if account:
            if payment.payment_type == "incoming":
                account.balance -= payment.amount
            else:
                account.balance += payment.amount
    
    payment_no = payment.payment_no
    db.delete(payment)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        module="payments",
        record_id=payment_id,
        record_type="Payment",
        old_values={"payment_no": payment_no},
        description=f"Ödeme silindi: {payment_no}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return {"message": "Ödeme silindi"}

