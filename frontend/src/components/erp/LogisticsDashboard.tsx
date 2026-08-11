import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useMe } from "@/lib/me-context";
import { greeting } from "@/lib/format";
import { Badge, Kpi, PageHeader, Panel } from "@/components/erp/ui-bits";

type LogisticsDash = {
  pending_dispatches: number;
  ready_for_dispatch: number;
  today_dispatches: number;
  delivered_today: number;
  confirmed_orders: number;
};

export function LogisticsDashboard() {
  const [data, setData] = useState<LogisticsDash | null>(null);
  const [error, setError] = useState("");
  const { me } = useMe();

  useEffect(() => {
    api<LogisticsDash>("/api/v1/dashboard/logistics")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  const name = me?.user.full_name?.split(" ")[0] || "Logistics";

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${name}`}
        subtitle="Transport only — ready queue and today's deliveries. Vehicle/POD master comes later."
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Pending dispatch"
          value={data ? String(data.pending_dispatches) : "—"}
          meta={`${data?.confirmed_orders ?? 0} confirmed orders`}
          tone={data && data.pending_dispatches > 0 ? "warn" : "good"}
        />
        <Kpi label="Ready for dispatch" value={data ? String(data.ready_for_dispatch) : "—"} />
        <Kpi label="Today's dispatches" value={data ? String(data.today_dispatches) : "—"} />
        <Kpi label="Delivered today" value={data ? String(data.delivered_today) : "—"} tone="good" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Dispatch queue">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span>Orders ready to move</span>
              <Badge tone={data && data.ready_for_dispatch > 0 ? "warn" : "good"}>
                {data?.ready_for_dispatch ?? 0}
              </Badge>
            </li>
            <li className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span>Moved / invoiced today</span>
              <Badge>{data?.delivered_today ?? 0}</Badge>
            </li>
          </ul>
        </Panel>

        <Panel title="Logistics workflow">
          <p className="mb-4 text-sm text-muted-foreground">
            Ready for dispatch → Vehicle/driver → Delivery → POD. Stock pick/pack stays with Supervisor.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link to="/dispatch" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Dispatch board →
            </Link>
            <Link to="/sales" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Ready orders →
            </Link>
            <Link to="/customers" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Delivery addresses →
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
