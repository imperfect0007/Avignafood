import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { Badge, Kpi, PageHeader, Panel, Table, Td } from "@/components/erp/ui-bits";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Client accounts · Avighna ERP" },
      { name: "description", content: "Per-client billing: fulfilled orders, revenue and outstanding. Books remain in Tally Prime." },
    ],
  }),
  component: Clients,
});

type ClientRow = {
  customer_id: number;
  name: string;
  gstin: string | null;
  phone: string | null;
  credit_days: number;
  credit_limit: string | number;
  orders_fulfilled: number;
  invoice_count: number;
  total_revenue: string | number;
  outstanding: string | number;
};

type InvoiceRow = {
  id: number;
  number: string;
  invoice_date: string;
  total: string | number;
  outstanding: string | number;
  status: string;
};

type Ledger = ClientRow & {
  address: string | null;
  invoices: InvoiceRow[];
};

function Clients() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [open, setOpen] = useState<Ledger | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<ClientRow[]>("/api/v1/invoices/clients")
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load clients"));
  }, []);

  async function openClient(id: number) {
    setError("");
    try {
      const ledger = await api<Ledger>(`/api/v1/invoices/clients/${id}`);
      setOpen(ledger);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open client");
    }
  }

  const revenue = rows.reduce((a, r) => a + Number(r.total_revenue || 0), 0);
  const outstanding = rows.reduce((a, r) => a + Number(r.outstanding || 0), 0);
  const fulfilled = rows.reduce((a, r) => a + r.orders_fulfilled, 0);

  return (
    <>
      <PageHeader
        title="Client accounts"
        subtitle="Open a client to see fulfilled orders and revenue. Accounting stays in Tally Prime."
      />
      {error && !open && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Clients" value={String(rows.length)} />
        <Kpi label="Orders fulfilled" value={String(fulfilled)} />
        <Kpi label="Revenue billed" value={money(revenue)} meta={`${money(outstanding)} outstanding`} tone="good" />
      </div>

      <Panel title="Per-client billing" hint="Tap a row" className="mt-6">
        <Table head={["Client", "GSTIN", "Fulfilled", "Invoices", "Revenue", "Outstanding"]}>
          {rows.map((c) => (
            <tr key={c.customer_id} className="cursor-pointer hover:bg-secondary/50" onClick={() => void openClient(c.customer_id)}>
              <Td className="font-medium">{c.name}</Td>
              <Td className="tabular-nums text-muted-foreground">{c.gstin || "—"}</Td>
              <Td className="tabular-nums">{c.orders_fulfilled}</Td>
              <Td className="tabular-nums">{c.invoice_count}</Td>
              <Td className="tabular-nums">{money(c.total_revenue)}</Td>
              <Td className="tabular-nums">{money(c.outstanding)}</Td>
            </tr>
          ))}
        </Table>
        {!rows.length && <p className="mt-3 text-sm text-muted-foreground">No clients billed yet.</p>}
      </Panel>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0 bg-foreground/40" aria-label="Close" onClick={() => setOpen(null)} />
          <div className="relative z-10 w-full max-h-[90dvh] overflow-y-auto rounded-t-2xl border border-border bg-card p-5 sm:max-w-lg sm:rounded-2xl">
            <h2 className="text-lg font-semibold">{open.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {[open.gstin, open.phone, open.credit_days ? `${open.credit_days} day credit` : null].filter(Boolean).join(" · ") || "—"}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Kpi label="Orders fulfilled" value={String(open.orders_fulfilled)} />
              <Kpi label="Total revenue" value={money(open.total_revenue)} tone="good" />
              <Kpi label="Invoices" value={String(open.invoice_count)} />
              <Kpi label="Outstanding" value={money(open.outstanding)} tone={Number(open.outstanding) > 0 ? "warn" : "default"} />
            </div>
            <Panel title="Invoices" className="mt-4 shadow-none">
              <Table head={["No.", "Date", "Amount", "Due", "Status"]}>
                {open.invoices.map((i) => (
                  <tr key={i.id}>
                    <Td className="font-medium">{i.number}</Td>
                    <Td className="text-muted-foreground">{i.invoice_date}</Td>
                    <Td className="tabular-nums">{money(i.total)}</Td>
                    <Td className="tabular-nums">{money(i.outstanding)}</Td>
                    <Td>
                      <Badge tone={i.status === "paid" ? "good" : i.status === "partial" ? "warn" : "neutral"}>{i.status}</Badge>
                    </Td>
                  </tr>
                ))}
              </Table>
              {!open.invoices.length && <p className="mt-2 text-sm text-muted-foreground">No invoices yet for this client.</p>}
            </Panel>
            <button type="button" onClick={() => setOpen(null)} className="mt-4 w-full rounded-lg border border-border py-2.5 text-sm">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
