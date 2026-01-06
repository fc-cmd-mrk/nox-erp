"""
Reports Router
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import Optional
from datetime import datetime, timedelta
from decimal import Decimal
from app.database import get_db
from app.auth import require_permission
from app.models.user import User
from app.models.transaction import Transaction, TransactionItem
from app.models.payment import Payment
from app.models.product import Product
from app.models.contact import Contact, ContactAccount
from app.models.account import Account

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/dashboard")
async def dashboard_summary(
    company_id: Optional[int] = None,
    current_user: User = Depends(require_permission("reports", "view")),
    db: Session = Depends(get_db)
):
    """Dashboard summary"""
    today = datetime.now().date()
    start_of_month = today.replace(day=1)
    start_of_week = today - timedelta(days=today.weekday())
    
    # Base query filters
    def apply_company_filter(query, model):
        if company_id:
            return query.filter(model.company_id == company_id)
        return query
    
    # Today's sales
    today_sales = db.query(func.sum(Transaction.total_amount)).filter(
        Transaction.transaction_type == "sale",
        func.date(Transaction.transaction_date) == today
    ).scalar() or 0
    
    # This week's sales
    week_sales = db.query(func.sum(Transaction.total_amount)).filter(
        Transaction.transaction_type == "sale",
        func.date(Transaction.transaction_date) >= start_of_week
    ).scalar() or 0
    
    # This month's sales
    month_sales = db.query(func.sum(Transaction.total_amount)).filter(
        Transaction.transaction_type == "sale",
        func.date(Transaction.transaction_date) >= start_of_month
    ).scalar() or 0
    
    # Today's profit
    today_profit = db.query(func.sum(TransactionItem.profit)).join(Transaction).filter(
        Transaction.transaction_type == "sale",
        func.date(Transaction.transaction_date) == today
    ).scalar() or 0
    
    # This month's profit
    month_profit = db.query(func.sum(TransactionItem.profit)).join(Transaction).filter(
        Transaction.transaction_type == "sale",
        func.date(Transaction.transaction_date) >= start_of_month
    ).scalar() or 0
    
    # Transaction counts
    today_count = db.query(func.count(Transaction.id)).filter(
        Transaction.transaction_type == "sale",
        func.date(Transaction.transaction_date) == today
    ).scalar() or 0
    
    # Total contacts
    total_customers = db.query(func.count(Contact.id)).filter(
        Contact.contact_type.in_(["customer", "both"])
    ).scalar() or 0
    
    total_suppliers = db.query(func.count(Contact.id)).filter(
        Contact.contact_type.in_(["supplier", "both"])
    ).scalar() or 0
    
    # Total products
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar() or 0
    
    # Account balances
    account_balances = db.query(
        Account.currency,
        func.sum(Account.balance).label("total")
    ).group_by(Account.currency).all()
    
    balances_dict = {row.currency: float(row.total) for row in account_balances}
    
    return {
        "sales": {
            "today": float(today_sales),
            "week": float(week_sales),
            "month": float(month_sales),
            "today_count": today_count
        },
        "profit": {
            "today": float(today_profit),
            "month": float(month_profit)
        },
        "counts": {
            "customers": total_customers,
            "suppliers": total_suppliers,
            "products": total_products
        },
        "account_balances": balances_dict
    }


@router.get("/profit-analysis")
async def profit_analysis(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    company_id: Optional[int] = None,
    current_user: User = Depends(require_permission("reports", "view")),
    db: Session = Depends(get_db)
):
    """Product profit analysis"""
    if not start_date:
        start_date = datetime.now().replace(day=1)
    if not end_date:
        end_date = datetime.now()
    
    # Product profit summary
    query = db.query(
        Product.id,
        Product.model_code,
        Product.name,
        func.sum(TransactionItem.quantity).label("total_quantity"),
        func.sum(TransactionItem.total_amount).label("total_revenue"),
        func.sum(TransactionItem.cost_price * TransactionItem.quantity).label("total_cost"),
        func.sum(TransactionItem.profit).label("total_profit")
    ).join(TransactionItem, TransactionItem.product_id == Product.id)\
     .join(Transaction, Transaction.id == TransactionItem.transaction_id)\
     .filter(
        Transaction.transaction_type == "sale",
        Transaction.transaction_date >= start_date,
        Transaction.transaction_date <= end_date
    )
    
    if company_id:
        query = query.filter(Transaction.company_id == company_id)
    
    results = query.group_by(Product.id).order_by(func.sum(TransactionItem.profit).desc()).limit(50).all()
    
    return [
        {
            "product_id": r.id,
            "model_code": r.model_code,
            "name": r.name,
            "total_quantity": float(r.total_quantity or 0),
            "total_revenue": float(r.total_revenue or 0),
            "total_cost": float(r.total_cost or 0),
            "total_profit": float(r.total_profit or 0),
            "profit_margin": (float(r.total_profit or 0) / float(r.total_revenue) * 100) if r.total_revenue else 0
        }
        for r in results
    ]


@router.get("/supplier-analysis")
async def supplier_analysis(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(require_permission("reports", "view")),
    db: Session = Depends(get_db)
):
    """Supplier purchase analysis"""
    if not start_date:
        start_date = datetime.now().replace(day=1)
    if not end_date:
        end_date = datetime.now()
    
    results = db.query(
        Contact.id,
        Contact.name,
        func.sum(Transaction.total_amount).label("total_purchases"),
        func.count(Transaction.id).label("transaction_count")
    ).join(Transaction, Transaction.contact_id == Contact.id)\
     .filter(
        Transaction.transaction_type == "purchase",
        Transaction.transaction_date >= start_date,
        Transaction.transaction_date <= end_date
    ).group_by(Contact.id).order_by(func.sum(Transaction.total_amount).desc()).all()
    
    return [
        {
            "supplier_id": r.id,
            "name": r.name,
            "total_purchases": float(r.total_purchases or 0),
            "transaction_count": r.transaction_count
        }
        for r in results
    ]


@router.get("/customer-analysis")
async def customer_analysis(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(require_permission("reports", "view")),
    db: Session = Depends(get_db)
):
    """Customer sales analysis"""
    if not start_date:
        start_date = datetime.now().replace(day=1)
    if not end_date:
        end_date = datetime.now()
    
    results = db.query(
        Contact.id,
        Contact.name,
        func.sum(Transaction.total_amount).label("total_sales"),
        func.count(Transaction.id).label("transaction_count")
    ).join(Transaction, Transaction.contact_id == Contact.id)\
     .filter(
        Transaction.transaction_type == "sale",
        Transaction.transaction_date >= start_date,
        Transaction.transaction_date <= end_date
    ).group_by(Contact.id).order_by(func.sum(Transaction.total_amount).desc()).limit(50).all()
    
    return [
        {
            "customer_id": r.id,
            "name": r.name,
            "total_sales": float(r.total_sales or 0),
            "transaction_count": r.transaction_count
        }
        for r in results
    ]


@router.get("/payment-channels")
async def payment_channel_analysis(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(require_permission("reports", "view")),
    db: Session = Depends(get_db)
):
    """Payment channel analysis"""
    if not start_date:
        start_date = datetime.now().replace(day=1)
    if not end_date:
        end_date = datetime.now()
    
    results = db.query(
        Payment.payment_channel,
        Payment.payment_type,
        func.sum(Payment.amount).label("total_amount"),
        func.count(Payment.id).label("count")
    ).filter(
        Payment.payment_date >= start_date,
        Payment.payment_date <= end_date,
        Payment.status == "completed"
    ).group_by(Payment.payment_channel, Payment.payment_type).all()
    
    return [
        {
            "channel": r.payment_channel,
            "type": r.payment_type,
            "total_amount": float(r.total_amount or 0),
            "count": r.count
        }
        for r in results
    ]


@router.get("/cash-flow")
async def cash_flow_report(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    account_id: Optional[int] = None,
    current_user: User = Depends(require_permission("reports", "view")),
    db: Session = Depends(get_db)
):
    """Cash flow report"""
    if not start_date:
        start_date = datetime.now().replace(day=1)
    if not end_date:
        end_date = datetime.now()
    
    query = db.query(
        Payment.payment_date,
        Payment.payment_type,
        Payment.payment_channel,
        Payment.currency,
        func.sum(Payment.amount).label("amount")
    ).filter(
        Payment.payment_date >= start_date,
        Payment.payment_date <= end_date,
        Payment.status == "completed"
    )
    
    if account_id:
        query = query.filter(Payment.account_id == account_id)
    
    results = query.group_by(
        func.date(Payment.payment_date),
        Payment.payment_type,
        Payment.payment_channel,
        Payment.currency
    ).order_by(Payment.payment_date).all()
    
    return [
        {
            "date": r.payment_date.strftime("%Y-%m-%d") if r.payment_date else None,
            "type": r.payment_type,
            "channel": r.payment_channel,
            "currency": r.currency,
            "amount": float(r.amount or 0)
        }
        for r in results
    ]


@router.get("/contact-balances")
async def contact_balances(
    contact_type: Optional[str] = None,
    current_user: User = Depends(require_permission("reports", "view")),
    db: Session = Depends(get_db)
):
    """Contact balance report"""
    query = db.query(
        Contact.id,
        Contact.code,
        Contact.name,
        Contact.contact_type,
        ContactAccount.currency,
        ContactAccount.balance
    ).join(ContactAccount, ContactAccount.contact_id == Contact.id)
    
    if contact_type:
        query = query.filter(Contact.contact_type == contact_type)
    
    # Only show non-zero balances
    results = query.filter(ContactAccount.balance != 0).order_by(ContactAccount.balance.desc()).all()
    
    return [
        {
            "contact_id": r.id,
            "code": r.code,
            "name": r.name,
            "contact_type": r.contact_type,
            "currency": r.currency,
            "balance": float(r.balance)
        }
        for r in results
    ]

