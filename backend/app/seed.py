"""Seed roles, permissions, org, companies, and super admin."""

from app.core.database import Base, SessionLocal, engine
from app.core.models import (
    Company,
    Organization,
    Permission,
    Role,
    RoleName,
    RolePermission,
    User,
    UserCompany,
    Warehouse,
)
from app.core.security import hash_password

# Import models so metadata is registered
import app.core.models  # noqa: F401

PERMISSIONS = [
    ("dashboard.view", "View dashboard"),
    ("companies.view", "View companies"),
    ("companies.create", "Create companies"),
    ("companies.edit", "Edit companies"),
    ("users.view", "View users"),
    ("users.create", "Create users"),
    ("users.edit", "Edit users"),
    ("customers.view", "View customers"),
    ("customers.create", "Create customers"),
    ("customers.edit", "Edit customers"),
    ("leads.view", "View leads"),
    ("leads.create", "Create leads"),
    ("leads.edit", "Edit leads"),
    ("products.view", "View products"),
    ("products.create", "Create products"),
    ("products.edit", "Edit products"),
    ("inventory.view", "View inventory"),
    ("inventory.edit", "Edit inventory"),
    ("quotations.view", "View quotations"),
    ("quotations.create", "Create quotations"),
    ("quotations.edit", "Edit quotations"),
    ("quotations.approve", "Approve quotations"),
    ("sales.view", "View sales orders"),
    ("sales.create", "Create sales orders"),
    ("sales.edit", "Edit/confirm sales orders"),
    ("invoices.view", "View invoices"),
    ("invoices.create", "Create invoices"),
    ("payments.view", "View payments"),
    ("payments.create", "Create payments"),
    ("audit.view", "View audit logs"),
    ("visits.view", "View field visits"),
    ("visits.create", "Log field visits"),
    ("vehicles.view", "View vehicle availability"),
    ("vehicles.edit", "Set vehicle availability"),
]

# Granular VIEW/CREATE/EDIT/APPROVE — menus hide modules; APIs enforce these codes.
ROLE_PERMS: dict[RoleName, list[str] | str] = {
    RoleName.SUPER_ADMIN: "*",  # everything + Administration
    RoleName.OWNER: "*",
    RoleName.SUPERVISOR: [
        # ops + warehouse + approvals; no Administration (no users.create/edit)
        "dashboard.view",
        "companies.view",
        "users.view",
        "customers.view",
        "customers.create",
        "customers.edit",
        "leads.view",
        "leads.create",
        "leads.edit",
        "products.view",
        "inventory.view",
        "inventory.edit",
        "quotations.view",
        "quotations.create",
        "quotations.edit",
        # quotations.approve: Owner only
        "sales.view",
        "sales.create",
        "sales.edit",
        "invoices.view",
        "payments.view",
        "audit.view",
        "visits.view",
        "visits.create",
        "vehicles.view",
        "vehicles.edit",
    ],
    RoleName.SALES: [
        "dashboard.view",
        "companies.view",
        "customers.view",
        "customers.create",
        "leads.view",
        "leads.create",
        "leads.edit",
        "visits.view",
        "visits.create",
        "vehicles.view",
    ],
    RoleName.ACCOUNTANT: [
        # money full; ops view; no field visits / inventory.edit / admin
        "dashboard.view",
        "companies.view",
        "customers.view",
        "customers.edit",  # billing fields only (enforced later)
        "leads.view",
        "products.view",
        "inventory.view",
        "quotations.view",
        "sales.view",
        "invoices.view",
        "invoices.create",
        "payments.view",
        "payments.create",
        "audit.view",
    ],
    RoleName.LOGISTICS: [
        # dispatch + addresses + order/invoice view; no inventory, leads, receivables write
        "dashboard.view",
        "companies.view",
        "customers.view",
        "products.view",
        "sales.view",
        "invoices.view",
        "vehicles.view",
        "vehicles.edit",
    ],
    # ponytail: WAREHOUSE role removed — Supervisor owns warehouse; enum kept for old DB rows
}


COMPANY_BRANDING = [
    {
        "legal_name": "Asian Apex & Co.",
        "trade_name": "Asian Apex",
        "invoice_prefix": "AA",
        "logo_url": "/logos/asian-apex.jpg",
    },
    {
        "legal_name": "Avighna Speciality Ingredients Pvt Ltd",
        "trade_name": "Avighna",
        "invoice_prefix": "AV",
        "logo_url": "/logos/avighna.png",
    },
    {
        "legal_name": "Ganesh Inc.",
        "trade_name": "Ganesh Inc",
        "invoice_prefix": "GI",
        "logo_url": "/logos/ganesh-inc.jpg",
    },
    {
        "legal_name": "Atharva Associates",
        "trade_name": "Atharva Associates",
        "invoice_prefix": "AT",
        "logo_url": "/logos/atharva-associates.png",
    },
]


