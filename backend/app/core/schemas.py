from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- Auth ----
class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(ORMModel):
    id: int
    email: str
    full_name: str
    organization_id: int
    role: str
    is_active: bool
    company_ids: list[int] = []


class MeOut(BaseModel):
    user: UserOut
    permissions: list[str]


class PermissionOut(ORMModel):
    id: int
    code: str
    description: str | None = None


class UserPermissionGrant(BaseModel):
    permission_code: str
    forever: bool = True
    expires_on: date | None = None  # ignored when forever=True; end of that day UTC


class UserPermissionOut(BaseModel):
    id: int
    permission_code: str
    description: str | None = None
    forever: bool
    expires_at: datetime | None = None
    created_at: datetime | None = None


# ---- Companies ----
class CompanyCreate(BaseModel):
    legal_name: str
    trade_name: str | None = None
    gstin: str | None = None
    pan: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    invoice_prefix: str = "INV"
    logo_url: str | None = None


class CompanyUpdate(BaseModel):
    legal_name: str | None = None
    trade_name: str | None = None
    gstin: str | None = None
    pan: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    invoice_prefix: str | None = None
    logo_url: str | None = None
    is_active: bool | None = None


class CompanyOut(ORMModel):
    id: int
    organization_id: int
    legal_name: str
    trade_name: str | None
    gstin: str | None
    pan: str | None
    address: str | None
    phone: str | None
    email: str | None
    invoice_prefix: str
    logo_url: str | None = None
    is_active: bool


# ---- Users ----
class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str = Field(min_length=6)
    role: str
    company_ids: list[int] = []


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    company_ids: list[int] | None = None
    password: str | None = None


# ---- Customers ----
class CustomerCreate(BaseModel):
    name: str
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    gstin: str | None = None
    address: str | None = None
    credit_limit: Decimal = Decimal("0")
    credit_days: int = 30


class CustomerUpdate(BaseModel):
    name: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    gstin: str | None = None
    address: str | None = None
    credit_limit: Decimal | None = None
    credit_days: int | None = None
    is_active: bool | None = None


class CustomerOut(ORMModel):
    id: int
    company_id: int
    name: str
    contact_person: str | None
    phone: str | None
    email: str | None
    gstin: str | None
    address: str | None
    credit_limit: Decimal
    credit_days: int
    is_active: bool


# ---- Leads ----
class LeadCreate(BaseModel):
    business_name: str
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    location: str | None = None
    source: str | None = None
    lead_type: str | None = None
    product_requirement: str | None = None
    quantity: str | None = None
    estimated_value: Decimal | None = None
    assigned_to_id: int | None = None
    notes: str | None = None


class LeadUpdate(BaseModel):
    business_name: str | None = None
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    location: str | None = None
    source: str | None = None
    lead_type: str | None = None
    product_requirement: str | None = None
    quantity: str | None = None
    estimated_value: Decimal | None = None
    status: str | None = None
    assigned_to_id: int | None = None
    notes: str | None = None
    lost_reason: str | None = None


class LeadOut(ORMModel):
    id: int
    company_id: int
    business_name: str
    contact_person: str | None
    phone: str | None
    email: str | None
    location: str | None
    source: str | None
    lead_type: str | None
    product_requirement: str | None
    quantity: str | None
    estimated_value: Decimal | None
    status: str
    assigned_to_id: int | None
    notes: str | None
    lost_reason: str | None
    customer_id: int | None


# ---- Products ----
class ProductCreate(BaseModel):
    sku: str
    name: str
    unit: str = "KG"
    hsn_code: str | None = None
    gst_rate: Decimal = Decimal("0")
    base_price: Decimal = Decimal("0")


class ProductUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    hsn_code: str | None = None
    gst_rate: Decimal | None = None
    base_price: Decimal | None = None
    is_active: bool | None = None


class ProductOut(ORMModel):
    id: int
    company_id: int
    sku: str
    name: str
    unit: str
    hsn_code: str | None
    gst_rate: Decimal
    base_price: Decimal
    is_active: bool


# ---- Inventory ----
class WarehouseOut(ORMModel):
    id: int
    company_id: int
    name: str
    is_default: bool
    is_active: bool


class StockSetIn(BaseModel):
    product_id: int
    warehouse_id: int | None = None
    quantity: Decimal


class StockOut(ORMModel):
    id: int
    product_id: int
    warehouse_id: int
    quantity: Decimal


# ---- Quotations / Sales ----
class LineIn(BaseModel):
    product_id: int
    quantity: Decimal
    unit_price: Decimal


class QuotationCreate(BaseModel):
    customer_id: int
    lead_id: int | None = None
    notes: str | None = None
    lines: list[LineIn]


class QuotationOut(ORMModel):
    id: int
    company_id: int
    customer_id: int
    lead_id: int | None
    status: str
    notes: str | None
    lines: list[dict]


class SalesOrderCreate(BaseModel):
    customer_id: int
    quotation_id: int | None = None
    warehouse_id: int | None = None
    notes: str | None = None
    lines: list[LineIn]


class SalesOrderOut(ORMModel):
    id: int
    company_id: int
    customer_id: int
    quotation_id: int | None
    warehouse_id: int
    status: str
    notes: str | None
    lines: list[dict]
    stock_warnings: list[str] = []


# ---- Invoices / Payments ----
class InvoiceOut(ORMModel):
    id: int
    company_id: int
    customer_id: int
    sales_order_id: int | None
    number: str
    invoice_date: date
    due_date: date | None
    status: str
    subtotal: Decimal
    tax_amount: Decimal
    total: Decimal
    amount_paid: Decimal
    outstanding: Decimal
    lines: list[dict] = []


class PaymentCreate(BaseModel):
    invoice_id: int
    amount: Decimal
    method: str = "bank"
    reference: str | None = None
    paid_at: date | None = None


class PaymentOut(ORMModel):
    id: int
    invoice_id: int
    amount: Decimal
    method: str
    reference: str | None
    paid_at: date


class AccountsDashboardOut(BaseModel):
    today_collections: Decimal
    month_collections: Decimal
    total_receivables: Decimal
    total_overdue: Decimal
    due_today: Decimal
    due_this_week: Decimal
    unpaid_invoices: int
    partial_invoices: int
    overdue_invoices: int
    credit_exposure: Decimal
    active_customers: int


class SupervisorDashboardOut(BaseModel):
    today_sales: Decimal
    month_sales: Decimal
    active_leads: int
    unassigned_leads: int
    pending_approvals: int
    pending_orders: int
    confirmed_orders: int
    low_stock_items: int
    outstanding: Decimal
    overdue_invoices: int
    team_users: int
    total_stock_qty: Decimal
    inventory_value: Decimal
    available_stock: Decimal
    ready_for_dispatch: int
    warehouses: int


class SalesDashboardOut(BaseModel):
    active_leads: int
    new_leads: int
    pending_quotations: int
    approved_quotations: int
    open_orders: int
    month_sales: Decimal
    month_target: Decimal
    achievement_pct: Decimal
    my_customers: int
    conversion_rate: Decimal


class LogisticsDashboardOut(BaseModel):
    pending_dispatches: int
    ready_for_dispatch: int
    today_dispatches: int
    delivered_today: int
    confirmed_orders: int
