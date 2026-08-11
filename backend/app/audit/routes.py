from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import AuthContext, require_perms
from app.core.models import AuditLog
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    action: str
    entity_type: str
    entity_id: int | None
    detail: str | None
    user_id: int | None
    company_id: int | None
    created_at: datetime | None


router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditOut])
def list_audit(
    auth: AuthContext = Depends(require_perms("audit.view")),
    db: Session = Depends(get_db),
    limit: int = 100,
):
    company_id = auth.company_id
    q = db.query(AuditLog).filter(AuditLog.organization_id == auth.organization_id)
    if company_id:
        q = q.filter((AuditLog.company_id == company_id) | (AuditLog.company_id.is_(None)))
    return q.order_by(AuditLog.id.desc()).limit(min(limit, 500)).all()
