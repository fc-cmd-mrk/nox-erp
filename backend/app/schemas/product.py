"""
Product Schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# Brief schemas for nested display
class TransactionItemBrief(BaseModel):
    """İşlem kalemi özet bilgisi"""
    id: int
    transaction_id: int
    quantity: Decimal
    unit_price: Decimal
    total_amount: Decimal
    profit: Decimal
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============ STOK GRUBU (ProductGroup) ============
class ProductGroupBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None


class ProductGroupCreate(ProductGroupBase):
    pass


class ProductGroupUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class ProductGroupSchema(ProductGroupBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProductGroupWithProducts(ProductGroupSchema):
    """Stok grubu ve ürünleri"""
    products: List["ProductSchema"] = []


# ============ KATEGORİ ============
class ProductCategoryBase(BaseModel):
    code: str
    name: str
    parent_id: Optional[int] = None


class ProductCategoryCreate(ProductCategoryBase):
    pass


class ProductCategoryUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    parent_id: Optional[int] = None
    is_active: Optional[bool] = None


class ProductCategorySchema(ProductCategoryBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProductCostBase(BaseModel):
    cost: Decimal
    currency: str = "TRY"


class ProductCostCreate(ProductCostBase):
    product_id: int
    supplier_id: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_default: bool = False


class ProductCostUpdate(BaseModel):
    cost: Optional[Decimal] = None
    currency: Optional[str] = None
    supplier_id: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class ProductCostSchema(ProductCostBase):
    id: int
    product_id: int
    supplier_id: Optional[int]
    valid_from: Optional[datetime]
    valid_until: Optional[datetime]
    is_default: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str


class ProductCreate(ProductBase):
    group_id: Optional[int] = None  # Stok Grubu
    category_id: Optional[int] = None
    default_sale_price: Decimal = Decimal("0")
    default_currency: str = "TRY"
    track_stock: bool = False
    description: Optional[str] = None
    barcode: Optional[str] = None
    unit: str = "Adet"


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    group_id: Optional[int] = None  # Stok Grubu
    category_id: Optional[int] = None
    default_sale_price: Optional[Decimal] = None
    default_currency: Optional[str] = None
    track_stock: Optional[bool] = None
    current_stock: Optional[int] = None
    description: Optional[str] = None
    barcode: Optional[str] = None
    unit: Optional[str] = None
    is_active: Optional[bool] = None


class ProductSchema(ProductBase):
    id: int
    group_id: Optional[int]
    category_id: Optional[int]
    default_sale_price: Decimal
    default_currency: str
    track_stock: bool
    current_stock: int
    description: Optional[str]
    barcode: Optional[str]
    unit: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class ProductWithCosts(ProductSchema):
    costs: List[ProductCostSchema] = []
    group: Optional[ProductGroupSchema] = None
    category: Optional[ProductCategorySchema] = None


class ProductDetail(ProductWithCosts):
    """Ürün detay görünümü - işlem kalemleri dahil"""
    transaction_items: List[TransactionItemBrief] = []


class ProductProfitAnalysis(BaseModel):
    product_id: int
    name: str
    group_name: Optional[str] = None
    total_sales: int
    total_revenue: Decimal
    total_cost: Decimal
    total_profit: Decimal
    profit_margin: Decimal


# Circular reference resolution
ProductGroupWithProducts.model_rebuild()

