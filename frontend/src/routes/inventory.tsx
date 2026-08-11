import { createFileRoute } from "@tanstack/react-router";
import { useCompany } from "@/lib/company-context";
import { byFirm, kpisFor, mt, stock } from "@/lib/erp-data";
import { Badge, Kpi, PageHeader, Panel, Table, Td } from "@/components/erp/ui-bits";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory · Avighna ERP" },
      { name: "description", content: "Batch-level stock in metric tons: manufacturer, warehouse, reserved quantity and ageing." },
      { property: "og:title", content: "Inventory · Avighna ERP" },
      { property: "og:description", content: "Every batch traceable from manufacturer to customer." },
    ],
  }),
  component: Inventory,
});

function Inventory() {
  const { firm } = useCompany();
  const rows = byFirm(stock, firm);
  const total = rows.reduce((a, s) => a + s.qty, 0);
  const reserved = rows.reduce((a, s) => a + s.reserved, 0);

  return (
    <>
      <PageHeader title="Inventory" subtitle="Stock is held in metric tons and tracked by batch, so any lot can be traced back to its manufacturer." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="On hand" value={mt(total)} meta={`${rows.length} live batches`} />
        <Kpi label="Reserved" value={mt(reserved)} meta="Allocated to confirmed orders" />
        <Kpi label="Available" value={mt(total - reserved)} tone="good" />
        <Kpi label="Stock value" value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(kpisFor(firm).stockValue)} />
      </div>

      <Panel title="Batch register" hint="Searchable by batch, product, manufacturer or warehouse" className="mt-6">
        <Table head={["Batch", "Product", "Manufacturer", "Warehouse", "On hand", "Reserved", "Available", "Age", "Movement"]}>
          {rows.map((s) => {
            const avail = s.qty - s.reserved;
            return (
              <tr key={s.batch}>
                <Td className="font-medium">{s.batch}</Td>
                <Td>{s.product}</Td>
                <Td className="text-muted-foreground">{s.manufacturer}</Td>
                <Td className="text-muted-foreground">{s.warehouse}</Td>
                <Td className="tabular-nums">{mt(s.qty)}</Td>
                <Td className="tabular-nums">{mt(s.reserved)}</Td>
                <Td className="tabular-nums">{mt(avail)}</Td>
                <Td className="tabular-nums">{s.age} d</Td>
                <Td>
                  <Badge tone={s.age > 60 ? "bad" : s.age > 40 ? "warn" : "good"}>
                    {s.age > 60 ? "Slow moving" : s.age > 40 ? "Watch ageing" : "Fast moving"}
                  </Badge>
                </Td>
              </tr>
            );
          })}
        </Table>
      </Panel>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Stock inward captures">
          <p className="text-sm text-muted-foreground">
            Manufacturer, product, quantity, batch and lot number, warehouse, date, purchase price, transport details, invoice number and quality notes.
          </p>
        </Panel>
        <Panel title="Stock outward captures">
          <p className="text-sm text-muted-foreground">
            Customer, invoice, batch, quantity, dispatch date, vehicle, driver, transport agency and source warehouse.
          </p>
        </Panel>
      </div>
    </>
  );
}