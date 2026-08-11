from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.audit.service import write_audit
from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import (
    Product,
    Quotation,
    QuotationStatus,
    SalesOrder,
    SalesOrderLine,
    SalesOrderStatus,
    StockBalance,
    Warehouse,
)
from app.core.schemas import SalesOrderCreate, SalesOrderOut
from app.inventory.routes import _default_warehouse

router = APIRouter(prefix="/sales-orders", tags=["sales"])


def _stock_qty(db: Session, warehouse_id: int, product_id: int) -> Decimal:
    row = (
        db.query(StockBalance)
        .filter(StockBalance.warehouse_id == warehouse_id, StockBalance.product_id == product_id)
        .first()
    )
    return row.quantity if row else Decimal("0")


def _out(so: SalesOrder, warnings: list[str] | None = None) -> SalesOrderOut:
    return SalesOrderOut(
        id=so.id,
        company_id=so.company_id,
        customer_id=so.customer_id,
        quotation_id=so.quotation_id,
        warehouse_id=so.warehouse_id,
        status=so.status.value,
        notes=so.notes,
        lines=[
            {
                "id": ln.id,
                "product_id": ln.product_id,
                "quantity": float(ln.quantity),
                "unit_price": float(ln.unit_price),
            }
            for ln in so.lines
        ],
        stock_warnings=warnings or [],
    )


@router.get("", response_model=list[SalesOrderOut])
def list_orders(
    auth: AuthContext = Depends(require_perms("sales.view")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    rows = (
        db.query(SalesOrder)
        .options(joinedload(SalesOrder.lines))
        .filter(SalesOrder.company_id == company_id, SalesOrder.organization_id == auth.organization_id)
        .order_by(SalesOrder.id.desc())
        .all()
    )
    return [_out(r) for r in rows]


@router.post("", response_model=SalesOrderOut)
def create_order(
    body: SalesOrderCreate,
    auth: AuthContext = Depends(require_perms("sales.create")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    lines = body.lines
    quotation = None
    if body.quotation_id:
        quotation = (
            db.query(Quotation)
            .options(joinedload(Quotation.lines))
            .filter(Quotation.id == body.quotation_id, Quotation.company_id == company_id)
            .first()
        )
        if not quotation:
            raise HTTPException(status_code=404, detail="Quotation not found")
        if quotation.status not in (QuotationStatus.ACCEPTED, QuotationStatus.APPROVED):
            raise HTTPException(status_code=400, detail="Quotation not accepted/approved")
        lines = [
            type("L", (), {"product_id": ln.product_id, "quantity": ln.quantity, "unit_price": ln.unit_price})()
            for ln in quotation.lines
        ]

    if not lines:
        raise HTTPException(status_code=400, detail="At least one line required")

    warehouse_id = body.warehouse_id
    if warehouse_id is None:
        warehouse_id = _default_warehouse(db, company_id, auth.organization_id).id
    else:
        wh = db.query(Warehouse).filter(Warehouse.id == warehouse_id, Warehouse.company_id == company_id).first()
        if not wh:
            raise HTTPException(status_code=404, detail="Warehouse not found")

    so = SalesOrder(
        organization_id=auth.organization_id,
        company_id=company_id,
        customer_id=body.customer_id if not quotation else quotation.customer_id,
        quotation_id=body.quotation_id,
        warehouse_id=warehouse_id,
        notes=body.notes,
        created_by_id=auth.user.id,
        status=SalesOrderStatus.DRAFT,
    )
    db.add(so)
    db.flush()
    for line in lines:
        product = (
            db.query(Product)
            .filter(Product.id == line.product_id, Product.company_id == company_id)
            .first()
        )
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {line.product_id} not found")
        db.add(
            SalesOrderLine(
                sales_order_id=so.id,
                product_id=line.product_id,
                quantity=line.quantity,
                unit_price=line.unit_price,
            )
        )
    if quotation:
        quotation.status = QuotationStatus.CONVERTED
    write_audit(
        db,
        action="create",
        entity_type="sales_order",
        entity_id=so.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
    )
    db.commit()
    so = db.query(SalesOrder).options(joinedload(SalesOrder.lines)).filter(SalesOrder.id == so.id).first()
    return _out(so)


@router.post("/{order_id}/confirm", response_model=SalesOrderOut)
def confirm_order(
    order_id: int,
    auth: AuthContext = Depends(require_perms("sales.edit")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    so = (
        db.query(SalesOrder)
        .options(joinedload(SalesOrder.lines))
        .filter(
            SalesOrder.id == order_id,
            SalesOrder.company_id == company_id,
            SalesOrder.organization_id == auth.organization_id,
        )
        .first()
    )
    if not so:
        raise HTTPException(status_code=404, detail="Sales order not found")
    if so.status != SalesOrderStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft orders can be confirmed")

    warnings: list[str] = []
    shortages: list[str] = []
    for ln in so.lines:
        available = _stock_qty(db, so.warehouse_id, ln.product_id)
        if available < ln.quantity:
            msg = f"product {ln.product_id}: need {ln.quantity}, have {available}"
            shortages.append(msg)
            warnings.append(msg)

    if shortages:
        raise HTTPException(status_code=400, detail={"error": "Insufficient stock", "shortages": shortages})

    # Deduct stock
    for ln in so.lines:
        row = (
            db.query(StockBalance)
            .filter(StockBalance.warehouse_id == so.warehouse_id, StockBalance.product_id == ln.product_id)
            .first()
        )
        if row:
            row.quantity = row.quantity - ln.quantity

    so.status = SalesOrderStatus.CONFIRMED
    so.confirmed_at = datetime.now(timezone.utc)
    write_audit(
        db,
        action="confirm",
        entity_type="sales_order",
        entity_id=so.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
    )
    db.commit()
    so = db.query(SalesOrder).options(joinedload(SalesOrder.lines)).filter(SalesOrder.id == so.id).first()
    return _out(so, warnings)
