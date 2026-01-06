#!/usr/bin/env python3
"""CSV Import Script for NOX ERP"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models.contact import Contact
from app.models.product import Product, ProductCategory
from app.models.transaction import Transaction, TransactionItem
from app.models.payment import Payment
from datetime import datetime
import uuid

# Database setup
DATABASE_URL = "sqlite:///nox_erp.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def generate_transaction_no():
    """Generate unique transaction number"""
    return f"TRX{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"

def generate_payment_no():
    """Generate unique payment number"""
    return f"PAY{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"

def import_stok_csv(file_path: str):
    """Import stok.csv (satış işlemleri)"""
    print(f"\n📦 Importing stok.csv from {file_path}...")
    
    db = SessionLocal()
    try:
        df = pd.read_csv(file_path)
        print(f"   Found {len(df)} records")
        
        # Track unique values
        customers = set()
        suppliers = set()
        products = set()
        imported_count = 0
        
        for idx, row in df.iterrows():
            # Get or create customer contact
            customer_name = str(row.get('musteri', '')).strip()
            if customer_name and customer_name not in customers:
                customers.add(customer_name)
                existing = db.query(Contact).filter(Contact.name == customer_name).first()
                if not existing:
                    contact = Contact(
                        code=f"C{len(customers):05d}",
                        name=customer_name,
                        contact_type="customer",
                        is_active=True
                    )
                    db.add(contact)
            
            # Get or create supplier contact
            supplier_name = str(row.get('tedarikci', '')).strip()
            if supplier_name and supplier_name not in suppliers:
                suppliers.add(supplier_name)
                existing = db.query(Contact).filter(Contact.name == supplier_name).first()
                if not existing:
                    contact = Contact(
                        code=f"S{len(suppliers):05d}",
                        name=supplier_name,
                        contact_type="supplier",
                        is_active=True
                    )
                    db.add(contact)
            
            # Get or create product
            model_code = str(row.get('modelkodu', '')).strip()
            if model_code and model_code not in products:
                products.add(model_code)
                existing = db.query(Product).filter(Product.model_code == model_code).first()
                if not existing:
                    product = Product(
                        model_code=model_code,
                        name=f"E-Pin {model_code}",
                        is_active=True
                    )
                    db.add(product)
            
            # Flush to get IDs
            db.flush()
            
            # Create transaction
            try:
                sale_date = datetime.strptime(str(row.get('satis', '')), '%Y-%m-%d %H:%M:%S')
            except:
                sale_date = datetime.now()
            
            cost = float(row.get('maliyet', 0) or 0)
            sale_price = float(row.get('satis_birim_fiyati', 0) or 0)
            quantity = int(row.get('adet', 1) or 1)
            
            # Get contact for transaction
            customer = db.query(Contact).filter(Contact.name == customer_name).first()
            product_obj = db.query(Product).filter(Product.model_code == model_code).first()
            
            # Create sale transaction
            trans_id = str(row.get('id', ''))
            existing_trans = db.query(Transaction).filter(Transaction.external_id == trans_id).first()
            if not existing_trans and customer and product_obj:
                profit = (sale_price - cost) * quantity
                profit_margin = ((sale_price - cost) / sale_price * 100) if sale_price > 0 else 0
                
                transaction = Transaction(
                    transaction_no=generate_transaction_no(),
                    external_id=trans_id,
                    transaction_type="sale",
                    company_id=1,
                    contact_id=customer.id if customer else None,
                    transaction_date=sale_date,
                    currency="TRY",
                    exchange_rate=1.0,
                    subtotal=sale_price * quantity,
                    tax_amount=0,
                    discount_amount=0,
                    total_amount=sale_price * quantity,
                    status="completed",
                    is_paid=True,
                    paid_amount=sale_price * quantity,
                    notes=f"Sipariş: {row.get('siparisid', '')}, Tedarikçi: {supplier_name}"
                )
                db.add(transaction)
                db.flush()
                
                # Create transaction item
                item = TransactionItem(
                    transaction_id=transaction.id,
                    product_id=product_obj.id if product_obj else None,
                    quantity=quantity,
                    unit_price=sale_price,
                    cost_price=cost,
                    tax_percent=0,
                    tax_amount=0,
                    discount_percent=0,
                    discount_amount=0,
                    total_amount=sale_price * quantity,
                    profit=profit,
                    profit_margin=profit_margin
                )
                db.add(item)
                imported_count += 1
            
            if idx % 100 == 0:
                db.commit()
                print(f"   Processed {idx + 1} records...")
        
        db.commit()
        print(f"✅ Imported: {len(customers)} customers, {len(suppliers)} suppliers, {len(products)} products, {imported_count} transactions")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def import_odeme_csv(file_path: str):
    """Import odeme.csv (ödemeler)"""
    print(f"\n💳 Importing odeme.csv from {file_path}...")
    
    db = SessionLocal()
    try:
        df = pd.read_csv(file_path)
        print(f"   Found {len(df)} records")
        
        customers = set()
        imported_count = 0
        
        for idx, row in df.iterrows():
            # Get or create customer
            customer_name = str(row.get('uye_isim', '')).strip()
            if customer_name and customer_name not in customers:
                customers.add(customer_name)
                existing = db.query(Contact).filter(Contact.name == customer_name).first()
                if not existing:
                    contact = Contact(
                        code=f"C{abs(hash(customer_name)) % 100000:05d}",
                        name=customer_name,
                        contact_type="customer",
                        is_active=True
                    )
                    db.add(contact)
            
            # Get payment channel
            channel = str(row.get('kanal', '')).strip()
            if 'GPAY' in channel:
                payment_channel = 'gpay'
            elif 'PayTR' in channel:
                payment_channel = 'paytr'
            elif 'Havale' in channel or 'EFT' in channel:
                payment_channel = 'bank_transfer'
            elif 'Kripto' in channel or 'USDT' in channel:
                payment_channel = 'crypto'
            elif 'Kredi' in channel:
                payment_channel = 'credit_card'
            else:
                payment_channel = 'other'
            
            # Parse date
            try:
                payment_date = datetime.strptime(str(row.get('tarih', '')), '%Y-%m-%d %H:%M:%S')
            except:
                payment_date = datetime.now()
            
            amount = float(row.get('tutar', 0) or 0)
            
            # Get contact
            db.flush()
            customer = db.query(Contact).filter(Contact.name == customer_name).first()
            
            # Create payment
            payment_id = str(row.get('bakiyeid', ''))
            existing_payment = db.query(Payment).filter(Payment.external_id == payment_id).first()
            if not existing_payment:
                payment = Payment(
                    payment_no=generate_payment_no(),
                    external_id=payment_id,
                    payment_type="incoming",
                    contact_id=customer.id if customer else None,
                    payment_date=payment_date,
                    due_date=payment_date,
                    currency="TRY",
                    exchange_rate=1.0,
                    amount=amount,
                    base_amount=amount,
                    payment_channel=payment_channel,
                    status="completed",
                    reference_no=payment_id,
                    description=f"Kanal: {channel}"
                )
                db.add(payment)
                imported_count += 1
            
            if idx % 50 == 0:
                db.commit()
                print(f"   Processed {idx + 1} records...")
        
        db.commit()
        print(f"✅ Imported {imported_count} payments from {len(customers)} customers")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

def import_epin_alis_csv(file_path: str):
    """Import epin alış (satın alma işlemleri)"""
    print(f"\n🛒 Importing epin alış from {file_path}...")
    
    db = SessionLocal()
    try:
        df = pd.read_csv(file_path)
        print(f"   Found {len(df)} records")
        
        suppliers = set()
        products = set()
        imported_count = 0
        
        for idx, row in df.iterrows():
            # Get or create supplier
            supplier_name = str(row.get('tedarikci', '')).strip()
            if supplier_name and supplier_name not in suppliers:
                suppliers.add(supplier_name)
                existing = db.query(Contact).filter(Contact.name == supplier_name).first()
                if not existing:
                    contact = Contact(
                        code=f"S{abs(hash(supplier_name)) % 100000:05d}",
                        name=supplier_name,
                        contact_type="supplier",
                        is_active=True
                    )
                    db.add(contact)
            
            # Get or create product
            model_code = str(row.get('modelkodu', '')).strip()
            product_name = str(row.get('urunadi', '')).strip()
            if model_code and model_code not in products:
                products.add(model_code)
                existing = db.query(Product).filter(Product.model_code == model_code).first()
                if not existing:
                    product = Product(
                        model_code=model_code,
                        name=product_name or f"E-Pin {model_code}",
                        is_active=True
                    )
                    db.add(product)
                elif product_name and existing.name != product_name:
                    existing.name = product_name
            
            # Flush to get IDs
            db.flush()
            
            # Parse date
            try:
                purchase_date = datetime.strptime(str(row.get('tarih', '')), '%Y-%m-%d %H:%M:%S')
            except:
                purchase_date = datetime.now()
            
            cost = float(row.get('maliyet', 0) or 0)
            quantity = int(row.get('adet', 1) or 1)
            
            # Get supplier and product
            supplier = db.query(Contact).filter(Contact.name == supplier_name).first()
            product_obj = db.query(Product).filter(Product.model_code == model_code).first()
            
            # Create purchase transaction
            epin_id = str(row.get('epinid', ''))
            existing_trans = db.query(Transaction).filter(Transaction.external_id == f"P{epin_id}").first()
            if not existing_trans and supplier and product_obj:
                transaction = Transaction(
                    transaction_no=generate_transaction_no(),
                    external_id=f"P{epin_id}",
                    transaction_type="purchase",
                    company_id=1,
                    contact_id=supplier.id,
                    transaction_date=purchase_date,
                    currency="TRY",
                    exchange_rate=1.0,
                    subtotal=cost * quantity,
                    tax_amount=0,
                    discount_amount=0,
                    total_amount=cost * quantity,
                    status="completed",
                    is_paid=True,
                    paid_amount=cost * quantity,
                    notes=f"Ürün: {product_name}"
                )
                db.add(transaction)
                db.flush()
                
                # Create transaction item
                item = TransactionItem(
                    transaction_id=transaction.id,
                    product_id=product_obj.id,
                    quantity=quantity,
                    unit_price=cost,
                    cost_price=cost,
                    tax_percent=0,
                    tax_amount=0,
                    discount_percent=0,
                    discount_amount=0,
                    total_amount=cost * quantity,
                    profit=0,
                    profit_margin=0
                )
                db.add(item)
                imported_count += 1
            
            if idx % 100 == 0:
                db.commit()
                print(f"   Processed {idx + 1} records...")
        
        db.commit()
        print(f"✅ Imported {imported_count} purchase records, {len(suppliers)} suppliers, {len(products)} products")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    base_path = "/Users/kemalgursoy/Desktop/Cursor/Nox ERP"
    
    print("=" * 50)
    print("NOX ERP - CSV Import")
    print("=" * 50)
    
    # Import stok.csv (satış işlemleri)
    stok_file = os.path.join(base_path, "stok.csv")
    if os.path.exists(stok_file):
        import_stok_csv(stok_file)
    else:
        print(f"⚠️ stok.csv not found at {stok_file}")
    
    # Import odeme.csv (ödemeler)
    odeme_file = os.path.join(base_path, "odeme (1).csv")
    if os.path.exists(odeme_file):
        import_odeme_csv(odeme_file)
    else:
        print(f"⚠️ odeme.csv not found at {odeme_file}")
    
    # Import epin alış (satın alma)
    epin_file = os.path.join(base_path, "sqllab_stok_20260106T144915.csv")
    if os.path.exists(epin_file):
        import_epin_alis_csv(epin_file)
    else:
        print(f"⚠️ epin alış file not found at {epin_file}")
    
    print("\n" + "=" * 50)
    print("✅ Import completed!")
    print("=" * 50)
