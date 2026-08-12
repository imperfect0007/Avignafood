import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { Badge, Kpi, PageHeader, Panel, Table, Td } from "@/components/erp/ui-bits";

export const Route = createFileRoute("/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices · Avighna ERP" },
      { name: "description", content: "Generate GST invoices from loads that are almost ready to dispatch. Books stay in Tally Prime." },
    ],
  }),
  component: Invoices,
});

type Billable = {
  dispatch_id: number;
  customer_id: number;
  customer_name: string;
  product: string;
  quantity: string | number;
  unit_price: string | number;
  estimated_total: string | number;
  dispatch_status: string;
  vehicle: string | null;
  lr: string | null;
  eta: string | null;
  notes: string | null;
  invoiced?: boolean;
  can_invoice?: boolean;
};

type InvoiceRow = {
  id: number;
  number: string;
  customer_name: string | null;
  invoice_date: string;
  due_date: string | null;
  status: string;
  total: string | number;
  amount_paid: string | number;
  outstanding: string | number;
  credit_days: number | null;
};

function Invoices() {
  const [inbox, setInbox] = useState<Billable[]>([]);
  const [billable, setBillable] = useState<Billable[]>([]);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [selected, setSelected] = useState<Billable | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [notice, ready, issued] = await Promise.all([
        api<Billable[]>("/api/v1/invoices/dispatch-inbox"),
        api<Billable[]>("/api/v1/invoices/billable"),
        api<InvoiceRow[]>("/api/v1/invoices"),
      ]);
      setInbox(notice);
      setBillable(ready);
      setRows(issued);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load invoices");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function generate() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/invoices/from-dispatch/${selected.dispatch_id}`, { method: "POST" });
      setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate invoice");
    } finally {
      setBusy(false);
    }
  }

  const invoiced = rows.reduce((a, i) => a + Number(i.total || 0), 0);
  const open = rows.filter((i) => i.status === "open" || i.status === "partial").length;

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Receive dispatch info → generate invoice → credit days start. Payment tracking lives under Receivables."
      />
      {error && !selected && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="Dispatch inbox" value={String(inbox.length)} meta="Loads Accounts can see" />
        <Kpi label="Ready to invoice" value={String(billable.length)} tone={billable.length ? "warn" : "good"} meta="Packed / Ready / out" />
        <Kpi label="Invoiced" value={money(invoiced)} meta={`${rows.length} documents`} />
        <Kpi label="Awaiting payment" value={String(open)} tone="warn" />
      </div>

      <Panel title="Dispatch inbox" hint="Accounts receives every load" className="mt-6">
        <Table head={["Customer", "Product", "Qty", "Stage", "Vehicle / LR", "Billing"]}>
          {inbox.map((b) => (
            <tr key={b.dispatch_id}>
              <Td className="font-medium">{b.customer_name}</Td>
              <Td className="text-muted-foreground">{b.product}</Td>
              <Td className="tabular-nums">{Number(b.quantity)}</Td>
              <Td>
                <Badge tone={b.dispatch_status === "Delivered" ? "good" : b.dispatch_status === "Pending" ? "neutral" : "warn"}>
                  {b.dispatch_status}
                </Badge>
              </Td>
              <Td className="text-xs text-muted-foreground">{[b.vehicle, b.lr].filter(Boolean).join(" · ") || "—"}</Td>
              <Td>
                {b.invoiced ? (
                  <Badge tone="good">Invoiced</Badge>
                ) : b.can_invoice ? (
                  <button type="button" className="text-sm text-primary hover:underline" onClick={() => setSelected(b)}>
                    Invoice now
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">Waiting for Packed+</span>
                )}
              </Td>
            </tr>
          ))}
        </Table>
        {!inbox.length && <p className="mt-3 text-sm text-muted-foreground">No dispatch loads yet. They appear here when supervisor / logistics books a movement.</p>}
      </Panel>

      <Panel title="Ready to invoice" hint="Packed / Ready / Dispatched / Delivered" className="mt-6">
        <Table head={["Customer", "Product", "Qty", "Est. value", "Stage", "Vehicle / LR", ""]}>
          {billable.map((b) => (
            <tr key={b.dispatch_id} className="cursor-pointer hover:bg-secondary/50" onClick={() => setSelected(b)}>
              <Td className="font-medium">{b.customer_name}</Td>
              <Td className="text-muted-foreground">{b.product}</Td>
              <Td className="tabular-nums">{Number(b.quantity)}</Td>
              <Td className="tabular-nums">{money(b.estimated_total)}</Td>
              <Td>
                <Badge tone={b.dispatch_status === "Delivered" ? "good" : "warn"}>{b.dispatch_status}</Badge>
              </Td>
              <Td className="text-muted-foreground text-xs">
                {[b.vehicle, b.lr].filter(Boolean).join(" · ") || "—"}
              </Td>
              <Td>
                <button type="button" className="text-sm text-primary hover:underline" onClick={(e) => { e.stopPropagation(); setSelected(b); }}>
                  Invoice
                </button>
              </Td>
            </tr>
          ))}
        </Table>
        {!billable.length && (
          <p className="mt-3 text-sm text-muted-foreground">No loads near dispatch yet. Accounts bills after supervisor books the order and it reaches Packed.</p>
        )}
      </Panel>

      <Panel title="Issued invoices" hint="Credit days start on invoice date" className="mt-6">
        <Table head={["Invoice no.", "Customer", "Credit start", "Due date", "Terms", "Amount", "Outstanding", "Status"]}>
          {rows.map((i) => (
            <tr key={i.id}>
              <Td className="font-medium">{i.number}</Td>
              <Td>{i.customer_name || "—"}</Td>
              <Td className="text-muted-foreground">{i.invoice_date}</Td>
              <Td className="text-muted-foreground">{i.due_date || "—"}</Td>
              <Td className="tabular-nums">{i.credit_days ?? 30} d</Td>
              <Td className="tabular-nums">{money(i.total)}</Td>
              <Td className="tabular-nums">{money(i.outstanding)}</Td>
              <Td>
                <Badge tone={i.status === "paid" ? "good" : i.status === "partial" ? "warn" : "neutral"}>{i.status}</Badge>
              </Td>
            </tr>
          ))}
        </Table>
        {!rows.length && <p className="mt-3 text-sm text-muted-foreground">No invoices generated yet.</p>}
      </Panel>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0 bg-foreground/40" aria-label="Close" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-full max-h-[90dvh] overflow-y-auto rounded-t-2xl border border-border bg-card p-5 sm:max-w-md sm:rounded-2xl">
            <h2 className="text-lg font-semibold">Generate invoice</h2>
            <p className="mt-1 text-sm text-muted-foreground">Order details for Tally / GST bill. This ERP only raises the invoice.</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Customer</dt><dd className="font-medium">{selected.customer_name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Product</dt><dd>{selected.product}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Quantity</dt><dd className="tabular-nums">{Number(selected.quantity)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Rate</dt><dd className="tabular-nums">{money(selected.unit_price)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Est. total (incl. GST)</dt><dd className="tabular-nums font-medium">{money(selected.estimated_total)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Dispatch stage</dt><dd>{selected.dispatch_status}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Vehicle</dt><dd>{selected.vehicle || "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">LR</dt><dd>{selected.lr || "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">ETA</dt><dd>{selected.eta || "—"}</dd></div>
              {selected.notes && (
                <div><dt className="text-muted-foreground">Notes</dt><dd className="mt-0.5">{selected.notes}</dd></div>
              )}
            </dl>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void generate()}
                className="rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {busy ? "Creating…" : "Generate invoice"}
              </button>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-border py-2.5 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
