from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.audit.service import write_audit
from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import Company, RoleName, UserCompany
from app.core.schemas import CompanyCreate, CompanyOut, CompanyUpdate

router = APIRouter(prefix="/companies", tags=["companies"])

LOGO_DIR = Path(__file__).resolve().parents[2] / "uploads" / "logos"
LOGO_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
LOGO_MAX = 2 * 1024 * 1024  # 2MB


@router.get("", response_model=list[CompanyOut])
def list_companies(
    auth: AuthContext = Depends(require_perms("companies.view")),
    db: Session = Depends(get_db),
):
    q = db.query(Company).filter(Company.organization_id == auth.organization_id)
    if auth.role not in (RoleName.SUPER_ADMIN, RoleName.OWNER, RoleName.SALES):
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


@router.post("/{company_id}/logo", response_model=CompanyOut)
async def upload_company_logo(
    company_id: int,
    file: UploadFile = File(...),
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

    ext = Path(file.filename or "").suffix.lower()
    if ext not in LOGO_EXTS:
        raise HTTPException(status_code=400, detail="Use PNG, JPG, WEBP or GIF")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > LOGO_MAX:
        raise HTTPException(status_code=400, detail="Logo max 2MB")

    LOGO_DIR.mkdir(parents=True, exist_ok=True)
    for old in LOGO_DIR.glob(f"{company_id}.*"):
        old.unlink(missing_ok=True)
    dest = LOGO_DIR / f"{company_id}{ext}"
    dest.write_bytes(data)

    company.logo_url = f"/uploads/logos/{company_id}{ext}"
    write_audit(
        db,
        action="upload_logo",
        entity_type="company",
        entity_id=company.id,
        organization_id=auth.organization_id,
        company_id=company.id,
        user_id=auth.user.id,
    )
    db.commit()
    db.refresh(company)
    return company
