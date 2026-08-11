import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useMe } from "@/lib/me-context";
import { greeting, money } from "@/lib/format";
import { Badge, Kpi, PageHeader, Panel } from "@/components/erp/ui-bits";

type SalesDash = {
  active_leads: number;
  new_leads: number;
  pending_quotations: number;
  approved_quotations: number;
  open_orders: number;
  month_sales: string;
  month_target: string;
  achievement_pct: string;
  my_customers: number;
  conversion_rate: string;
};

export function SalesDashboard() {
  const [data, setData] = useState<SalesDash | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<SalesDash>("/api/v1/dashboard/sales")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  const { me } = useMe();
  const name = me?.user.full_name?.split(" ")[0] || "Sales";
  const achievement = data ? Number(data.achievement_pct) : 0;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${name}`}
        subtitle="Your pipeline only — leads, follow-ups, quotations and orders. No finance admin or stock edits."
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Active leads"
          value={data ? String(data.active_leads) : "—"}
          meta={`${data?.new_leads ?? 0} new`}
        />
        <Kpi
          label="Quotations"
          value={data ? String(data.pending_quotations) : "—"}
          meta={`${data?.approved_quotations ?? 0} approved / accepted`}
        />
        <Kpi label="Open orders" value={data ? String(data.open_orders) : "—"} />
        <Kpi
          label="Monthly sales"
          value={data ? money(data.month_sales) : "—"}
          meta={`Target ${data ? money(data.month_target) : "—"}`}
          tone="good"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Achievement"
          value={data ? `${data.achievement_pct}%` : "—"}
          tone={achievement >= 80 ? "good" : achievement >= 50 ? "warn" : "default"}
        />
        <Kpi label="My customers" value={data ? String(data.my_customers) : "—"} />
        <Kpi label="Lead conversion" value={data ? `${data.conversion_rate}%` : "—"} meta="Won / closed leads" />
        <Kpi label="Focus" value="Pipeline" meta="Qualify → Quote → Order" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Today's path">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span>New leads to contact</span>
              <Badge tone={data && data.new_leads > 0 ? "warn" : "good"}>{data?.new_leads ?? 0}</Badge>
            </li>
            <li className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span>Quotes in flight</span>
              <Badge>{data?.pending_quotations ?? 0}</Badge>
            </li>
            <li className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span>Orders to push</span>
              <Badge tone={data && data.open_orders > 0 ? "warn" : "good"}>{data?.open_orders ?? 0}</Badge>
            </li>
            <li className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span>Target progress</span>
              <span className="font-medium tabular-nums">{data ? `${data.achievement_pct}%` : "—"}</span>
            </li>
          </ul>
        </Panel>

        <Panel title="Sales workflow">
          <p className="mb-4 text-sm text-muted-foreground">
            Lead → Visit → Quotation → Order. Price below floor needs supervisor/owner approval.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link to="/leads" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              My leads →
            </Link>
            <Link to="/field" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Customer visits →
            </Link>
            <Link to="/sales" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Quotations & orders →
            </Link>
            <Link to="/customers" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Customers →
            </Link>
            <Link to="/inventory" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Stock (view) →
            </Link>
            <Link to="/invoices" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Invoices (view) →
            </Link>
          </div>
        </Panel>
      </div>
    </>
  );
}
