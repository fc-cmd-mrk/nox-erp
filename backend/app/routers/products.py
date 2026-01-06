"""
Products Router
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import date
from app.database import get_db
from app.auth import require_permission
from app.models.user import User
from app.models.product import Product, ProductCost, ProductCategory
from app.models.transaction import Transaction, TransactionItem
from app.models.company import Company, Warehouse
from app.models.settings import ExchangeRate
from app.models.audit_log import AuditLog
from app.schemas.product import (
    ProductSchema, ProductCreate, ProductUpdate, ProductWithCosts, ProductDetail,
    ProductCostSchema, ProductCostCreate, ProductCostUpdate,
    ProductCategorySchema, ProductCategoryCreate, ProductCategoryUpdate
)

router = APIRouter(prefix="/products", tags=["Products"])


# ============ CATEGORIES ============

@router.get("/categories", response_model=List[ProductCategorySchema])
async def list_categories(
    current_user: User = Depends(require_permission("products", "view")),
    db: Session = Depends(get_db)
):
    """List all product categories"""
    categories = db.query(ProductCategory).all()
    return categories


@router.post("/categories", response_model=ProductCategorySchema)
async def create_category(
    category_data: ProductCategoryCreate,
    current_user: User = Depends(require_permission("products", "create")),
    db: Session = Depends(get_db)
):
    """Create product category"""
    category = ProductCategory(**category_data.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/categories/{category_id}", response_model=ProductCategorySchema)
async def update_category(
    category_id: int,
    category_data: ProductCategoryUpdate,
    current_user: User = Depends(require_permission("products", "edit")),
    db: Session = Depends(get_db)
):
    """Update product category"""
    category = db.query(ProductCategory).filter(ProductCategory.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Kategori bulunamadı")
    
    for field, value in category_data.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    
    db.commit()
    db.refresh(category)
    return category


# ============ PRODUCTS ============

@router.get("", response_model=List[ProductWithCosts])
async def list_products(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    current_user: User = Depends(require_permission("products", "view")),
    db: Session = Depends(get_db)
):
    """List all products"""
    query = db.query(Product)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(search_term)) | 
            (Product.model_code.ilike(search_term))
        )
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    products = query.offset(skip).limit(limit).all()
    return products


@router.get("/statistics", response_model=List[dict])
async def get_products_with_statistics(
    company_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    current_user: User = Depends(require_permission("products", "view")),
    db: Session = Depends(get_db)
):
    """Get all products with statistics (last purchase price, last sale price, stock, profit in USD)"""
    from decimal import Decimal
    
    products = db.query(Product).all()
    
    # Get today's exchange rates for USD conversion
    today = date.today()
    exchange_rates = {}
    rates = db.query(ExchangeRate).filter(
        ExchangeRate.rate_date == today,
        ExchangeRate.to_currency == 'TRY'
    ).all()
    
    for rate in rates:
        exchange_rates[rate.from_currency] = float(rate.buying_rate or rate.selling_rate or 1)
    
    # Add USD rate (assumed 1 USD = X TRY)
    usd_to_try = exchange_rates.get('USD', 1)
    
    result = []
    for product in products:
        # Base query for transaction items
        items_query = db.query(TransactionItem).join(Transaction).filter(
            TransactionItem.product_id == product.id
        )
        
        # Apply filters
        if company_id:
            items_query = items_query.filter(Transaction.company_id == company_id)
        if warehouse_id:
            items_query = items_query.filter(TransactionItem.warehouse_id == warehouse_id)
        
        # Get last purchase (alış)
        last_purchase = items_query.filter(
            Transaction.transaction_type.in_(['purchase'])
        ).order_by(desc(Transaction.transaction_date)).first()
        
        # Get last sale (satış)
        last_sale = items_query.filter(
            Transaction.transaction_type.in_(['sale'])
        ).order_by(desc(Transaction.transaction_date)).first()
        
        # Calculate total stats
        all_items = items_query.all()
        total_quantity = sum(float(item.quantity) for item in all_items if item.quantity)
        total_profit = sum(float(item.profit or 0) for item in all_items)
        total_revenue = sum(float(item.total_amount or 0) for item in all_items)
        
        # Get stock by warehouse if filter is applied
        stock_by_warehouse = []
        if warehouse_id or company_id:
            warehouse_items = items_query.all()
            # Calculate net stock from transactions
            stock = 0
            for item in warehouse_items:
                trans = item.transaction
                if trans.transaction_type in ['purchase', 'sale_return']:
                    stock += float(item.quantity or 0)
                elif trans.transaction_type in ['sale', 'purchase_return']:
                    stock -= float(item.quantity or 0)
            stock_by_warehouse.append({
                'warehouse_id': warehouse_id,
                'stock': stock
            })
        
        # Convert profit to USD
        currency = product.default_currency
        if currency == 'TRY':
            profit_usd = total_profit / usd_to_try if usd_to_try > 0 else total_profit
        elif currency == 'USD':
            profit_usd = total_profit
        else:
            # First convert to TRY, then to USD
            currency_to_try = exchange_rates.get(currency, 1)
            profit_in_try = total_profit * currency_to_try
            profit_usd = profit_in_try / usd_to_try if usd_to_try > 0 else profit_in_try
        
        result.append({
            'id': product.id,
            'model_code': product.model_code,
            'name': product.name,
            'description': product.description,
            'default_currency': product.default_currency,
            'default_sale_price': float(product.default_sale_price or 0),
            'current_stock': product.current_stock,
            'last_purchase_price': float(last_purchase.unit_price) if last_purchase else None,
            'last_purchase_date': last_purchase.transaction.transaction_date.isoformat() if last_purchase and last_purchase.transaction else None,
            'last_purchase_currency': last_purchase.transaction.currency if last_purchase and last_purchase.transaction else None,
            'last_sale_price': float(last_sale.unit_price) if last_sale else None,
            'last_sale_date': last_sale.transaction.transaction_date.isoformat() if last_sale and last_sale.transaction else None,
            'last_sale_currency': last_sale.transaction.currency if last_sale and last_sale.transaction else None,
            'total_quantity_sold': total_quantity,
            'total_profit': total_profit,
            'total_profit_usd': round(profit_usd, 2),
            'total_revenue': total_revenue,
            'stock_by_warehouse': stock_by_warehouse
        })
    
    return result


@router.get("/warehouses/list")
async def list_warehouses(
    company_id: Optional[int] = None,
    current_user: User = Depends(require_permission("products", "view")),
    db: Session = Depends(get_db)
):
    """List all warehouses, optionally filtered by company"""
    query = db.query(Warehouse)
    if company_id:
        query = query.filter(Warehouse.company_id == company_id)
    warehouses = query.all()
    return [
        {
            'id': w.id,
            'code': w.code,
            'name': w.name,
            'company_id': w.company_id,
            'company_name': w.company.name if w.company else None
        }
        for w in warehouses
    ]


@router.get("/{product_id}", response_model=ProductDetail)
async def get_product(
    product_id: int,
    current_user: User = Depends(require_permission("products", "view")),
    db: Session = Depends(get_db)
):
    """Get product by ID with transaction items"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    return product


