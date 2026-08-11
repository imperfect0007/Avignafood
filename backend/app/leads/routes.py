from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.audit.service import write_audit
from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import Customer, Lead, LeadStatus
from app.core.schemas import CustomerOut, LeadCreate, LeadOut, LeadUpdate

router = APIRouter(prefix="/leads", tags=["leads"])


def _out(lead: Lead) -> LeadOut:
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
        assigned_to_id=lead.assigned_to_id,
        notes=lead.notes,
        lost_reason=lead.lost_reason,
        customer_id=lead.customer_id,
    )


@router.get("", response_model=list[LeadOut])
def list_leads(
    auth: AuthContext = Depends(require_perms("leads.view")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    leads = (
        db.query(Lead)
        .filter(Lead.company_id == company_id, Lead.organization_id == auth.organization_id)
        .order_by(Lead.id.desc())
        .all()
    )
    return [_out(l) for l in leads]


@router.post("", response_model=LeadOut)
def create_lead(
    body: LeadCreate,
    auth: AuthContext = Depends(require_perms("leads.create")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    lead = Lead(
        organization_id=auth.organization_id,
        company_id=company_id,
        status=LeadStatus.NEW,
        **body.model_dump(),
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
    return _out(lead)


@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: int,
    body: LeadUpdate,
    auth: AuthContext = Depends(require_perms("leads.edit")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id, Lead.company_id == company_id, Lead.organization_id == auth.organization_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    data = body.model_dump(exclude_unset=True)
    if "status" in data:
        try:
            data["status"] = LeadStatus(data["status"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status")
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
    return _out(lead)


@router.post("/{lead_id}/convert", response_model=CustomerOut)
def convert_lead(
    lead_id: int,
    auth: AuthContext = Depends(require_perms("leads.edit", "customers.create")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id, Lead.company_id == company_id, Lead.organization_id == auth.organization_id)
        .first()
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead.customer_id:
        customer = db.query(Customer).filter(Customer.id == lead.customer_id).first()
        return customer

    # Dedupe by phone or GSTIN within company
    existing = None
    if lead.phone:
        existing = (
            db.query(Customer)
            .filter(Customer.company_id == company_id, Customer.phone == lead.phone)
            .first()
        )
    if not existing and lead.email:
        existing = (
            db.query(Customer)
            .filter(Customer.company_id == company_id, Customer.email == lead.email)
            .first()
        )

    if existing:
        customer = existing
    else:
        customer = Customer(
            organization_id=auth.organization_id,
            company_id=company_id,
            name=lead.business_name,
            contact_person=lead.contact_person,
            phone=lead.phone,
            email=lead.email,
            address=lead.location,
        )
        db.add(customer)
        db.flush()

    lead.status = LeadStatus.WON
    lead.customer_id = customer.id
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
    return customer
