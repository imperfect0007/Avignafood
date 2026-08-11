from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import (
    Customer,
    Invoice,
    InvoiceStatus,
    Lead,
    LeadStatus,
    Payment,
    Product,
    Quotation,
    QuotationStatus,
    SalesOrder,
    SalesOrderStatus,
    StockBalance,
    UserCompany,
    Warehouse,
)
from app.core.schemas import (
    AccountsDashboardOut,
    LogisticsDashboardOut,
    SalesDashboardOut,
    SupervisorDashboardOut,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/accounts", response_model=AccountsDashboardOut)
def accounts_dashboard(
    auth: AuthContext = Depends(require_perms("dashboard.view")),
    db: Session = Depends(get_db),
):
    """Financial dashboard for Accounts role (billing / receivables focus)."""
    company_id = auth.require_company()
    today = date.today()
    month_start = today.replace(day=1)
    week_end = today + timedelta(days=7)

    today_collections = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.company_id == company_id, Payment.paid_at == today)
        .scalar()
    )
    month_collections = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.company_id == company_id, Payment.paid_at >= month_start)
        .scalar()
    )

    open_invoices = (
        db.query(Invoice)
        .filter(
            Invoice.company_id == company_id,
            Invoice.status.in_([InvoiceStatus.OPEN, InvoiceStatus.PARTIAL]),
        )
        .all()
    )

    total_receivables = Decimal("0")
    total_overdue = Decimal("0")
    due_today = Decimal("0")
    due_this_week = Decimal("0")
    unpaid = 0
    partial = 0
    overdue_count = 0

    for inv in open_invoices:
        bal = inv.total - inv.amount_paid
        if bal <= 0:
            continue
        total_receivables += bal
        if inv.status == InvoiceStatus.OPEN:
            unpaid += 1
        elif inv.status == InvoiceStatus.PARTIAL:
            partial += 1
        due = inv.due_date
        if due is not None:
            if due < today:
                total_overdue += bal
                overdue_count += 1
            elif due == today:
                due_today += bal
            elif due <= week_end:
                due_this_week += bal

    credit_exposure = (
        db.query(func.coalesce(func.sum(Customer.credit_limit), 0))
        .filter(Customer.company_id == company_id, Customer.is_active.is_(True))
        .scalar()
    )
    active_customers = (
        db.query(func.count(Customer.id))
        .filter(Customer.company_id == company_id, Customer.is_active.is_(True))
        .scalar()
    )

    return AccountsDashboardOut(
        today_collections=Decimal(str(today_collections)),
        month_collections=Decimal(str(month_collections)),
        total_receivables=total_receivables,
        total_overdue=total_overdue,
        due_today=due_today,
        due_this_week=due_this_week,
        unpaid_invoices=unpaid,
        partial_invoices=partial,
        overdue_invoices=overdue_count,
        credit_exposure=Decimal(str(credit_exposure)),
        active_customers=int(active_customers or 0),
    )


