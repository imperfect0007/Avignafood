from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.audit.service import write_audit
from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import (
    Company,
    Customer,
    Invoice,
    InvoiceLine,
    InvoiceStatus,
    Product,
    SalesOrder,
    SalesOrderStatus,
)
from app.core.schemas import InvoiceOut

router = APIRouter(prefix="/invoices", tags=["invoices"])


def _out(inv: Invoice) -> InvoiceOut:
    outstanding = inv.total - inv.amount_paid
    return InvoiceOut(
        id=inv.id,
        company_id=inv.company_id,
        customer_id=inv.customer_id,
        sales_order_id=inv.sales_order_id,
        number=inv.number,
        invoice_date=inv.invoice_date,
        due_date=inv.due_date,
        status=inv.status.value,
        subtotal=inv.subtotal,
        tax_amount=inv.tax_amount,
        total=inv.total,
        amount_paid=inv.amount_paid,
        outstanding=outstanding,
        lines=[
            {
                "id": ln.id,
                "product_id": ln.product_id,
                "quantity": float(ln.quantity),
                "unit_price": float(ln.unit_price),
                "gst_rate": float(ln.gst_rate),
                "line_total": float(ln.line_total),
            }
            for ln in inv.lines
        ],
    )


@router.get("", response_model=list[InvoiceOut])
def list_invoices(
    auth: AuthContext = Depends(require_perms("invoices.view")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    rows = (
        db.query(Invoice)
        .options(joinedload(Invoice.lines))
        .filter(Invoice.company_id == company_id, Invoice.organization_id == auth.organization_id)
        .order_by(Invoice.id.desc())
        .all()
    )
    return [_out(r) for r in rows]


@router.post("/from-order/{order_id}", response_model=InvoiceOut)
def invoice_from_order(
    order_id: int,
    auth: AuthContext = Depends(require_perms("invoices.create")),
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
    if so.status != SalesOrderStatus.CONFIRMED:
        raise HTTPException(status_code=400, detail="Order must be confirmed before invoicing")
    existing = db.query(Invoice).filter(Invoice.sales_order_id == so.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Invoice already exists for this order")

    company = db.query(Company).filter(Company.id == company_id).first()
    customer = db.query(Customer).filter(Customer.id == so.customer_id).first()
    count = db.query(Invoice).filter(Invoice.company_id == company_id).count() + 1
    number = f"{company.invoice_prefix}-{count:05d}"

    subtotal = Decimal("0")
    tax_amount = Decimal("0")
    inv = Invoice(
        organization_id=auth.organization_id,
        company_id=company_id,
        customer_id=so.customer_id,
        sales_order_id=so.id,
        number=number,
        invoice_date=date.today(),
        due_date=date.today() + timedelta(days=customer.credit_days if customer else 30),
        status=InvoiceStatus.OPEN,
    )
    db.add(inv)
    db.flush()

    for ln in so.lines:
        product = db.query(Product).filter(Product.id == ln.product_id).first()
        gst_rate = product.gst_rate if product else Decimal("0")
        line_sub = ln.quantity * ln.unit_price
        line_tax = line_sub * gst_rate / Decimal("100")
        line_total = line_sub + line_tax
        subtotal += line_sub
        tax_amount += line_tax
        db.add(
            InvoiceLine(
                invoice_id=inv.id,
                product_id=ln.product_id,
                quantity=ln.quantity,
                unit_price=ln.unit_price,
                gst_rate=gst_rate,
                line_total=line_total,
            )
        )

    inv.subtotal = subtotal
    inv.tax_amount = tax_amount
    inv.total = subtotal + tax_amount
    so.status = SalesOrderStatus.INVOICED
    write_audit(
        db,
        action="create",
        entity_type="invoice",
        entity_id=inv.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
        detail=number,
    )
    db.commit()
    inv = db.query(Invoice).options(joinedload(Invoice.lines)).filter(Invoice.id == inv.id).first()
    return _out(inv)


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: int,
    auth: AuthContext = Depends(require_perms("invoices.view")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    inv = (
        db.query(Invoice)
        .options(joinedload(Invoice.lines))
        .filter(
            Invoice.id == invoice_id,
            Invoice.company_id == company_id,
            Invoice.organization_id == auth.organization_id,
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return _out(inv)
