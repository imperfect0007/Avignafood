from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.audit.service import write_audit
from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import (
    Customer,
    FieldVisit,
    FieldVisitMedia,
    Lead,
    LeadStatus,
    RoleName,
    SalesOrder,
    SalesOrderStatus,
)
from app.core.schemas import VisitCreate, VisitOut
from app.inventory.routes import _default_warehouse

router = APIRouter(prefix="/visits", tags=["visits"])

MEDIA_DIR = Path(__file__).resolve().parents[2] / "uploads" / "field"
ALLOWED = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".webm", ".ogg", ".m4a", ".mp3", ".wav", ".mp4"}
MAX_BYTES = 20 * 1024 * 1024


def _dec(v: float | None) -> Decimal | None:
    return None if v is None else Decimal(str(v))


def _out(visit: FieldVisit) -> VisitOut:
    return VisitOut.model_validate(visit)


def _can_use_company(auth: AuthContext, company_id: int) -> bool:
    if auth.role in (RoleName.SUPER_ADMIN, RoleName.OWNER):
        return True
    return company_id in {uc.company_id for uc in auth.user.companies}


@router.post("/upload")
async def upload_field_media(
    file: UploadFile = File(...),
    auth: AuthContext = Depends(require_perms("visits.create")),
):
    ext = Path(file.filename or "bin").suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large (20MB max)")
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{auth.user.id}_{uuid4().hex}{ext}"
    dest = MEDIA_DIR / name
    dest.write_bytes(data)
    return {"url": f"/uploads/field/{name}"}


@router.get("", response_model=list[VisitOut])
def list_visits(
    auth: AuthContext = Depends(require_perms("visits.view")),
    db: Session = Depends(get_db),
):
    q = (
        db.query(FieldVisit)
        .options(joinedload(FieldVisit.media))
        .filter(FieldVisit.organization_id == auth.organization_id)
    )
    if auth.role == RoleName.SALES:
        q = q.filter(FieldVisit.user_id == auth.user.id)
    elif auth.company_id:
        q = q.filter(FieldVisit.company_id == auth.company_id)
    return [_out(v) for v in q.order_by(FieldVisit.checked_in_at.desc()).limit(100).all()]


@router.post("", response_model=VisitOut)
def create_visit(
    body: VisitCreate,
    auth: AuthContext = Depends(require_perms("visits.create")),
    db: Session = Depends(get_db),
):
    if not _can_use_company(auth, body.company_id):
        raise HTTPException(status_code=403, detail="No access to this company")

    kind = (body.client_kind or "new").lower()
    if kind not in ("existing", "new"):
        raise HTTPException(status_code=400, detail="Pick existing client or new client")

    customer: Customer | None = None
    lead_id = None
    sales_order_id = None
    site_name = body.site_name.strip()
    contact = body.contact_person
    phone = body.phone

    if kind == "existing":
        if not body.customer_id:
            raise HTTPException(status_code=400, detail="Select an existing client")
        customer = (
            db.query(Customer)
            .filter(
                Customer.id == body.customer_id,
                Customer.company_id == body.company_id,
                Customer.organization_id == auth.organization_id,
            )
            .first()
        )
        if not customer:
            raise HTTPException(status_code=404, detail="Client not found")
        site_name = customer.name
        contact = contact or customer.contact_person
        phone = phone or customer.phone
        warehouse = _default_warehouse(db, body.company_id, auth.organization_id)
        so = SalesOrder(
            organization_id=auth.organization_id,
            company_id=body.company_id,
            customer_id=customer.id,
            warehouse_id=warehouse.id,
            notes=body.notes or body.voice_url,
            created_by_id=auth.user.id,
            status=SalesOrderStatus.DRAFT,
        )
        db.add(so)
        db.flush()
        sales_order_id = so.id
    else:
        if not site_name:
            raise HTTPException(status_code=400, detail="Business / site name is required")
        existing = None
        if phone:
            existing = (
                db.query(Customer)
                .filter(Customer.company_id == body.company_id, Customer.phone == phone)
                .first()
            )
        if existing:
            customer = existing
        else:
            customer = Customer(
                organization_id=auth.organization_id,
                company_id=body.company_id,
                name=site_name,
                contact_person=contact,
                phone=phone,
                address=f"{body.lat},{body.lng}" if body.lat is not None and body.lng is not None else None,
            )
            db.add(customer)
            db.flush()
        lead = Lead(
            organization_id=auth.organization_id,
            company_id=body.company_id,
            business_name=site_name,
            contact_person=contact,
            phone=phone,
            location=f"{body.lat},{body.lng}" if body.lat is not None and body.lng is not None else None,
            source="Field visit",
            notes=body.notes,
            voice_url=body.voice_url,
            status=LeadStatus.VISIT_REQUIRED,
            assigned_to_id=auth.user.id,
            customer_id=customer.id,
        )
        db.add(lead)
        db.flush()
        lead_id = lead.id

    visit = FieldVisit(
        organization_id=auth.organization_id,
        company_id=body.company_id,
        user_id=auth.user.id,
        lead_id=lead_id,
        customer_id=customer.id if customer else None,
        sales_order_id=sales_order_id,
        site_name=site_name,
        contact_person=contact,
        phone=phone,
        notes=body.notes,
        voice_url=body.voice_url,
        lat=_dec(body.lat),
        lng=_dec(body.lng),
        accuracy_m=_dec(body.accuracy_m),
        checked_in_at=datetime.now(timezone.utc),
    )
    db.add(visit)
    db.flush()
    for photo in body.photos:
        db.add(
            FieldVisitMedia(
                visit_id=visit.id,
                kind=photo.kind or "photo",
                url=photo.url,
                lat=_dec(photo.lat),
                lng=_dec(photo.lng),
            )
        )
    write_audit(
        db,
        action="create",
        entity_type="field_visit",
        entity_id=visit.id,
        organization_id=auth.organization_id,
        company_id=body.company_id,
        user_id=auth.user.id,
        detail=f"kind={kind} customer={customer.id if customer else None} order={sales_order_id}",
    )
    db.commit()
    visit = (
        db.query(FieldVisit)
        .options(joinedload(FieldVisit.media))
        .filter(FieldVisit.id == visit.id)
        .first()
    )
    return _out(visit)
