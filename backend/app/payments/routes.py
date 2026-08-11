from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.audit.service import write_audit
from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import Invoice, InvoiceStatus, Payment
from app.core.schemas import PaymentCreate, PaymentOut

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("", response_model=list[PaymentOut])
def list_payments(
    auth: AuthContext = Depends(require_perms("payments.view")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    return (
        db.query(Payment)
        .filter(Payment.company_id == company_id, Payment.organization_id == auth.organization_id)
        .order_by(Payment.id.desc())
        .all()
    )


@router.post("", response_model=PaymentOut)
def create_payment(
    body: PaymentCreate,
    auth: AuthContext = Depends(require_perms("payments.create")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    inv = (
        db.query(Invoice)
        .filter(
            Invoice.id == body.invoice_id,
            Invoice.company_id == company_id,
            Invoice.organization_id == auth.organization_id,
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if inv.status == InvoiceStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Invoice cancelled")
    outstanding = inv.total - inv.amount_paid
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    if body.amount > outstanding:
        raise HTTPException(status_code=400, detail=f"Amount exceeds outstanding {outstanding}")

    payment = Payment(
        organization_id=auth.organization_id,
        company_id=company_id,
        invoice_id=inv.id,
        amount=body.amount,
        method=body.method,
        reference=body.reference,
        paid_at=body.paid_at or date.today(),
        created_by_id=auth.user.id,
    )
    db.add(payment)
    inv.amount_paid = inv.amount_paid + body.amount
    if inv.amount_paid >= inv.total:
        inv.status = InvoiceStatus.PAID
        inv.amount_paid = inv.total
    else:
        inv.status = InvoiceStatus.PARTIAL

    write_audit(
        db,
        action="create",
        entity_type="payment",
        entity_id=None,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
        detail=f"invoice={inv.id} amount={body.amount}",
    )
    db.commit()
    db.refresh(payment)
    return payment
