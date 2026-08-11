from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.audit.service import write_audit
from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import Customer, Dispatch, Vehicle
from app.core.schemas import DispatchCreate, DispatchOut, DispatchUpdate

router = APIRouter(prefix="/dispatches", tags=["dispatches"])

STAGES = ("Pending", "Allocated", "Packed", "Ready", "Dispatched", "Delivered")
BUSY = ("Pending", "Allocated", "Packed", "Ready", "Dispatched")
NEEDS_VEHICLE = ("Allocated", "Packed", "Ready", "Dispatched")


def busy_plates(db: Session, company_id: int) -> set[str]:
    rows = (
        db.query(Dispatch.vehicle)
        .filter(
            Dispatch.company_id == company_id,
            Dispatch.status.in_(BUSY),
            Dispatch.vehicle.isnot(None),
            Dispatch.vehicle != "",
        )
        .all()
    )
    return {r[0] for r in rows if r[0]}


def org_vehicles(db: Session, org_id: int) -> list[Vehicle]:
    return (
        db.query(Vehicle)
        .filter(Vehicle.organization_id == org_id, Vehicle.is_active.is_(True))
        .order_by(Vehicle.id)
        .all()
    )


def first_available_vehicle(db: Session, company_id: int, org_id: int) -> Vehicle | None:
    busy = busy_plates(db, company_id)
    for v in org_vehicles(db, org_id):
        if v.plate not in busy:
            return v
    return None


def require_vehicle_for_status(status: str, vehicle: str | None) -> None:
    if status in NEEDS_VEHICLE and not (vehicle and str(vehicle).strip()):
        raise HTTPException(
            status_code=400,
            detail="Assign an available vehicle before Allocated (or later stages)",
        )


def resolve_vehicle(
    db: Session,
    *,
    org_id: int,
    company_id: int,
    vehicle_id: int | None,
    allow_plate: str | None = None,
) -> Vehicle | None:
    if vehicle_id is None:
        return None
    veh = (
        db.query(Vehicle)
        .filter(Vehicle.id == vehicle_id, Vehicle.organization_id == org_id, Vehicle.is_active.is_(True))
        .first()
    )
    if not veh:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    busy = busy_plates(db, company_id)
    if allow_plate:
        busy.discard(allow_plate)
    if veh.plate in busy:
        raise HTTPException(status_code=400, detail="Vehicle is not available — already on an open load")
    return veh


def create_load_for_purchase(
    db: Session,
    *,
    auth: AuthContext,
    company_id: int,
    customer_id: int,
    product: str,
    quantity,
    eta: str | None,
    purchase_id: int,
) -> Dispatch:
    """Auto load from a purchase — assign a free vehicle when one exists."""
    veh = first_available_vehicle(db, company_id, auth.organization_id)
    row = Dispatch(
        organization_id=auth.organization_id,
        company_id=company_id,
        customer_id=customer_id,
        product=product,
        quantity=quantity,
        vehicle=veh.plate if veh else None,
        transporter=veh.driver_name if veh else None,
        eta=eta,
        status="Allocated" if veh else "Pending",
        notes=f"Auto from purchase PO-{purchase_id}"
        + ("" if veh else " · waiting for vehicle"),
        created_by_id=auth.user.id,
    )
    db.add(row)
    db.flush()
    return row


@router.get("", response_model=list[DispatchOut])
def list_dispatches(
    auth: AuthContext = Depends(require_perms("dispatch.view")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    return (
        db.query(Dispatch)
        .filter(Dispatch.company_id == company_id, Dispatch.organization_id == auth.organization_id)
        .order_by(Dispatch.id.desc())
        .all()
    )


@router.post("", response_model=DispatchOut)
def create_dispatch(
    body: DispatchCreate,
    auth: AuthContext = Depends(require_perms("dispatch.create")),
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
        raise HTTPException(status_code=400, detail="Customer not found")
    if body.quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")

    vehicle = body.vehicle
    transporter = body.transporter
    status = body.status if body.status in STAGES else "Pending"
    if body.vehicle_id is not None:
        veh = resolve_vehicle(
            db,
            org_id=auth.organization_id,
            company_id=company_id,
            vehicle_id=body.vehicle_id,
        )
        assert veh is not None
        vehicle = veh.plate
        transporter = transporter or veh.driver_name
        if status == "Pending":
            status = "Allocated"
    require_vehicle_for_status(status, vehicle)

    row = Dispatch(
        organization_id=auth.organization_id,
        company_id=company_id,
        created_by_id=auth.user.id,
        customer_id=body.customer_id,
        product=body.product,
        quantity=body.quantity,
        vehicle=vehicle,
        transporter=transporter,
        lr=body.lr,
        eta=body.eta,
        status=status,
        notes=body.notes,
    )
    db.add(row)
    db.flush()
    write_audit(
        db,
        action="create",
        entity_type="dispatch",
        entity_id=row.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
        detail=f"customer={body.customer_id} product={body.product}",
    )
    db.commit()
    db.refresh(row)
    return row


@router.patch("/{dispatch_id}", response_model=DispatchOut)
def update_dispatch(
    dispatch_id: int,
    body: DispatchUpdate,
    auth: AuthContext = Depends(require_perms("dispatch.edit")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    row = (
        db.query(Dispatch)
        .filter(
            Dispatch.id == dispatch_id,
            Dispatch.company_id == company_id,
            Dispatch.organization_id == auth.organization_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Dispatch not found")
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in STAGES:
        raise HTTPException(status_code=400, detail=f"Status must be one of {', '.join(STAGES)}")

    vehicle_id = data.pop("vehicle_id", None)
    if vehicle_id is not None:
        if vehicle_id == 0:
            data["vehicle"] = None
            data["transporter"] = None
            if data.get("status", row.status) in NEEDS_VEHICLE:
                data["status"] = "Pending"
        else:
            veh = resolve_vehicle(
                db,
                org_id=auth.organization_id,
                company_id=company_id,
                vehicle_id=vehicle_id,
                allow_plate=row.vehicle,
            )
            assert veh is not None
            data["vehicle"] = veh.plate
            data.setdefault("transporter", veh.driver_name)

    for k, v in data.items():
        setattr(row, k, v)

    require_vehicle_for_status(row.status, row.vehicle)

    write_audit(
        db,
        action="update",
        entity_type="dispatch",
        entity_id=row.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
        detail=f"status={row.status} vehicle={row.vehicle}",
    )
    db.commit()
    db.refresh(row)
    return row