@router.get("/supervisor", response_model=SupervisorDashboardOut)
def supervisor_dashboard(
    auth: AuthContext = Depends(require_perms("dashboard.view")),
    db: Session = Depends(get_db),
):
    """Ops + warehouse dashboard — sales team, approvals, stock, dispatch prep."""
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
    active_leads = (
        db.query(func.count(Lead.id))
        .filter(
            Lead.company_id == company_id,
            Lead.status.notin_([LeadStatus.WON, LeadStatus.LOST]),
        )
        .scalar()
    )
    unassigned_leads = (
        db.query(func.count(Lead.id))
        .filter(
            Lead.company_id == company_id,
            Lead.assigned_to_id.is_(None),
            Lead.status.notin_([LeadStatus.WON, LeadStatus.LOST]),
        )
        .scalar()
    )
    pending_approvals = (
        db.query(func.count(Quotation.id))
        .filter(
            Quotation.company_id == company_id,
            Quotation.status == QuotationStatus.PENDING_APPROVAL,
        )
        .scalar()
    )
    pending_orders = (
        db.query(func.count(SalesOrder.id))
        .filter(SalesOrder.company_id == company_id, SalesOrder.status == SalesOrderStatus.DRAFT)
        .scalar()
    )
    confirmed_orders = (
        db.query(func.count(SalesOrder.id))
        .filter(SalesOrder.company_id == company_id, SalesOrder.status == SalesOrderStatus.CONFIRMED)
        .scalar()
        or 0
    )
    low_stock_items = (
        db.query(func.count(StockBalance.id))
        .filter(StockBalance.company_id == company_id, StockBalance.quantity < 100)
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
    overdue_invoices = 0
    for inv in (
        db.query(Invoice)
        .filter(
            Invoice.company_id == company_id,
            Invoice.status.in_([InvoiceStatus.OPEN, InvoiceStatus.PARTIAL]),
        )
        .all()
    ):
        if inv.due_date and inv.due_date < today and (inv.total - inv.amount_paid) > 0:
            overdue_invoices += 1

    team_users = (
        db.query(func.count(UserCompany.user_id.distinct()))
        .filter(UserCompany.company_id == company_id)
        .scalar()
    )

    total_stock = Decimal(
        str(
            db.query(func.coalesce(func.sum(StockBalance.quantity), 0))
            .filter(StockBalance.company_id == company_id)
            .scalar()
        )
    )
    inv_value = Decimal(
        str(
            db.query(func.coalesce(func.sum(StockBalance.quantity * Product.base_price), 0))
            .join(Product, Product.id == StockBalance.product_id)
            .filter(StockBalance.company_id == company_id)
            .scalar()
        )
    )
    # ponytail: confirm already deducts stock — available = on-hand balance
    warehouses = (
        db.query(func.count(Warehouse.id))
        .filter(Warehouse.company_id == company_id, Warehouse.is_active.is_(True))
        .scalar()
        or 0
    )

    return SupervisorDashboardOut(
        today_sales=Decimal(str(today_sales)),
        month_sales=Decimal(str(month_sales)),
        active_leads=int(active_leads or 0),
        unassigned_leads=int(unassigned_leads or 0),
        pending_approvals=int(pending_approvals or 0),
        pending_orders=int(pending_orders or 0),
        confirmed_orders=int(confirmed_orders),
        low_stock_items=int(low_stock_items or 0),
        outstanding=Decimal(str(outstanding)),
        overdue_invoices=overdue_invoices,
        team_users=int(team_users or 0),
        total_stock_qty=total_stock,
        inventory_value=inv_value,
        available_stock=total_stock,
        ready_for_dispatch=int(confirmed_orders),
        warehouses=int(warehouses),
    )


@router.get("/sales", response_model=SalesDashboardOut)
def sales_dashboard(
    auth: AuthContext = Depends(require_perms("dashboard.view")),
    db: Session = Depends(get_db),
):
    """Personal sales dashboard — own leads, quotes, orders, achievement."""
    company_id = auth.require_company()
    uid = auth.user.id
    today = date.today()
    month_start = today.replace(day=1)
    # ponytail: fixed monthly target until targets module exists
    month_target = Decimal("500000")

    active_leads = (
        db.query(func.count(Lead.id))
        .filter(
            Lead.company_id == company_id,
            Lead.assigned_to_id == uid,
            Lead.status.notin_([LeadStatus.WON, LeadStatus.LOST]),
        )
        .scalar()
    )
    new_leads = (
        db.query(func.count(Lead.id))
        .filter(
            Lead.company_id == company_id,
            Lead.assigned_to_id == uid,
            Lead.status == LeadStatus.NEW,
        )
        .scalar()
    )
    pending_quotations = (
        db.query(func.count(Quotation.id))
        .filter(
            Quotation.company_id == company_id,
            Quotation.created_by_id == uid,
            Quotation.status.in_(
                [QuotationStatus.DRAFT, QuotationStatus.PENDING_APPROVAL, QuotationStatus.APPROVED]
            ),
        )
        .scalar()
    )
    approved_quotations = (
        db.query(func.count(Quotation.id))
        .filter(
            Quotation.company_id == company_id,
            Quotation.created_by_id == uid,
            Quotation.status.in_([QuotationStatus.APPROVED, QuotationStatus.ACCEPTED, QuotationStatus.CONVERTED]),
        )
        .scalar()
    )
    open_orders = (
        db.query(func.count(SalesOrder.id))
        .filter(
            SalesOrder.company_id == company_id,
            SalesOrder.created_by_id == uid,
            SalesOrder.status.in_([SalesOrderStatus.DRAFT, SalesOrderStatus.CONFIRMED]),
        )
        .scalar()
    )

    # Revenue from invoices linked to sales orders this user created
    month_sales = (
        db.query(func.coalesce(func.sum(Invoice.total), 0))
        .join(SalesOrder, Invoice.sales_order_id == SalesOrder.id)
        .filter(
            Invoice.company_id == company_id,
            Invoice.invoice_date >= month_start,
            Invoice.status != InvoiceStatus.CANCELLED,
            SalesOrder.created_by_id == uid,
        )
        .scalar()
    )

    my_customers = (
        db.query(func.count(func.distinct(SalesOrder.customer_id)))
        .filter(SalesOrder.company_id == company_id, SalesOrder.created_by_id == uid)
        .scalar()
    )

    won = (
        db.query(func.count(Lead.id))
        .filter(Lead.company_id == company_id, Lead.assigned_to_id == uid, Lead.status == LeadStatus.WON)
        .scalar()
        or 0
    )
    closed = (
        db.query(func.count(Lead.id))
        .filter(
            Lead.company_id == company_id,
            Lead.assigned_to_id == uid,
            Lead.status.in_([LeadStatus.WON, LeadStatus.LOST]),
        )
        .scalar()
        or 0
    )
    conversion = Decimal("0")
    if closed > 0:
        conversion = (Decimal(won) * Decimal("100") / Decimal(closed)).quantize(Decimal("0.1"))

    month_sales_d = Decimal(str(month_sales))
    achievement = Decimal("0")
    if month_target > 0:
        achievement = (month_sales_d * Decimal("100") / month_target).quantize(Decimal("0.1"))

    return SalesDashboardOut(
        active_leads=int(active_leads or 0),
        new_leads=int(new_leads or 0),
        pending_quotations=int(pending_quotations or 0),
        approved_quotations=int(approved_quotations or 0),
        open_orders=int(open_orders or 0),
        month_sales=month_sales_d,
        month_target=month_target,
        achievement_pct=achievement,
        my_customers=int(my_customers or 0),
        conversion_rate=conversion,
    )


@router.get("/logistics", response_model=LogisticsDashboardOut)
def logistics_dashboard(
    auth: AuthContext = Depends(require_perms("dashboard.view")),
    db: Session = Depends(get_db),
):
    """Dispatch queue from confirmed orders. Vehicle/POD zeros until dispatch master exists."""
    company_id = auth.require_company()
    today = date.today()

    # ponytail: no Dispatch/Vehicle tables yet — confirmed SO = ready queue; invoiced today ≈ delivered
    confirmed = (
        db.query(func.count(SalesOrder.id))
        .filter(SalesOrder.company_id == company_id, SalesOrder.status == SalesOrderStatus.CONFIRMED)
        .scalar()
        or 0
    )
    delivered_today = (
        db.query(func.count(Invoice.id))
        .filter(
            Invoice.company_id == company_id,
            Invoice.invoice_date == today,
            Invoice.status != InvoiceStatus.CANCELLED,
        )
        .scalar()
        or 0
    )

    return LogisticsDashboardOut(
        pending_dispatches=int(confirmed),
        ready_for_dispatch=int(confirmed),
        today_dispatches=int(delivered_today),
        delivered_today=int(delivered_today),
        confirmed_orders=int(confirmed),
    )
