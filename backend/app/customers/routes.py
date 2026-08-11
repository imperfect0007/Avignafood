from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.audit.service import write_audit
from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import Customer
from app.core.schemas import CustomerCreate, CustomerOut, CustomerUpdate

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerOut])
def list_customers(
    auth: AuthContext = Depends(require_perms("customers.view")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    return (
        db.query(Customer)
        .filter(Customer.company_id == company_id, Customer.organization_id == auth.organization_id)
        .order_by(Customer.id.desc())
        .all()
    )


@router.post("", response_model=CustomerOut)
def create_customer(
    body: CustomerCreate,
    auth: AuthContext = Depends(require_perms("customers.create")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    customer = Customer(
        organization_id=auth.organization_id,
        company_id=company_id,
        **body.model_dump(),
    )
    db.add(customer)
    db.flush()
    write_audit(
        db,
        action="create",
        entity_type="customer",
        entity_id=customer.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
    )
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: int,
    auth: AuthContext = Depends(require_perms("customers.view")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    customer = (
        db.query(Customer)
        .filter(
            Customer.id == customer_id,
            Customer.company_id == company_id,
            Customer.organization_id == auth.organization_id,
        )
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.patch("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    body: CustomerUpdate,
    auth: AuthContext = Depends(require_perms("customers.edit")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    customer = (
        db.query(Customer)
        .filter(
            Customer.id == customer_id,
            Customer.company_id == company_id,
            Customer.organization_id == auth.organization_id,
        )
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(customer, k, v)
    write_audit(
        db,
        action="update",
        entity_type="customer",
        entity_id=customer.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
    )
    db.commit()
    db.refresh(customer)
    return customer
