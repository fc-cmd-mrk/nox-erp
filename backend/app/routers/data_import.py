"""
Data Import/Export Router
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
import pandas as pd
import io
from datetime import datetime
from app.database import get_db, Base, engine
from app.auth import require_permission, get_current_user
from app.models.user import User
from app.models.company import Company, Warehouse
from app.models.contact import Contact, ContactAccount
from app.models.product import Product, ProductCost
from app.models.transaction import Transaction, TransactionItem
from app.models.payment import Payment
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/data", tags=["Data Import/Export"])


def parse_file(file: UploadFile) -> pd.DataFrame:
    """Parse uploaded file to DataFrame"""
    content = file.file.read()
    file_ext = file.filename.split(".")[-1].lower()
    
    if file_ext == "csv":
        return pd.read_csv(io.BytesIO(content))
    elif file_ext in ["xls", "xlsx"]:
        return pd.read_excel(io.BytesIO(content))
    elif file_ext == "xml":
        return pd.read_xml(io.BytesIO(content))
    else:
        raise HTTPException(status_code=400, detail="Desteklenmeyen dosya formatı")


@router.post("/import/contacts")
async def import_contacts(
    file: UploadFile = File(...),
    req: Request = None,
    current_user: User = Depends(require_permission("contacts", "create")),
    db: Session = Depends(get_db)
):
    """Import contacts from file"""
    df = parse_file(file)
    
    imported = 0
    errors = []
    
    for idx, row in df.iterrows():
        try:
            # Check required fields
            if "code" not in row or "name" not in row:
                errors.append(f"Satır {idx + 1}: code ve name alanları gerekli")
                continue
            
            # Skip if exists
            if db.query(Contact).filter(Contact.code == row["code"]).first():
                errors.append(f"Satır {idx + 1}: {row['code']} zaten mevcut")
                continue
            
            contact = Contact(
                code=str(row["code"]),
                name=str(row["name"]),
                contact_type=row.get("contact_type", "both"),
                company_name=row.get("company_name"),
                email=row.get("email"),
                phone=row.get("phone"),
                address=row.get("address"),
                city=row.get("city"),
                country=row.get("country"),
                default_currency=row.get("default_currency", "TRY")
            )
            db.add(contact)
            db.flush()
            
            # Create default account
            account = ContactAccount(
                contact_id=contact.id,
                currency=contact.default_currency,
                balance=0
            )
            db.add(account)
            imported += 1
            
        except Exception as e:
            errors.append(f"Satır {idx + 1}: {str(e)}")
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="import",
        module="contacts",
        description=f"Cari import: {imported} kayıt, {len(errors)} hata",
        ip_address=req.client.host if req and req.client else None
    )
    db.add(log)
    db.commit()
    
    return {
        "imported": imported,
        "errors": errors[:20]  # Limit error messages
    }


@router.post("/import/products")
async def import_products(
    file: UploadFile = File(...),
    req: Request = None,
    current_user: User = Depends(require_permission("products", "create")),
    db: Session = Depends(get_db)
):
    """Import products from file"""
    df = parse_file(file)
    
    imported = 0
    errors = []
    
    for idx, row in df.iterrows():
        try:
            model_code = str(row.get("model_code") or row.get("modelkodu", ""))
            name = str(row.get("name") or row.get("urunadi", ""))
            
            if not model_code or not name:
                errors.append(f"Satır {idx + 1}: model_code ve name alanları gerekli")
                continue
            
            # Check if exists
            existing = db.query(Product).filter(Product.model_code == model_code).first()
            if existing:
                errors.append(f"Satır {idx + 1}: {model_code} zaten mevcut")
                continue
            
            product = Product(
                model_code=model_code,
                name=name,
                default_sale_price=float(row.get("sale_price", row.get("satis_birim_fiyati", 0)) or 0),
                default_currency="TRY"
            )
            db.add(product)
            imported += 1
            
        except Exception as e:
            errors.append(f"Satır {idx + 1}: {str(e)}")
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="import",
        module="products",
        description=f"Ürün import: {imported} kayıt, {len(errors)} hata",
        ip_address=req.client.host if req and req.client else None
    )
    db.add(log)
    db.commit()
    
    return {
        "imported": imported,
        "errors": errors[:20]
    }


@router.post("/import/transactions")
async def import_transactions(
    file: UploadFile = File(...),
    transaction_type: str = "sale",  # sale or purchase
    company_id: int = 1,
    req: Request = None,
    current_user: User = Depends(require_permission("transactions", "create")),
    db: Session = Depends(get_db)
):
    """Import transactions from CSV (stok.csv format)"""
    df = parse_file(file)
    
    imported = 0
    errors = []
    
    # Group by order ID
    order_col = "siparisid" if "siparisid" in df.columns else "order_id"
    
    if order_col not in df.columns:
        # Single items, create individual transactions
        for idx, row in df.iterrows():
            try:
                # Generate transaction number
                trans_no = f"IMP{datetime.now().strftime('%Y%m%d')}{idx:04d}"
                
                # Find or create product
                model_code = str(row.get("modelkodu", row.get("model_code", "")))
                if model_code:
                    product = db.query(Product).filter(Product.model_code == model_code).first()
                    if not product:
                        product = Product(
                            model_code=model_code,
                            name=str(row.get("urunadi", row.get("name", model_code)))
                        )
                        db.add(product)
                        db.flush()
                
                # Create transaction
                transaction = Transaction(
                    transaction_no=trans_no,
                    external_id=str(row.get("id", row.get("epinid", ""))),
                    transaction_type=transaction_type,
                    company_id=company_id,
                    currency="TRY"
                )
                db.add(transaction)
                db.flush()
                
                # Create item
                cost = float(row.get("maliyet", row.get("cost", 0)) or 0)
                price = float(row.get("satis_birim_fiyati", row.get("price", cost)) or cost)
                qty = int(row.get("adet", row.get("quantity", 1)) or 1)
                
                item = TransactionItem(
                    transaction_id=transaction.id,
                    product_id=product.id if product else None,
                    quantity=qty,
                    unit_price=price,
                    cost_price=cost,
                    total_amount=price * qty,
                    profit=(price - cost) * qty,
                    profit_margin=((price - cost) / price * 100) if price > 0 else 0
                )
                db.add(item)
                
                transaction.total_amount = price * qty
                imported += 1
                
            except Exception as e:
                errors.append(f"Satır {idx + 1}: {str(e)}")
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="import",
        module="transactions",
        description=f"İşlem import: {imported} kayıt, {len(errors)} hata",
        ip_address=req.client.host if req and req.client else None
    )
    db.add(log)
    db.commit()
    
    return {
        "imported": imported,
        "errors": errors[:20]
    }


@router.post("/import/payments")
async def import_payments(
    file: UploadFile = File(...),
    req: Request = None,
    current_user: User = Depends(require_permission("payments", "create")),
    db: Session = Depends(get_db)
):
    """Import payments from CSV (odeme.csv format)"""
    df = parse_file(file)
    
    imported = 0
    errors = []
    
    for idx, row in df.iterrows():
        try:
            payment_no = f"IMP{datetime.now().strftime('%Y%m%d')}{idx:04d}"
            
            # Determine payment channel
            channel_map = {
                "GPAY": "gpay",
                "PayTR": "paytr",
                "Kredi Kartı": "credit_card",
                "Havale": "bank_transfer",
                "Nakit": "cash"
            }
            
            kanal = str(row.get("kanal", ""))
            payment_channel = "other"
            for key, value in channel_map.items():
                if key.lower() in kanal.lower():
                    payment_channel = value
                    break
            
            payment = Payment(
                payment_no=payment_no,
                external_id=str(row.get("bakiyeid", "")),
                payment_type="incoming",
                payment_channel=payment_channel,
                currency="TRY",
                amount=float(row.get("tutar", 0) or 0),
                description=f"{row.get('uye_isim', '')} - {kanal}",
                status="completed"
            )
            
            # Parse date
            tarih = row.get("tarih")
            if tarih:
                try:
                    payment.payment_date = pd.to_datetime(tarih)
                except:
                    payment.payment_date = datetime.now()
            
            db.add(payment)
            imported += 1
            
        except Exception as e:
            errors.append(f"Satır {idx + 1}: {str(e)}")
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="import",
        module="payments",
        description=f"Ödeme import: {imported} kayıt, {len(errors)} hata",
        ip_address=req.client.host if req and req.client else None
    )
    db.add(log)
    db.commit()
    
    return {
        "imported": imported,
        "errors": errors[:20]
    }


# ============ EXPORT ============

@router.get("/export/{model}")
async def export_data(
    model: str,
    format: str = "csv",  # csv, xlsx, xml
    req: Request = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export data to file"""
    model_map = {
        "contacts": Contact,
        "products": Product,
        "transactions": Transaction,
        "payments": Payment
    }
    
    # Column headers for each model (Turkish)
    column_headers = {
        "contacts": {
            "id": "ID", "code": "Kod", "name": "Ad", "contact_type": "Tip",
            "company_name": "Firma Adı", "tax_number": "Vergi No", "tax_office": "Vergi Dairesi",
            "email": "Email", "phone": "Telefon", "mobile": "Mobil", "address": "Adres",
            "city": "Şehir", "country": "Ülke", "payment_term_days": "Vade (Gün)",
            "credit_limit": "Kredi Limiti", "default_currency": "Para Birimi",
            "notes": "Notlar", "is_active": "Aktif", "created_at": "Oluşturma Tarihi", "updated_at": "Güncelleme Tarihi"
        },
        "products": {
            "id": "ID", "model_code": "Model Kodu", "name": "Ürün Adı", "barcode": "Barkod",
            "category": "Kategori", "brand": "Marka", "purchase_price": "Alış Fiyatı",
            "sale_price": "Satış Fiyatı", "stock_quantity": "Stok Miktarı", "unit": "Birim",
            "is_active": "Aktif", "created_at": "Oluşturma Tarihi", "updated_at": "Güncelleme Tarihi"
        },
        "transactions": {
            "id": "ID", "transaction_no": "İşlem No", "external_id": "Harici ID",
            "transaction_type": "İşlem Tipi", "company_id": "Şirket ID", "contact_id": "Cari ID",
            "transaction_date": "İşlem Tarihi", "due_date": "Vade Tarihi",
            "currency": "Para Birimi", "subtotal": "Ara Toplam", "tax_amount": "KDV Tutarı",
            "discount_amount": "İndirim", "total_amount": "Toplam Tutar",
            "paid_amount": "Ödenen", "is_paid": "Ödendi", "exchange_rate": "Kur",
            "notes": "Notlar", "status": "Durum", "created_at": "Oluşturma Tarihi"
        },
        "payments": {
            "id": "ID", "payment_no": "Ödeme No", "external_id": "Harici ID",
            "transaction_id": "İşlem ID", "contact_id": "Cari ID", "account_id": "Hesap ID",
            "payment_type": "Ödeme Tipi", "payment_channel": "Ödeme Kanalı",
            "currency": "Para Birimi", "amount": "Tutar", "exchange_rate": "Kur",
            "base_amount": "TRY Tutarı", "due_date": "Vade Tarihi", "is_advance": "Avans",
            "status": "Durum", "reference_no": "Referans No", "description": "Açıklama",
            "payment_date": "Ödeme Tarihi", "created_at": "Oluşturma Tarihi"
        }
    }
    
    if model not in model_map:
        raise HTTPException(status_code=400, detail="Geçersiz model")
    
    # Get data
    records = db.query(model_map[model]).all()
    
    # Get column names from model
    model_columns = [column.name for column in model_map[model].__table__.columns]
    
    # Convert to DataFrame
    data = []
    for record in records:
        row = {}
        for column in model_columns:
            value = getattr(record, column, None)
            if isinstance(value, datetime):
                value = value.isoformat()
            row[column] = value
        data.append(row)
    
    # Create DataFrame with columns even if no data
    if data:
        df = pd.DataFrame(data)
    else:
        # Empty DataFrame with columns
        df = pd.DataFrame(columns=model_columns)
    
    # Rename columns to Turkish if headers available
    if model in column_headers:
        rename_map = {k: v for k, v in column_headers[model].items() if k in df.columns}
        df = df.rename(columns=rename_map)
    
    # Create file
    output = io.BytesIO()
    
    if format == "csv":
        df.to_csv(output, index=False)
        media_type = "text/csv"
        ext = "csv"
    elif format == "xlsx":
        df.to_excel(output, index=False, engine="openpyxl")
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        ext = "xlsx"
    elif format == "xml":
        df.to_xml(output, index=False)
        media_type = "application/xml"
        ext = "xml"
    else:
        raise HTTPException(status_code=400, detail="Desteklenmeyen format")
    
    output.seek(0)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="export",
        module=model,
        description=f"{model} export: {len(records)} kayıt, format: {format}",
        ip_address=req.client.host if req and req.client else None
    )
    db.add(log)
    db.commit()
    
    filename = f"{model}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{ext}"
    
    return StreamingResponse(
        output,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============ TEST DATA CLEANUP ============

@router.delete("/clear-all")
async def clear_all_data(
    confirm: str = "no",
    req: Request = None,
    current_user: User = Depends(require_permission("settings", "delete")),
    db: Session = Depends(get_db)
):
    """Clear all data (TEST ONLY)"""
    if confirm != "CONFIRM_DELETE_ALL":
        raise HTTPException(
            status_code=400, 
            detail="Tüm verileri silmek için confirm='CONFIRM_DELETE_ALL' parametresi gerekli"
        )
    
    # Delete in correct order to respect foreign keys
    db.query(TransactionItem).delete()
    db.query(Transaction).delete()
    db.query(Payment).delete()
    db.query(ProductCost).delete()
    db.query(Product).delete()
    db.query(ContactAccount).delete()
    db.query(Contact).delete()
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="clear_all",
        module="system",
        description="Tüm veriler silindi (test)",
        ip_address=req.client.host if req and req.client else None
    )
    db.add(log)
    db.commit()
    
    return {"message": "Tüm veriler silindi"}

