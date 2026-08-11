from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import Customer, Invoice, InvoiceStatus, Lead, LeadStatus, SalesOrder, SalesOrderStatus
from app.core.schemas import DashboardOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
def dashboard(
    auth: AuthContext = Depends(require_perms("dashboard.view")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    today = date.today()
    month_start = today.replace(day=1)

    today_sales = (
        db.query(func.coalesce(func.sum(Invoice.total), 0))
        .filter(
            Invoice.company_id == company_id,
            Invoice.invoice_date == today,
            Invoice.status != InvoiceStatus.CANCELLED,
        )
        .scalar()
    )
    month_sales = (
        db.query(func.coalesce(func.sum(Invoice.total), 0))
        .filter(
            Invoice.company_id == company_id,
            Invoice.invoice_date >= month_start,
            Invoice.status != InvoiceStatus.CANCELLED,
        )
        .scalar()
    )
    outstanding = (
        db.query(func.coalesce(func.sum(Invoice.total - Invoice.amount_paid), 0))
        .filter(
            Invoice.company_id == company_id,
            Invoice.status.in_([InvoiceStatus.OPEN, InvoiceStatus.PARTIAL]),
        )
        .scalar()
    )
    open_orders = (
        db.query(func.count(SalesOrder.id))
        .filter(
            SalesOrder.company_id == company_id,
            SalesOrder.status.in_([SalesOrderStatus.DRAFT, SalesOrderStatus.CONFIRMED]),
        )
        .scalar()
    )
    active_customers = (
        db.query(func.count(Customer.id))
        .filter(Customer.company_id == company_id, Customer.is_active.is_(True))
        .scalar()
    )
    open_leads = (
        db.query(func.count(Lead.id))
        .filter(
            Lead.company_id == company_id,
            Lead.status.notin_([LeadStatus.WON, LeadStatus.LOST]),
        )
        .scalar()
    )
    return DashboardOut(
        today_sales=Decimal(str(today_sales)),
        month_sales=Decimal(str(month_sales)),
        outstanding=Decimal(str(outstanding)),
        open_orders=int(open_orders or 0),
        active_customers=int(active_customers or 0),
        open_leads=int(open_leads or 0),
    )
