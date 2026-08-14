from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.audit.service import write_audit
from app.core.database import engine, get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import Customer, Lead, LeadActivity, LeadStatus, RoleName, User
from app.customers.routes import _out as customer_out
from app.core.schemas import (
    CustomerOut,
    LeadActivityIn,
    LeadActivityOut,
    LeadBulkIn,
    LeadCreate,
    LeadOut,
    LeadUpdate,
)
from app.sales.ensure_schema import ensure_sales_schema

router = APIRouter(prefix="/leads", tags=["leads"])

OPEN_STATUSES = (
    LeadStatus.NEW,
    LeadStatus.CONTACTED,
    LeadStatus.QUALIFIED,
    LeadStatus.VISIT_REQUIRED,
    LeadStatus.QUOTATION,
    LeadStatus.NEGOTIATION,
)


def _ensure() -> None:
    ensure_sales_schema(engine)


def _names(db: Session, user_ids: set[int]) -> dict[int, str]:
    if not user_ids:
        return {}
    rows = db.query(User).filter(User.id.in_(user_ids)).all()
    return {u.id: u.full_name for u in rows}


def _out(lead: Lead, names: dict[int, str] | None = None) -> LeadOut:
    now = datetime.now(timezone.utc)
    nxt = getattr(lead, "next_follow_up", None)
    overdue = bool(nxt and nxt < now and lead.status in OPEN_STATUSES)
    aid = lead.assigned_to_id
    return LeadOut(
        id=lead.id,
        company_id=lead.company_id,
        business_name=lead.business_name,
        contact_person=lead.contact_person,
        phone=lead.phone,
        email=lead.email,
        location=lead.location,
        source=lead.source,
        lead_type=lead.lead_type,
        product_requirement=lead.product_requirement,
        quantity=lead.quantity,
        estimated_value=lead.estimated_value,
        status=lead.status.value,
        assigned_to_id=aid,
        assigned_to_name=(names or {}).get(aid) if aid else None,
        notes=lead.notes,
        lost_reason=lead.lost_reason,
        customer_id=lead.customer_id,
        voice_url=getattr(lead, "voice_url", None),
        gstin=getattr(lead, "gstin", None),
        priority=getattr(lead, "priority", None),
        next_follow_up=nxt,
        overdue_follow_up=overdue,
        stuck=overdue,
        created_at=lead.created_at,
    )


def _find_duplicate(db: Session, company_id: int, phone: str | None, gstin: str | None, exclude_id: int | None = None) -> Lead | None:
    q = db.query(Lead).filter(Lead.company_id == company_id)
    if exclude_id:
        q = q.filter(Lead.id != exclude_id)
    if phone:
        hit = q.filter(Lead.phone == phone).first()
        if hit:
            return hit
    if gstin:
        hit = q.filter(Lead.gstin == gstin).first()
        if hit:
            return hit
    return None


def _get_lead(db: Session, auth: AuthContext, lead_id: int, company_id: int) -> Lead:
    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id, Lead.company_id == company_id, Lead.organization_id == auth.organization_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if auth.role == RoleName.SALES and lead.assigned_to_id not in (None, auth.user.id):
        raise HTTPException(status_code=403, detail="This lead is assigned to someone else")
    return lead


@router.get("", response_model=list[LeadOut])
def list_leads(
    status: str | None = None,
    source: str | None = None,
    lead_type: str | None = None,
    assigned: str | None = Query(None, description="me | unassigned | all"),
    overdue: bool = False,
    stuck: bool = False,
    q: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    auth: AuthContext = Depends(require_perms("leads.view")),
    db: Session = Depends(get_db),
):
    _ensure()
    company_id = auth.require_company()
    query = db.query(Lead).filter(Lead.company_id == company_id, Lead.organization_id == auth.organization_id)
    if auth.role == RoleName.SALES:
        query = query.filter(or_(Lead.assigned_to_id == auth.user.id, Lead.assigned_to_id.is_(None)))
    if status:
        try:
            query = query.filter(Lead.status == LeadStatus(status))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
    if source:
        query = query.filter(Lead.source == source)
    if lead_type:
        query = query.filter(Lead.lead_type == lead_type)
    if assigned == "me":
        query = query.filter(Lead.assigned_to_id == auth.user.id)
    elif assigned == "unassigned":
        query = query.filter(Lead.assigned_to_id.is_(None))
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Lead.business_name.ilike(like),
                Lead.contact_person.ilike(like),
                Lead.phone.ilike(like),
            )
        )
    if date_from:
        query = query.filter(Lead.created_at >= datetime.combine(date_from, datetime.min.time(), tzinfo=timezone.utc))
    if date_to:
        query = query.filter(Lead.created_at <= datetime.combine(date_to, datetime.max.time(), tzinfo=timezone.utc))
    leads = query.order_by(Lead.id.desc()).all()
    names = _names(db, {l.assigned_to_id for l in leads if l.assigned_to_id})
    out = [_out(l, names) for l in leads]
    if overdue:
        out = [r for r in out if r.overdue_follow_up]
    if stuck:
        out = [r for r in out if r.stuck]
    return out


