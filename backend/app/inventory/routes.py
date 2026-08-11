from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.audit.service import write_audit
from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import SalesOrder, SalesOrderLine, SalesOrderStatus, StockBalance, Warehouse
from app.core.schemas import StockGlimpseOut, StockOut, StockSetIn, WarehouseOut

router = APIRouter(prefix="/inventory", tags=["inventory"])


def _default_warehouse(db: Session, company_id: int, org_id: int) -> Warehouse:
    wh = (
        db.query(Warehouse)
        .filter(Warehouse.company_id == company_id, Warehouse.is_default.is_(True))
        .first()
    )
    if wh:
        return wh
    wh = Warehouse(
        organization_id=org_id,
        company_id=company_id,
        name="Main Warehouse",
        is_default=True,
    )
    db.add(wh)
    db.flush()
    return wh


@router.get("/warehouses", response_model=list[WarehouseOut])
def list_warehouses(
    auth: AuthContext = Depends(require_perms("inventory.view")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    rows = (
        db.query(Warehouse)
        .filter(Warehouse.company_id == company_id, Warehouse.organization_id == auth.organization_id)
        .all()
    )
    if not rows:
        wh = _default_warehouse(db, company_id, auth.organization_id)
        db.commit()
        return [wh]
    return rows


@router.get("/glimpse", response_model=StockGlimpseOut)
def stock_glimpse(
    auth: AuthContext = Depends(require_perms("inventory.view")),
    db: Session = Depends(get_db),
):
    """On hand vs already promised (draft orders). Headroom = what sales can still commit."""
    company_id = auth.require_company()
    on_hand = db.query(func.coalesce(func.sum(StockBalance.quantity), 0)).filter(
        StockBalance.company_id == company_id,
        StockBalance.organization_id == auth.organization_id,
    ).scalar()
    booked = (
        db.query(func.coalesce(func.sum(SalesOrderLine.quantity), 0))
        .join(SalesOrder, SalesOrderLine.sales_order_id == SalesOrder.id)
        .filter(
            SalesOrder.company_id == company_id,
            SalesOrder.organization_id == auth.organization_id,
            SalesOrder.status == SalesOrderStatus.DRAFT,
        )
        .scalar()
    )
    on_hand_d = Decimal(str(on_hand or 0))
    booked_d = Decimal(str(booked or 0))
    return StockGlimpseOut(on_hand=on_hand_d, booked=booked_d, headroom=on_hand_d - booked_d)


@router.get("/stock", response_model=list[StockOut])
def list_stock(
    auth: AuthContext = Depends(require_perms("inventory.view")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    return (
        db.query(StockBalance)
        .filter(StockBalance.company_id == company_id, StockBalance.organization_id == auth.organization_id)
        .all()
    )


@router.post("/stock", response_model=StockOut)
def set_stock(
    body: StockSetIn,
    auth: AuthContext = Depends(require_perms("inventory.edit")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    warehouse_id = body.warehouse_id
    if warehouse_id is None:
        warehouse_id = _default_warehouse(db, company_id, auth.organization_id).id
    else:
        wh = (
            db.query(Warehouse)
            .filter(Warehouse.id == warehouse_id, Warehouse.company_id == company_id)
            .first()
        )
        if not wh:
            raise HTTPException(status_code=404, detail="Warehouse not found")

    row = (
        db.query(StockBalance)
        .filter(StockBalance.warehouse_id == warehouse_id, StockBalance.product_id == body.product_id)
        .first()
    )
    if row:
        row.quantity = body.quantity
    else:
        row = StockBalance(
            organization_id=auth.organization_id,
            company_id=company_id,
            warehouse_id=warehouse_id,
            product_id=body.product_id,
            quantity=body.quantity,
        )
        db.add(row)
    db.flush()
    write_audit(
        db,
        action="set_stock",
        entity_type="stock_balance",
        entity_id=row.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
        detail=f"product={body.product_id} qty={body.quantity}",
    )
    db.commit()
    db.refresh(row)
    return row
