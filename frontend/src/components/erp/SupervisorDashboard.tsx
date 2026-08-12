import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useMe } from "@/lib/me-context";
import { greeting } from "@/lib/format";
import { Badge, Kpi, PageHeader, Panel } from "@/components/erp/ui-bits";

type SupervisorDash = {
  today_sales: string;
  month_sales: string;
  active_leads: number;
  unassigned_leads: number;
  pending_approvals: number;
  pending_orders: number;
  confirmed_orders: number;
  low_stock_items: number;
  outstanding: string;
  overdue_invoices: number;
  team_users: number;
  total_stock_qty: string;
  inventory_value: string;
  available_stock: string;
  ready_for_dispatch: number;
  warehouses: number;
};

function qty(v: string | number) {
  return `${(Number(v) || 0).toLocaleString()} KG`;
}

export function SupervisorDashboard() {
  const [data, setData] = useState<SupervisorDash | null>(null);
  const [error, setError] = useState("");
  const { me } = useMe();

  useEffect(() => {
    api<SupervisorDash>("/api/v1/dashboard/supervisor")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  const name = me?.user.full_name?.split(" ")[0] || "Supervisor";

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${name}`}
        subtitle="Collect confirmed orders → verify stock → procure if short → allocate & book a vehicle window. Accounts invoices after dispatch."
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Pending orders"
          value={data ? String(data.pending_orders) : "—"}
          tone={data && data.pending_orders > 0 ? "warn" : "good"}
        />
        <Kpi label="Confirmed" value={data ? String(data.confirmed_orders) : "—"} />
        <Kpi
          label="Pending approvals"
          value={data ? String(data.pending_approvals) : "—"}
          tone={data && data.pending_approvals > 0 ? "warn" : "good"}
        />
        <Kpi
          label="Ready for dispatch"
          value={data ? String(data.ready_for_dispatch) : "—"}
          meta="Book a window on Order desk"
          tone={data && data.ready_for_dispatch > 0 ? "warn" : "default"}
        />
      </div>

      <h2 className="mt-8 mb-3 text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Warehouse
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total stock" value={data ? qty(data.total_stock_qty) : "—"} />
        <Kpi label="Available" value={data ? qty(data.available_stock) : "—"} tone="good" />
        <Kpi
          label="Low stock"
          value={data ? String(data.low_stock_items) : "—"}
          tone={data && data.low_stock_items > 0 ? "bad" : "good"}
        />
        <Kpi label="Warehouses" value={data ? String(data.warehouses) : "—"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Quiet alerts">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span>Unassigned leads</span>
              <Badge tone={data && data.unassigned_leads > 0 ? "warn" : "good"}>
                {data?.unassigned_leads ?? 0}
              </Badge>
            </li>
            <li className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span>Price / quote approvals</span>
              <Badge tone={data && data.pending_approvals > 0 ? "warn" : "good"}>
                {data?.pending_approvals ?? 0}
              </Badge>
            </li>
            <li className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span>Low stock SKUs</span>
              <Badge tone={data && data.low_stock_items > 0 ? "bad" : "good"}>
                {data?.low_stock_items ?? 0}
              </Badge>
            </li>
            <li className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span>Orders ready for logistics</span>
              <Badge tone={data && data.ready_for_dispatch > 0 ? "warn" : "good"}>
                {data?.ready_for_dispatch ?? 0}
              </Badge>
            </li>
          </ul>
        </Panel>

        <Panel title="Supervisor workflow">
          <p className="mb-4 text-sm text-muted-foreground">
            After Super Admin approval: verify stock (2nd check) → raise PR if short → receive + batch → allocate, book morning/afternoon/evening for logistics.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link to="/ops" className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium hover:bg-primary/10">
              Order desk →
            </Link>
            <Link to="/inventory" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Warehouse & stock →
            </Link>
            <Link to="/purchases" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Purchases / inward →
            </Link>
            <Link to="/sales" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Orders & approvals →
            </Link>
            <Link to="/leads" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Sales team leads →
            </Link>
          </div>
        </Panel>
      </div>
    </>
  );
}
