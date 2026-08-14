"""Create logistics tables on existing DBs."""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

_done = False

_RUN_COLS = {
    "slot": "VARCHAR(20) DEFAULT 'afternoon'",
}
_STOP_COLS = {
    "signature_url": "VARCHAR(255)",
    "return_required": "BOOLEAN DEFAULT FALSE",
    "reattempt_date": "DATE",
}


def ensure_logistics_schema(engine: Engine) -> None:
    global _done
    if _done:
        return
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS logistics_runs (
                    id SERIAL PRIMARY KEY,
                    organization_id INTEGER NOT NULL,
                    company_id INTEGER NOT NULL,
                    number VARCHAR(40) NOT NULL,
                    on_date DATE NOT NULL,
                    vehicle_id INTEGER,
                    driver_name VARCHAR(120),
                    agency VARCHAR(80) DEFAULT 'Own Vehicle',
                    route VARCHAR(200),
                    status VARCHAR(40) DEFAULT 'planned',
                    notes TEXT,
                    slot VARCHAR(20) DEFAULT 'afternoon',
                    created_by_id INTEGER,
                    dispatched_at TIMESTAMP WITH TIME ZONE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS logistics_stops (
                    id SERIAL PRIMARY KEY,
                    run_id INTEGER NOT NULL,
                    sales_order_id INTEGER NOT NULL,
                    customer_id INTEGER NOT NULL,
                    dispatch_id INTEGER,
                    status VARCHAR(40) DEFAULT 'pending',
                    qty_ordered NUMERIC(14, 3) DEFAULT 0,
                    qty_delivered NUMERIC(14, 3) DEFAULT 0,
                    receiver_name VARCHAR(120),
                    pod_url VARCHAR(255),
                    fail_reason VARCHAR(80),
                    remarks TEXT,
                    signature_url VARCHAR(255),
                    return_required BOOLEAN DEFAULT FALSE,
                    reattempt_date DATE,
                    delivered_at TIMESTAMP WITH TIME ZONE
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS logistics_exceptions (
                    id SERIAL PRIMARY KEY,
                    organization_id INTEGER NOT NULL,
                    company_id INTEGER NOT NULL,
                    sales_order_id INTEGER,
                    run_id INTEGER,
                    kind VARCHAR(40) NOT NULL,
                    detail TEXT,
                    status VARCHAR(40) DEFAULT 'open',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
                """
            )
        )
    insp = inspect(engine)
    with engine.begin() as conn:
        tables = set(insp.get_table_names())
        if "logistics_runs" in tables:
            existing = {c["name"] for c in insp.get_columns("logistics_runs")}
            for col, ddl in _RUN_COLS.items():
                if col not in existing:
                    conn.execute(text(f"ALTER TABLE logistics_runs ADD COLUMN {col} {ddl}"))
        if "logistics_stops" in tables:
            existing = {c["name"] for c in insp.get_columns("logistics_stops")}
            for col, ddl in _STOP_COLS.items():
                if col not in existing:
                    conn.execute(text(f"ALTER TABLE logistics_stops ADD COLUMN {col} {ddl}"))
    _done = True
