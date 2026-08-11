import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useCompany } from "@/lib/company-context";
import { byFirm, defaultFormula, delayCost, formulaVars, inr, invoices } from "@/lib/erp-data";
import { Badge, Bar, Kpi, PageHeader, Panel, Table, Td } from "@/components/erp/ui-bits";

export const Route = createFileRoute("/receivables")({
  head: () => ({
    meta: [
      { title: "Receivables & credit · Avighna ERP" },
      { name: "description", content: "Credit countdowns per invoice and a configurable formula that prices the cost of every delayed payment." },
      { property: "og:title", content: "Receivables & credit · Avighna ERP" },
      { property: "og:description", content: "See exactly what a late payment costs, using your own formula." },
    ],
  }),
  component: Receivables,
});

function Receivables() {
  const { firm } = useCompany();
  const rows = byFirm(invoices, firm);
  const [rate, setRate] = useState(formulaVars.annualRate);
  const [fee, setFee] = useState(formulaVars.flatFee);

  const overdueRows = rows.filter((i) => i.daysElapsed > i.creditDays);
  const totalImpact = overdueRows.reduce((a, i) => a + delayCost(i.amount, i.daysElapsed - i.creditDays, rate, fee), 0);

  return (
    <>
      <PageHeader title="Receivables & credit" subtitle="Every invoice starts a countdown. When a customer crosses their agreed days, the cost is calculated with your own formula." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Outstanding" value={inr(rows.reduce((a, i) => a + i.amount, 0))} />
        <Kpi label="Overdue invoices" value={String(overdueRows.length)} tone={overdueRows.length ? "bad" : "good"} />
        <Kpi label="Cost of delay" value={inr(totalImpact)} tone="warn" meta="Computed from the formula below" />
      </div>

      <Panel title="Credit countdown" className="mt-6">
        <Table head={["Invoice", "Customer", "Amount", "Terms", "Elapsed", "Countdown", "Overdue", "Cost of delay"]}>
          {rows.map((i) => {
            const overdue = Math.max(0, i.daysElapsed - i.creditDays);
            return (
              <tr key={i.id}>
                <Td className="font-medium">{i.id}</Td>
                <Td>{i.customer}</Td>
                <Td className="tabular-nums">{inr(i.amount)}</Td>
                <Td className="tabular-nums">{i.creditDays} d</Td>
                <Td className="tabular-nums">{i.daysElapsed} d</Td>
                <Td>
                  <Bar value={(i.daysElapsed / i.creditDays) * 100} tone={overdue ? "destructive" : i.daysElapsed / i.creditDays > 0.8 ? "warning" : "primary"} />
                </Td>
                <Td>{overdue ? <Badge tone="bad">{overdue} days</Badge> : <Badge tone="good">On time</Badge>}</Td>
                <Td className="tabular-nums">{overdue ? inr(delayCost(i.amount, overdue, rate, fee)) : "—"}</Td>
              </tr>
            );
          })}
        </Table>
      </Panel>

      <Panel title="Delay cost formula" hint="Editable without touching code" className="mt-6">
        <code className="block rounded-xl bg-muted px-4 py-3 font-mono text-xs">{defaultFormula}</code>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted-foreground">Annual rate — {rate}%</span>
            <input type="range" min={0} max={36} step={0.5} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="mt-2 w-full accent-[var(--color-primary)]" />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Flat handling fee — {inr(fee)}</span>
            <input type="range" min={0} max={10000} step={250} value={fee} onChange={(e) => setFee(Number(e.target.value))} className="mt-2 w-full accent-[var(--color-primary)]" />
          </label>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Example: 60 days allowed, paid on day 67 → 7 days late on {inr(2640000)} = {inr(delayCost(2640000, 7, rate, fee))} of financial impact.
        </p>
      </Panel>
    </>
  );
}