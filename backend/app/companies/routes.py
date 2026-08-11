from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.audit.service import write_audit
from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import Company, RoleName, UserCompany
from app.core.schemas import CompanyCreate, CompanyOut, CompanyUpdate

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=list[CompanyOut])
def list_companies(
    auth: AuthContext = Depends(require_perms("companies.view")),
    db: Session = Depends(get_db),
):
    q = db.query(Company).filter(Company.organization_id == auth.organization_id)
    if auth.role not in (RoleName.SUPER_ADMIN, RoleName.OWNER):
        allowed = [uc.company_id for uc in auth.user.companies]
        q = q.filter(Company.id.in_(allowed))
    return q.order_by(Company.id).all()


@router.post("", response_model=CompanyOut)
def create_company(
    body: CompanyCreate,
    auth: AuthContext = Depends(require_perms("companies.create")),
    db: Session = Depends(get_db),
):
    company = Company(organization_id=auth.organization_id, **body.model_dump())
    db.add(company)
    db.flush()
    # Owner/super_admin get access automatically via role; still link creating user
    if not any(uc.company_id == company.id for uc in auth.user.companies):
        db.add(UserCompany(user_id=auth.user.id, company_id=company.id))
    write_audit(
        db,
        action="create",
        entity_type="company",
        entity_id=company.id,
        organization_id=auth.organization_id,
        company_id=company.id,
        user_id=auth.user.id,
    )
    db.commit()
    db.refresh(company)
    return company


@router.patch("/{company_id}", response_model=CompanyOut)
def update_company(
    company_id: int,
    body: CompanyUpdate,
    auth: AuthContext = Depends(require_perms("companies.edit")),
    db: Session = Depends(get_db),
):
    company = (
        db.query(Company)
        .filter(Company.id == company_id, Company.organization_id == auth.organization_id)
        .first()
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(company, k, v)
    write_audit(
        db,
        action="update",
        entity_type="company",
        entity_id=company.id,
        organization_id=auth.organization_id,
        company_id=company.id,
        user_id=auth.user.id,
    )
    db.commit()
    db.refresh(company)
    return company
