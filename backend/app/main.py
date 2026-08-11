from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.audit.routes import router as audit_router
from app.auth.routes import router as auth_router
from app.companies.routes import router as companies_router
from app.core.config import settings
from app.customers.routes import router as customers_router
from app.dashboard.routes import router as dashboard_router
from app.invoices.routes import router as invoices_router
from app.inventory.routes import router as inventory_router
from app.leads.routes import router as leads_router
from app.payments.routes import router as payments_router
from app.products.routes import router as products_router
from app.quotations.routes import router as quotations_router
from app.sales.routes import router as sales_router
from app.users.routes import router as users_router
from app.vehicles.routes import router as vehicles_router
from app.visits.routes import router as visits_router

app = FastAPI(title="Avighnya Foods API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (
    auth_router,
    users_router,
    companies_router,
    customers_router,
    leads_router,
    products_router,
    inventory_router,
    quotations_router,
    sales_router,
    invoices_router,
    payments_router,
    dashboard_router,
    audit_router,
    visits_router,
    vehicles_router,
):
    app.include_router(r, prefix="/api/v1")

_uploads = Path(__file__).resolve().parent.parent / "uploads"
_uploads.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_uploads), name="uploads")


@app.get("/health")
def health():
    return {"status": "ok"}
