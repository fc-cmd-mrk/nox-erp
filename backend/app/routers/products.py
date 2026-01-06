"""
Products Router
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.auth import require_permission
from app.models.user import User
from app.models.product import Product, ProductCost, ProductCategory
from app.models.audit_log import AuditLog
from app.schemas.product import (
    ProductSchema, ProductCreate, ProductUpdate, ProductWithCosts,
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


@router.get("/{product_id}", response_model=ProductWithCosts)
async def get_product(
    product_id: int,
    current_user: User = Depends(require_permission("products", "view")),
    db: Session = Depends(get_db)
):
    """Get product by ID"""
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

