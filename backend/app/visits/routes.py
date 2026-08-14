from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.audit.service import write_audit
from app.core.database import engine, get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import (
    Customer,
    FieldVisit,
    FieldVisitMedia,
    Lead,
    LeadStatus,
    RoleName,
)
from app.core.schemas import VisitCreate, VisitOut
from app.sales.ensure_schema import ensure_sales_schema

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
    ensure_sales_schema(engine)
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
    ensure_sales_schema(engine)
    if not _can_use_company(auth, body.company_id):
        raise HTTPException(status_code=403, detail="No access to this company")

    kind = (body.client_kind or "new").lower()
    if kind not in ("existing", "new"):
        raise HTTPException(status_code=400, detail="Pick existing client or new client")

    allowed_purpose = {"prospecting", "new_order", "follow-up", "collection", "complaint", "delivery_support"}
    purpose = (body.purpose or "follow-up").strip().lower().replace(" ", "-").replace("_", "-")
    if purpose == "delivery-support":
        purpose = "delivery_support"
    if purpose == "new-order":
        purpose = "new_order"
    if purpose not in allowed_purpose:
        raise HTTPException(status_code=400, detail="Invalid visit purpose")

    customer: Customer | None = None
    lead_id = body.lead_id
    site_name = body.site_name.strip()
    contact = body.contact_person
    phone = body.phone

    if kind == "existing":
        if body.customer_id:
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
        elif body.lead_id:
            lead = (
                db.query(Lead)
                .filter(
                    Lead.id == body.lead_id,
                    Lead.company_id == body.company_id,
                    Lead.organization_id == auth.organization_id,
                )
                .first()
            )
            if not lead:
                raise HTTPException(status_code=404, detail="Lead not found")
            lead_id = lead.id
            site_name = lead.business_name
            contact = contact or lead.contact_person
            phone = phone or lead.phone
            if lead.status in (LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED):
                lead.status = LeadStatus.VISIT_REQUIRED
        else:
            raise HTTPException(status_code=400, detail="Select an existing customer or lead")
    else:
        if not site_name:
            raise HTTPException(status_code=400, detail="Business / site name is required")
        if body.lead_id:
            lead = (
                db.query(Lead)
                .filter(
                    Lead.id == body.lead_id,
                    Lead.company_id == body.company_id,
                    Lead.organization_id == auth.organization_id,
                )
                .first()
            )
            if lead:
                lead_id = lead.id
                if lead.status in (LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED):
                    lead.status = LeadStatus.VISIT_REQUIRED
        else:
            lead = Lead(
                organization_id=auth.organization_id,
                company_id=body.company_id,
                business_name=site_name,
                contact_person=contact,
                phone=phone,
                location=f"{body.lat},{body.lng}" if body.lat is not None and body.lng is not None else None,
                source="Visit",
                notes=body.notes,
                voice_url=body.voice_url,
                status=LeadStatus.VISIT_REQUIRED,
                assigned_to_id=auth.user.id,
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
        sales_order_id=None,
        site_name=site_name,
        contact_person=contact,
        phone=phone,
        notes=body.notes,
        voice_url=body.voice_url,
        lat=_dec(body.lat),
        lng=_dec(body.lng),
        accuracy_m=_dec(body.accuracy_m),
        checked_in_at=datetime.now(timezone.utc),
        purpose=purpose,
        outcome=body.outcome,
        next_action=body.next_action,
        competitor_notes=body.competitor_notes,
        issue=body.issue,
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
        detail=f"kind={kind} customer={customer.id if customer else None} purpose={purpose}",
    )
    db.commit()
    visit = (
        db.query(FieldVisit)
        .options(joinedload(FieldVisit.media))
        .filter(FieldVisit.id == visit.id)
        .first()
    )
    return _out(visit)
