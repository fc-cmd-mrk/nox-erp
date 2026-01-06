"""
Authentication Router
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.auth import verify_password, create_access_token, get_current_user
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.user import LoginRequest, LoginResponse, UserSchema

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, req: Request, db: Session = Depends(get_db)):
    """User login"""
    user = db.query(User).filter(User.username == request.username).first()
    
    if not user or not verify_password(request.password, user.hashed_password):
        # Log failed attempt
        log = AuditLog(
            username=request.username,
            action="login_failed",
            module="auth",
            description=f"Başarısız giriş denemesi: {request.username}",
            ip_address=req.client.host if req.client else None
        )
        db.add(log)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Kullanıcı adı veya şifre hatalı"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Kullanıcı devre dışı"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    
    # Log successful login
    log = AuditLog(
        user_id=user.id,
        username=user.username,
        action="login",
        module="auth",
        description=f"Kullanıcı giriş yaptı: {user.username}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    # Create token
    access_token = create_access_token(data={"sub": user.username})
    
    return LoginResponse(
        access_token=access_token,
        user=UserSchema.model_validate(user)
    )


@router.post("/logout")
async def logout(
    req: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """User logout"""
    # Log logout
    log = AuditLog(
        user_id=current_user.id,
        username=current_user.username,
        action="logout",
        module="auth",
        description=f"Kullanıcı çıkış yaptı: {current_user.username}",
        ip_address=req.client.host if req.client else None
    )
    db.add(log)
    db.commit()
    
    return {"message": "Başarıyla çıkış yapıldı"}


@router.get("/me", response_model=UserSchema)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return UserSchema.model_validate(current_user)

