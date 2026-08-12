from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.audit.service import write_audit
from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import (
    Customer,
    Dispatch,
    Product,
    Purchase,
    Quotation,
    QuotationStatus,
    SalesOrder,
    SalesOrderLine,
    SalesOrderStatus,
    StockBalance,
    Vehicle,
    VehicleSlot,
    Warehouse,
)
from app.core.schemas import (
    AllocateDispatchIn,
    OrderDeskOut,
    RaisePurchaseIn,
    SalesOrderCreate,
    SalesOrderOut,
)
from app.inventory.routes import _default_warehouse
from app.sales.ops import desk_out, line_stock, on_hand

router = APIRouter(prefix="/sales-orders", tags=["sales"])


def _stock_qty(db: Session, warehouse_id: int, product_id: int) -> Decimal:
    row = (
        db.query(StockBalance)
        .filter(StockBalance.warehouse_id == warehouse_id, StockBalance.product_id == product_id)
        .first()
    )
    return row.quantity if row else Decimal("0")


def _out(so: SalesOrder, warnings: list[str] | None = None, customer_name: str | None = None) -> SalesOrderOut:
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
        ops_status=getattr(so, "ops_status", None) or "pending_verify",
        customer_name=customer_name,
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

    # First stock check (sale time) — warn only; Supervisor does the second verify.
    warnings: list[str] = []
    for ln in so.lines:
        available = _stock_qty(db, so.warehouse_id, ln.product_id)
        if available < ln.quantity:
            warnings.append(f"product {ln.product_id}: need {ln.quantity}, have {available}")

    so.status = SalesOrderStatus.CONFIRMED
    so.confirmed_at = datetime.now(timezone.utc)
    so.ops_status = "pending_verify"
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


def _load_so(db: Session, company_id: int, org_id: int, order_id: int) -> SalesOrder:
    so = (
        db.query(SalesOrder)
        .options(joinedload(SalesOrder.lines))
        .filter(
            SalesOrder.id == order_id,
            SalesOrder.company_id == company_id,
            SalesOrder.organization_id == org_id,
        )
        .first()
    )
    if not so:
        raise HTTPException(status_code=404, detail="Sales order not found")
    return so


@router.get("/desk", response_model=list[OrderDeskOut])
def order_desk(
    auth: AuthContext = Depends(require_perms("sales.view")),
    db: Session = Depends(get_db),
):
    """Supervisor queue: confirmed orders after Super Admin approval."""
    company_id = auth.require_company()
    rows = (
        db.query(SalesOrder)
        .options(joinedload(SalesOrder.lines))
        .filter(
            SalesOrder.company_id == company_id,
            SalesOrder.organization_id == auth.organization_id,
            SalesOrder.status == SalesOrderStatus.CONFIRMED,
        )
        .order_by(SalesOrder.id.desc())
        .all()
    )
    return [desk_out(db, so) for so in rows]


@router.post("/{order_id}/verify-stock", response_model=OrderDeskOut)
def verify_stock(
    order_id: int,
    auth: AuthContext = Depends(require_perms("sales.edit")),
    db: Session = Depends(get_db),
):
    """Second stock check — Supervisor verifies availability after approval."""
    company_id = auth.require_company()
    so = _load_so(db, company_id, auth.organization_id, order_id)
    if so.status != SalesOrderStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Only confirmed orders can be verified")
    lines = line_stock(db, so.warehouse_id, so.lines)
    so.ops_status = "ready" if all(ln.ok for ln in lines) else "shortage"
    write_audit(
        db,
        action="verify_stock",
        entity_type="sales_order",
        entity_id=so.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
        detail=so.ops_status,
    )
    db.commit()
    return desk_out(db, so)


