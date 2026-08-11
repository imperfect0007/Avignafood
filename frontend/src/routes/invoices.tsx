import { createFileRoute } from "@tanstack/react-router";
import { useCompany } from "@/lib/company-context";
import { byFirm, firms, inr, invoices } from "@/lib/erp-data";
import { Badge, Kpi, PageHeader, Panel, Table, Td } from "@/components/erp/ui-bits";

export const Route = createFileRoute("/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices · Avighna ERP" },
      { name: "description", content: "GST invoices per firm with its own numbering series, approved pricing and instant WhatsApp or email delivery." },
      { property: "og:title", content: "Invoices · Avighna ERP" },
      { property: "og:description", content: "Company-aware billing with approved rates applied automatically." },
    ],
  }),
  component: Invoices,
});

function Invoices() {
  const { firm } = useCompany();
  const rows = byFirm(invoices, firm);

  return (
    <>
      <PageHeader title="Invoices" subtitle="Each firm bills under its own GST number and numbering series. The approved rate flows straight into the invoice." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Invoiced" value={inr(rows.reduce((a, i) => a + i.amount, 0))} meta={`${rows.length} documents`} />
        <Kpi label="Awaiting payment" value={String(rows.filter((i) => !i.paid).length)} tone="warn" />
        <Kpi label="Past credit period" value={String(rows.filter((i) => i.daysElapsed > i.creditDays).length)} tone="bad" />
      </div>

      <Panel title="Issued invoices" className="mt-6">
        <Table head={["Invoice no.", "Customer", "Date", "Amount", "Terms", "Day", "Status"]}>
          {rows.map((i) => {
            const overdue = i.daysElapsed - i.creditDays;
            return (
              <tr key={i.id}>
                <Td className="font-medium">{i.id}</Td>
                <Td>{i.customer}</Td>
                <Td className="text-muted-foreground">{i.date}</Td>
                <Td className="tabular-nums">{inr(i.amount)}</Td>
                <Td className="tabular-nums">{i.creditDays} days</Td>
                <Td className="tabular-nums">{i.daysElapsed}</Td>
                <Td>
                  <Badge tone={overdue > 0 ? "bad" : overdue > -7 ? "warn" : "good"}>
                    {overdue > 0 ? `${overdue} days overdue` : `${-overdue} days left`}
                  </Badge>
                </Td>
              </tr>
            );
          })}
        </Table>
      </Panel>

      <Panel title="Numbering & branding per firm" className="mt-6">
        <Table head={["Company", "Segment", "GST", "Invoice series"]}>
          {firms.map((f) => (
            <tr key={f.id}>
              <Td className="font-medium">{f.name}</Td>
              <Td className="text-muted-foreground">{f.short}</Td>
              <Td className="tabular-nums">{f.gst}</Td>
              <Td className="tabular-nums text-muted-foreground">
                {f.id === "f1" ? "SFI/25-26/####" : f.id === "f2" ? "SPA/25-26/####" : f.id === "f3" ? "SSL/25-26/####" : "STD/25-26/####"}
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}