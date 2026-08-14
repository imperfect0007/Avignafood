import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import { useCompany } from "@/lib/company-context";
import { downloadCsv } from "@/lib/accounts";
import { Kpi, PageHeader, Panel, Table, Td } from "@/components/erp/ui-bits";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [{ title: "Accounts reports · Avighna ERP" }],
  }),
  component: Reports,
});

type AgingRow = {
  customer_id: number;
  customer_name: string;
  current: string | number;
  d1_30: string | number;
  d31_60: string | number;
  d61_90: string | number;
  d90_plus: string | number;
  total: string | number;
};

type InvoiceRow = {
  id: number;
  number: string;
  customer_name: string | null;
  invoice_date: string;
  due_date: string | null;
  status: string;
  subtotal: string | number;
  tax_amount: string | number;
  cgst?: string | number;
  sgst?: string | number;
  total: string | number;
  outstanding: string | number;
  interest_loss?: string | number;
};

type PaymentRow = {
  id: number;
  paid_at: string;
  invoice_number: string | null;
  customer_name: string | null;
  amount: string | number;
  method: string;
};

type SalesAging = {
  salesperson_id?: number | null;
  salesperson_name: string;
  current: string | number;
  d1_30: string | number;
  d31_60: string | number;
  d61_90: string | number;
  d90_plus: string | number;
  total: string | number;
};

