"""Accounts columns/tables on existing DBs."""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

_done = False

_INVOICE_COLS = {
    "credit_applied": "NUMERIC(14, 2) DEFAULT 0",
    "debit_applied": "NUMERIC(14, 2) DEFAULT 0",
    "sent_at": "TIMESTAMP WITH TIME ZONE",
    "sent_via": "VARCHAR(40)",
    "penalty_waived": "BOOLEAN DEFAULT FALSE",
    "penalty_waiver_reason": "TEXT",
}


def ensure_accounts_schema(engine: Engine) -> None:
    global _done
    if _done:
        return
    insp = inspect(engine)
    tables = set(insp.get_table_names())
    with engine.begin() as conn:
        if "invoices" in tables:
            existing = {c["name"] for c in insp.get_columns("invoices")}
            for col, ddl in _INVOICE_COLS.items():
                if col not in existing:
                    conn.execute(text(f"ALTER TABLE invoices ADD COLUMN {col} {ddl}"))
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS credit_notes (
                    id SERIAL PRIMARY KEY,
                    organization_id INTEGER NOT NULL,
                    company_id INTEGER NOT NULL,
                    customer_id INTEGER NOT NULL,
                    invoice_id INTEGER NOT NULL,
                    kind VARCHAR(20) NOT NULL,
                    amount NUMERIC(14, 2) NOT NULL,
                    reason VARCHAR(80) NOT NULL,
                    remarks TEXT,
                    status VARCHAR(20) DEFAULT 'posted',
                    created_by_id INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
                """
            )
        )
    _done = True