@router.get("/export")
def export_leads(
    auth: AuthContext = Depends(require_perms("leads.view")),
    db: Session = Depends(get_db),
):
    rows = list_leads(auth=auth, db=db)
    lines = ["id,business,contact,phone,source,type,stage,value,assigned,next_follow_up"]
    for r in rows:
        lines.append(
            ",".join(
                [
                    str(r.id),
                    (r.business_name or "").replace(",", " "),
                    (r.contact_person or "").replace(",", " "),
                    r.phone or "",
                    r.source or "",
                    r.lead_type or "",
                    r.status,
                    str(r.estimated_value or ""),
                    r.assigned_to_name or "",
                    r.next_follow_up.isoformat() if r.next_follow_up else "",
                ]
            )
        )
    return PlainTextResponse("\n".join(lines), media_type="text/csv")


class LeadImportIn(BaseModel):
    csv: str


@router.post("/import", response_model=list[LeadOut])
def import_leads(
    body: LeadImportIn,
    auth: AuthContext = Depends(require_perms("leads.create")),
    db: Session = Depends(get_db),
):
    """CSV columns: business_name,phone,source,type,gstin,city,notes"""
    _ensure()
    company_id = auth.require_company()
    created: list[LeadOut] = []
    raw = (body.csv or "").strip().splitlines()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty CSV")
    start = 1 if "business" in raw[0].lower() else 0
    for line in raw[start:]:
        parts = [p.strip() for p in line.split(",")]
        if not parts or not parts[0]:
            continue
        phone = parts[1] if len(parts) > 1 else None
        gstin = parts[4] if len(parts) > 4 else None
        if _find_duplicate(db, company_id, phone or None, gstin or None):
            continue
        lead = Lead(
            organization_id=auth.organization_id,
            company_id=company_id,
            business_name=parts[0],
            phone=phone or None,
            source=parts[2] if len(parts) > 2 and parts[2] else "Other",
            lead_type=parts[3] if len(parts) > 3 and parts[3] else None,
            gstin=gstin or None,
            location=parts[5] if len(parts) > 5 else None,
            notes=parts[6] if len(parts) > 6 else None,
            status=LeadStatus.NEW,
            assigned_to_id=auth.user.id,
        )
        db.add(lead)
        db.flush()
        created.append(_out(lead, {auth.user.id: auth.user.full_name}))
    db.commit()
    return created


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(
    lead_id: int,
    auth: AuthContext = Depends(require_perms("leads.view")),
    db: Session = Depends(get_db),
):
    _ensure()
    company_id = auth.require_company()
    lead = _get_lead(db, auth, lead_id, company_id)
    names = _names(db, {lead.assigned_to_id} if lead.assigned_to_id else set())
    return _out(lead, names)


@router.post("", response_model=LeadOut)
def create_lead(
    body: LeadCreate,
    auth: AuthContext = Depends(require_perms("leads.create")),
    db: Session = Depends(get_db),
):
    _ensure()
    payload = body.model_dump()
    company_id = payload.pop("company_id", None) or auth.company_id
    if company_id is None:
        raise HTTPException(status_code=400, detail="Pick a company for this lead")
    allowed = {uc.company_id for uc in auth.user.companies}
    if auth.role not in (RoleName.SUPER_ADMIN, RoleName.OWNER) and company_id not in allowed:
        raise HTTPException(status_code=403, detail="No access to this company")
    dup = _find_duplicate(db, company_id, payload.get("phone"), payload.get("gstin"))
    if dup:
        raise HTTPException(
            status_code=409,
            detail=f"Duplicate lead LD-{dup.id} ({dup.business_name}) — same phone or GST",
        )
    assigned = payload.get("assigned_to_id") or auth.user.id
    if auth.role == RoleName.SALES:
        assigned = auth.user.id
    lead = Lead(
        organization_id=auth.organization_id,
        company_id=company_id,
        status=LeadStatus.NEW,
        assigned_to_id=assigned,
        **{k: v for k, v in payload.items() if k != "assigned_to_id"},
    )
    db.add(lead)
    db.flush()
    write_audit(
        db,
        action="create",
        entity_type="lead",
        entity_id=lead.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
    )
    db.commit()
    db.refresh(lead)
    return _out(lead, {auth.user.id: auth.user.full_name})


