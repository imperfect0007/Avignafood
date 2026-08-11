from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload

from app.audit.service import write_audit
from app.core.database import get_db
from app.core.deps import AuthContext, get_auth
from app.core.models import User
from app.core.schemas import MeOut, TokenOut, UserOut
from app.core.security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
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