@router.post("/{order_id}/raise-purchase", response_model=OrderDeskOut)
def raise_purchase(
    order_id: int,
    body: RaisePurchaseIn,
    auth: AuthContext = Depends(require_perms("purchases.create")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    so = _load_so(db, company_id, auth.organization_id, order_id)
    lines = line_stock(db, so.warehouse_id, so.lines)
    short = [ln for ln in lines if not ln.ok]
    if body.product_id:
        short = [ln for ln in lines if ln.product_id == body.product_id] or short
    if not short:
        raise HTTPException(status_code=400, detail="Stock is sufficient — no purchase required")
    target = short[0]
    qty = body.quantity if body.quantity and body.quantity > 0 else (target.quantity - target.on_hand)
    if qty <= 0:
        qty = target.quantity
    row = Purchase(
        organization_id=auth.organization_id,
        company_id=company_id,
        customer_id=so.customer_id,
        source="sales_referral",
        manufacturer=(body.manufacturer or "").strip() or None,
        product=target.product_name,
        product_id=target.product_id,
        quantity=qty,
        received=Decimal("0"),
        value=Decimal("0"),
        status="pending_approval",
        notes=(body.notes or f"Shortage for SO-{so.id}").strip(),
        sales_order_id=so.id,
        created_by_id=auth.user.id,
    )
    db.add(row)
    so.ops_status = "procuring"
    write_audit(
        db,
        action="create",
        entity_type="purchase",
        entity_id=None,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
        detail=f"PR for SO-{so.id} product={target.product_id} qty={qty}",
    )
    db.commit()
    return desk_out(db, so)


@router.post("/{order_id}/allocate", response_model=OrderDeskOut)
def allocate_dispatch(
    order_id: int,
    body: AllocateDispatchIn,
    auth: AuthContext = Depends(require_perms("dispatch.create")),
    db: Session = Depends(get_db),
):
    """Allocate stock, book vehicle slot, prepare dispatch for Accounts + logistics."""
    company_id = auth.require_company()
    so = _load_so(db, company_id, auth.organization_id, order_id)
    if so.status != SalesOrderStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Order must be confirmed")
    if (so.ops_status or "") not in ("ready", "allocated"):
        raise HTTPException(status_code=400, detail="Verify stock (and receive purchase if short) before dispatch")
    if body.slot not in ("morning", "afternoon", "evening"):
        raise HTTPException(status_code=400, detail="Slot must be morning, afternoon or evening")

    existing = db.query(Dispatch).filter(Dispatch.sales_order_id == so.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Dispatch already prepared for this order")

    lines = line_stock(db, so.warehouse_id, so.lines)
    if not all(ln.ok for ln in lines):
        raise HTTPException(status_code=400, detail="Stock still short — raise purchase or receive inward first")

    veh = None
    if body.vehicle_id:
        veh = (
            db.query(Vehicle)
            .filter(Vehicle.id == body.vehicle_id, Vehicle.organization_id == auth.organization_id, Vehicle.is_active.is_(True))
            .first()
        )
        if not veh:
            raise HTTPException(status_code=404, detail="Vehicle not found")
    else:
        veh = (
            db.query(Vehicle)
            .filter(Vehicle.organization_id == auth.organization_id, Vehicle.is_active.is_(True))
            .order_by(Vehicle.id)
            .first()
        )
    if not veh:
        raise HTTPException(status_code=400, detail="No vehicle in fleet")

    slot_row = (
        db.query(VehicleSlot)
        .filter(VehicleSlot.vehicle_id == veh.id, VehicleSlot.on_date == body.on_date, VehicleSlot.slot == body.slot)
        .first()
    )
    if slot_row and slot_row.status == "booked":
        raise HTTPException(status_code=400, detail="That vehicle slot is already booked")
    if slot_row:
        slot_row.status = "booked"
        slot_row.notes = f"SO-{so.id}"
    else:
        db.add(
            VehicleSlot(
                vehicle_id=veh.id,
                on_date=body.on_date,
                slot=body.slot,
                status="booked",
                notes=f"SO-{so.id}",
            )
        )

    names = ", ".join(ln.product_name for ln in lines)
    qty = sum((ln.quantity for ln in lines), Decimal("0"))
    load = Dispatch(
        organization_id=auth.organization_id,
        company_id=company_id,
        customer_id=so.customer_id,
        product=names or "Order",
        quantity=qty,
        vehicle=veh.plate,
        transporter=veh.driver_name,
        status="Ready",
        notes=f"SO-{so.id} · {body.slot} {body.on_date}",
        created_by_id=auth.user.id,
        sales_order_id=so.id,
        slot_date=body.on_date,
        slot=body.slot,
        eta=f"{body.on_date} {body.slot}",
    )
    db.add(load)
    db.flush()

    for ln in so.lines:
        row = (
            db.query(StockBalance)
            .filter(StockBalance.warehouse_id == so.warehouse_id, StockBalance.product_id == ln.product_id)
            .first()
        )
        if row:
            row.quantity = (row.quantity or Decimal("0")) - ln.quantity

    so.ops_status = "allocated"
    write_audit(
        db,
        action="allocate",
        entity_type="sales_order",
        entity_id=so.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
        detail=f"dispatch={load.id} slot={body.slot} date={body.on_date}",
    )
    db.commit()
    return desk_out(db, so)
