import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export type VehicleDay = {
  vehicle_id: number;
  name: string;
  plate: string;
  kind: string;
  driver_name: string | null;
  status: "available" | "booked" | "unmarked";
  notes: string | null;
};

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return isoDate(d);
}

export function VehicleGlance() {
  const [onDate, setOnDate] = useState(tomorrowIso);
  const [rows, setRows] = useState<VehicleDay[]>([]);

  useEffect(() => {
    api<VehicleDay[]>(`/api/v1/vehicles/availability?on_date=${onDate}`)
      .then(setRows)
      .catch(() => setRows([]));
  }, [onDate]);

  const truck = rows[0];

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Vehicle</p>
        <input
          type="date"
          className="rounded-xl border border-border bg-card px-2 py-1.5 text-sm"
          value={onDate}
          onChange={(e) => setOnDate(e.target.value)}
        />
      </div>
      {truck ? (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-3 py-3">
          <span className="min-w-0">
            <span className="block font-medium">{truck.name}</span>
            <span className="text-xs text-muted-foreground">
              {truck.plate}
              {truck.driver_name ? ` · ${truck.driver_name}` : ""}
            </span>
          </span>
          <StatusPill status={truck.status} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No vehicle listed yet.</p>
      )}
    </section>
  );
}

export function VehicleEditor() {
  const [onDate, setOnDate] = useState(tomorrowIso);
  const [rows, setRows] = useState<VehicleDay[]>([]);
  const [error, setError] = useState("");

  async function load(d = onDate) {
    try {
      setRows(await api<VehicleDay[]>(`/api/v1/vehicles/availability?on_date=${d}`));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load vehicles");
    }
  }

  useEffect(() => {
    void load();
  }, [onDate]);

  async function setStatus(id: number, status: "available" | "booked") {
    try {
      await api(`/api/v1/vehicles/${id}/availability`, {
        method: "PUT",
        body: JSON.stringify({ on_date: onDate, status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update");
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Vehicle availability</h2>
          <p className="text-xs text-muted-foreground">Mark a day so sales can promise a truck.</p>
        </div>
        <input
          type="date"
          className="rounded-xl border border-border bg-background px-2 py-1.5 text-sm"
          value={onDate}
          onChange={(e) => setOnDate(e.target.value)}
        />
      </div>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.vehicle_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5">
            <span>
              <span className="block text-sm font-medium">{r.name}</span>
              <span className="text-xs text-muted-foreground">
                {r.plate}
                {r.driver_name ? ` · ${r.driver_name}` : ""}
              </span>
            </span>
            <span className="flex gap-1">
              <button
                type="button"
                onClick={() => void setStatus(r.vehicle_id, "available")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium",
                  r.status === "available" ? "bg-primary text-primary-foreground" : "border border-border",
                )}
              >
                Free
              </button>
              <button
                type="button"
                onClick={() => void setStatus(r.vehicle_id, "booked")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium",
                  r.status === "booked" ? "bg-destructive text-destructive-foreground" : "border border-border",
                )}
              >
                Booked
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusPill({ status }: { status: VehicleDay["status"] }) {
  const label = status === "available" ? "Free" : status === "booked" ? "Booked" : "—";
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-medium",
        status === "available" && "bg-primary/15 text-primary",
        status === "booked" && "bg-destructive/15 text-destructive",
        status === "unmarked" && "bg-secondary text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
