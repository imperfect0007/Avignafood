from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.audit.service import write_audit
from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import Role, RoleName, User, UserCompany
from app.core.schemas import UserCreate, UserOut, UserUpdate
from app.core.security import hash_password

router = APIRouter(prefix="/users", tags=["users"])


def _out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        organization_id=user.organization_id,
        role=user.role.name.value,
        is_active=user.is_active,
        company_ids=[uc.company_id for uc in user.companies],
    )


@router.get("", response_model=list[UserOut])
def list_users(
    auth: AuthContext = Depends(require_perms("users.view")),
    db: Session = Depends(get_db),
):
    users = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.companies))
        .filter(User.organization_id == auth.organization_id)
        .all()
    )
    return [_out(u) for u in users]


@router.post("", response_model=UserOut)
def create_user(
    body: UserCreate,
    auth: AuthContext = Depends(require_perms("users.create")),
    db: Session = Depends(get_db),
):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Email already exists")
    try:
        role_name = RoleName(body.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role")
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        raise HTTPException(status_code=400, detail="Role not found")
    user = User(
        organization_id=auth.organization_id,
        role_id=role.id,
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    db.flush()
    for cid in body.company_ids:
        db.add(UserCompany(user_id=user.id, company_id=cid))
    write_audit(
        db,
        action="create",
        entity_type="user",
        entity_id=user.id,
        organization_id=auth.organization_id,
        user_id=auth.user.id,
    )
    db.commit()
    db.refresh(user)
    user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.companies))
        .filter(User.id == user.id)
        .first()
    )
    return _out(user)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    body: UserUpdate,
    auth: AuthContext = Depends(require_perms("users.edit")),
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.companies))
        .filter(User.id == user_id, User.organization_id == auth.organization_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.password:
        user.hashed_password = hash_password(body.password)
    if body.role:
        try:
            role_name = RoleName(body.role)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role")
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            raise HTTPException(status_code=400, detail="Role not found")
        user.role_id = role.id
    if body.company_ids is not None:
        db.query(UserCompany).filter(UserCompany.user_id == user.id).delete()
        for cid in body.company_ids:
            db.add(UserCompany(user_id=user.id, company_id=cid))
    write_audit(
        db,
        action="update",
        entity_type="user",
        entity_id=user.id,
        organization_id=auth.organization_id,
        user_id=auth.user.id,
    )
    db.commit()
    user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.companies))
        .filter(User.id == user_id)
        .first()
    )
    return _out(user)
