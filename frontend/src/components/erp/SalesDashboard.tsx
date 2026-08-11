import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardPen } from "lucide-react";
import { api, mediaUrl } from "@/lib/api";
import { useMe } from "@/lib/me-context";
import { greeting } from "@/lib/format";
import { VehicleGlance } from "@/components/erp/VehicleBoard";

type Visit = {
  id: number;
  site_name: string;
  checked_in_at: string;
  sales_order_id: number | null;
  customer_id: number | null;
  media: { url: string; kind: string }[];
};

export function SalesDashboard() {
  const { me } = useMe();
  const name = me?.user.full_name?.split(" ")[0] || "there";
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    api<Visit[]>("/api/v1/visits")
      .then(setVisits)
      .catch(() => setVisits([]));
  }, []);

  const today = useMemo(
    () =>
      visits.filter((v) => new Date(v.checked_in_at).toDateString() === new Date().toDateString()),
    [visits],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[Fraunces,Georgia,serif] text-3xl leading-tight">
          {greeting()}, {name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log the visit. Call the team before you promise stock.
        </p>
      </div>

      <Link
        to="/field"
        className="flex min-h-24 items-center justify-center gap-3 rounded-3xl bg-primary px-4 text-lg font-semibold text-primary-foreground"
      >
        <ClipboardPen className="size-7" />
        Log a visit
      </Link>

      <VehicleGlance />

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">
          Today · {today.length} visit{today.length === 1 ? "" : "s"}
        </h2>
        <ul className="space-y-2">
          {today.map((v) => (
            <li key={v.id} className="rounded-2xl border border-border bg-card p-3">
              <p className="font-medium">{v.site_name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(v.checked_in_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                {v.sales_order_id ? " · new order" : v.customer_id ? " · new client" : ""}
              </p>
              {v.media[0] && (
                <img src={mediaUrl(v.media[0].url)} alt="" className="mt-2 h-24 w-full rounded-xl object-cover" />
              )}
            </li>
          ))}
          {!today.length && (
            <li className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing logged yet today.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
