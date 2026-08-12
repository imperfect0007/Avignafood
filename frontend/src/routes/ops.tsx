import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Badge, PageHeader, Panel } from "@/components/erp/ui-bits";
import { SLOTS, VehicleEditor, tomorrowIso, type SlotKey, type VehicleAvail } from "@/components/erp/VehicleBoard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ops")({
  head: () => ({
    meta: [
      { title: "Order desk · Avighna ERP" },
      {
        name: "description",
        content: "Supervisor desk: verify stock, raise purchase, receive batch, allocate and book vehicle slots.",
      },
    ],
  }),
  component: OrderDesk,
});

type DeskLine = {
  product_id: number;
  product_name: string;
  quantity: string | number;
  unit_price: string | number;
  on_hand: string | number;
  ok: boolean;
};

type DeskOrder = {
  id: number;
  customer_id: number;
  customer_name: string;
  quotation_id: number | null;
  warehouse_id: number;
  status: string;
  ops_status: string;
  notes: string | null;
  confirmed_at: string | null;
  created_at: string | null;
  lines: DeskLine[];
  stock_ok: boolean;
  dispatch_id: number | null;
  purchase_id: number | null;
  purchase_status: string | null;
  slot_date: string | null;
  slot: string | null;
  vehicle: string | null;
};

type Filter = "all" | "pending_verify" | "shortage" | "procuring" | "ready" | "allocated";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending_verify", label: "Verify" },
  { id: "shortage", label: "Shortage" },
  { id: "procuring", label: "Procuring" },
  { id: "ready", label: "Ready" },
  { id: "allocated", label: "Dispatched" },
];

function opsTone(status: string): "neutral" | "good" | "warn" | "bad" {
  if (status === "ready" || status === "allocated" || status === "dispatched") return "good";
  if (status === "shortage") return "bad";
  if (status === "procuring" || status === "pending_verify") return "warn";
  return "neutral";
}

function opsLabel(status: string) {
  return (
    {
      pending_verify: "Verify stock",
      shortage: "Shortage",
      procuring: "Procuring",
      ready: "Ready to allocate",
      allocated: "Dispatch prepared",
      dispatched: "Invoiced",
    }[status] || status
  );
}

function kg(v: string | number) {
  return `${Number(v || 0).toLocaleString()} KG`;
}

