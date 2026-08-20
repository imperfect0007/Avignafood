from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.audit.service import write_audit
from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import Product
from app.core.schemas import ProductCreate, ProductOut, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
def list_products(
    auth: AuthContext = Depends(require_perms("products.view")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    return (
        db.query(Product)
        .filter(Product.company_id == company_id, Product.organization_id == auth.organization_id)
        .order_by(Product.name)
        .all()
    )


@router.post("", response_model=ProductOut)
def create_product(
    body: ProductCreate,
    auth: AuthContext = Depends(require_perms("products.create")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    exists = (
        db.query(Product)
        .filter(Product.company_id == company_id, Product.sku == body.sku)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="SKU already exists")
    data = body.model_dump()
    if not data.get("selling_price"):
        data["selling_price"] = data.get("base_price") or 0
    product = Product(organization_id=auth.organization_id, company_id=company_id, **data)
    db.add(product)
    db.flush()
    write_audit(
        db,
        action="create",
        entity_type="product",
        entity_id=product.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
    )
    db.commit()
    db.refresh(product)
    return product


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    body: ProductUpdate,
    auth: AuthContext = Depends(require_perms("products.edit")),
    db: Session = Depends(get_db),
):
    company_id = auth.require_company()
    product = (
        db.query(Product)
        .filter(
            Product.id == product_id,
            Product.company_id == company_id,
            Product.organization_id == auth.organization_id,
        )
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(product, k, v)
    write_audit(
        db,
        action="update",
        entity_type="product",
        entity_id=product.id,
        organization_id=auth.organization_id,
        company_id=company_id,
        user_id=auth.user.id,
    )
    db.commit()
    db.refresh(product)
    return product
