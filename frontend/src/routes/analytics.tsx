import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useCompany } from "@/lib/company-context";
import { byFirm, customers, firms, inr, kpisByFirm, kpisFor, monthlyRevenue } from "@/lib/erp-data";
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

function Analytics() {
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