import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { useCompany } from "@/lib/company-context";
import { useMe } from "@/lib/me-context";
import { byFirm, customers, firms, inr, kpisByFirm, kpisFor, monthlyRevenue } from "@/lib/erp-data";
import { money } from "@/lib/format";
import { Kpi, PageHeader, Panel, Table, Td } from "@/components/erp/ui-bits";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · Avighna ERP" },
      { name: "description", content: "Revenue, receivables, customer behaviour and inventory turnover, consolidated or per firm." },
      { property: "og:title", content: "Analytics · Avighna ERP" },
      { property: "og:description", content: "Drill from the consolidated picture into a single firm." },
    ],
  }),
  component: Analytics,
});

const palette = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)"];

type ClientRow = {
  customer_id: number;
  name: string;
  orders_fulfilled: number;
  invoice_count: number;
  total_revenue: string | number;
  outstanding: string | number;
};

function AccountsAnalytics() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  useEffect(() => {
    api<ClientRow[]>("/api/v1/invoices/clients").then(setRows).catch(() => setRows([]));
  }, []);
  const revenue = rows.reduce((a, r) => a + Number(r.total_revenue || 0), 0);
  const outstanding = rows.reduce((a, r) => a + Number(r.outstanding || 0), 0);
  const fulfilled = rows.reduce((a, r) => a + r.orders_fulfilled, 0);
  const chart = [...rows]
    .sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue))
    .slice(0, 8)
    .map((c) => ({ name: c.name.split(" ")[0], value: Number(c.total_revenue) / 100000, orders: c.orders_fulfilled }));

  return (
    <>
      <PageHeader title="Billing analytics" subtitle="Per-client revenue and receivables from invoices raised here. Tally Prime remains the books." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Billed revenue" value={money(revenue)} tone="good" />
        <Kpi label="Outstanding" value={money(outstanding)} tone="warn" />
        <Kpi label="Orders fulfilled" value={String(fulfilled)} />
        <Kpi label="Clients billed" value={String(rows.filter((r) => r.invoice_count > 0).length)} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Revenue by client" hint="₹ lakh">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} layout="vertical" margin={{ left: 10, right: 8 }}>
                <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                <Bar dataKey="value" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Client billing">
          <Table head={["Client", "Fulfilled", "Invoices", "Revenue", "Outstanding"]}>
            {rows.map((c) => (
              <tr key={c.customer_id}>
                <Td className="font-medium">{c.name}</Td>
                <Td className="tabular-nums">{c.orders_fulfilled}</Td>
                <Td className="tabular-nums">{c.invoice_count}</Td>
                <Td className="tabular-nums">{money(c.total_revenue)}</Td>
                <Td className="tabular-nums">{money(c.outstanding)}</Td>
              </tr>
            ))}
          </Table>
          {!rows.length && <p className="mt-3 text-sm text-muted-foreground">No billing data yet.</p>}
        </Panel>
      </div>
    </>
  );
}

function Analytics() {
  const { me } = useMe();
  if (me?.user.role === "accountant") return <AccountsAnalytics />;

  const { firm } = useCompany();
  const k = kpisFor(firm);
  const custRows = byFirm(customers, firm);

  const trend = monthlyRevenue.map((m) => ({
    month: m.month,
    value: firm === "all" ? m.f1 + m.f2 + m.f3 + m.f4 : (m as unknown as Record<string, number>)[firm],
  }));
  const share = firms.map((f) => ({ name: f.short, value: kpisByFirm[f.id].revenue / 100000 }));
  const topCustomers = [...custRows].sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((c) => ({ name: c.name.split(" ")[0], value: c.revenue / 100000 }));

  return (
    <>
      <PageHeader title="Analytics" subtitle="A few numbers that matter, not a wall of charts. Switch companies to narrow the view." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Revenue" value={inr(k.revenue)} tone="good" />
        <Kpi label="Receivables" value={inr(k.outstanding)} tone="warn" />
        <Kpi label="Inventory value" value={inr(k.stockValue)} />
        <Kpi label="Growth" value={`${k.growth > 0 ? "+" : ""}${k.growth}%`} tone={k.growth >= 0 ? "good" : "bad"} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Revenue trend" hint="₹ lakh">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ left: -18, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                <Line type="monotone" dataKey="value" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Revenue share by firm" hint="₹ lakh">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={share} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {share.map((_, i) => (
                    <Cell key={i} fill={palette[i % palette.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Top customers" hint="₹ lakh">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCustomers} layout="vertical" margin={{ left: 10, right: 8 }}>
                <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <YAxis type="category" dataKey="name" width={80} tickLine={false} axisLine={false} fontSize={12} stroke="var(--color-muted-foreground)" />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)", background: "var(--color-card)" }} />
                <Bar dataKey="value" fill="var(--color-chart-1)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Payment behaviour">
          <Table head={["Customer", "Terms", "Outstanding", "Utilisation"]}>
            {custRows.map((c) => (
              <tr key={c.id}>
                <Td className="font-medium">{c.name}</Td>
                <Td className="tabular-nums">{c.creditDays} d</Td>
                <Td className="tabular-nums">{inr(c.outstanding)}</Td>
                <Td className="tabular-nums">{Math.round((c.outstanding / c.creditLimit) * 100)}%</Td>
              </tr>
            ))}
          </Table>
        </Panel>
      </div>
    </>
  );
}