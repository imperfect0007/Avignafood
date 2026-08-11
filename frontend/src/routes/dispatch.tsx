import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/me-context";
import { SLOTS, VehicleEditor, todayIso } from "@/components/erp/VehicleBoard";
import type { Stop } from "@/components/erp/LogisticsDashboard";

export const Route = createFileRoute("/dispatch")({
  head: () => ({
    meta: [{ title: "Runs · Avighna" }],
  }),
  component: Dispatch,
});

function Dispatch() {
  const { me } = useMe();
  if (me?.user.role === "logistics") return <DriverRuns />;
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-[Fraunces,Georgia,serif] text-2xl">Truck windows</h1>
      <VehicleEditor />
    </div>
  );
}

function DriverRuns() {
  const [onDate, setOnDate] = useState(todayIso);
  const [stops, setStops] = useState<Stop[]>([]);

  useEffect(() => {
    api<Stop[]>(`/api/v1/deliveries?on_date=${onDate}`)
      .then(setStops)
      .catch(() => setStops([]));
  }, [onDate]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[Fraunces,Georgia,serif] text-2xl">Runs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pick a day. Three windows. Tap a window to book or free it.</p>
      </div>
      <VehicleEditor date={onDate} onDateChange={setOnDate} />
      <ul className="space-y-2">
        {SLOTS.map((s) => {
          const rows = stops.filter((x) => x.slot === s.key);
          return (
            <li key={s.key} className="rounded-2xl border border-border bg-card p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              {rows.length ? (
                rows.map((r) => (
                  <p key={r.id} className="mt-1 text-sm font-medium">
                    {r.customer_name}
                    <span className="font-normal text-muted-foreground"> · {r.item_summary}</span>
                  </p>
                ))
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No stop</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
