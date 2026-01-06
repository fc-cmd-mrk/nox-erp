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


# ============ TRANSFER (VİRMAN) ============

from pydantic import BaseModel

class TransferCreate(BaseModel):
    """Transfer between accounts"""
    from_account_id: int
    to_account_id: int
    from_amount: float
    to_amount: Optional[float] = None  # Calculated if not provided
    exchange_rate: Optional[float] = None
    description: Optional[str] = None
    reference_no: Optional[str] = None


@router.post("/transfer")
async def create_transfer(
    transfer_data: TransferCreate,
    req: Request,
    current_user: User = Depends(require_permission("payments", "create")),
    db: Session = Depends(get_db)
):
    """Hesaplar arası virman (transfer). Farklı para birimleri arası dönüşüm destekler."""
    
    # Get source and destination accounts
    from_account = db.query(Account).filter(Account.id == transfer_data.from_account_id).first()
    to_account = db.query(Account).filter(Account.id == transfer_data.to_account_id).first()
    
    if not from_account:
        raise HTTPException(status_code=404, detail="Kaynak hesap bulunamadı")
    if not to_account:
        raise HTTPException(status_code=404, detail="Hedef hesap bulunamadı")
    
    if from_account.id == to_account.id:
        raise HTTPException(status_code=400, detail="Kaynak ve hedef hesap aynı olamaz")
    
    # Check sufficient balance
    if float(from_account.balance) < transfer_data.from_amount:
        raise HTTPException(
            status_code=400, 
            detail=f"Yetersiz bakiye. Mevcut: {from_account.balance} {from_account.currency}"
        )
    
    # Calculate to_amount if not provided
    from_amount = Decimal(str(transfer_data.from_amount))
    
    if from_account.currency == to_account.currency:
        # Same currency - no conversion needed
        to_amount = from_amount
        exchange_rate = Decimal("1")
    else:
        # Different currencies - conversion needed
        if transfer_data.to_amount:
            to_amount = Decimal(str(transfer_data.to_amount))
            exchange_rate = to_amount / from_amount
        elif transfer_data.exchange_rate:
            exchange_rate = Decimal(str(transfer_data.exchange_rate))
            to_amount = from_amount * exchange_rate
        else:
            raise HTTPException(
                status_code=400, 
                detail="Farklı para birimleri için 'to_amount' veya 'exchange_rate' gerekli"
            )
    
    # Generate transfer number
    today = datetime.now().strftime("%Y%m%d")
    last = db.query(Payment).filter(
        Payment.payment_no.like(f"TRF{today}%")
    ).order_by(Payment.id.desc()).first()
    
    if last:
        last_num = int(last.payment_no[-4:])
        new_num = last_num + 1
    else:
        new_num = 1
    
    transfer_no = f"TRF{today}{new_num:04d}"
    
    # Create outgoing payment (from source account)
    outgoing_payment = Payment(
        payment_no=f"{transfer_no}-OUT",
        payment_type="outgoing",
        payment_channel="bank_transfer",
        currency=from_account.currency,
        amount=from_amount,
        exchange_rate=exchange_rate,
        base_amount=from_amount,
        account_id=from_account.id,
        reference_no=transfer_data.reference_no or transfer_no,
        description=f"Virman: {from_account.name} -> {to_account.name}. {transfer_data.description or ''}",
        payment_date=datetime.utcnow(),
        status="completed"
    )
    db.add(outgoing_payment)
    
    # Create incoming payment (to destination account)
    incoming_payment = Payment(
        payment_no=f"{transfer_no}-IN",
        payment_type="incoming",
        payment_channel="bank_transfer",
        currency=to_account.currency,
        amount=to_amount,
        exchange_rate=Decimal("1") / exchange_rate if exchange_rate != 0 else Decimal("1"),
        base_amount=to_amount,
        account_id=to_account.id,
        reference_no=transfer_data.reference_no or transfer_no,
        description=f"Virman: {from_account.name} -> {to_account.name}. {transfer_data.description or ''}",
        payment_date=datetime.utcnow(),
        status="completed"
    )
    db.add(incoming_payment)
    
    # Update account balances
    from_account.balance -= from_amount
    to_account.balance += to_amount
    
    # Create account transactions
    out_trans = AccountTransaction(
        account_id=from_account.id,
        transaction_type="transfer_out",
        amount=from_amount,
        balance_after=from_account.balance,
        reference_type="transfer",
        reference_id=None,
        description=f"Virman çıkış: {transfer_no} -> {to_account.name}",
        transaction_date=datetime.utcnow()
    )
    db.add(out_trans)
    
    in_trans = AccountTransaction(
        account_id=to_account.id,
        transaction_type="transfer_in",
        amount=to_amount,
        balance_after=to_account.balance,
        reference_type="transfer",
        reference_id=None,
        description=f"Virman giriş: {transfer_no} <- {from_account.name}",
        transaction_date=datetime.utcnow()
    )
    db.add(in_trans)
    
    # Audit log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        module="payments",
        record_type="Transfer",
        new_values={
            "transfer_no": transfer_no,
            "from_account": from_account.name,
            "to_account": to_account.name,
            "from_amount": float(from_amount),
            "to_amount": float(to_amount),
            "exchange_rate": float(exchange_rate)
        },
        description=f"Virman: {from_account.name} ({from_amount} {from_account.currency}) -> {to_account.name} ({to_amount} {to_account.currency})",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    
    db.commit()
    
    return {
        "message": "Virman başarılı",
        "transfer_no": transfer_no,
        "from_account": {
            "name": from_account.name,
            "currency": from_account.currency,
            "amount": float(from_amount),
            "new_balance": float(from_account.balance)
        },
        "to_account": {
            "name": to_account.name,
            "currency": to_account.currency,
            "amount": float(to_amount),
            "new_balance": float(to_account.balance)
        },
        "exchange_rate": float(exchange_rate)
    }