@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: int,
    body: LeadUpdate,
    auth: AuthContext = Depends(require_perms("leads.edit")),
    db: Session = Depends(get_db),
):
    _ensure()
    company_id = auth.require_company()
    lead = _get_lead(db, auth, lead_id, company_id)
    data = body.model_dump(exclude_unset=True)
    if "status" in data:
        try:
            data["status"] = LeadStatus(data["status"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
    if auth.role == RoleName.SALES:
        data.pop("assigned_to_id", None)
    for k, v in data.items():
        setattr(lead, k, v)
    write_audit(
        db,
        action="update",
        entity_type="lead",
        entity_id=lead.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
        detail=f"status={lead.status.value}",
    )
    db.commit()
    db.refresh(lead)
    names = _names(db, {lead.assigned_to_id} if lead.assigned_to_id else set())
    return _out(lead, names)


@router.post("/bulk", response_model=list[LeadOut])
def bulk_leads(
    body: LeadBulkIn,
    auth: AuthContext = Depends(require_perms("leads.edit")),
    db: Session = Depends(get_db),
):
    _ensure()
    company_id = auth.require_company()
    if auth.role == RoleName.SALES:
        raise HTTPException(status_code=403, detail="Bulk assign is for team leads")
    if not body.ids:
        raise HTTPException(status_code=400, detail="No leads selected")
    status = None
    if body.status:
        try:
            status = LeadStatus(body.status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
    rows = (
        db.query(Lead)
        .filter(Lead.id.in_(body.ids), Lead.company_id == company_id, Lead.organization_id == auth.organization_id)
        .all()
    )
    for lead in rows:
        if status is not None:
            lead.status = status
        if body.assigned_to_id is not None:
            lead.assigned_to_id = body.assigned_to_id
    db.commit()
    names = _names(db, {l.assigned_to_id for l in rows if l.assigned_to_id})
    return [_out(l, names) for l in rows]


@router.get("/{lead_id}/activities", response_model=list[LeadActivityOut])
def list_activities(
    lead_id: int,
    auth: AuthContext = Depends(require_perms("leads.view")),
    db: Session = Depends(get_db),
):
    _ensure()
    company_id = auth.require_company()
    _get_lead(db, auth, lead_id, company_id)
    rows = (
        db.query(LeadActivity)
        .filter(LeadActivity.lead_id == lead_id)
        .order_by(LeadActivity.id.desc())
        .all()
    )
    return rows


@router.post("/{lead_id}/follow-ups", response_model=LeadOut)
def add_follow_up(
    lead_id: int,
    body: LeadActivityIn,
    auth: AuthContext = Depends(require_perms("leads.edit")),
    db: Session = Depends(get_db),
):
    _ensure()
    company_id = auth.require_company()
    lead = _get_lead(db, auth, lead_id, company_id)
    db.add(
        LeadActivity(
            lead_id=lead.id,
            user_id=auth.user.id,
            kind=body.kind or "follow_up",
            notes=body.notes,
            next_action=body.next_action,
        )
    )
    if body.next_follow_up:
        lead.next_follow_up = body.next_follow_up
    write_audit(
        db,
        action="follow_up",
        entity_type="lead",
        entity_id=lead.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
    )
    db.commit()
    db.refresh(lead)
    names = _names(db, {lead.assigned_to_id} if lead.assigned_to_id else set())
    return _out(lead, names)


@router.post("/{lead_id}/convert", response_model=CustomerOut)
def convert_lead(
    lead_id: int,
    auth: AuthContext = Depends(require_perms("leads.edit", "customers.create")),
    db: Session = Depends(get_db),
):
    _ensure()
    company_id = auth.require_company()
    lead = _get_lead(db, auth, lead_id, company_id)
    if lead.customer_id:
        customer = db.query(Customer).filter(Customer.id == lead.customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Linked customer missing")
        return customer_out(db, customer, company_id)

    existing = None
    gstin = getattr(lead, "gstin", None)
    if lead.phone:
        existing = db.query(Customer).filter(Customer.company_id == company_id, Customer.phone == lead.phone).first()
    if not existing and gstin:
        existing = db.query(Customer).filter(Customer.company_id == company_id, Customer.gstin == gstin).first()
    if not existing and lead.email:
        existing = db.query(Customer).filter(Customer.company_id == company_id, Customer.email == lead.email).first()

    if existing:
        customer = existing
    else:
        customer = Customer(
            organization_id=auth.organization_id,
            company_id=company_id,
            name=lead.business_name,
            legal_name=lead.business_name,
            trade_name=lead.business_name,
            contact_person=lead.contact_person,
            phone=lead.phone,
            email=lead.email,
            gstin=gstin,
            address=lead.location,
            customer_type=lead.lead_type,
        )
        db.add(customer)
        db.flush()

    lead.status = LeadStatus.WON
    lead.customer_id = customer.id
    db.add(
        LeadActivity(
            lead_id=lead.id,
            user_id=auth.user.id,
            kind="convert",
            notes=f"Converted to customer {customer.id}. Source {lead.source or '—'} kept.",
        )
    )
    write_audit(
        db,
        action="convert",
        entity_type="lead",
        entity_id=lead.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
        detail=f"customer_id={customer.id}",
    )
    db.commit()
    db.refresh(customer)
    return customer_out(db, customer, company_id)
