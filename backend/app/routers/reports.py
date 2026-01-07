"""
Reports Router
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import Optional, List
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
from app.models.company import Company
from app.models.settings import ExchangeRate

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/dashboard")
async def dashboard_summary(
    company_id: Optional[int] = None,
    current_user: User = Depends(require_permission("reports", "view")),
    db: Session = Depends(get_db)
):
    """Dashboard summary with optional company filter"""
    today = datetime.now().date()
    start_of_month = today.replace(day=1)
    start_of_week = today - timedelta(days=today.weekday())
    
    # Today's sales
    today_sales_query = db.query(func.sum(Transaction.total_amount)).filter(
        Transaction.transaction_type == "sale",
        func.date(Transaction.transaction_date) == today
    )
    if company_id:
        today_sales_query = today_sales_query.filter(Transaction.company_id == company_id)
    today_sales = today_sales_query.scalar() or 0
    
    # This week's sales
    week_sales_query = db.query(func.sum(Transaction.total_amount)).filter(
        Transaction.transaction_type == "sale",
        func.date(Transaction.transaction_date) >= start_of_week
    )
    if company_id:
        week_sales_query = week_sales_query.filter(Transaction.company_id == company_id)
    week_sales = week_sales_query.scalar() or 0
    
    # This month's sales
    month_sales_query = db.query(func.sum(Transaction.total_amount)).filter(
        Transaction.transaction_type == "sale",
        func.date(Transaction.transaction_date) >= start_of_month
    )
    if company_id:
        month_sales_query = month_sales_query.filter(Transaction.company_id == company_id)
    month_sales = month_sales_query.scalar() or 0
    
    # Today's profit
    today_profit_query = db.query(func.sum(TransactionItem.profit)).join(Transaction).filter(
        Transaction.transaction_type == "sale",
        func.date(Transaction.transaction_date) == today
    )
    if company_id:
        today_profit_query = today_profit_query.filter(Transaction.company_id == company_id)
    today_profit = today_profit_query.scalar() or 0
    
    # This month's profit
    month_profit_query = db.query(func.sum(TransactionItem.profit)).join(Transaction).filter(
        Transaction.transaction_type == "sale",
        func.date(Transaction.transaction_date) >= start_of_month
    )
    if company_id:
        month_profit_query = month_profit_query.filter(Transaction.company_id == company_id)
    month_profit = month_profit_query.scalar() or 0
    
    # Transaction counts
    today_count_query = db.query(func.count(Transaction.id)).filter(
        Transaction.transaction_type == "sale",
        func.date(Transaction.transaction_date) == today
    )
    if company_id:
        today_count_query = today_count_query.filter(Transaction.company_id == company_id)
    today_count = today_count_query.scalar() or 0
    
    # Total contacts (contacts linked to the company via ContactCompany)
    if company_id:
        from app.models.contact import ContactCompany
        total_customers = db.query(func.count(func.distinct(Contact.id))).join(
            ContactCompany, ContactCompany.contact_id == Contact.id
        ).filter(
            Contact.contact_type.in_(["customer", "both"]),
            ContactCompany.company_id == company_id
        ).scalar() or 0
        
        total_suppliers = db.query(func.count(func.distinct(Contact.id))).join(
            ContactCompany, ContactCompany.contact_id == Contact.id
        ).filter(
            Contact.contact_type.in_(["supplier", "both"]),
            ContactCompany.company_id == company_id
        ).scalar() or 0
    else:
        total_customers = db.query(func.count(Contact.id)).filter(
            Contact.contact_type.in_(["customer", "both"])
        ).scalar() or 0
        
        total_suppliers = db.query(func.count(Contact.id)).filter(
            Contact.contact_type.in_(["supplier", "both"])
        ).scalar() or 0
    
    # Total products
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar() or 0
    
    # Account balances (filter by company if specified)
    account_balances_query = db.query(
        Account.currency,
        func.sum(Account.balance).label("total")
    )
    if company_id:
        account_balances_query = account_balances_query.filter(Account.company_id == company_id)
    account_balances = account_balances_query.group_by(Account.currency).all()
    
    balances_dict = {row.currency: float(row.total) for row in account_balances}
    
    # Get company name if filtered
    company_name = None
    if company_id:
        company = db.query(Company).filter(Company.id == company_id).first()
        if company:
            company_name = company.name
    
    return {
        "company_id": company_id,
        "company_name": company_name,
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


# ============ MULTI-CURRENCY PROFIT/LOSS ANALYSIS ============

@router.get("/profit-loss")
async def profit_loss_report(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    company_id: Optional[int] = None,
    currency: Optional[str] = None,
    group_by: str = Query("product", description="product, contact, company, date"),
    current_user: User = Depends(require_permission("reports", "view")),
    db: Session = Depends(get_db)
):
    """
    Kar/Zarar Analizi - Şirket/Cari/Ürün bazlı, döviz cinsine göre
    """
    if not start_date:
        start_date = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if not end_date:
        end_date = datetime.now()
    
    # Get exchange rates for TRY conversion
    exchange_rates = {}
    rates = db.query(ExchangeRate).filter(ExchangeRate.is_current == True).all()
    for rate in rates:
        exchange_rates[rate.from_currency] = float(rate.rate)
    exchange_rates["TRY"] = 1.0
    
    # Base query
    base_query = db.query(Transaction).filter(
        Transaction.transaction_date >= start_date,
        Transaction.transaction_date <= end_date,
        Transaction.status != "cancelled"
    )
    
    if company_id:
        base_query = base_query.filter(Transaction.company_id == company_id)
    
    if currency:
        base_query = base_query.filter(Transaction.currency == currency)
    
    transactions = base_query.all()
    
    # Calculate summary
    summary = {
        "by_currency": {},
        "by_type": {"sale": 0, "purchase": 0, "sale_return": 0, "purchase_return": 0},
        "total_profit_try": 0,
        "total_revenue_try": 0,
        "total_cost_try": 0,
        "details": []
    }
    
    # Group results
    grouped = {}
    
    for trans in transactions:
        # Get exchange rate
        rate_to_try = exchange_rates.get(trans.currency, 1.0)
        
        # Calculate profit for this transaction
        trans_profit = Decimal("0")
        trans_revenue = Decimal("0")
        trans_cost = Decimal("0")
        
        for item in trans.items:
            if trans.transaction_type in ["sale", "sale_return"]:
                trans_revenue += item.total_amount
                trans_cost += item.cost_price * item.quantity
                trans_profit += item.profit or Decimal("0")
        
        # Convert to TRY
        trans_profit_try = float(trans_profit) * rate_to_try
        trans_revenue_try = float(trans_revenue) * rate_to_try
        trans_cost_try = float(trans_cost) * rate_to_try
        
        # Update by currency
        if trans.currency not in summary["by_currency"]:
            summary["by_currency"][trans.currency] = {
                "revenue": 0, "cost": 0, "profit": 0, "count": 0
            }
        
        summary["by_currency"][trans.currency]["revenue"] += float(trans_revenue)
        summary["by_currency"][trans.currency]["cost"] += float(trans_cost)
        summary["by_currency"][trans.currency]["profit"] += float(trans_profit)
        summary["by_currency"][trans.currency]["count"] += 1
        
        # Update by type
        if trans.transaction_type in summary["by_type"]:
            summary["by_type"][trans.transaction_type] += float(trans.total_amount)
        
        # Update TRY totals
        if trans.transaction_type in ["sale", "sale_return"]:
            summary["total_profit_try"] += trans_profit_try
            summary["total_revenue_try"] += trans_revenue_try
            summary["total_cost_try"] += trans_cost_try
        
        # Group by selected field
        if group_by == "product":
            for item in trans.items:
                if item.product_id:
                    key = item.product_id
                    if key not in grouped:
                        product = db.query(Product).filter(Product.id == item.product_id).first()
                        grouped[key] = {
                            "id": key,
                            "name": product.name if product else "Bilinmeyen",
                            "code": product.model_code if product else "-",
                            "revenue": 0, "cost": 0, "profit": 0, "quantity": 0
                        }
                    grouped[key]["revenue"] += float(item.total_amount) * rate_to_try
                    grouped[key]["cost"] += float(item.cost_price * item.quantity) * rate_to_try
                    grouped[key]["profit"] += float(item.profit or 0) * rate_to_try
                    grouped[key]["quantity"] += float(item.quantity)
        
        elif group_by == "contact":
            if trans.contact_id:
                key = trans.contact_id
                if key not in grouped:
                    contact = trans.contact
                    grouped[key] = {
                        "id": key,
                        "name": contact.name if contact else "Bilinmeyen",
                        "code": contact.code if contact else "-",
                        "type": contact.contact_type if contact else "-",
                        "revenue": 0, "cost": 0, "profit": 0, "count": 0
                    }
                grouped[key]["revenue"] += trans_revenue_try
                grouped[key]["cost"] += trans_cost_try
                grouped[key]["profit"] += trans_profit_try
                grouped[key]["count"] += 1
        
        elif group_by == "company":
            key = trans.company_id
            if key not in grouped:
                company = trans.company
                grouped[key] = {
                    "id": key,
                    "name": company.name if company else "Bilinmeyen",
                    "code": company.code if company else "-",
                    "country": company.country if company else "-",
                    "revenue": 0, "cost": 0, "profit": 0, "count": 0
                }
            grouped[key]["revenue"] += trans_revenue_try
            grouped[key]["cost"] += trans_cost_try
            grouped[key]["profit"] += trans_profit_try
            grouped[key]["count"] += 1
        
        elif group_by == "date":
            key = trans.transaction_date.strftime("%Y-%m-%d")
            if key not in grouped:
                grouped[key] = {
                    "date": key,
                    "revenue": 0, "cost": 0, "profit": 0, "count": 0
                }
            grouped[key]["revenue"] += trans_revenue_try
            grouped[key]["cost"] += trans_cost_try
            grouped[key]["profit"] += trans_profit_try
            grouped[key]["count"] += 1
    
    # Sort grouped results
    if group_by == "date":
        summary["details"] = sorted(grouped.values(), key=lambda x: x["date"], reverse=True)
    else:
        summary["details"] = sorted(grouped.values(), key=lambda x: x["profit"], reverse=True)
    
    # Add profit margin to details
    for detail in summary["details"]:
        if detail.get("revenue", 0) > 0:
            detail["profit_margin"] = round(detail["profit"] / detail["revenue"] * 100, 2)
        else:
            detail["profit_margin"] = 0
    
    return {
        "period": {
            "start": start_date.strftime("%Y-%m-%d"),
            "end": end_date.strftime("%Y-%m-%d")
        },
        "summary": {
            "total_revenue_try": round(summary["total_revenue_try"], 2),
            "total_cost_try": round(summary["total_cost_try"], 2),
            "total_profit_try": round(summary["total_profit_try"], 2),
            "profit_margin": round(summary["total_profit_try"] / summary["total_revenue_try"] * 100, 2) if summary["total_revenue_try"] > 0 else 0
        },
        "by_currency": summary["by_currency"],
        "by_type": summary["by_type"],
        "details": summary["details"][:100],  # Limit to 100
        "exchange_rates": exchange_rates
    }


@router.get("/company-profit-loss")
async def company_profit_loss(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(require_permission("reports", "view")),
    db: Session = Depends(get_db)
):
    """Şirket bazlı kar/zarar analizi"""
    if not start_date:
        start_date = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if not end_date:
        end_date = datetime.now()
    
    # Get exchange rates
    exchange_rates = {"TRY": 1.0}
    rates = db.query(ExchangeRate).filter(ExchangeRate.is_current == True).all()
    for rate in rates:
        exchange_rates[rate.from_currency] = float(rate.rate)
    
    # Get all companies
    companies = db.query(Company).filter(Company.is_active == True).all()
    
    results = []
    for company in companies:
        # Get transactions for this company
        transactions = db.query(Transaction).filter(
            Transaction.company_id == company.id,
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date,
            Transaction.status != "cancelled"
        ).all()
        
        revenue = Decimal("0")
        cost = Decimal("0")
        profit = Decimal("0")
        sales_count = 0
        purchase_count = 0
        
        for trans in transactions:
            rate = exchange_rates.get(trans.currency, 1.0)
            
            if trans.transaction_type == "sale":
                sales_count += 1
                for item in trans.items:
                    revenue += item.total_amount * Decimal(str(rate))
                    cost += (item.cost_price * item.quantity) * Decimal(str(rate))
                    profit += (item.profit or Decimal("0")) * Decimal(str(rate))
            
            elif trans.transaction_type == "purchase":
                purchase_count += 1
        
        results.append({
            "company_id": company.id,
            "company_code": company.code,
            "company_name": company.name,
            "country": company.country,
            "default_currency": company.default_currency,
            "sales_count": sales_count,
            "purchase_count": purchase_count,
            "revenue_try": round(float(revenue), 2),
            "cost_try": round(float(cost), 2),
            "profit_try": round(float(profit), 2),
            "profit_margin": round(float(profit) / float(revenue) * 100, 2) if revenue > 0 else 0
        })
    
    # Sort by profit
    results.sort(key=lambda x: x["profit_try"], reverse=True)
    
    return {
        "period": {
            "start": start_date.strftime("%Y-%m-%d"),
            "end": end_date.strftime("%Y-%m-%d")
        },
        "companies": results,
        "totals": {
            "total_revenue_try": sum(r["revenue_try"] for r in results),
            "total_cost_try": sum(r["cost_try"] for r in results),
            "total_profit_try": sum(r["profit_try"] for r in results)
        }
    }


@router.get("/currency-summary")
async def currency_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(require_permission("reports", "view")),
    db: Session = Depends(get_db)
):
    """Para birimi bazlı özet"""
    if not start_date:
        start_date = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if not end_date:
        end_date = datetime.now()
    
    # Get transactions grouped by currency
    results = db.query(
        Transaction.currency,
        Transaction.transaction_type,
        func.sum(Transaction.total_amount).label("total"),
        func.count(Transaction.id).label("count")
    ).filter(
        Transaction.transaction_date >= start_date,
        Transaction.transaction_date <= end_date,
        Transaction.status != "cancelled"
    ).group_by(Transaction.currency, Transaction.transaction_type).all()
    
    # Get current exchange rates
    exchange_rates = {"TRY": 1.0}
    rates = db.query(ExchangeRate).filter(ExchangeRate.is_current == True).all()
    for rate in rates:
        exchange_rates[rate.from_currency] = float(rate.rate)
    
    # Organize by currency
    currencies = {}
    for r in results:
        if r.currency not in currencies:
            currencies[r.currency] = {
                "currency": r.currency,
                "rate_to_try": exchange_rates.get(r.currency, None),
                "sales": 0, "purchases": 0, "returns": 0,
                "sales_count": 0, "purchase_count": 0, "return_count": 0
            }
        
        if r.transaction_type == "sale":
            currencies[r.currency]["sales"] = float(r.total)
            currencies[r.currency]["sales_count"] = r.count
        elif r.transaction_type == "purchase":
            currencies[r.currency]["purchases"] = float(r.total)
            currencies[r.currency]["purchase_count"] = r.count
        elif r.transaction_type in ["sale_return", "purchase_return"]:
            currencies[r.currency]["returns"] += float(r.total)
            currencies[r.currency]["return_count"] += r.count
    
    # Calculate TRY equivalents
    for curr in currencies.values():
        rate = curr["rate_to_try"] or 1.0
        curr["sales_try"] = round(curr["sales"] * rate, 2)
        curr["purchases_try"] = round(curr["purchases"] * rate, 2)
        curr["net_try"] = round((curr["sales"] - curr["purchases"]) * rate, 2)
    
    return {
        "period": {
            "start": start_date.strftime("%Y-%m-%d"),
            "end": end_date.strftime("%Y-%m-%d")
        },
        "currencies": list(currencies.values()),
        "exchange_rates": exchange_rates
    }

