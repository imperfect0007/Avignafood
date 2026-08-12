from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session, joinedload

from app.core.models import (
    Customer,
    Dispatch,
    Product,
    Purchase,
    Quotation,
    SalesOrder,
    SalesOrderLine,
    SalesOrderStatus,
    StockBalance,
)
from app.core.schemas import OrderDeskLine, OrderDeskOut
from app.inventory.routes import _default_warehouse


def on_hand(db: Session, warehouse_id: int, product_id: int) -> Decimal:
    row = (
        db.query(StockBalance)
        .filter(StockBalance.warehouse_id == warehouse_id, StockBalance.product_id == product_id)
        .first()
    )
    return row.quantity if row else Decimal("0")


def line_stock(db: Session, warehouse_id: int, lines) -> list[OrderDeskLine]:
    out: list[OrderDeskLine] = []
    for ln in lines:
        product = db.query(Product).filter(Product.id == ln.product_id).first()
        have = on_hand(db, warehouse_id, ln.product_id)
        out.append(
            OrderDeskLine(
                product_id=ln.product_id,
                product_name=product.name if product else f"Product #{ln.product_id}",
                quantity=ln.quantity,
                unit_price=ln.unit_price,
                on_hand=have,
                ok=have >= ln.quantity,
            )
        )
    return out


def open_confirmed_from_quotation(db: Session, *, auth, quotation: Quotation) -> SalesOrder | None:
    """After Super Admin/Owner approval (or at-floor quote), open a confirmed SO for Supervisor."""
    existing = (
        db.query(SalesOrder)
        .filter(SalesOrder.quotation_id == quotation.id, SalesOrder.company_id == quotation.company_id)
        .first()
    )
    if existing:
        return existing
    warehouse = _default_warehouse(db, quotation.company_id, auth.organization_id)
    so = SalesOrder(
        organization_id=auth.organization_id,
        company_id=quotation.company_id,
        customer_id=quotation.customer_id,
        quotation_id=quotation.id,
        warehouse_id=warehouse.id,
        notes=quotation.notes,
        created_by_id=auth.user.id,
        status=SalesOrderStatus.CONFIRMED,
        confirmed_at=datetime.now(timezone.utc),
        ops_status="pending_verify",
    )
    db.add(so)
    db.flush()
    for ln in quotation.lines:
        db.add(
            SalesOrderLine(
                sales_order_id=so.id,
                product_id=ln.product_id,
                quantity=ln.quantity,
                unit_price=ln.unit_price,
            )
        )
    quotation.status  # leave caller to set CONVERTED if desired
    return so


def desk_out(db: Session, so: SalesOrder) -> OrderDeskOut:
    so = db.query(SalesOrder).options(joinedload(SalesOrder.lines)).filter(SalesOrder.id == so.id).first() or so
    customer = db.query(Customer).filter(Customer.id == so.customer_id).first()
    lines = line_stock(db, so.warehouse_id, so.lines)
    purchase = (
        db.query(Purchase)
        .filter(Purchase.sales_order_id == so.id)
        .order_by(Purchase.id.desc())
        .first()
    )
    load = (
        db.query(Dispatch)
        .filter(Dispatch.sales_order_id == so.id)
        .order_by(Dispatch.id.desc())
        .first()
    )
    return OrderDeskOut(
        id=so.id,
        customer_id=so.customer_id,
        customer_name=customer.name if customer else f"Customer #{so.customer_id}",
        quotation_id=so.quotation_id,
        warehouse_id=so.warehouse_id,
        status=so.status.value if hasattr(so.status, "value") else str(so.status),
        ops_status=so.ops_status or "pending_verify",
        notes=so.notes,
        confirmed_at=so.confirmed_at,
        created_at=so.created_at,
        lines=lines,
        stock_ok=all(ln.ok for ln in lines) if lines else False,
        dispatch_id=load.id if load else None,
        purchase_id=purchase.id if purchase else None,
        purchase_status=purchase.status if purchase else None,
        slot_date=load.slot_date if load else None,
        slot=load.slot if load else None,
        vehicle=load.vehicle if load else None,
    )
