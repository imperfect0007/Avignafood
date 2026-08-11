import { createFileRoute } from "@tanstack/react-router";
import { useCompany } from "@/lib/company-context";
import { useMe } from "@/lib/me-context";
import { byFirm, dispatches, mt } from "@/lib/erp-data";
import { Badge, Kpi, PageHeader, Panel, Table, Td } from "@/components/erp/ui-bits";
import { VehicleEditor } from "@/components/erp/VehicleBoard";

export const Route = createFileRoute("/dispatch")({
  head: () => ({
    meta: [
      { title: "Dispatch · Avighna ERP" },
      { name: "description", content: "Loads moving from pending to delivered, with vehicle, transporter, LR number and proof of delivery." },
      { property: "og:title", content: "Dispatch · Avighna ERP" },
      { property: "og:description", content: "Track every load from allocation to delivery." },
    ],
  }),
  component: Dispatch,
});

const stages = ["Pending", "Allocated", "Packed", "Ready", "Dispatched", "Delivered"] as const;

function Dispatch() {
  const { firm } = useCompany();
  const { me } = useMe();
  const rows = byFirm(dispatches, firm);
  const canMarkVehicles = ["supervisor", "logistics", "owner", "super_admin"].includes(me?.user.role || "");

  return (
    <>
      <PageHeader title="Dispatch" subtitle="A single line of sight from allocation to delivery, so nobody has to call the warehouse." />
      {canMarkVehicles && (
        <div className="mb-6">
          <VehicleEditor />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Moving today" value={String(rows.filter((d) => d.status === "Dispatched").length)} />
        <Kpi label="Awaiting vehicle" value={String(rows.filter((d) => ["Pending", "Allocated", "Packed", "Ready"].includes(d.status)).length)} tone="warn" />
        <Kpi label="Delivered this week" value={String(rows.filter((d) => d.status === "Delivered").length)} tone="good" />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stages.map((s) => (
          <div key={s} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{s}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums">{rows.filter((d) => d.status === s).length}</p>
          </div>
        ))}
      </div>

      <Panel title="Loads" className="mt-6">
        <Table head={["Load", "Customer", "Product", "Qty", "Vehicle", "Transporter", "LR no.", "ETA", "Status"]}>
          {rows.map((d) => (
            <tr key={d.id}>
              <Td className="font-medium">{d.id}</Td>
              <Td>{d.customer}</Td>
              <Td className="text-muted-foreground">{d.product}</Td>
              <Td className="tabular-nums">{mt(d.qty)}</Td>
              <Td className="tabular-nums">{d.vehicle}</Td>
              <Td className="text-muted-foreground">{d.transporter}</Td>
              <Td className="text-muted-foreground">{d.lr}</Td>
              <Td>{d.eta}</Td>
              <Td><Badge tone={d.status === "Delivered" ? "good" : d.status === "Pending" ? "warn" : "neutral"}>{d.status}</Badge></Td>
            </tr>
          ))}
        </Table>
      </Panel>
    </>
  );
}