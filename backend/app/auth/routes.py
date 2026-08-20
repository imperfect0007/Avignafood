from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload

from app.audit.service import write_audit
from app.core.database import engine, get_db
from app.core.deps import AuthContext, get_auth
from app.core.models import User
from app.core.schemas import MeOut, MeProfileUpdate, TokenOut, UserOut
from app.sales.ensure_schema import ensure_sales_schema
from app.core.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        phone=user.phone,
        organization_id=user.organization_id,
        role=user.role.name.value,
        is_active=user.is_active,
        company_ids=[uc.company_id for uc in user.companies],
    )


@router.post("/login", response_model=TokenOut)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.companies))
        .filter(User.email == form.username)
        .first()
    )
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive")
    token = create_access_token({"sub": str(user.id)})
    write_audit(
        db,
        action="login",
        entity_type="user",
        entity_id=user.id,
        organization_id=user.organization_id,
        user_id=user.id,
    )
    db.commit()
    return TokenOut(access_token=token)


@router.get("/me", response_model=MeOut)
def me(auth: AuthContext = Depends(get_auth)):
    return MeOut(user=_user_out(auth.user), permissions=sorted(auth.permissions))


@router.patch("/me", response_model=MeOut)
def update_me(
    body: MeProfileUpdate,
    auth: AuthContext = Depends(get_auth),
    db: Session = Depends(get_db),
):
    ensure_sales_schema(engine)
    phone = (body.phone or "").strip() or None
    if phone and len(phone) > 30:
        raise HTTPException(status_code=400, detail="Mobile number is too long")
    name = (body.full_name or "").strip()
    if body.full_name is not None:
        if not name:
            raise HTTPException(status_code=400, detail="Name is required")
        if len(name) > 120:
            raise HTTPException(status_code=400, detail="Name is too long")
    user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.companies))
        .filter(User.id == auth.user.id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.full_name is not None:
        user.full_name = name
    user.phone = phone
    write_audit(
        db,
        action="update_profile",
        entity_type="user",
        entity_id=user.id,
        organization_id=user.organization_id,
        user_id=user.id,
        detail="name,phone",
    )
    db.commit()
    user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.companies))
        .filter(User.id == auth.user.id)
        .first()
    )
    return MeOut(user=_user_out(user), permissions=sorted(auth.permissions))
