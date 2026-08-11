from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.audit.service import write_audit
from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import (
    Approval,
    ApprovalStatus,
    Product,
    Quotation,
    QuotationLine,
    QuotationStatus,
    RoleName,
)
from app.core.schemas import QuotationCreate, QuotationOut

router = APIRouter(prefix="/quotations", tags=["quotations"])


def _out(q: Quotation) -> QuotationOut:
    return QuotationOut(
        id=q.id,
        company_id=q.company_id,
        customer_id=q.customer_id,
        lead_id=q.lead_id,
        status=q.status.value,
        notes=q.notes,
        needs_price_approval=q.needs_price_approval,
        lines=[
            {
                "id": ln.id,
                "product_id": ln.product_id,
                "quantity": float(ln.quantity),
                "unit_price": float(ln.unit_price),
                "base_price": float(ln.base_price),
            }
            for ln in q.lines
        ],
    )


@router.get("", response_model=list[QuotationOut])
def list_quotations(
    auth: AuthContext = Depends(require_perms("quotations.view")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    rows = (
        db.query(Quotation)
        .options(joinedload(Quotation.lines))
        .filter(Quotation.company_id == company_id, Quotation.organization_id == auth.organization_id)
        .order_by(Quotation.id.desc())
        .all()
    )
    return [_out(r) for r in rows]


@router.post("", response_model=QuotationOut)
def create_quotation(
    body: QuotationCreate,
    auth: AuthContext = Depends(require_perms("quotations.create")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    if not body.lines:
        raise HTTPException(status_code=400, detail="At least one line required")

    needs_approval = False
    q = Quotation(
        organization_id=auth.organization_id,
        company_id=company_id,
        customer_id=body.customer_id,
        lead_id=body.lead_id,
        notes=body.notes,
        created_by_id=auth.user.id,
        status=QuotationStatus.DRAFT,
    )
    db.add(q)
    db.flush()

    for line in body.lines:
        product = (
            db.query(Product)
            .filter(Product.id == line.product_id, Product.company_id == company_id)
            .first()
        )
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {line.product_id} not found")
        if line.unit_price < product.base_price:
            needs_approval = True
        db.add(
            QuotationLine(
                quotation_id=q.id,
                product_id=line.product_id,
                quantity=line.quantity,
                unit_price=line.unit_price,
                base_price=product.base_price,
            )
        )

    q.needs_price_approval = needs_approval
    if needs_approval:
        q.status = QuotationStatus.PENDING_APPROVAL
        db.add(
            Approval(
                organization_id=auth.organization_id,
                company_id=company_id,
                quotation_id=q.id,
                status=ApprovalStatus.PENDING,
                requested_by_id=auth.user.id,
                reason="Unit price below base price",
            )
        )
    else:
        q.status = QuotationStatus.APPROVED

    write_audit(
        db,
        action="create",
        entity_type="quotation",
        entity_id=q.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
        detail=f"needs_approval={needs_approval}",
    )
    db.commit()
    q = db.query(Quotation).options(joinedload(Quotation.lines)).filter(Quotation.id == q.id).first()
    return _out(q)


@router.post("/{quotation_id}/approve", response_model=QuotationOut)
def approve_quotation(
    quotation_id: int,
    auth: AuthContext = Depends(require_perms("quotations.approve")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    if auth.role not in (RoleName.OWNER, RoleName.SUPER_ADMIN, RoleName.SUPERVISOR):
        # permission already checked; allow
        pass
    q = (
        db.query(Quotation)
        .options(joinedload(Quotation.lines))
        .filter(
            Quotation.id == quotation_id,
            Quotation.company_id == company_id,
            Quotation.organization_id == auth.organization_id,
        )
        .first()
    )
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")
    if q.status != QuotationStatus.PENDING_APPROVAL:
        raise HTTPException(status_code=400, detail="Quotation is not pending approval")
    q.status = QuotationStatus.APPROVED
    approval = (
        db.query(Approval)
        .filter(Approval.quotation_id == q.id, Approval.status == ApprovalStatus.PENDING)
        .first()
    )
    if approval:
        approval.status = ApprovalStatus.APPROVED
        approval.decided_by_id = auth.user.id
        approval.decided_at = datetime.now(timezone.utc)
    write_audit(
        db,
        action="approve",
        entity_type="quotation",
        entity_id=q.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
    )
    db.commit()
    q = db.query(Quotation).options(joinedload(Quotation.lines)).filter(Quotation.id == q.id).first()
    return _out(q)


@router.post("/{quotation_id}/reject", response_model=QuotationOut)
def reject_quotation(
    quotation_id: int,
    auth: AuthContext = Depends(require_perms("quotations.approve")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    q = (
        db.query(Quotation)
        .options(joinedload(Quotation.lines))
        .filter(
            Quotation.id == quotation_id,
            Quotation.company_id == company_id,
            Quotation.organization_id == auth.organization_id,
        )
        .first()
    )
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")
    q.status = QuotationStatus.REJECTED
    approval = (
        db.query(Approval)
        .filter(Approval.quotation_id == q.id, Approval.status == ApprovalStatus.PENDING)
        .first()
    )
    if approval:
        approval.status = ApprovalStatus.REJECTED
        approval.decided_by_id = auth.user.id
        approval.decided_at = datetime.now(timezone.utc)
    write_audit(
        db,
        action="reject",
        entity_type="quotation",
        entity_id=q.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
    )
    db.commit()
    q = db.query(Quotation).options(joinedload(Quotation.lines)).filter(Quotation.id == q.id).first()
    return _out(q)


@router.post("/{quotation_id}/accept", response_model=QuotationOut)
def accept_quotation(
    quotation_id: int,
    auth: AuthContext = Depends(require_perms("quotations.edit")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    q = (
        db.query(Quotation)
        .options(joinedload(Quotation.lines))
        .filter(
            Quotation.id == quotation_id,
            Quotation.company_id == company_id,
            Quotation.organization_id == auth.organization_id,
        )
        .first()
    )
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")
    if q.status not in (QuotationStatus.APPROVED, QuotationStatus.ACCEPTED):
        raise HTTPException(status_code=400, detail="Quotation must be approved first")
    q.status = QuotationStatus.ACCEPTED
    write_audit(
        db,
        action="accept",
        entity_type="quotation",
        entity_id=q.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
    )
    db.commit()
    q = db.query(Quotation).options(joinedload(Quotation.lines)).filter(Quotation.id == q.id).first()
    return _out(q)