function Reports() {
  const { firm } = useCompany();
  const [aging, setAging] = useState<AgingRow[]>([]);
  const [people, setPeople] = useState<SalesAging[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [tab, setTab] = useState<"aging" | "sales" | "invoices" | "payments" | "delay">("aging");

  useEffect(() => {
    api<AgingRow[]>("/api/v1/accounts/aging").then(setAging).catch(() => setAging([]));
    api<SalesAging[]>("/api/v1/accounts/aging/salespeople").then(setPeople).catch(() => setPeople([]));
    api<InvoiceRow[]>("/api/v1/invoices").then(setInvoices).catch(() => setInvoices([]));
    api<PaymentRow[]>("/api/v1/payments").then(setPayments).catch(() => setPayments([]));
  }, [firm]);

  const totals = useMemo(() => {
    const sum = (key: keyof AgingRow) => aging.reduce((a, r) => a + Number(r[key] || 0), 0);
    return {
      current: sum("current"),
      d1_30: sum("d1_30"),
      d31_60: sum("d31_60"),
      d61_90: sum("d61_90"),
      d90_plus: sum("d90_plus"),
      total: sum("total"),
    };
  }, [aging]);

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Ageing by customer and salesperson, collections, outstanding and cost of delay. Company-scoped."
        action={
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-2 text-sm"
            onClick={() => {
              if (tab === "aging") {
                downloadCsv("ageing-customer.csv", [
                  ["Customer", "Current", "1-30", "31-60", "61-90", "90+", "Total"],
                  ...aging.map((r) => [r.customer_name, r.current, r.d1_30, r.d31_60, r.d61_90, r.d90_plus, r.total]),
                ]);
              } else if (tab === "sales") {
                downloadCsv("ageing-salesperson.csv", [
                  ["Salesperson", "Current", "1-30", "31-60", "61-90", "90+", "Total"],
                  ...people.map((r) => [r.salesperson_name, r.current, r.d1_30, r.d31_60, r.d61_90, r.d90_plus, r.total]),
                ]);
              } else if (tab === "invoices") {
                downloadCsv("invoices.csv", [
                  ["Invoice", "Date", "Customer", "Total", "Outstanding", "Status"],
                  ...invoices.map((i) => [i.number, i.invoice_date, i.customer_name || "", i.total, i.outstanding, i.status]),
                ]);
              } else if (tab === "payments") {
                downloadCsv("payments.csv", [
                  ["Date", "Invoice", "Customer", "Amount", "Mode"],
                  ...payments.map((p) => [p.paid_at, p.invoice_number || "", p.customer_name || "", p.amount, p.method]),
                ]);
              } else {
                downloadCsv("cost-of-delay.csv", [
                  ["Invoice", "Customer", "Due", "Outstanding", "Cost of delay"],
                  ...invoices.filter((i) => Number(i.interest_loss || 0) > 0).map((i) => [i.number, i.customer_name || "", i.due_date || "", i.outstanding, i.interest_loss || 0]),
                ]);
              }
            }}
          >
            Export Excel
          </button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {([
          ["aging", "Customer ageing"],
          ["sales", "Salesperson"],
          ["invoices", "Invoice register"],
          ["payments", "Collections"],
          ["delay", "Cost of delay"],
        ] as const).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-xl border px-3 py-2 text-sm ${tab === t ? "border-primary bg-primary/10 font-medium" : "border-border"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "aging" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Current" value={money(totals.current)} />
            <Kpi label="1–30 days" value={money(totals.d1_30)} />
            <Kpi label="31–60 days" value={money(totals.d31_60)} />
            <Kpi label="61–90 days" value={money(totals.d61_90)} />
            <Kpi label="90+ days" value={money(totals.d90_plus)} tone={totals.d90_plus ? "bad" : "default"} />
            <Kpi label="Total" value={money(totals.total)} tone="warn" />
          </div>
          <Panel title="Customer aging" className="mt-6">
            <Table head={["Customer", "Current", "1–30", "31–60", "61–90", "90+", "Total"]}>
              {aging.map((r) => (
                <tr key={r.customer_id}>
                  <Td className="font-medium">{r.customer_name}</Td>
                  <Td className="tabular-nums">{money(r.current)}</Td>
                  <Td className="tabular-nums">{money(r.d1_30)}</Td>
                  <Td className="tabular-nums">{money(r.d31_60)}</Td>
                  <Td className="tabular-nums">{money(r.d61_90)}</Td>
                  <Td className="tabular-nums">{money(r.d90_plus)}</Td>
                  <Td className="tabular-nums font-medium">{money(r.total)}</Td>
                </tr>
              ))}
            </Table>
            {!aging.length && <p className="mt-3 text-sm text-muted-foreground">No open receivables.</p>}
          </Panel>
        </>
      )}

      {tab === "sales" && (
        <Panel title="Ageing by salesperson">
          <Table head={["Salesperson", "Current", "1–30", "31–60", "61–90", "90+", "Total"]}>
            {people.map((r) => (
              <tr key={r.salesperson_id ?? r.salesperson_name}>
                <Td className="font-medium">{r.salesperson_name}</Td>
                <Td className="tabular-nums">{money(r.current)}</Td>
                <Td className="tabular-nums">{money(r.d1_30)}</Td>
                <Td className="tabular-nums">{money(r.d31_60)}</Td>
                <Td className="tabular-nums">{money(r.d61_90)}</Td>
                <Td className="tabular-nums">{money(r.d90_plus)}</Td>
                <Td className="tabular-nums font-medium">{money(r.total)}</Td>
              </tr>
            ))}
          </Table>
          {!people.length && <p className="mt-3 text-sm text-muted-foreground">No salesperson ageing yet.</p>}
        </Panel>
      )}

      {tab === "delay" && (
        <Panel title="Cost of delay" hint="18% p.a. default policy. Owner configures formula; Accounts cannot silently clear a penalty.">
          <Table head={["Invoice", "Customer", "Due", "Outstanding", "Cost of delay"]}>
            {invoices.filter((i) => Number(i.interest_loss || 0) > 0).map((i) => (
              <tr key={i.id}>
                <Td className="font-medium">{i.number}</Td>
                <Td>{i.customer_name}</Td>
                <Td className="text-muted-foreground">{i.due_date || "—"}</Td>
                <Td className="tabular-nums">{money(i.outstanding)}</Td>
                <Td className="tabular-nums">{money(i.interest_loss || 0)}</Td>
              </tr>
            ))}
          </Table>
          {!invoices.some((i) => Number(i.interest_loss || 0) > 0) && (
            <p className="mt-3 text-sm text-muted-foreground">No overdue interest this period.</p>
          )}
        </Panel>
      )}

      {tab === "invoices" && (
        <Panel title="GST invoice register">
          <Table head={["Invoice", "Date", "Customer", "Taxable", "CGST", "SGST", "Total", "Outstanding", "Status"]}>
            {invoices.map((i) => (
              <tr key={i.id}>
                <Td className="font-medium">{i.number}</Td>
                <Td className="text-muted-foreground">{i.invoice_date}</Td>
                <Td>{i.customer_name}</Td>
                <Td className="tabular-nums">{money(i.subtotal)}</Td>
                <Td className="tabular-nums">{money(i.cgst || 0)}</Td>
                <Td className="tabular-nums">{money(i.sgst || 0)}</Td>
                <Td className="tabular-nums">{money(i.total)}</Td>
                <Td className="tabular-nums">{money(i.outstanding)}</Td>
                <Td className="capitalize">{i.status}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      )}

      {tab === "payments" && (
        <Panel title="Payment register">
          <Table head={["Date", "Invoice", "Customer", "Amount", "Mode"]}>
            {payments.map((p) => (
              <tr key={p.id}>
                <Td className="text-muted-foreground">{p.paid_at}</Td>
                <Td className="font-medium">{p.invoice_number}</Td>
                <Td>{p.customer_name}</Td>
                <Td className="tabular-nums">{money(p.amount)}</Td>
                <Td className="capitalize">{p.method}</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      )}
    </>
  );
}
