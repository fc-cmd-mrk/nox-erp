"""
Transactions Router
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from app.database import get_db
from app.auth import require_permission
from app.models.user import User
from app.models.transaction import Transaction, TransactionItem
from app.models.product import Product
from app.models.contact import Contact, ContactAccount
from app.models.audit_log import AuditLog
from app.schemas.transaction import (
    TransactionSchema, TransactionCreate, TransactionUpdate, TransactionWithItems,
    TransactionItemSchema
)

router = APIRouter(prefix="/transactions", tags=["Transactions"])


def generate_transaction_no(db: Session, transaction_type: str) -> str:
    """Generate unique transaction number"""
    prefix = {
        "sale": "SLS",
        "purchase": "PRC",
        "sale_return": "SLR",
        "purchase_return": "PRR"
    }.get(transaction_type, "TRX")
    
    today = datetime.now().strftime("%Y%m%d")
    
    # Get last transaction number for today
    last = db.query(Transaction).filter(
        Transaction.transaction_no.like(f"{prefix}{today}%")
    ).order_by(Transaction.id.desc()).first()
    
    if last:
        last_num = int(last.transaction_no[-4:])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}{today}{new_num:04d}"


@router.get("", response_model=List[TransactionWithItems])
async def list_transactions(
    skip: int = 0,
    limit: int = 100,
    transaction_type: Optional[str] = None,
    company_id: Optional[int] = None,
    contact_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(require_permission("transactions", "view")),
    db: Session = Depends(get_db)
):
    """List all transactions"""
    query = db.query(Transaction)
    
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    
    if company_id:
        query = query.filter(Transaction.company_id == company_id)
    
    if contact_id:
        query = query.filter(Transaction.contact_id == contact_id)
    
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)
    
    transactions = query.order_by(Transaction.transaction_date.desc()).offset(skip).limit(limit).all()
    return transactions


@router.get("/sales", response_model=List[TransactionWithItems])
async def list_sales(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_permission("transactions", "view")),
    db: Session = Depends(get_db)
):
    """List sales only"""
    transactions = db.query(Transaction).filter(
        Transaction.transaction_type == "sale"
    ).order_by(Transaction.transaction_date.desc()).offset(skip).limit(limit).all()
    return transactions


@router.get("/purchases", response_model=List[TransactionWithItems])
async def list_purchases(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_permission("transactions", "view")),
    db: Session = Depends(get_db)
):
    """List purchases only"""
    transactions = db.query(Transaction).filter(
        Transaction.transaction_type == "purchase"
    ).order_by(Transaction.transaction_date.desc()).offset(skip).limit(limit).all()
    return transactions


@router.get("/{transaction_id}", response_model=TransactionWithItems)
async def get_transaction(
    transaction_id: int,
    current_user: User = Depends(require_permission("transactions", "view")),
    db: Session = Depends(get_db)
):
    """Get transaction by ID"""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="İşlem bulunamadı")
    return transaction


@router.post("", response_model=TransactionSchema)
async def create_transaction(
    transaction_data: TransactionCreate,
    req: Request,
    current_user: User = Depends(require_permission("transactions", "create")),
    db: Session = Depends(get_db)
):
    """Create new transaction"""
    # Generate transaction number
    transaction_no = generate_transaction_no(db, transaction_data.transaction_type)
    
    # Calculate totals
    subtotal = Decimal("0")
    tax_total = Decimal("0")
    discount_total = Decimal("0")
    
    items_data = transaction_data.items
    transaction_dict = transaction_data.model_dump(exclude={"items"})
    transaction_dict["transaction_no"] = transaction_no
    
    transaction = Transaction(**transaction_dict)
    db.add(transaction)
    db.flush()
    
    # Create items
    for item_data in items_data:
        item_dict = item_data.model_dump()
        
        # Calculate item totals
        qty = item_dict["quantity"]
        unit_price = item_dict["unit_price"]
        cost_price = item_dict.get("cost_price", Decimal("0"))
        
        line_total = qty * unit_price
        
        # Apply discounts
        if item_dict.get("discount_percent"):
            item_dict["discount_amount"] = line_total * (item_dict["discount_percent"] / 100)
        
        line_total -= item_dict.get("discount_amount", Decimal("0"))
        
        # Calculate tax
        if item_dict.get("tax_percent"):
            item_dict["tax_amount"] = line_total * (item_dict["tax_percent"] / 100)
        
        line_total += item_dict.get("tax_amount", Decimal("0"))
        
        # Calculate profit
        profit = (unit_price - cost_price) * qty
        profit_margin = ((unit_price - cost_price) / unit_price * 100) if unit_price > 0 else 0
        
        item_dict["total_amount"] = line_total
        item_dict["profit"] = profit
        item_dict["profit_margin"] = profit_margin
        item_dict["transaction_id"] = transaction.id
        
        item = TransactionItem(**item_dict)
        db.add(item)
        
        subtotal += qty * unit_price
        tax_total += item_dict.get("tax_amount", Decimal("0"))
        discount_total += item_dict.get("discount_amount", Decimal("0"))
    
    # Update transaction totals
    transaction.subtotal = subtotal
    transaction.tax_amount = tax_total
    transaction.discount_amount = discount_total
    transaction.total_amount = subtotal - discount_total + tax_total
    
    # Update contact balance if contact exists
    if transaction.contact_id:
        contact_account = db.query(ContactAccount).filter(
            ContactAccount.contact_id == transaction.contact_id,
            ContactAccount.currency == transaction.currency
        ).first()
        
        if contact_account:
            if transaction.transaction_type in ["sale", "purchase_return"]:
                contact_account.balance += transaction.total_amount  # They owe us
            else:  # purchase, sale_return
                contact_account.balance -= transaction.total_amount  # We owe them
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        module="transactions",
        record_id=transaction.id,
        record_type="Transaction",
        new_values={"transaction_no": transaction_no, "total": float(transaction.total_amount)},
        description=f"İşlem oluşturuldu: {transaction_no}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    db.refresh(transaction)
    
    return transaction


@router.put("/{transaction_id}", response_model=TransactionSchema)
async def update_transaction(
    transaction_id: int,
    transaction_data: TransactionUpdate,
    req: Request,
    current_user: User = Depends(require_permission("transactions", "edit")),
    db: Session = Depends(get_db)
):
    """Update transaction"""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="İşlem bulunamadı")
    
    old_values = {"status": transaction.status}
    
    for field, value in transaction_data.model_dump(exclude_unset=True).items():
        setattr(transaction, field, value)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="update",
        module="transactions",
        record_id=transaction.id,
        record_type="Transaction",
        old_values=old_values,
        new_values={"status": transaction.status},
        description=f"İşlem güncellendi: {transaction.transaction_no}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    db.refresh(transaction)
    
    return transaction


@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: int,
    req: Request,
    current_user: User = Depends(require_permission("transactions", "delete")),
    db: Session = Depends(get_db)
):
    """Delete transaction"""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="İşlem bulunamadı")
    
    transaction_no = transaction.transaction_no
    
    # Reverse contact balance
    if transaction.contact_id:
        contact_account = db.query(ContactAccount).filter(
            ContactAccount.contact_id == transaction.contact_id,
            ContactAccount.currency == transaction.currency
        ).first()
        
        if contact_account:
            if transaction.transaction_type in ["sale", "purchase_return"]:
                contact_account.balance -= transaction.total_amount
            else:
                contact_account.balance += transaction.total_amount
    
    db.delete(transaction)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        module="transactions",
        record_id=transaction_id,
        record_type="Transaction",
        old_values={"transaction_no": transaction_no},
        description=f"İşlem silindi: {transaction_no}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return {"message": "İşlem silindi"}


# ============ İADE / İPTAL ============

@router.post("/{transaction_id}/cancel")
async def cancel_transaction(
    transaction_id: int,
    reason: str = Query(None, description="İptal sebebi"),
    req: Request = None,
    current_user: User = Depends(require_permission("transactions", "edit")),
    db: Session = Depends(get_db)
):
    """İşlemi iptal et"""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="İşlem bulunamadı")
    
    if transaction.status == "cancelled":
        raise HTTPException(status_code=400, detail="Bu işlem zaten iptal edilmiş")
    
    old_status = transaction.status
    transaction.status = "cancelled"
    
    if reason:
        transaction.notes = f"{transaction.notes or ''}\n[İPTAL: {reason}]".strip()
    
    # Reverse contact balance
    if transaction.contact_id:
        contact_account = db.query(ContactAccount).filter(
            ContactAccount.contact_id == transaction.contact_id,
            ContactAccount.currency == transaction.currency
        ).first()
        
        if contact_account:
            if transaction.transaction_type in ["sale", "purchase_return"]:
                contact_account.balance -= transaction.total_amount
            else:
                contact_account.balance += transaction.total_amount
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="cancel",
        module="transactions",
        record_id=transaction.id,
        record_type="Transaction",
        old_values={"status": old_status},
        new_values={"status": "cancelled", "reason": reason},
        description=f"İşlem iptal edildi: {transaction.transaction_no}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return {"message": "İşlem iptal edildi", "transaction_no": transaction.transaction_no}


@router.post("/{transaction_id}/return", response_model=TransactionSchema)
async def create_return(
    transaction_id: int,
    reason: str = Query(None, description="İade sebebi"),
    full_return: bool = Query(True, description="Tam iade mi?"),
    req: Request = None,
    current_user: User = Depends(require_permission("transactions", "create")),
    db: Session = Depends(get_db)
):
    """İşlem için iade oluştur"""
    original = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Orijinal işlem bulunamadı")
    
    if original.status == "cancelled":
        raise HTTPException(status_code=400, detail="İptal edilmiş işlem için iade yapılamaz")
    
    # Determine return type
    if original.transaction_type == "sale":
        return_type = "sale_return"
    elif original.transaction_type == "purchase":
        return_type = "purchase_return"
    else:
        raise HTTPException(status_code=400, detail="Bu işlem tipi için iade yapılamaz")
    
    # Generate return transaction number
    return_no = generate_transaction_no(db, return_type)
    
    # Create return transaction
    return_transaction = Transaction(
        transaction_no=return_no,
        external_id=f"RET-{original.transaction_no}",
        transaction_type=return_type,
        company_id=original.company_id,
        contact_id=original.contact_id,
        transaction_date=datetime.now(),
        currency=original.currency,
        exchange_rate=original.exchange_rate,
        subtotal=original.subtotal,
        tax_amount=original.tax_amount,
        discount_amount=original.discount_amount,
        total_amount=original.total_amount,
        status="completed",
        notes=f"İade - Orijinal: {original.transaction_no}" + (f"\nSebep: {reason}" if reason else "")
    )
    db.add(return_transaction)
    db.flush()
    
    # Copy items
    for item in original.items:
        return_item = TransactionItem(
            transaction_id=return_transaction.id,
            product_id=item.product_id,
            warehouse_id=item.warehouse_id,
            sub_warehouse_id=item.sub_warehouse_id,
            description=f"İADE: {item.description or ''}",
            quantity=item.quantity,
            unit_price=item.unit_price,
            cost_price=item.cost_price,
            discount_percent=item.discount_percent,
            discount_amount=item.discount_amount,
            tax_percent=item.tax_percent,
            tax_amount=item.tax_amount,
            total_amount=item.total_amount,
            profit=-item.profit,  # Negative profit for returns
            profit_margin=-item.profit_margin
        )
        db.add(return_item)
    
    # Update contact balance
    if return_transaction.contact_id:
        contact_account = db.query(ContactAccount).filter(
            ContactAccount.contact_id == return_transaction.contact_id,
            ContactAccount.currency == return_transaction.currency
        ).first()
        
        if contact_account:
            if return_type == "sale_return":
                contact_account.balance -= return_transaction.total_amount  # We owe them back
            else:  # purchase_return
                contact_account.balance += return_transaction.total_amount  # They owe us back
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        module="transactions",
        record_id=return_transaction.id,
        record_type="Transaction",
        new_values={
            "transaction_no": return_no, 
            "original": original.transaction_no,
            "type": return_type
        },
        description=f"İade oluşturuldu: {return_no} (Orijinal: {original.transaction_no})",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    db.refresh(return_transaction)
    
    return return_transaction


# ============ SUMMARY / REPORTS ============

@router.get("/summary/today")
async def get_today_summary(
    company_id: Optional[int] = None,
    current_user: User = Depends(require_permission("transactions", "view")),
    db: Session = Depends(get_db)
):
    """Bugünün özeti"""
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    
    query = db.query(Transaction).filter(
        Transaction.transaction_date >= today,
        Transaction.transaction_date < tomorrow,
        Transaction.status != "cancelled"
    )
    
    if company_id:
        query = query.filter(Transaction.company_id == company_id)
    
    transactions = query.all()
    
    sales_total = sum(t.total_amount for t in transactions if t.transaction_type == "sale")
    purchase_total = sum(t.total_amount for t in transactions if t.transaction_type == "purchase")
    
    # Calculate profit from items
    profit = Decimal("0")
    for t in transactions:
        if t.transaction_type == "sale":
            for item in t.items:
                profit += item.profit or Decimal("0")
        elif t.transaction_type == "sale_return":
            for item in t.items:
                profit += item.profit or Decimal("0")  # Already negative
    
    return {
        "date": today.strftime("%Y-%m-%d"),
        "sales_count": len([t for t in transactions if t.transaction_type == "sale"]),
        "sales_total": float(sales_total),
        "purchase_count": len([t for t in transactions if t.transaction_type == "purchase"]),
        "purchase_total": float(purchase_total),
        "profit": float(profit)
    }


@router.get("/summary/monthly")
async def get_monthly_summary(
    year: int = None,
    month: int = None,
    company_id: Optional[int] = None,
    current_user: User = Depends(require_permission("transactions", "view")),
    db: Session = Depends(get_db)
):
    """Aylık özet"""
    now = datetime.now()
    year = year or now.year
    month = month or now.month
    
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
    query = db.query(Transaction).filter(
        Transaction.transaction_date >= start_date,
        Transaction.transaction_date < end_date,
        Transaction.status != "cancelled"
    )
    
    if company_id:
        query = query.filter(Transaction.company_id == company_id)
    
    transactions = query.all()
    
    sales_total = sum(t.total_amount for t in transactions if t.transaction_type == "sale")
    purchase_total = sum(t.total_amount for t in transactions if t.transaction_type == "purchase")
    return_total = sum(t.total_amount for t in transactions if t.transaction_type in ["sale_return", "purchase_return"])
    
    # Calculate profit
    profit = Decimal("0")
    for t in transactions:
        for item in t.items:
            if t.transaction_type in ["sale", "sale_return"]:
                profit += item.profit or Decimal("0")
    
    return {
        "year": year,
        "month": month,
        "sales_count": len([t for t in transactions if t.transaction_type == "sale"]),
        "sales_total": float(sales_total),
        "purchase_count": len([t for t in transactions if t.transaction_type == "purchase"]),
        "purchase_total": float(purchase_total),
        "return_count": len([t for t in transactions if t.transaction_type in ["sale_return", "purchase_return"]]),
        "return_total": float(return_total),
        "profit": float(profit)
    }

