"""
Users Router
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.auth import get_current_user, get_password_hash, require_permission
from app.models.user import User, Role, Permission, RolePermission
from app.models.audit_log import AuditLog
from app.schemas.user import (
    UserSchema, UserCreate, UserUpdate, UserWithRole,
    RoleSchema, RoleCreate, RoleUpdate, RoleWithPermissions,
    PermissionSchema
)

router = APIRouter(prefix="/users", tags=["Users"])


# ============ USERS ============

@router.get("", response_model=List[UserWithRole])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_permission("users", "view")),
    db: Session = Depends(get_db)
):
    """List all users"""
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserWithRole)
async def get_user(
    user_id: int,
    current_user: User = Depends(require_permission("users", "view")),
    db: Session = Depends(get_db)
):
    """Get user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return user


@router.post("", response_model=UserSchema)
async def create_user(
    user_data: UserCreate,
    req: Request,
    current_user: User = Depends(require_permission("users", "create")),
    db: Session = Depends(get_db)
):
    """Create new user"""
    # Check if username exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Bu kullanıcı adı zaten kullanılıyor")
    
    # Check if email exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Bu email zaten kullanılıyor")
    
    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        role_id=user_data.role_id,
        company_id=user_data.company_id,
        is_superuser=user_data.is_superuser
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        module="users",
        record_id=user.id,
        record_type="User",
        new_values={"username": user.username, "email": user.email},
        description=f"Kullanıcı oluşturuldu: {user.username}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return user


@router.put("/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    req: Request,
    current_user: User = Depends(require_permission("users", "edit")),
    db: Session = Depends(get_db)
):
    """Update user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    old_values = {"username": user.username, "email": user.email}
    
    # Update fields
    update_data = user_data.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="update",
        module="users",
        record_id=user.id,
        record_type="User",
        old_values=old_values,
        new_values={"username": user.username, "email": user.email},
        description=f"Kullanıcı güncellendi: {user.username}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    req: Request,
    current_user: User = Depends(require_permission("users", "delete")),
    db: Session = Depends(get_db)
):
    """Delete user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Kendinizi silemezsiniz")
    
    username = user.username
    db.delete(user)
    
    # Log
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        module="users",
        record_id=user_id,
        record_type="User",
        old_values={"username": username},
        description=f"Kullanıcı silindi: {username}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return {"message": "Kullanıcı silindi"}


# ============ ROLES ============

@router.get("/roles/list", response_model=List[RoleWithPermissions])
async def list_roles(
    current_user: User = Depends(require_permission("users", "view")),
    db: Session = Depends(get_db)
):
    """List all roles"""
    roles = db.query(Role).all()
    return roles


@router.post("/roles", response_model=RoleSchema)
async def create_role(
    role_data: RoleCreate,
    current_user: User = Depends(require_permission("users", "create")),
    db: Session = Depends(get_db)
):
    """Create new role"""
    role = Role(**role_data.model_dump())
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.put("/roles/{role_id}", response_model=RoleSchema)
async def update_role(
    role_id: int,
    role_data: RoleUpdate,
    current_user: User = Depends(require_permission("users", "edit")),
    db: Session = Depends(get_db)
):
    """Update role"""
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Rol bulunamadı")
    
    for field, value in role_data.model_dump(exclude_unset=True).items():
        setattr(role, field, value)
    
    db.commit()
    db.refresh(role)
    return role


@router.post("/roles/{role_id}/permissions/{permission_id}")
async def add_role_permission(
    role_id: int,
    permission_id: int,
    current_user: User = Depends(require_permission("users", "edit")),
    db: Session = Depends(get_db)
):
    """Add permission to role"""
    # Check if already exists
    existing = db.query(RolePermission).filter(
        RolePermission.role_id == role_id,
        RolePermission.permission_id == permission_id
    ).first()
    
    if existing:
        return {"message": "İzin zaten tanımlı"}
    
    rp = RolePermission(role_id=role_id, permission_id=permission_id)
    db.add(rp)
    db.commit()
    return {"message": "İzin eklendi"}


@router.delete("/roles/{role_id}/permissions/{permission_id}")
async def remove_role_permission(
    role_id: int,
    permission_id: int,
    current_user: User = Depends(require_permission("users", "edit")),
    db: Session = Depends(get_db)
):
    """Remove permission from role"""
    rp = db.query(RolePermission).filter(
        RolePermission.role_id == role_id,
        RolePermission.permission_id == permission_id
    ).first()
    
    if rp:
        db.delete(rp)
        db.commit()
    
    return {"message": "İzin kaldırıldı"}


# ============ PERMISSIONS ============

@router.get("/permissions/list", response_model=List[PermissionSchema])
async def list_permissions(
    current_user: User = Depends(require_permission("users", "view")),
    db: Session = Depends(get_db)
):
    """List all permissions"""
    permissions = db.query(Permission).all()
    return permissions

