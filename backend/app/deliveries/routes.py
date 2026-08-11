from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import Company, Customer, Delivery
from app.core.schemas import DeliveryComplete, DeliveryInvoiceOut, DeliveryOut

router = APIRouter(prefix="/deliveries", tags=["deliveries"])

POD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "pod"
ALLOWED = {".jpg", ".jpeg", ".png", ".webp"}
MAX_BYTES = 20 * 1024 * 1024


def _out(row: Delivery, company: Company | None, customer: Customer | None) -> DeliveryOut:
    return DeliveryOut(
        id=row.id,
        company_id=row.company_id,
        company_name=(company.trade_name or company.legal_name) if company else f"Firm {row.company_id}",
        customer_name=customer.name if customer else "Customer",
        address=customer.address if customer else None,
        phone=customer.phone if customer else None,
        item_summary=row.item_summary,
        slot_date=row.slot_date,
        slot=row.slot,
        status=row.status,
        pod_url=row.pod_url,
    )


@router.post("/upload")
async def upload_pod(
    file: UploadFile = File(...),
    auth: AuthContext = Depends(require_perms("deliveries.edit")),
):
    ext = Path(file.filename or "jpg").suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(status_code=400, detail="Use a photo")
    data = await file.read()
    if not data or len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Invalid photo")
    POD_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{auth.user.id}_{uuid4().hex}{ext}"
    (POD_DIR / name).write_bytes(data)
    return {"url": f"/uploads/pod/{name}"}


@router.get("", response_model=list[DeliveryOut])
def list_deliveries(
    on_date: date | None = Query(default=None),
    after: date | None = Query(default=None),
    status: str | None = Query(default=None),
    auth: AuthContext = Depends(require_perms("deliveries.view")),
    db: Session = Depends(get_db),
):
    q = db.query(Delivery).filter(Delivery.organization_id == auth.organization_id)
    if on_date:
        q = q.filter(Delivery.slot_date == on_date)
    if after:
        q = q.filter(Delivery.slot_date > after)
    if status:
        q = q.filter(Delivery.status == status)
    rows = q.order_by(Delivery.slot_date, Delivery.slot, Delivery.id).all()
    companies = {c.id: c for c in db.query(Company).filter(Company.id.in_({r.company_id for r in rows} or [0])).all()}
    customers = {c.id: c for c in db.query(Customer).filter(Customer.id.in_({r.customer_id for r in rows} or [0])).all()}
    return [_out(r, companies.get(r.company_id), customers.get(r.customer_id)) for r in rows]


@router.post("/{delivery_id}/complete", response_model=DeliveryOut)
def complete_delivery(
    delivery_id: int,
    body: DeliveryComplete,
    auth: AuthContext = Depends(require_perms("deliveries.edit")),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Delivery)
        .filter(Delivery.id == delivery_id, Delivery.organization_id == auth.organization_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Delivery not found")
    row.status = "done"
    row.pod_url = body.pod_url
    row.lat = None if body.lat is None else Decimal(str(body.lat))
    row.lng = None if body.lng is None else Decimal(str(body.lng))
    row.completed_at = datetime.now(timezone.utc)
    db.commit()
    company = db.query(Company).filter(Company.id == row.company_id).first()
    customer = db.query(Customer).filter(Customer.id == row.customer_id).first()
    return _out(row, company, customer)


@router.get("/{delivery_id}/invoice", response_model=DeliveryInvoiceOut)
def delivery_invoice(
    delivery_id: int,
    auth: AuthContext = Depends(require_perms("deliveries.view")),
    db: Session = Depends(get_db),
):
    row = (
        db.query(Delivery)
        .filter(Delivery.id == delivery_id, Delivery.organization_id == auth.organization_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Delivery not found")
    if row.status != "done":
        raise HTTPException(status_code=400, detail="Invoice after drop-off only")
    company = db.query(Company).filter(Company.id == row.company_id).first()
    customer = db.query(Customer).filter(Customer.id == row.customer_id).first()
    return DeliveryInvoiceOut(
        delivery_id=row.id,
        number=f"DEL-{row.id:05d}",
        company_name=(company.trade_name or company.legal_name) if company else f"Firm {row.company_id}",
        customer_name=customer.name if customer else "Customer",
        address=customer.address if customer else None,
        phone=customer.phone if customer else None,
        item_summary=row.item_summary,
        slot_date=row.slot_date,
        slot=row.slot,
    )
