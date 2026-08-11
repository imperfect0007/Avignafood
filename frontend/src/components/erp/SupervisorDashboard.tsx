import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useMe } from "@/lib/me-context";
import { greeting, money } from "@/lib/format";
import { Badge, Kpi, PageHeader, Panel } from "@/components/erp/ui-bits";
import { VehicleEditor } from "@/components/erp/VehicleBoard";

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
        subtitle="Sales team + warehouse — approvals, stock, pick/pack, ready for logistics. No vehicle/driver or payments."
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Today's sales" value={data ? money(data.today_sales) : "—"} tone="good" />
        <Kpi label="Monthly sales" value={data ? money(data.month_sales) : "—"} />
        <Kpi
          label="Pending approvals"
          value={data ? String(data.pending_approvals) : "—"}
          tone={data && data.pending_approvals > 0 ? "warn" : "good"}
        />
        <Kpi
          label="Ready for dispatch"
          value={data ? String(data.ready_for_dispatch) : "—"}
          meta="Hand off to logistics"
          tone={data && data.ready_for_dispatch > 0 ? "warn" : "default"}
        />
      </div>

      <h2 className="mt-8 mb-3 text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Warehouse
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Total stock"
          value={data ? qty(data.total_stock_qty) : "—"}
          meta={data ? money(data.inventory_value) : undefined}
        />
        <Kpi label="Available" value={data ? qty(data.available_stock) : "—"} tone="good" />
        <Kpi
          label="Low stock"
          value={data ? String(data.low_stock_items) : "—"}
          tone={data && data.low_stock_items > 0 ? "bad" : "good"}
        />
        <Kpi label="Warehouses" value={data ? String(data.warehouses) : "—"} />
      </div>

      <div className="mt-6">
        <VehicleEditor />
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
            Demand → pick/pack → ready for dispatch. Logistics owns vehicle/driver/POD.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link to="/inventory" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Warehouse & stock →
            </Link>
            <Link to="/purchases" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Purchases / inward →
            </Link>
            <Link to="/sales" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Orders & approvals →
            </Link>
            <Link to="/dispatch" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Dispatch prep →
            </Link>
            <Link to="/leads" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Sales team leads →
            </Link>
            <Link to="/receivables" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Credit (monitor) →
            </Link>
          </div>
        </Panel>
      </div>
    </>
  );
}
