from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.audit.service import write_audit
from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import Customer, Purchase
from app.core.schemas import PurchaseCreate, PurchaseOut
from app.dispatches.routes import create_load_for_purchase

router = APIRouter(prefix="/purchases", tags=["purchases"])


@router.get("", response_model=list[PurchaseOut])
def list_purchases(
    auth: AuthContext = Depends(require_perms("purchases.view")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    return (
        db.query(Purchase)
        .filter(Purchase.company_id == company_id, Purchase.organization_id == auth.organization_id)
        .order_by(Purchase.id.desc())
        .all()
    )


@router.post("", response_model=PurchaseOut)
def create_purchase(
    body: PurchaseCreate,
    auth: AuthContext = Depends(require_perms("purchases.create")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    customer = (
        db.query(Customer)
        .filter(
            Customer.id == body.customer_id,
            Customer.company_id == company_id,
            Customer.organization_id == auth.organization_id,
        )
        .first()
    )
    if not customer:
        raise HTTPException(status_code=400, detail="Customer not found — create the customer first")
    if body.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    row = Purchase(
        organization_id=auth.organization_id,
        company_id=company_id,
        created_by_id=auth.user.id,
        **body.model_dump(),
    )
    db.add(row)
    db.flush()
    write_audit(
        db,
        action="create",
        entity_type="purchase",
        entity_id=row.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
        detail=f"customer={body.customer_id} product={body.product} source={body.source}",
    )

    # Auto-create dispatch load; assign free vehicle when available
    load = create_load_for_purchase(
        db,
        auth=auth,
        company_id=company_id,
        customer_id=body.customer_id,
        product=body.product,
        quantity=body.quantity,
        eta=body.eta,
        purchase_id=row.id,
    )
    write_audit(
        db,
        action="create",
        entity_type="dispatch",
        entity_id=load.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
        detail=f"auto_from_purchase={row.id} vehicle={load.vehicle or 'none'}",
    )

    db.commit()
    db.refresh(row)
    return PurchaseOut.model_validate(row).model_copy(update={"dispatch_id": load.id})
