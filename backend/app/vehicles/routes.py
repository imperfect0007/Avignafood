from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import Vehicle, VehicleDay
from app.core.schemas import VehicleCreate, VehicleDayOut, VehicleDaySet, VehicleOut

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.get("", response_model=list[VehicleOut])
def list_vehicles(
    auth: AuthContext = Depends(require_perms("vehicles.view")),
    db: Session = Depends(get_db),
):
    return (
        db.query(Vehicle)
        .filter(Vehicle.organization_id == auth.organization_id, Vehicle.is_active.is_(True))
        .order_by(Vehicle.id)
        .all()
    )


@router.post("", response_model=VehicleOut)
def create_vehicle(
    body: VehicleCreate,
    auth: AuthContext = Depends(require_perms("vehicles.edit")),
    db: Session = Depends(get_db),
):
    v = Vehicle(
        organization_id=auth.organization_id,
        name=body.name.strip(),
        plate=body.plate.strip().upper(),
        kind=body.kind or "truck",
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return v


@router.get("/availability", response_model=list[VehicleDayOut])
def availability(
    on_date: date = Query(...),
    auth: AuthContext = Depends(require_perms("vehicles.view")),
    db: Session = Depends(get_db),
):
    vehicles = (
        db.query(Vehicle)
        .filter(Vehicle.organization_id == auth.organization_id, Vehicle.is_active.is_(True))
        .order_by(Vehicle.id)
        .all()
    )
    days = {
        d.vehicle_id: d
        for d in db.query(VehicleDay).filter(VehicleDay.on_date == on_date).all()
    }
    out: list[VehicleDayOut] = []
    for v in vehicles:
        row = days.get(v.id)
        out.append(
            VehicleDayOut(
                vehicle_id=v.id,
                name=v.name,
                plate=v.plate,
                kind=v.kind,
                driver_name=v.driver_name,
                status=row.status if row else "unmarked",
                notes=row.notes if row else None,
            )
        )
    return out


@router.put("/{vehicle_id}/availability", response_model=VehicleDayOut)
def set_availability(
    vehicle_id: int,
    body: VehicleDaySet,
    auth: AuthContext = Depends(require_perms("vehicles.edit")),
    db: Session = Depends(get_db),
):
    if body.status not in ("available", "booked"):
        raise HTTPException(status_code=400, detail="Status must be available or booked")
    v = (
        db.query(Vehicle)
        .filter(Vehicle.id == vehicle_id, Vehicle.organization_id == auth.organization_id)
        .first()
    )
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    row = (
        db.query(VehicleDay)
        .filter(VehicleDay.vehicle_id == vehicle_id, VehicleDay.on_date == body.on_date)
        .first()
    )
    if row:
        row.status = body.status
        row.notes = body.notes
    else:
        row = VehicleDay(
            vehicle_id=vehicle_id,
            on_date=body.on_date,
            status=body.status,
            notes=body.notes,
        )
        db.add(row)
    db.commit()
    return VehicleDayOut(
        vehicle_id=v.id,
        name=v.name,
        plate=v.plate,
        kind=v.kind,
        driver_name=v.driver_name,
        status=row.status,
        notes=row.notes,
    )
