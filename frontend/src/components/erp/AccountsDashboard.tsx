import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { useMe } from "@/lib/me-context";
import { greeting, money } from "@/lib/format";
import { Badge, Kpi, PageHeader, Panel } from "@/components/erp/ui-bits";

type AccountsDash = {
  today_collections: string;
  month_collections: string;
  total_receivables: string;
  total_overdue: string;
  due_today: string;
  due_this_week: string;
  unpaid_invoices: number;
  partial_invoices: number;
  overdue_invoices: number;
  credit_exposure: string;
  active_customers: number;
};

export function AccountsDashboard() {
  const [data, setData] = useState<AccountsDash | null>(null);
  const [ready, setReady] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<AccountsDash>("/api/v1/dashboard/accounts")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
    api<unknown[]>("/api/v1/invoices/billable")
      .then((rows) => setReady(rows.length))
      .catch(() => setReady(0));
  }, []);

  const { me } = useMe();
  const name = me?.user.full_name?.split(" ")[0] || "Accounts";

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${name}`}
        subtitle="Billing only — generate invoices, track receivables, open a client’s account. Books live in Tally Prime."
      />

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Ready to invoice"
          value={ready == null ? "—" : String(ready)}
          meta="Loads near dispatch"
          tone={ready ? "warn" : "good"}
        />
        <Kpi
          label="Today's collections"
          value={data ? money(data.today_collections) : "—"}
          meta="Payments received today"
          tone="good"
        />
        <Kpi
          label="Total receivables"
          value={data ? money(data.total_receivables) : "—"}
          meta={`${data?.unpaid_invoices ?? 0} unpaid · ${data?.partial_invoices ?? 0} partial`}
          tone="warn"
        />
        <Kpi
          label="Total overdue"
          value={data ? money(data.total_overdue) : "—"}
          meta={`${data?.overdue_invoices ?? 0} invoice(s) past due`}
          tone={data && Number(data.total_overdue) > 0 ? "bad" : "default"}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Due today" value={data ? money(data.due_today) : "—"} />
        <Kpi label="Due this week" value={data ? money(data.due_this_week) : "—"} />
        <Kpi label="Monthly collections" value={data ? money(data.month_collections) : "—"} />
        <Kpi label="Active clients" value={data ? String(data.active_customers) : "—"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Quiet alerts">
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span>Ready to invoice</span>
              <Badge tone={ready ? "warn" : "good"}>{ready ?? 0}</Badge>
            </li>
            <li className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span>Overdue payments</span>
              <Badge tone={data && data.overdue_invoices > 0 ? "bad" : "good"}>
                {data?.overdue_invoices ?? 0}
              </Badge>
            </li>
            <li className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span>Unpaid invoices</span>
              <Badge tone="warn">{data?.unpaid_invoices ?? 0}</Badge>
            </li>
            <li className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
              <span>Due today</span>
              <span className="tabular-nums font-medium">{data ? money(data.due_today) : "—"}</span>
            </li>
          </ul>
        </Panel>

        <Panel title="Accounts workflow">
          <p className="mb-4 text-sm text-muted-foreground">
            Dispatch info → generate invoice → credit days start → record payments → monitor outstanding. Tally Prime remains the books.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link to="/invoices" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Generate invoices →
            </Link>
            <Link to="/receivables" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Receivables →
            </Link>
            <Link to="/clients" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Client accounts →
            </Link>
            <Link to="/analytics" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-secondary">
              Billing analytics →
            </Link>
          </div>
        </Panel>
      </div>
    </>
  );
}
