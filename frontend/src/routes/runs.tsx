import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { todayIso } from "@/components/erp/VehicleBoard";
import {
  SLOTS,
  kg,
  type WindowRow,
} from "@/components/erp/logistics-flow";

export const Route = createFileRoute("/runs")({
  head: () => ({
    meta: [{ title: "Runs · Avighna" }],
  }),
  component: RunsScreen,
});

export function RunsScreen() {
  const [onDate, setOnDate] = useState(todayIso);
  const [windows, setWindows] = useState<WindowRow[]>([]);
  const [error, setError] = useState("");

  async function load(date = onDate) {
    try {
      const w = await api<{ windows: WindowRow[] }>(`/api/v1/logistics/windows?on_date=${date}`);
      setWindows(w.windows);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load runs");
    }
  }

  useEffect(() => {
    void load(onDate);
  }, [onDate]);

  const booked = windows.filter((w) => w.status === "booked" && w.run);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Assigned runs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Supervisor assigns drops on Order desk. You only leave from Today.
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <label className="block text-sm">
        Date
        <input
          type="date"
          className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5"
          value={onDate}
          onChange={(e) => setOnDate(e.target.value)}
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        {SLOTS.map((s) => {
          const w = windows.find((x) => x.slot === s.key);
          const bookedWin = w?.status === "booked";
          return (
            <div
              key={s.key}
              className={cn(
                "rounded-2xl border px-2 py-4 text-center",
                bookedWin ? "border-primary bg-primary/10" : "border-border bg-card",
              )}
            >
              <span className="block text-xs font-semibold uppercase tracking-wide">{s.label}</span>
              <span className="mt-1 block text-sm font-medium">{bookedWin ? "Assigned" : "Empty"}</span>
            </div>
          );
        })}
      </div>

      {booked.length > 0 ? (
        <section className="space-y-2">
          {booked.map((w) => (
            <article key={w.slot} className="rounded-2xl border border-border bg-card px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{w.label}</p>
              {w.run?.stops.map((s) => (
                <p key={s.id} className="mt-1 text-sm">
                  {s.customer_name} · {s.product_summary || kg(s.qty_ordered)}
                </p>
              ))}
            </article>
          ))}
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Nothing assigned for this day yet.
        </p>
      )}
    </div>
  );
}
