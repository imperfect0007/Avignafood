from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.models import Permission, RoleName, RolePermission, User
from app.core.security import TokenError, safe_decode

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class AuthContext:
    def __init__(self, user: User, company_id: int | None, permissions: set[str]):
        self.user = user
        self.company_id = company_id
        self.permissions = permissions
        self.organization_id = user.organization_id

    @property
    def role(self) -> RoleName:
        return self.user.role.name

    def require_company(self) -> int:
        if self.company_id is None:
            raise HTTPException(status_code=400, detail="X-Company-Id header required")
        return self.company_id

    def has_perm(self, code: str) -> bool:
        if self.role == RoleName.SUPER_ADMIN:
            return True
        return code in self.permissions


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    try:
        payload = safe_decode(token)
    except TokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = (
        db.query(User)
        .options(joinedload(User.role), joinedload(User.companies))
        .filter(User.id == int(user_id), User.is_active.is_(True))
        .first()
    )
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_auth(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_company_id: str | None = Header(default=None, alias="X-Company-Id"),
) -> AuthContext:
    perms = (
        db.query(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .filter(RolePermission.role_id == user.role_id)
        .all()
    )
    permission_set = {p[0] for p in perms}

    company_id: int | None = None
    if x_company_id:
        try:
            company_id = int(x_company_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid X-Company-Id")
        from app.core.models import Company

        company = db.query(Company).filter(Company.id == company_id).first()
        if not company or company.organization_id != user.organization_id:
            raise HTTPException(status_code=403, detail="No access to this company")
        if user.role.name not in (RoleName.SUPER_ADMIN, RoleName.OWNER):
            allowed = {uc.company_id for uc in user.companies}
            if company_id not in allowed:
                raise HTTPException(status_code=403, detail="No access to this company")

    return AuthContext(user=user, company_id=company_id, permissions=permission_set)


def require_perms(*codes: str):
    def _dep(auth: AuthContext = Depends(get_auth)) -> AuthContext:
        if auth.role == RoleName.SUPER_ADMIN:
            return auth
        for code in codes:
            if code not in auth.permissions:
                raise HTTPException(status_code=403, detail=f"Missing permission: {code}")
        return auth

    return _dep