function OrderDesk() {
  const [rows, setRows] = useState<DeskOrder[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [fleet, setFleet] = useState<VehicleAvail[]>([]);
  const [slotDate, setSlotDate] = useState(tomorrowIso());
  const [slot, setSlot] = useState<SlotKey>("evening");
  const [vehicleId, setVehicleId] = useState<number | "">("");
  const [maker, setMaker] = useState("");
  const [prNotes, setPrNotes] = useState("");
  const [batch, setBatch] = useState("");
  const [receiveMaker, setReceiveMaker] = useState("");

  async function loadDesk() {
    try {
      const data = await api<DeskOrder[]>("/api/v1/sales-orders/desk");
      setRows(data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load order desk");
    }
  }

  async function loadFleet(onDate: string) {
    try {
      const all = await api<VehicleAvail[]>(`/api/v1/vehicles/availability/all?on_date=${onDate}`);
      setFleet(all);
      if (all.length && vehicleId === "") setVehicleId(all[0].vehicle_id);
    } catch {
      try {
        const one = await api<VehicleAvail>(`/api/v1/vehicles/availability?on_date=${onDate}`);
        setFleet([one]);
        if (vehicleId === "") setVehicleId(one.vehicle_id);
      } catch {
        setFleet([]);
      }
    }
  }

  useEffect(() => {
    void loadDesk();
  }, []);

  useEffect(() => {
    void loadFleet(slotDate);
  }, [slotDate]);

  const visible = useMemo(() => {
    if (filter === "all") return rows.filter((r) => r.ops_status !== "dispatched");
    if (filter === "allocated") return rows.filter((r) => r.ops_status === "allocated" || r.ops_status === "dispatched");
    return rows.filter((r) => r.ops_status === filter);
  }, [rows, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.ops_status] = (c[r.ops_status] || 0) + 1;
    return c;
  }, [rows]);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError("");
    try {
      await fn();
      await loadDesk();
      await loadFleet(slotDate);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  const selectedVehicle = fleet.find((v) => v.vehicle_id === vehicleId);
  const slotFree = selectedVehicle ? selectedVehicle[slot] === "free" : false;

  return (
    <>
      <PageHeader
        title="Order desk"
        subtitle="Confirmed sales orders after Super Admin approval. Verify stock, procure if short, then allocate and book a vehicle window for logistics. Accounts invoices from dispatch."
      />
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-6">
      <aside className="mb-4 lg:order-2 lg:mb-0 lg:sticky lg:top-20">
        <Panel title="Fleet windows" hint="For logistics">
          <p className="mb-3 text-xs text-muted-foreground">
            Morning / afternoon / evening. Tap a window to mark free or booked, then allocate the order to it.
          </p>
          <VehicleEditor date={slotDate} onDateChange={setSlotDate} onUpdated={() => void loadFleet(slotDate)} />
        </Panel>
      </aside>
      <div className="lg:order-1">
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const n =
            f.id === "all"
              ? rows.filter((r) => r.ops_status !== "dispatched").length
              : f.id === "allocated"
                ? (counts.allocated || 0) + (counts.dispatched || 0)
                : counts[f.id] || 0;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium",
                filter === f.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary",
              )}
            >
              {f.label}
              <span className="ml-1 tabular-nums opacity-80">{n}</span>
            </button>
          );
        })}
      </div>

      {!visible.length && (
        <Panel>
          <p className="text-sm text-muted-foreground">
            No orders in this step. Once Sales books a deal and Super Admin approves, it lands here as confirmed.
          </p>
        </Panel>
      )}

      <div className="space-y-4">
        {visible.map((so) => (
          <Panel key={so.id} title={`SO-${so.id} · ${so.customer_name}`} hint={so.confirmed_at ? `Confirmed ${so.confirmed_at.slice(0, 10)}` : undefined}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone={opsTone(so.ops_status)}>{opsLabel(so.ops_status)}</Badge>
              {so.purchase_id && (
                <Badge tone={so.purchase_status === "approved" || so.purchase_status === "received" ? "good" : "warn"}>
                  PR-{so.purchase_id} · {so.purchase_status}
                </Badge>
              )}
              {so.dispatch_id && (
                <Badge tone="good">
                  Dispatch #{so.dispatch_id}
                  {so.slot ? ` · ${so.slot}` : ""}
                  {so.vehicle ? ` · ${so.vehicle}` : ""}
                </Badge>
              )}
            </div>

            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-[0.65rem] uppercase tracking-[0.1em] text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Product</th>
                    <th className="pb-2 pr-3 font-medium">Need</th>
                    <th className="pb-2 pr-3 font-medium">On hand</th>
                    <th className="pb-2 font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {so.lines.map((ln) => (
                    <tr key={ln.product_id}>
                      <td className="py-2 pr-3">{ln.product_name}</td>
                      <td className="py-2 pr-3 tabular-nums">{kg(ln.quantity)}</td>
                      <td className="py-2 pr-3 tabular-nums">{kg(ln.on_hand)}</td>
                      <td className="py-2">
                        <Badge tone={ln.ok ? "good" : "bad"}>{ln.ok ? "Available" : "Short"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {so.ops_status === "pending_verify" && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-muted-foreground">
                  Second stock check — Sales already saw availability once. Confirm warehouse on-hand now.
                </p>
                <button
                  type="button"
                  disabled={busy === `v-${so.id}`}
                  onClick={() => run(`v-${so.id}`, () => api(`/api/v1/sales-orders/${so.id}/verify-stock`, { method: "POST" }).then(() => undefined))}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {busy === `v-${so.id}` ? "Verifying…" : "Verify stock"}
                </button>
              </div>
            )}

            {so.ops_status === "shortage" && (
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-secondary/40 p-3">
                <p className="text-sm text-muted-foreground">No availability. Raise a purchase requirement for Super Admin approval.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-muted-foreground">
                    Manufacturer
                    <input
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={maker}
                      onChange={(e) => setMaker(e.target.value)}
                      placeholder="e.g. ABC Foods"
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Notes
                    <input
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={prNotes}
                      onChange={(e) => setPrNotes(e.target.value)}
                      placeholder="Shortage for this SO"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  disabled={busy === `pr-${so.id}`}
                  onClick={() =>
                    run(`pr-${so.id}`, () =>
                      api(`/api/v1/sales-orders/${so.id}/raise-purchase`, {
                        method: "POST",
                        body: JSON.stringify({ manufacturer: maker || null, notes: prNotes || null }),
                      }).then(() => undefined),
                    )
                  }
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {busy === `pr-${so.id}` ? "Raising…" : "Raise purchase requirement"}
                </button>
              </div>
            )}

            {so.ops_status === "procuring" && (
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-secondary/40 p-3">
                {so.purchase_status === "pending_approval" && (
                  <p className="text-sm text-muted-foreground">Waiting for Super Admin / Owner to approve PR-{so.purchase_id}.</p>
                )}
                {so.purchase_status === "rejected" && (
                  <p className="text-sm text-destructive">Purchase was declined. Raise a new requirement if still short.</p>
                )}
                {(so.purchase_status === "approved" || so.purchase_status === "Approved") && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Approved. Receive material from manufacturer, then enter stock inward + batch.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-xs text-muted-foreground">
                        Batch / lot
                        <input
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          value={batch}
                          onChange={(e) => setBatch(e.target.value)}
                          placeholder="LOT-2408-A"
                        />
                      </label>
                      <label className="text-xs text-muted-foreground">
                        Manufacturer
                        <input
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                          value={receiveMaker}
                          onChange={(e) => setReceiveMaker(e.target.value)}
                          placeholder="As on GRN"
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      disabled={busy === `rx-${so.id}` || !so.purchase_id}
                      onClick={() =>
                        run(`rx-${so.id}`, () =>
                          api(`/api/v1/purchases/${so.purchase_id}/receive`, {
                            method: "POST",
                            body: JSON.stringify({
                              batch: batch || null,
                              manufacturer: receiveMaker || null,
                              notes: `GRN SO-${so.id}`,
                            }),
                          }).then(() => undefined),
                        )
                      }
                      className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
                    >
                      {busy === `rx-${so.id}` ? "Receiving…" : "Receive + batch inward"}
                    </button>
                  </>
                )}
              </div>
            )}

            {so.ops_status === "ready" && (
              <div className="mt-4 space-y-3 rounded-xl border border-border bg-secondary/40 p-3">
                <p className="text-sm text-muted-foreground">
                  Stock is available. Allocate to the order, prepare dispatch, and book a window for logistics (e.g. tomorrow evening if the driver is free).
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="text-xs text-muted-foreground">
                    Dispatch date
                    <input
                      type="date"
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={slotDate}
                      onChange={(e) => setSlotDate(e.target.value)}
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Window
                    <select
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={slot}
                      onChange={(e) => setSlot(e.target.value as SlotKey)}
                    >
                      {SLOTS.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Vehicle
                    <select
                      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value ? Number(e.target.value) : "")}
                    >
                      {fleet.map((v) => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>
                          {v.name} · {v.plate}
                          {v.driver_name ? ` · ${v.driver_name}` : ""} · {v[slot]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {selectedVehicle && (
                  <p className="text-xs text-muted-foreground">
                    {selectedVehicle.driver_name || "No driver listed"} · {slot} on {slotDate} is{" "}
                    <span className={slotFree ? "text-success" : "text-destructive"}>{slotFree ? "free" : "booked"}</span>.
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy === `a-${so.id}` || !slotFree || !vehicleId}
                  onClick={() =>
                    run(`a-${so.id}`, () =>
                      api(`/api/v1/sales-orders/${so.id}/allocate`, {
                        method: "POST",
                        body: JSON.stringify({ on_date: slotDate, slot, vehicle_id: vehicleId || null }),
                      }).then(() => undefined),
                    )
                  }
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {busy === `a-${so.id}` ? "Allocating…" : "Allocate & prepare dispatch"}
                </button>
              </div>
            )}

            {(so.ops_status === "allocated" || so.ops_status === "dispatched") && (
              <p className="mt-3 text-sm text-muted-foreground">
                Dispatch prepared
                {so.slot_date ? ` for ${so.slot_date}` : ""}
                {so.slot ? ` ${so.slot}` : ""}
                {so.vehicle ? ` · ${so.vehicle}` : ""}. This load is in Accounts for invoice generation.
              </p>
            )}
          </Panel>
        ))}
      </div>
      </div>
      </div>
    </>
  );
}