@router.get("/code/{model_code}", response_model=ProductWithCosts)
async def get_product_by_code(
    model_code: str,
    current_user: User = Depends(require_permission("products", "view")),
    db: Session = Depends(get_db)
):
    """Get product by model code"""
    product = db.query(Product).filter(Product.model_code == model_code).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    return product


@router.post("", response_model=ProductSchema)
async def create_product(
    product_data: ProductCreate,
    req: Request,
    current_user: User = Depends(require_permission("products", "create")),
    db: Session = Depends(get_db)
):
    """Create new product"""
    if db.query(Product).filter(Product.model_code == product_data.model_code).first():
        raise HTTPException(status_code=400, detail="Bu model kodu zaten kullanılıyor")
    
    product = Product(**product_data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        module="products",
        record_id=product.id,
        record_type="Product",
        new_values={"model_code": product.model_code, "name": product.name},
        description=f"Ürün oluşturuldu: {product.name}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return product


@router.put("/{product_id}", response_model=ProductSchema)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    req: Request,
    current_user: User = Depends(require_permission("products", "edit")),
    db: Session = Depends(get_db)
):
    """Update product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    old_values = {"model_code": product.model_code, "name": product.name}
    
    for field, value in product_data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="update",
        module="products",
        record_id=product.id,
        record_type="Product",
        old_values=old_values,
        new_values={"model_code": product.model_code, "name": product.name},
        description=f"Ürün güncellendi: {product.name}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    db.refresh(product)
    
    return product


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    req: Request,
    current_user: User = Depends(require_permission("products", "delete")),
    db: Session = Depends(get_db)
):
    """Delete product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    name = product.name
    db.delete(product)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        module="products",
        record_id=product_id,
        record_type="Product",
        old_values={"name": name},
        description=f"Ürün silindi: {name}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return {"message": "Ürün silindi"}


# ============ PRODUCT COSTS ============

@router.post("/{product_id}/costs", response_model=ProductCostSchema)
async def add_product_cost(
    product_id: int,
    cost_data: ProductCostCreate,
    current_user: User = Depends(require_permission("products", "edit")),
    db: Session = Depends(get_db)
):
    """Add cost entry for product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Ürün bulunamadı")
    
    cost_data.product_id = product_id
    cost = ProductCost(**cost_data.model_dump())
    db.add(cost)
    db.commit()
    db.refresh(cost)
    
    return cost


@router.put("/costs/{cost_id}", response_model=ProductCostSchema)
async def update_product_cost(
    cost_id: int,
    cost_data: ProductCostUpdate,
    current_user: User = Depends(require_permission("products", "edit")),
    db: Session = Depends(get_db)
):
    """Update product cost"""
    cost = db.query(ProductCost).filter(ProductCost.id == cost_id).first()
    if not cost:
        raise HTTPException(status_code=404, detail="Maliyet kaydı bulunamadı")
    
    for field, value in cost_data.model_dump(exclude_unset=True).items():
        setattr(cost, field, value)
    
    db.commit()
    db.refresh(cost)
    return cost


@router.delete("/costs/{cost_id}")
async def delete_product_cost(
    cost_id: int,
    current_user: User = Depends(require_permission("products", "delete")),
    db: Session = Depends(get_db)
):
    """Delete product cost"""
    cost = db.query(ProductCost).filter(ProductCost.id == cost_id).first()
    if not cost:
        raise HTTPException(status_code=404, detail="Maliyet kaydı bulunamadı")
    
    db.delete(cost)
    db.commit()
    return {"message": "Maliyet kaydı silindi"}

