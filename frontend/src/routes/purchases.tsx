import { createFileRoute } from "@tanstack/react-router";
import { useCompany } from "@/lib/company-context";
import { byFirm, inr, mt, purchaseOrders } from "@/lib/erp-data";
import { Badge, Bar, Kpi, PageHeader, Panel, Table, Td } from "@/components/erp/ui-bits";

export const Route = createFileRoute("/purchases")({
  head: () => ({
    meta: [
      { title: "Purchases · Avighna ERP" },
      { name: "description", content: "Purchase orders to the four fixed manufacturers, with expected delivery and pending quantities." },
      { property: "og:title", content: "Purchases · Avighna ERP" },
      { property: "og:description", content: "Advance-paid orders, goods receipts and supplier performance." },
    ],
  }),
  component: Purchases,
});

function Purchases() {
  const { firm } = useCompany();
  const rows = byFirm(purchaseOrders, firm);
  const open = rows.filter((p) => p.received < p.qty);

  return (
    <>
      <PageHeader title="Purchases" subtitle="Four fixed manufacturers, advance payments, and a clear view of what is still on the road." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Open orders" value={String(open.length)} meta="Awaiting full receipt" />
        <Kpi label="Incoming quantity" value={mt(open.reduce((a, p) => a + (p.qty - p.received), 0))} />
        <Kpi label="Committed value" value={inr(rows.reduce((a, p) => a + p.value, 0))} />
      </div>

      <Panel title="Purchase orders" className="mt-6">
        <Table head={["PO", "Manufacturer", "Product", "Ordered", "Received", "Progress", "Value", "ETA", "Status"]}>
          {rows.map((p) => (
            <tr key={p.id}>
              <Td className="font-medium">{p.id}</Td>
              <Td>{p.manufacturer}</Td>
              <Td className="text-muted-foreground">{p.product}</Td>
              <Td className="tabular-nums">{mt(p.qty)}</Td>
              <Td className="tabular-nums">{mt(p.received)}</Td>
              <Td><Bar value={(p.received / p.qty) * 100} /></Td>
              <Td className="tabular-nums">{inr(p.value)}</Td>
              <Td className="text-muted-foreground">{p.eta}</Td>
              <Td><Badge tone={p.status === "Received" ? "good" : p.status === "Confirmed" ? "neutral" : "warn"}>{p.status}</Badge></Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}