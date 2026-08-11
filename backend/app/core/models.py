import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RoleName(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    OWNER = "owner"
    SUPERVISOR = "supervisor"
    SALES = "sales"
    ACCOUNTANT = "accountant"
    LOGISTICS = "logistics"
    WAREHOUSE = "warehouse"


class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    VISIT_REQUIRED = "visit_required"
    QUOTATION = "quotation"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"


class QuotationStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    ACCEPTED = "accepted"
    CONVERTED = "converted"


class SalesOrderStatus(str, enum.Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    INVOICED = "invoiced"
    CANCELLED = "cancelled"


class InvoiceStatus(str, enum.Enum):
    OPEN = "open"
    PARTIAL = "partial"
    PAID = "paid"
    CANCELLED = "cancelled"


class ApprovalStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    companies: Mapped[list["Company"]] = relationship(back_populates="organization")
    users: Mapped[list["User"]] = relationship(back_populates="organization")


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    legal_name: Mapped[str] = mapped_column(String(200), nullable=False)
    trade_name: Mapped[str | None] = mapped_column(String(200))
    gstin: Mapped[str | None] = mapped_column(String(20))
    pan: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(120))
    invoice_prefix: Mapped[str] = mapped_column(String(20), default="INV")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    organization: Mapped["Organization"] = relationship(back_populates="companies")


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[RoleName] = mapped_column(Enum(RoleName, name="role_name"), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(200))


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(200))


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role_id", "permission_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    permission_id: Mapped[int] = mapped_column(ForeignKey("permissions.id"), nullable=False)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    organization: Mapped["Organization"] = relationship(back_populates="users")
    role: Mapped["Role"] = relationship()
    companies: Mapped[list["UserCompany"]] = relationship(back_populates="user")


class UserCompany(Base):
    __tablename__ = "user_companies"
    __table_args__ = (UniqueConstraint("user_id", "company_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)

    user: Mapped["User"] = relationship(back_populates="companies")
    company: Mapped["Company"] = relationship()


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_person: Mapped[str | None] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(120))
    gstin: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(Text)
    credit_limit: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    credit_days: Mapped[int] = mapped_column(Integer, default=30)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    business_name: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_person: Mapped[str | None] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(120))
    location: Mapped[str | None] = mapped_column(String(200))
    source: Mapped[str | None] = mapped_column(String(80))
    lead_type: Mapped[str | None] = mapped_column(String(40))
    product_requirement: Mapped[str | None] = mapped_column(Text)
    quantity: Mapped[str | None] = mapped_column(String(80))
    estimated_value: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    status: Mapped[LeadStatus] = mapped_column(Enum(LeadStatus, name="lead_status"), default=LeadStatus.NEW)
    assigned_to_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    notes: Mapped[str | None] = mapped_column(Text)
    lost_reason: Mapped[str | None] = mapped_column(String(200))
    customer_id: Mapped[int | None] = mapped_column(ForeignKey("customers.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    sku: Mapped[str] = mapped_column(String(60), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    unit: Mapped[str] = mapped_column(String(20), default="KG")
    hsn_code: Mapped[str | None] = mapped_column(String(20))
    gst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    base_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("company_id", "sku"),)


class Warehouse(Base):
    __tablename__ = "warehouses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class StockBalance(Base):
    __tablename__ = "stock_balances"
    __table_args__ = (UniqueConstraint("warehouse_id", "product_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    warehouse_id: Mapped[int] = mapped_column(ForeignKey("warehouses.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Quotation(Base):
    __tablename__ = "quotations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    lead_id: Mapped[int | None] = mapped_column(ForeignKey("leads.id"))
    status: Mapped[QuotationStatus] = mapped_column(
        Enum(QuotationStatus, name="quotation_status"), default=QuotationStatus.DRAFT
    )
    notes: Mapped[str | None] = mapped_column(Text)
    needs_price_approval: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lines: Mapped[list["QuotationLine"]] = relationship(back_populates="quotation", cascade="all, delete-orphan")


class QuotationLine(Base):
    __tablename__ = "quotation_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quotation_id: Mapped[int] = mapped_column(ForeignKey("quotations.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    base_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)

    quotation: Mapped["Quotation"] = relationship(back_populates="lines")


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    quotation_id: Mapped[int] = mapped_column(ForeignKey("quotations.id"), nullable=False)
    status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus, name="approval_status"), default=ApprovalStatus.PENDING
    )
    requested_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    decided_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    quotation_id: Mapped[int | None] = mapped_column(ForeignKey("quotations.id"))
    warehouse_id: Mapped[int] = mapped_column(ForeignKey("warehouses.id"), nullable=False)
    status: Mapped[SalesOrderStatus] = mapped_column(
        Enum(SalesOrderStatus, name="sales_order_status"), default=SalesOrderStatus.DRAFT
    )
    notes: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    lines: Mapped[list["SalesOrderLine"]] = relationship(back_populates="sales_order", cascade="all, delete-orphan")


class SalesOrderLine(Base):
    __tablename__ = "sales_order_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sales_order_id: Mapped[int] = mapped_column(ForeignKey("sales_orders.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)

    sales_order: Mapped["SalesOrder"] = relationship(back_populates="lines")


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    sales_order_id: Mapped[int | None] = mapped_column(ForeignKey("sales_orders.id"))
    number: Mapped[str] = mapped_column(String(40), nullable=False)
    invoice_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, name="invoice_status"), default=InvoiceStatus.OPEN
    )
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lines: Mapped[list["InvoiceLine"]] = relationship(back_populates="invoice", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship(back_populates="invoice")

    __table_args__ = (UniqueConstraint("company_id", "number"),)


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    gst_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0)
    line_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)

    invoice: Mapped["Invoice"] = relationship(back_populates="lines")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    method: Mapped[str] = mapped_column(String(40), default="bank")
    reference: Mapped[str | None] = mapped_column(String(120))
    paid_at: Mapped[date] = mapped_column(Date, nullable=False)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    invoice: Mapped["Invoice"] = relationship(back_populates="payments")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id"))
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id"))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[int | None] = mapped_column(Integer)
    detail: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