def _ensure_column(table: str, column: str, ddl: str) -> None:
    # ponytail: create_all won't add columns to existing tables
    from sqlalchemy import text

    with engine.begin() as conn:
        exists = conn.execute(
            text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_name = :table AND column_name = :column"
            ),
            {"table": table, "column": column},
        ).scalar()
        if not exists:
            conn.execute(text(ddl))


def _ensure_logo_column() -> None:
    _ensure_column("companies", "logo_url", "ALTER TABLE companies ADD COLUMN logo_url VARCHAR(255)")
    _ensure_column("leads", "voice_url", "ALTER TABLE leads ADD COLUMN voice_url VARCHAR(255)")
    _ensure_column("field_visits", "customer_id", "ALTER TABLE field_visits ADD COLUMN customer_id INTEGER")
    _ensure_column("field_visits", "sales_order_id", "ALTER TABLE field_visits ADD COLUMN sales_order_id INTEGER")
    _ensure_column("vehicles", "driver_name", "ALTER TABLE vehicles ADD COLUMN driver_name VARCHAR(120)")


def _sync_company_branding(db) -> None:
    companies = db.query(Company).order_by(Company.id).all()
    for company, brand in zip(companies, COMPANY_BRANDING):
        company.legal_name = brand["legal_name"]
        company.trade_name = brand["trade_name"]
        company.invoice_prefix = brand["invoice_prefix"]
        company.logo_url = brand["logo_url"]
    db.commit()
    print(f"Company branding synced for {min(len(companies), len(COMPANY_BRANDING))} companies")


def _sync_role_user(
    db,
    *,
    role_name: RoleName,
    email: str,
    full_name: str,
    password: str,
) -> None:
    from app.core.models import Permission, Role, RolePermission, User, UserCompany, Organization

    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        # ponytail: roles added to enum after first seed
        role = Role(name=role_name, description=role_name.value.replace("_", " ").title())
        db.add(role)
        db.flush()
    perm_map = {p.code: p.id for p in db.query(Permission).all()}
    for code, desc in PERMISSIONS:
        if code not in perm_map:
            p = Permission(code=code, description=desc)
            db.add(p)
            db.flush()
            perm_map[code] = p.id
    wanted = ROLE_PERMS[role_name]
    assert isinstance(wanted, list)
    db.query(RolePermission).filter(RolePermission.role_id == role.id).delete()
    for code in wanted:
        if code in perm_map:
            db.add(RolePermission(role_id=role.id, permission_id=perm_map[code]))

    org = db.query(Organization).first()
    companies = db.query(Company).order_by(Company.id).all()
    user = db.query(User).filter(User.email == email).first()
    if not user and org:
        user = User(
            organization_id=org.id,
            role_id=role.id,
            email=email,
            full_name=full_name,
            hashed_password=hash_password(password),
        )
        db.add(user)
        db.flush()
        for c in companies:
            db.add(UserCompany(user_id=user.id, company_id=c.id))
        print(f"{full_name} user created: {email} / {password}")
    elif user:
        user.role_id = role.id
        existing = {uc.company_id for uc in db.query(UserCompany).filter(UserCompany.user_id == user.id).all()}
        for c in companies:
            if c.id not in existing:
                db.add(UserCompany(user_id=user.id, company_id=c.id))
        print(f"{full_name} user refreshed")
    db.commit()


def _sync_vehicles(db) -> None:
    from app.core.models import Organization, Vehicle

    org = db.query(Organization).first()
    if not org:
        return
    keep = (
        db.query(Vehicle)
        .filter(Vehicle.organization_id == org.id, Vehicle.plate == "KA-01-AB-4421")
        .first()
    )
    if not keep:
        keep = db.query(Vehicle).filter(Vehicle.organization_id == org.id).order_by(Vehicle.id).first()
    if not keep:
        keep = Vehicle(
            organization_id=org.id,
            name="Tata 1109",
            plate="KA-01-AB-4421",
            kind="truck",
            driver_name="Ravi Kumar",
        )
        db.add(keep)
        db.flush()
    keep.name = "Tata 1109"
    keep.plate = "KA-01-AB-4421"
    keep.kind = "truck"
    keep.driver_name = "Ravi Kumar"
    keep.is_active = True
    for extra in db.query(Vehicle).filter(Vehicle.organization_id == org.id, Vehicle.id != keep.id).all():
        extra.is_active = False
    db.commit()
    print("Fleet set to 1 vehicle / 1 driver")


