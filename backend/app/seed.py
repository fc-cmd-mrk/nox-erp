"""
Seed Initial Data
"""
from sqlalchemy.orm import Session
from app.auth import get_password_hash
from app.models.user import User, Role, Permission, RolePermission
from app.models.company import Company, Warehouse
from app.models.settings import Currency, SystemSettings


def seed_initial_data(db: Session):
    """Seed initial data if not exists"""
    
    # Check if already seeded
    if db.query(Role).first():
        print("📦 Data already seeded, skipping...")
        return
    
    print("🌱 Seeding initial data...")
    
    # ============ PERMISSIONS ============
    modules = [
        "users", "companies", "contacts", "products", 
        "transactions", "accounts", "payments", "reports", "settings"
    ]
    actions = ["view", "create", "edit", "delete"]
    
    permissions = []
    for module in modules:
        for action in actions:
            perm = Permission(
                module=module,
                action=action,
                name=f"{module}.{action}",
                display_name=f"{module.title()} - {action.title()}"
            )
            db.add(perm)
            permissions.append(perm)
    
    db.flush()
    
    # ============ ROLES ============
    roles_data = [
        {"name": "super_admin", "display_name": "Süper Admin", "description": "Tüm yetkiler"},
        {"name": "admin", "display_name": "Admin", "description": "Yönetici yetkileri"},
        {"name": "accountant", "display_name": "Muhasebe", "description": "Muhasebe yetkileri"},
        {"name": "sales", "display_name": "Satış", "description": "Satış yetkileri"},
        {"name": "purchasing", "display_name": "Satın Alma", "description": "Satın alma yetkileri"},
        {"name": "viewer", "display_name": "Görüntüleyici", "description": "Sadece okuma"}
    ]
    
    roles = {}
    for role_data in roles_data:
        role = Role(**role_data)
        db.add(role)
        roles[role_data["name"]] = role
    
    db.flush()
    
    # ============ ROLE PERMISSIONS ============
    # Super Admin - All permissions
    for perm in permissions:
        rp = RolePermission(role_id=roles["super_admin"].id, permission_id=perm.id)
        db.add(rp)
    
    # Admin - All except user management
    for perm in permissions:
        if perm.module != "users" or perm.action == "view":
            rp = RolePermission(role_id=roles["admin"].id, permission_id=perm.id)
            db.add(rp)
    
    # Accountant - Contacts, Transactions, Payments, Reports
    accountant_modules = ["contacts", "transactions", "payments", "reports", "accounts"]
    for perm in permissions:
        if perm.module in accountant_modules:
            rp = RolePermission(role_id=roles["accountant"].id, permission_id=perm.id)
            db.add(rp)
    
    # Sales - Products, Transactions (view, create), Contacts (view, create)
    for perm in permissions:
        if perm.module == "products" and perm.action in ["view", "create"]:
            rp = RolePermission(role_id=roles["sales"].id, permission_id=perm.id)
            db.add(rp)
        elif perm.module == "transactions" and perm.action in ["view", "create"]:
            rp = RolePermission(role_id=roles["sales"].id, permission_id=perm.id)
            db.add(rp)
        elif perm.module == "contacts" and perm.action in ["view", "create"]:
            rp = RolePermission(role_id=roles["sales"].id, permission_id=perm.id)
            db.add(rp)
        elif perm.module == "reports" and perm.action == "view":
            rp = RolePermission(role_id=roles["sales"].id, permission_id=perm.id)
            db.add(rp)
    
    # Viewer - View only
    for perm in permissions:
        if perm.action == "view":
            rp = RolePermission(role_id=roles["viewer"].id, permission_id=perm.id)
            db.add(rp)
    
    db.flush()
    
    # ============ COMPANIES ============
    companies_data = [
        {"code": "AG", "name": "Agetekno", "country": "Türkiye", "country_code": "TR", "default_currency": "TRY"},
        {"code": "DI", "name": "Dijiplus", "country": "Türkiye", "country_code": "TR", "default_currency": "TRY"},
        {"code": "PA", "name": "Pasific", "country": "Dubai", "country_code": "AE", "default_currency": "USD"},
        {"code": "KE", "name": "Keybyte", "country": "Dubai", "country_code": "AE", "default_currency": "USD"},
        {"code": "WE", "name": "Webzon", "country": "Kıbrıs", "country_code": "CY", "default_currency": "EUR"},
        {"code": "NO", "name": "Noxbyte", "country": "Kıbrıs", "country_code": "CY", "default_currency": "EUR"},
        {"code": "BB", "name": "BBVOID", "country": "Kıbrıs", "country_code": "CY", "default_currency": "EUR"},
        {"code": "AGN", "name": "Agenzon", "country": "Kıbrıs", "country_code": "CY", "default_currency": "EUR"},
        {"code": "PB", "name": "Paybyte", "country": "Estonya", "country_code": "EE", "default_currency": "EUR"},
        {"code": "B2C", "name": "B2C Müşteri", "full_name": "B2C Müşteri Hesabı", "country": "Türkiye", "country_code": "TR", "default_currency": "TRY"},
        {"code": "B2B", "name": "B2B Müşteri", "full_name": "B2B Müşteri Hesabı", "country": "Türkiye", "country_code": "TR", "default_currency": "TRY"},
    ]
    
    for company_data in companies_data:
        company = Company(**company_data)
        db.add(company)
        db.flush()
        
        # Create default warehouse
        warehouse = Warehouse(
            company_id=company.id,
            code="MAIN",
            name="Ana Depo",
            is_default=True
        )
        db.add(warehouse)
    
    db.flush()
    
    # ============ CURRENCIES ============
    currencies_data = [
        {"code": "TRY", "name": "Türk Lirası", "symbol": "₺", "is_default": True},
        {"code": "USD", "name": "Amerikan Doları", "symbol": "$"},
        {"code": "EUR", "name": "Euro", "symbol": "€"},
        {"code": "GBP", "name": "İngiliz Sterlini", "symbol": "£"},
        {"code": "USDT", "name": "Tether", "symbol": "₮", "is_crypto": True, "decimal_places": 4},
    ]
    
    for curr_data in currencies_data:
        currency = Currency(**curr_data)
        db.add(currency)
    
    # ============ SYSTEM SETTINGS ============
    settings_data = [
        {"key": "company_name", "value": "NOX ERP", "category": "general", "description": "Şirket adı", "is_public": True},
        {"key": "default_currency", "value": "TRY", "category": "general", "description": "Varsayılan para birimi", "is_public": True},
        {"key": "tax_rate", "value": "20", "value_type": "number", "category": "finance", "description": "Varsayılan KDV oranı"},
        {"key": "decimal_places", "value": "2", "value_type": "number", "category": "general", "description": "Ondalık basamak sayısı"},
    ]
    
    for setting_data in settings_data:
        setting = SystemSettings(**setting_data)
        db.add(setting)
    
    # ============ USERS ============
    users_data = [
        {
            "username": "admin",
            "email": "admin@noxerp.com",
            "full_name": "Sistem Admin",
            "password": "admin123",
            "role_name": "super_admin",
            "is_superuser": True
        },
        {
            "username": "muhasebe",
            "email": "muhasebe@noxerp.com",
            "full_name": "Muhasebe Kullanıcı",
            "password": "muhasebe123",
            "role_name": "accountant"
        },
        {
            "username": "satis",
            "email": "satis@noxerp.com",
            "full_name": "Satış Kullanıcı",
            "password": "satis123",
            "role_name": "sales"
        },
        {
            "username": "viewer",
            "email": "viewer@noxerp.com",
            "full_name": "Görüntüleyici",
            "password": "viewer123",
            "role_name": "viewer"
        }
    ]
    
    # Get first company
    first_company = db.query(Company).first()
    
    for user_data in users_data:
        role = roles[user_data.pop("role_name")]
        password = user_data.pop("password")
        
        user = User(
            **user_data,
            hashed_password=get_password_hash(password),
            role_id=role.id,
            company_id=first_company.id if first_company else None
        )
        db.add(user)
    
    db.commit()
    print("✅ Initial data seeded successfully!")

