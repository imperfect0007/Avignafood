import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { money, waHref } from "@/lib/format";
import { firms } from "@/lib/erp-data";
import { useCompany } from "@/lib/company-context";
import { dueCountdown, payStatus, payStatusLabel } from "@/lib/accounts";
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

type BillableOrder = {
  sales_order_id: number;
  customer_id: number;
  customer_name: string;
  address: string | null;
  ops_status: string;
  logistics_status: string | null;
  line_count: number;
  qty: string | number;
  estimated_total: string | number;
  credit_limit: string | number;
  current_outstanding: string | number;
  projected_exposure: string | number;
  credit_ok: boolean;
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
  subtotal?: string | number;
  tax_amount?: string | number;
  cgst?: string | number;
  sgst?: string | number;
  delay_days?: number;
  interest_loss?: string | number;
  phone?: string | null;
  gstin?: string | null;
  sent_via?: string | null;
  sent_at?: string | null;
  address?: string | null;
  billing_address?: string | null;
  shipping_address?: string | null;
  sales_order_id?: number | null;
  dispatch_id?: number | null;
  payment_status?: string;
  lines?: {
    product_name?: string;
    quantity: number;
    unit_price: number;
    gst_rate: number;
    line_total: number;
  }[];
};

function Invoices() {
  const { firm } = useCompany();
  const company = firms.find((f) => f.id === firm);
  const [inbox, setInbox] = useState<Billable[]>([]);
  const [billable, setBillable] = useState<Billable[]>([]);
  const [orders, setOrders] = useState<BillableOrder[]>([]);
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [selected, setSelected] = useState<Billable | null>(null);
  const [pickOrder, setPickOrder] = useState<BillableOrder | null>(null);
  const [printInv, setPrintInv] = useState<InvoiceRow | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [month, setMonth] = useState("all");

  async function load() {
    try {
      const [notice, ready, issued, soReady] = await Promise.all([
        api<Billable[]>("/api/v1/invoices/dispatch-inbox"),
        api<Billable[]>("/api/v1/invoices/billable"),
        api<InvoiceRow[]>("/api/v1/invoices"),
        api<BillableOrder[]>("/api/v1/invoices/billable-orders").catch(() => [] as BillableOrder[]),
      ]);
      setInbox(notice);
      setBillable(ready);
      setRows(issued);
      setOrders(soReady);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load invoices");
    }
  }

  useEffect(() => {
    void load();
  }, [firm]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((i) => {
      const pay = payStatus(i);
      if (status !== "all" && pay !== status && i.status !== status) return false;
      if (overdueOnly && pay !== "overdue") return false;
      if (month !== "all" && !String(i.invoice_date).startsWith(month)) return false;
      if (!needle) return true;
      return `${i.number} ${i.customer_name || ""}`.toLowerCase().includes(needle);
    });
  }, [rows, q, status, overdueOnly, month]);

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

  async function generateFromOrder(override = false) {
    if (!pickOrder) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/invoices/from-order/${pickOrder.sales_order_id}?override_credit=${override}`, { method: "POST" });
      setPickOrder(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate invoice");
    } finally {
      setBusy(false);
    }
  }

  async function sendInvoice(row: InvoiceRow, via: "whatsapp" | "email") {
    try {
      await api(`/api/v1/invoices/${row.id}/send?via=${via}`, { method: "POST" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not mark sent");
    }
  }

  async function openPrint(row: InvoiceRow) {
    try {
      setPrintInv(await api<InvoiceRow>(`/api/v1/invoices/${row.id}`));
    } catch {
      setPrintInv(row);
    }
  }
  const invoiced = rows.reduce((a, i) => a + Number(i.total || 0), 0);
  const open = rows.filter((i) => i.status === "open" || i.status === "partial").length;

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Create from Super Admin–approved sales orders. After you raise the invoice, Supervisor allots the driver. After delivery, collect payment here."
      />
      {error && !selected && !pickOrder && !printInv && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="Dispatch inbox" value={String(inbox.length)} meta="Loads Accounts can see" />
        <Kpi label="Ready to invoice" value={String(orders.length || billable.length)} tone={(orders.length || billable.length) ? "warn" : "good"} meta="Approved orders" />
        <Kpi label="Invoiced" value={money(invoiced)} meta={`${rows.length} documents`} />
        <Kpi label="Awaiting payment" value={String(open)} tone="warn" />
      </div>

      <Panel title="Ready to invoice" hint="Super Admin approved these orders — raise the invoice so Supervisor can allot a driver" className="mt-6">
        <Table head={["Order", "Customer", "Lines", "Est. total", "Stage", "Credit", ""]}>
          {orders.map((o) => (
            <tr key={o.sales_order_id}>
              <Td className="font-medium">SO-{o.sales_order_id}</Td>
              <Td>{o.customer_name}</Td>
              <Td className="tabular-nums">{o.line_count}</Td>
              <Td className="tabular-nums">{money(o.estimated_total)}</Td>
              <Td className="capitalize">{(o.logistics_status || o.ops_status).replaceAll("_", " ")}</Td>
              <Td>
                <Badge tone={o.credit_ok ? "good" : "bad"}>{o.credit_ok ? "Within limit" : "Limit exceeded"}</Badge>
              </Td>
              <Td>
                <button type="button" className="text-sm text-primary hover:underline" onClick={() => setPickOrder(o)}>
                  Invoice
                </button>
              </Td>
            </tr>
          ))}
        </Table>
        {!orders.length && (
          <p className="mt-3 text-sm text-muted-foreground">No approved orders waiting to bill. Super Admin must approve a sales order first.</p>
        )}
      </Panel>

      <Panel title="Dispatch inbox" hint="Operational status only — Accounts does not assign vehicles" className="mt-6">
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
                  <span className="text-xs text-muted-foreground">Raise from the order queue</span>
                )}
              </Td>
            </tr>
          ))}
        </Table>
        {!inbox.length && <p className="mt-3 text-sm text-muted-foreground">No dispatch loads yet. They appear here when supervisor / logistics books a movement.</p>}
      </Panel>

      {billable.length > 0 && (
      <Panel title="Dispatch-level billing" hint="Fallback when a load has no sales order. Prefer Ready to invoice above." className="mt-6">
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
      </Panel>
      )}

      <Panel title="Issued invoices" hint="Invoice ↔ sales order ↔ dispatch. Filters stay on this company." className="mt-6">
        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            placeholder="Search invoice or customer"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partially paid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="all">All dates</option>
            <option value={new Date().toISOString().slice(0, 7)}>This month</option>
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
            Overdue only
          </label>
        </div>
        <Table head={["Invoice", "Customer", "SO / Dispatch", "Date", "Due", "Total", "Outstanding", "Status", ""]}>
          {visible.map((i) => {
            const pay = payStatus(i);
            return (
            <tr key={i.id}>
              <Td className="font-medium">{i.number}</Td>
              <Td>{i.customer_name || "—"}</Td>
              <Td className="text-muted-foreground text-xs">
                {i.sales_order_id ? `SO-${i.sales_order_id}` : "—"}
                {i.dispatch_id ? ` · D-${i.dispatch_id}` : ""}
              </Td>
              <Td className="text-muted-foreground">{i.invoice_date}</Td>
              <Td className="text-muted-foreground">{dueCountdown(i.due_date)}</Td>
              <Td className="tabular-nums">{money(i.total)}</Td>
              <Td className="tabular-nums">{money(i.outstanding)}</Td>
              <Td>
                <Badge tone={pay === "paid" ? "good" : pay === "overdue" ? "bad" : pay === "partial" ? "warn" : "neutral"}>
                  {payStatusLabel(pay)}
                  {i.sent_via ? " · sent" : ""}
                </Badge>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="text-sm text-primary hover:underline" onClick={() => void openPrint(i)}>
                    PDF
                  </button>
                  {i.phone ? (
                    <a
                      href={`${waHref(i.phone)}?text=${encodeURIComponent(`Invoice ${i.number} dated ${i.invoice_date}. Amount ${money(i.total)}. Due ${i.due_date || ""}.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline"
                      onClick={() => void sendInvoice(i, "whatsapp")}
                    >
                      WhatsApp
                    </a>
                  ) : (
                    <button type="button" className="text-sm text-primary hover:underline" onClick={() => void sendInvoice(i, "whatsapp")}>
                      Send
                    </button>
                  )}
                  <button type="button" className="text-sm text-primary hover:underline" onClick={() => void sendInvoice(i, "email")}>
                    Email
                  </button>
                  {Number(i.outstanding) > 0 && i.status !== "cancelled" && (
                    <Link to="/payments" className="text-sm text-primary hover:underline">
                      Payment
                    </Link>
                  )}
                </div>
              </Td>
            </tr>
            );
          })}
        </Table>
        {!visible.length && <p className="mt-3 text-sm text-muted-foreground">No invoices match these filters.</p>}
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

      {pickOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0 bg-foreground/40" aria-label="Close" onClick={() => setPickOrder(null)} />
          <div className="relative z-10 w-full max-h-[90dvh] overflow-y-auto rounded-t-2xl border border-border bg-card p-5 sm:max-w-md sm:rounded-2xl">
            <h2 className="text-lg font-semibold">Generate invoice</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              SO-{pickOrder.sales_order_id} · approved sales prices · GST from product master
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Customer</dt><dd className="font-medium">{pickOrder.customer_name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Lines</dt><dd>{pickOrder.line_count}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Est. total incl. GST</dt><dd className="tabular-nums font-medium">{money(pickOrder.estimated_total)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Credit limit</dt><dd className="tabular-nums">{money(pickOrder.credit_limit)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Current outstanding</dt><dd className="tabular-nums">{money(pickOrder.current_outstanding)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Projected exposure</dt><dd className="tabular-nums">{money(pickOrder.projected_exposure)}</dd></div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Credit</dt>
                <dd><Badge tone={pickOrder.credit_ok ? "good" : "bad"}>{pickOrder.credit_ok ? "Within limit" : "Limit exceeded"}</Badge></dd>
              </div>
            </dl>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void generateFromOrder(!pickOrder.credit_ok)}
                className="rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {busy ? "Creating…" : pickOrder.credit_ok ? "Generate invoice" : "Invoice anyway"}
              </button>
              <button type="button" onClick={() => setPickOrder(null)} className="rounded-lg border border-border py-2.5 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {printInv && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 print:static print:inset-auto print:p-0">
          <button type="button" className="absolute inset-0 bg-foreground/40 print:hidden" aria-label="Close" onClick={() => setPrintInv(null)} />
          <div id="invoice-print" className="relative z-10 w-full max-h-[90dvh] overflow-y-auto rounded-t-2xl border border-border bg-card p-5 sm:max-w-lg sm:rounded-2xl print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:p-8">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{company?.name || "Avighna Foods"}</p>
            <h2 className="text-lg font-semibold">Tax Invoice {printInv.number}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              GSTIN {company?.gst || "—"} · Invoice {printInv.invoice_date} · Due {printInv.due_date || "—"}
              {printInv.sales_order_id ? ` · SO-${printInv.sales_order_id}` : ""}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground">Bill to</dt>
                <dd className="font-medium">{printInv.customer_name}</dd>
                <dd>{printInv.gstin || ""}</dd>
                <dd className="text-muted-foreground">{printInv.billing_address || printInv.address || ""}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ship to</dt>
                <dd>{printInv.shipping_address || printInv.address || "—"}</dd>
                <dd className="text-muted-foreground">{printInv.credit_days ?? 30} day credit</dd>
              </div>
            </dl>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-1">Product</th>
                  <th className="py-1 text-right">Qty</th>
                  <th className="py-1 text-right">Rate</th>
                  <th className="py-1 text-right">GST</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(printInv.lines || []).map((ln, idx) => (
                  <tr key={idx} className="border-b border-border/60">
                    <td className="py-1">{ln.product_name || "Item"}</td>
                    <td className="py-1 text-right tabular-nums">{ln.quantity}</td>
                    <td className="py-1 text-right tabular-nums">{money(ln.unit_price)}</td>
                    <td className="py-1 text-right tabular-nums">{ln.gst_rate}%</td>
                    <td className="py-1 text-right tabular-nums">{money(ln.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-4 ml-auto w-56 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Taxable</dt><dd className="tabular-nums">{money(printInv.subtotal || 0)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">CGST</dt><dd className="tabular-nums">{money(printInv.cgst || 0)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">SGST</dt><dd className="tabular-nums">{money(printInv.sgst || 0)}</dd></div>
              <div className="flex justify-between font-medium"><dt>Grand total</dt><dd className="tabular-nums">{money(printInv.total)}</dd></div>
            </dl>
            <p className="mt-4 text-xs text-muted-foreground">Pay by bank transfer / UPI / cheque. Outstanding {money(printInv.outstanding)}.</p>
            <div className="mt-5 grid grid-cols-2 gap-2 print:hidden">
              <button type="button" onClick={() => window.print()} className="rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground">
                Print / PDF
              </button>
              <button type="button" onClick={() => setPrintInv(null)} className="rounded-lg border border-border py-2.5 text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