def _sync_demo_customers(db) -> None:
    from app.core.models import Company, Customer

    samples = [
        ("Anand Bakers Pvt Ltd", "Ramesh Anand", "9845011122"),
        ("Gokul Beverages", "Vinay T.", "9845022233"),
        ("Medisyn Formulations", "Neha S.", "9845033344"),
    ]
    for company in db.query(Company).order_by(Company.id).all():
        if db.query(Customer).filter(Customer.company_id == company.id).first():
            continue
        for name, contact, phone in samples:
            db.add(
                Customer(
                    organization_id=company.organization_id,
                    company_id=company.id,
                    name=name,
                    contact_person=contact,
                    phone=phone,
                )
            )
    db.commit()


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_logo_column()
    db = SessionLocal()
    try:
        if db.query(Organization).first():
            _sync_company_branding(db)
            _sync_role_user(
                db,
                role_name=RoleName.ACCOUNTANT,
                email="accounts@avighnya.local",
                full_name="Accounts",
                password="accounts123",
            )
            _sync_role_user(
                db,
                role_name=RoleName.SUPERVISOR,
                email="supervisor@avighnya.local",
                full_name="Supervisor",
                password="super123",
            )
            _sync_role_user(
                db,
                role_name=RoleName.SALES,
                email="sales@avighnya.local",
                full_name="Sales Person",
                password="sales123",
            )
            _sync_role_user(
                db,
                role_name=RoleName.LOGISTICS,
                email="logistics@avighnya.local",
                full_name="Logistics",
                password="logistics123",
            )
            _sync_vehicles(db)
            _sync_demo_customers(db)
            print("Seed skipped: already initialized (branding + role users refreshed)")
            return

        for code, desc in PERMISSIONS:
            db.add(Permission(code=code, description=desc))
        db.flush()
        perm_map = {p.code: p.id for p in db.query(Permission).all()}

        for role_name in RoleName:
            db.add(Role(name=role_name, description=role_name.value.replace("_", " ").title()))
        db.flush()
        role_map = {r.name: r.id for r in db.query(Role).all()}

        for role_name, perms in ROLE_PERMS.items():
            role_id = role_map[role_name]
            codes = list(perm_map.keys()) if perms == "*" else perms
            for code in codes:
                db.add(RolePermission(role_id=role_id, permission_id=perm_map[code]))

        org = Organization(name="Avighna Group")
        db.add(org)
        db.flush()

        companies = []
        for i, brand in enumerate(COMPANY_BRANDING, start=1):
            c = Company(
                organization_id=org.id,
                legal_name=brand["legal_name"],
                trade_name=brand["trade_name"],
                invoice_prefix=brand["invoice_prefix"],
                logo_url=brand["logo_url"],
                gstin=f"29AAAAA000{i}A1Z{i}",
            )
            db.add(c)
            db.flush()
            db.add(
                Warehouse(
                    organization_id=org.id,
                    company_id=c.id,
                    name="Main Warehouse",
                    is_default=True,
                )
            )
            companies.append(c)

        admin = User(
            organization_id=org.id,
            role_id=role_map[RoleName.SUPER_ADMIN],
            email="admin@avighnya.local",
            full_name="Super Admin",
            hashed_password=hash_password("admin123"),
        )
        db.add(admin)
        db.flush()
        for c in companies:
            db.add(UserCompany(user_id=admin.id, company_id=c.id))

        owner = User(
            organization_id=org.id,
            role_id=role_map[RoleName.OWNER],
            email="owner@avighnya.local",
            full_name="Owner",
            hashed_password=hash_password("owner123"),
        )
        db.add(owner)
        db.flush()
        for c in companies:
            db.add(UserCompany(user_id=owner.id, company_id=c.id))

        sales = User(
            organization_id=org.id,
            role_id=role_map[RoleName.SALES],
            email="sales@avighnya.local",
            full_name="Sales Person",
            hashed_password=hash_password("sales123"),
        )
        db.add(sales)
        db.flush()
        db.add(UserCompany(user_id=sales.id, company_id=companies[0].id))

        accounts = User(
            organization_id=org.id,
            role_id=role_map[RoleName.ACCOUNTANT],
            email="accounts@avighnya.local",
            full_name="Accounts",
            hashed_password=hash_password("accounts123"),
        )
        db.add(accounts)
        db.flush()
        for c in companies:
            db.add(UserCompany(user_id=accounts.id, company_id=c.id))

        supervisor = User(
            organization_id=org.id,
            role_id=role_map[RoleName.SUPERVISOR],
            email="supervisor@avighnya.local",
            full_name="Supervisor",
            hashed_password=hash_password("super123"),
        )
        db.add(supervisor)
        db.flush()
        for c in companies:
            db.add(UserCompany(user_id=supervisor.id, company_id=c.id))

        logistics = User(
            organization_id=org.id,
            role_id=role_map[RoleName.LOGISTICS],
            email="logistics@avighnya.local",
            full_name="Logistics",
            hashed_password=hash_password("logistics123"),
        )
        db.add(logistics)
        db.flush()
        for c in companies:
            db.add(UserCompany(user_id=logistics.id, company_id=c.id))

        db.commit()
        _sync_vehicles(db)
        print(
            "Seed complete: admin@avighnya.local / admin123 · "
            "accounts@avighnya.local / accounts123 · "
            "supervisor@avighnya.local / super123 · "
            "logistics@avighnya.local / logistics123"
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()
