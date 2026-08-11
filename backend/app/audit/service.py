from sqlalchemy.orm import Session

from app.core.models import AuditLog


def write_audit(
    db: Session,
    *,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    detail: str | None = None,
    organization_id: int | None = None,
    company_id: int | None = None,
    user_id: int | None = None,
) -> None:
    db.add(
        AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            detail=detail,
            organization_id=organization_id,
            company_id=company_id,
            user_id=user_id,
        )
    )
