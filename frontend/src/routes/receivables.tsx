import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { Badge, Bar, Kpi, PageHeader, Panel, Table, Td } from "@/components/erp/ui-bits";

export const Route = createFileRoute("/receivables")({
  head: () => ({
    meta: [
      { title: "Receivables · Avighna ERP" },
      { name: "description", content: "Payment tracking and outstanding monitoring after credit days start on the invoice." },
    ],
  }),
  component: Receivables,
});

type InvoiceRow = {
  id: number;
  number: string;
  customer_name: string | null;
  invoice_date: string;
  due_date: string | null;
  status: string;
  total: string | number;
  outstanding: string | number;
  credit_days: number | null;
};

type PaymentRow = {
  id: number;
  invoice_id: number;
  invoice_number: string | null;
  customer_name: string | null;
  amount: string | number;
  method: string;
  reference: string | null;
  paid_at: string;
};

function daysBetween(from: string, to = new Date()) {
  const a = new Date(from + "T00:00:00");
  const ms = to.getTime() - a.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

const inputCls =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

function Receivables() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [error, setError] = useState("");
  const [payFor, setPayFor] = useState<InvoiceRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ amount: "", method: "bank", reference: "", paid_at: "" });

  async function load() {
    try {
      const [inv, pay] = await Promise.all([
        api<InvoiceRow[]>("/api/v1/invoices"),
        api<PaymentRow[]>("/api/v1/payments"),
      ]);
      setRows(inv);
      setPayments(pay);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load receivables");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const open = useMemo(
    () => rows.filter((i) => i.status === "open" || i.status === "partial"),
    [rows],
  );
  const outstanding = open.reduce((a, i) => a + Number(i.outstanding || 0), 0);
  const overdueRows = open.filter((i) => i.due_date && new Date(i.due_date) < new Date());
  const overdueAmt = overdueRows.reduce((a, i) => a + Number(i.outstanding || 0), 0);
  const currentAmt = outstanding - overdueAmt;
  const collected = payments.reduce((a, p) => a + Number(p.amount || 0), 0);

  function startPay(i: InvoiceRow) {
    setError("");
    setPayFor(i);
    setForm({
      amount: String(Number(i.outstanding) || ""),
      method: "bank",
      reference: "",
      paid_at: new Date().toISOString().slice(0, 10),
    });
  }

  async function savePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payFor) return;
    const amount = Number(form.amount);
    if (!(amount > 0)) {
      setError("Enter a positive amount");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/payments", {
        method: "POST",
        body: JSON.stringify({
          invoice_id: payFor.id,
          amount,
          method: form.method,
          reference: form.reference.trim() || null,
          paid_at: form.paid_at || null,
        }),
      });
      setPayFor(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record payment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Receivables"
        subtitle="After an invoice is raised, credit days start. Track payments and watch outstanding here."
      />
      {error && !payFor && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Outstanding" value={money(outstanding)} tone="warn" meta="Open + partial invoices" />
        <Kpi label="Current (in credit)" value={money(currentAmt)} tone="good" />
        <Kpi label="Overdue" value={money(overdueAmt)} tone={overdueAmt ? "bad" : "good"} meta={`${overdueRows.length} invoice(s)`} />
        <Kpi label="Payments recorded" value={money(collected)} meta={`${payments.length} receipts`} />
      </div>

      <Panel title="Outstanding monitoring" hint="Credit countdown from invoice date" className="mt-6">
        <Table head={["Invoice", "Customer", "Due", "Amount due", "Terms", "Elapsed", "Countdown", ""]}>
          {open.map((i) => {
            const terms = i.credit_days || 30;
            const elapsed = daysBetween(i.invoice_date);
            const overdue = Math.max(0, elapsed - terms);
            return (
              <tr key={i.id}>
                <Td className="font-medium">{i.number}</Td>
                <Td>{i.customer_name || "—"}</Td>
                <Td className="text-muted-foreground">{i.due_date || "—"}</Td>
                <Td className="tabular-nums">{money(i.outstanding)}</Td>
                <Td className="tabular-nums">{terms} d</Td>
                <Td className="tabular-nums">{elapsed} d</Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Bar
                      value={(elapsed / terms) * 100}
                      tone={overdue ? "destructive" : elapsed / terms > 0.8 ? "warning" : "primary"}
                    />
                    {overdue ? <Badge tone="bad">{overdue}d late</Badge> : <Badge tone="good">On time</Badge>}
                  </div>
                </Td>
                <Td>
                  <button type="button" className="text-sm text-primary hover:underline" onClick={() => startPay(i)}>
                    Record payment
                  </button>
                </Td>
              </tr>
            );
          })}
        </Table>
        {!open.length && <p className="mt-3 text-sm text-muted-foreground">No open outstanding.</p>}
      </Panel>

      <Panel title="Payment tracking" hint="Receipts against invoices" className="mt-6">
        <Table head={["Date", "Invoice", "Customer", "Amount", "Mode", "Reference"]}>
          {payments.map((p) => (
            <tr key={p.id}>
              <Td className="text-muted-foreground">{p.paid_at}</Td>
              <Td className="font-medium">{p.invoice_number || `#${p.invoice_id}`}</Td>
              <Td>{p.customer_name || "—"}</Td>
              <Td className="tabular-nums">{money(p.amount)}</Td>
              <Td className="capitalize">{p.method}</Td>
              <Td className="text-muted-foreground">{p.reference || "—"}</Td>
            </tr>
          ))}
        </Table>
        {!payments.length && <p className="mt-3 text-sm text-muted-foreground">No payments recorded yet.</p>}
      </Panel>

      {payFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0 bg-foreground/40" aria-label="Close" onClick={() => setPayFor(null)} />
          <form
            onSubmit={(e) => void savePayment(e)}
            className="relative z-10 w-full max-h-[90dvh] overflow-y-auto rounded-t-2xl border border-border bg-card p-5 sm:max-w-md sm:rounded-2xl"
          >
            <h2 className="text-lg font-semibold">Record payment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {payFor.number} · {payFor.customer_name || "Customer"} · due {money(payFor.outstanding)}
            </p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm text-muted-foreground">
                Amount
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  className={inputCls}
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </label>
              <label className="block text-sm text-muted-foreground">
                Mode
                <select className={inputCls} value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
                  <option value="bank">Bank / NEFT</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </label>
              <label className="block text-sm text-muted-foreground">
                Reference
                <input className={inputCls} value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="UTR / cheque no." />
              </label>
              <label className="block text-sm text-muted-foreground">
                Paid on
                <input type="date" className={inputCls} value={form.paid_at} onChange={(e) => setForm((f) => ({ ...f, paid_at: e.target.value }))} />
              </label>
            </div>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="submit" disabled={busy} className="rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
                {busy ? "Saving…" : "Save payment"}
              </button>
              <button type="button" onClick={() => setPayFor(null)} className="rounded-lg border border-border py-2.5 text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
