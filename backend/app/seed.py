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
]

ROLE_PERMS: dict[RoleName, list[str] | str] = {
    RoleName.SUPER_ADMIN: "*",
    RoleName.OWNER: "*",
    RoleName.SUPERVISOR: [
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
        "quotations.view",
        "quotations.create",
        "quotations.edit",
        "quotations.approve",
        "sales.view",
        "sales.create",
        "sales.edit",
        "invoices.view",
        "payments.view",
        "audit.view",
    ],
    RoleName.SALES: [
        "dashboard.view",
        "companies.view",
        "customers.view",
        "customers.create",
        "leads.view",
        "leads.create",
        "leads.edit",
        "products.view",
        "inventory.view",
        "quotations.view",
        "quotations.create",
        "quotations.edit",
        "sales.view",
        "sales.create",
        "invoices.view",
    ],
    RoleName.ACCOUNTANT: [
        "dashboard.view",
        "companies.view",
        "customers.view",
        "products.view",
        "quotations.view",
        "sales.view",
        "invoices.view",
        "invoices.create",
        "payments.view",
        "payments.create",
    ],
    RoleName.LOGISTICS: [
        "dashboard.view",
        "companies.view",
        "customers.view",
        "products.view",
        "inventory.view",
        "sales.view",
        "invoices.view",
    ],
    RoleName.WAREHOUSE: [
        "dashboard.view",
        "companies.view",
        "products.view",
        "inventory.view",
        "inventory.edit",
        "sales.view",
    ],
}


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Organization).first():
            print("Seed skipped: already initialized")
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

        org = Organization(name="Avighnya Foods")
        db.add(org)
        db.flush()

        companies = []
        for i, name in enumerate(
            ["Avighnya Foods Pvt Ltd", "Avighnya Ingredients", "Avighnya Trading", "Avighnya Retail Supply"],
            start=1,
        ):
            c = Company(
                organization_id=org.id,
                legal_name=name,
                trade_name=name,
                invoice_prefix=f"AF{i}",
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

        db.commit()
        print("Seed complete: admin@avighnya.local / admin123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
