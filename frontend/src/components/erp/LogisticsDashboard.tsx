import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { api, apiUpload } from "@/lib/api";
import { useMe } from "@/lib/me-context";
import { greeting } from "@/lib/format";
import { todayIso, type LiveStatus, type VehicleAvail } from "@/components/erp/VehicleBoard";
import { readGps } from "@/components/erp/sales-field";
import { cn } from "@/lib/utils";

export type Stop = {
  id: number;
  company_name: string;
  customer_name: string;
  address: string | null;
  phone: string | null;
  item_summary: string;
  slot: string;
  slot_date: string;
  status: string;
  pod_url: string | null;
};

type InvoicePreview = {
  number: string;
  company_name: string;
  customer_name: string;
  address: string | null;
  item_summary: string;
  slot_date: string;
  slot: string;
};

const LIVE: { id: LiveStatus; label: string; hint: string }[] = [
  { id: "idle", label: "Idle", hint: "Can take a new drop" },
  { id: "going", label: "Going", hint: "Out with goods" },
  { id: "returning", label: "Coming back", hint: "Last drop done" },
];

export function LogisticsDashboard() {
  const { me } = useMe();
  const name = me?.user.full_name?.split(" ")[0] || "Ravi";
  const [truck, setTruck] = useState<VehicleAvail | null>(null);
  const [today, setToday] = useState<Stop[]>([]);
  const [upcoming, setUpcoming] = useState<Stop[]>([]);
  const [error, setError] = useState("");
  const [popup, setPopup] = useState<Stop | null>(null);
  const [openUp, setOpenUp] = useState<number | null>(null);
  const [invoice, setInvoice] = useState<InvoicePreview | null>(null);
  const [gone, setGone] = useState<number[]>([]);

  async function load() {
    try {
      const [avail, day, later] = await Promise.all([
        api<VehicleAvail>(`/api/v1/vehicles/availability?on_date=${todayIso()}`),
        api<Stop[]>(`/api/v1/deliveries?on_date=${todayIso()}`),
        api<Stop[]>(`/api/v1/deliveries?after=${todayIso()}&status=pending`),
      ]);
      setTruck(avail);
      setToday(day);
      setUpcoming(later);
      const first = day.find((s) => s.status !== "done");
      if (first) setPopup(first);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setLive(status: LiveStatus) {
    if (!truck) return;
    try {
      await api(`/api/v1/vehicles/${truck.vehicle_id}/live`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      setTruck({ ...truck, live_status: status });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update");
    }
  }

  const visibleToday = today.filter((s) => !gone.includes(s.id));

  async function onMarked(stop: Stop) {
    setToday((rows) => rows.map((s) => (s.id === stop.id ? { ...s, status: "done" } : s)));
    const left = today.filter((s) => s.id !== stop.id && s.status !== "done" && !gone.includes(s.id));
    if (left.length === 0) await setLive("returning");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[Fraunces,Georgia,serif] text-3xl leading-tight">{greeting()}, {name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Last drop of the day flips you to Coming back. Sales then knows the truck is emptying.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-3 gap-2">
        {LIVE.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => void setLive(o.id)}
            className={cn(
              "min-h-[4.5rem] rounded-2xl border px-1 py-2 text-center",
              truck?.live_status === o.id ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border bg-card",
            )}
          >
            <span className="block text-sm font-semibold">{o.label}</span>
            <span className="mt-1 block text-[10px] leading-tight text-muted-foreground">{o.hint}</span>
          </button>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Today&apos;s drops</h2>
        {visibleToday.map((s) => (
          <StopCard
            key={s.id}
            stop={s}
            onMarked={() => void onMarked(s)}
            onInvoice={(inv) => {
              setInvoice(inv);
              setGone((g) => [...g, s.id]);
            }}
          />
        ))}
        {!visibleToday.length && (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No drops left today.
          </p>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Upcoming</h2>
          {upcoming.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setOpenUp((id) => (id === s.id ? null : s.id))}
              className="w-full rounded-2xl border border-border bg-card px-3 py-2.5 text-left"
            >
              <p className="truncate font-medium">{s.customer_name}</p>
              {openUp === s.id && (
                <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                  <p>{s.company_name} · {s.item_summary}</p>
                  <p className="capitalize">{s.slot_date} · {s.slot}</p>
                  {s.address && <p>{s.address}</p>}
                  {s.phone && <p>{s.phone}</p>}
                </div>
              )}
            </button>
          ))}
        </section>
      )}

      {popup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {today.filter((s) => s.status !== "done").length} drop{today.filter((s) => s.status !== "done").length === 1 ? "" : "s"} today
            </p>
            <p className="mt-1 text-xl font-semibold">{popup.customer_name}</p>
            <p className="mt-1 text-sm">{popup.item_summary}</p>
            <p className="mt-1 text-sm text-muted-foreground capitalize">{popup.slot} · {popup.company_name}</p>
            <button
              type="button"
              className="mt-4 min-h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"
              onClick={() => setPopup(null)}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {invoice && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoice {invoice.number}</p>
            <p className="mt-2 text-lg font-semibold">{invoice.customer_name}</p>
            <p className="text-sm text-muted-foreground">{invoice.company_name}</p>
            <p className="mt-3 text-sm">{invoice.item_summary}</p>
            {invoice.address && <p className="mt-1 text-sm text-muted-foreground">{invoice.address}</p>}
            <p className="mt-2 text-xs capitalize text-muted-foreground">{invoice.slot_date} · {invoice.slot}</p>
            <button
              type="button"
              className="mt-4 min-h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"
              onClick={() => setInvoice(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StopCard({
  stop,
  onMarked,
  onInvoice,
}: {
  stop: Stop;
  onMarked: () => void;
  onInvoice: (inv: InvoicePreview) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(stop.status === "done");
  const [shot, setShot] = useState(!!stop.pod_url);
  const [podUrl, setPodUrl] = useState(stop.pod_url);
  const [err, setErr] = useState("");

  async function takePhoto(file: File) {
    setBusy(true);
    setErr("");
    try {
      const up = await apiUpload("/api/v1/deliveries/upload", file);
      setPodUrl(up.url);
      try {
        await readGps();
      } catch {
        /* photo is enough */
      }
      setShot(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save photo");
    } finally {
      setBusy(false);
    }
  }

  async function markDelivered() {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/v1/deliveries/${stop.id}/complete`, {
        method: "POST",
        body: JSON.stringify({ pod_url: podUrl, lat: null, lng: null }),
      });
      setDone(true);
      onMarked();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not mark delivered");
    } finally {
      setBusy(false);
    }
  }

  async function openInvoice() {
    if (!done) {
      setErr("Mark delivered first");
      return;
    }
    try {
      const inv = await api<InvoicePreview>(`/api/v1/deliveries/${stop.id}/invoice`);
      onInvoice(inv);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No invoice yet");
    }
  }

  return (
    <article className="relative rounded-2xl border border-border bg-card p-4 pr-14">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void takePhoto(f);
        }}
      />
      <button
        type="button"
        aria-label="Take proof photo"
        onClick={() => inputRef.current?.click()}
        className="absolute right-3 top-3 grid size-10 place-items-center rounded-xl border border-border bg-background"
      >
        <Camera className={cn("size-5", shot && "text-primary")} />
      </button>

      <p className="text-xs uppercase tracking-wide text-muted-foreground">{stop.company_name}</p>
      <h3 className="mt-0.5 text-lg font-semibold">{stop.customer_name}</h3>
      <p className="mt-1 text-sm">{stop.item_summary}</p>
      {stop.address && <p className="mt-2 text-sm text-muted-foreground">{stop.address}</p>}
      {stop.phone && (
        <a href={`tel:${stop.phone}`} className="mt-1 inline-block text-sm font-medium text-primary">
          {stop.phone}
        </a>
      )}
      <p className="mt-1 text-xs capitalize text-muted-foreground">{stop.slot}</p>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button type="button" onClick={() => void openInvoice()} className="text-sm text-primary underline">
          Invoice
        </button>
        {!done && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void markDelivered()}
            className="min-h-12 flex-1 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Saving…" : "Mark delivered"}
          </button>
        )}
      </div>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
    </article>
  );
}
