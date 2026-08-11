import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useMe } from "@/lib/me-context";
import {
  CompanyPick,
  GeoPhotos,
  GpsPill,
  VoiceNote,
  fieldInput,
  readGps,
  useCompanies,
  type GeoFix,
  type GeoPhoto,
} from "@/components/erp/sales-field";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/field")({
  head: () => ({
    meta: [
      { title: "Log visit · Avighna" },
      { name: "description", content: "Existing client order or new client — with optional on-site photos." },
    ],
  }),
  component: Field,
});

type CustomerOpt = { id: number; name: string; contact_person: string | null; phone: string | null };

function Field() {
  const { me } = useMe();
  const navigate = useNavigate();
  const companies = useCompanies();
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [kind, setKind] = useState<"existing" | "new">("existing");
  const [customers, setCustomers] = useState<CustomerOpt[]>([]);
  const [customerId, setCustomerId] = useState<number | "">("");
  const [site, setSite] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [onSite, setOnSite] = useState(false);
  const [geo, setGeo] = useState<GeoFix | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [photos, setPhotos] = useState<GeoPhoto[]>([]);
  const [voice, setVoice] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const isSales = me?.user.role === "sales";

  useEffect(() => {
    if (!companyId) {
      setCustomers([]);
      setCustomerId("");
      return;
    }
    api<CustomerOpt[]>("/api/v1/customers", { companyId })
      .then((rows) => setCustomers(rows))
      .catch(() => setCustomers([]));
  }, [companyId]);

  async function pin() {
    setGeoBusy(true);
    setError("");
    try {
      setGeo(await readGps());
    } catch (e) {
      setError(e instanceof Error ? e.message : "GPS failed");
    } finally {
      setGeoBusy(false);
    }
  }

  async function save() {
    setError("");
    if (!companyId) {
      setError("Pick which firm this is for");
      return;
    }
    if (kind === "existing" && !customerId) {
      setError("Select the existing client");
      return;
    }
    if (kind === "new" && !site.trim()) {
      setError("Enter the new client's business name");
      return;
    }
    setSaving(true);
    try {
      let fix = geo;
      if (onSite && !fix) {
        try {
          fix = await readGps();
          setGeo(fix);
        } catch {
          /* photos still save */
        }
      }
      const picked = customers.find((c) => c.id === Number(customerId));
      await api("/api/v1/visits", {
        method: "POST",
        companyId,
        body: JSON.stringify({
          company_id: companyId,
          client_kind: kind,
          customer_id: kind === "existing" ? Number(customerId) : null,
          site_name: kind === "existing" ? picked?.name || "Client" : site.trim(),
          contact_person: kind === "existing" ? picked?.contact_person : contact.trim() || null,
          phone: kind === "existing" ? picked?.phone : phone.trim() || null,
          notes: null,
          voice_url: voice,
          lat: onSite ? (fix?.lat ?? null) : null,
          lng: onSite ? (fix?.lng ?? null) : null,
          accuracy_m: onSite ? (fix?.accuracy_m ?? null) : null,
          photos: onSite ? photos.map((p) => ({ url: p.url, kind: "photo", lat: p.lat, lng: p.lng })) : [],
        }),
      });
      navigate({ to: "/" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={isSales ? "space-y-4" : "mx-auto max-w-md space-y-4"}>
      <div>
        <h1 className="font-[Fraunces,Georgia,serif] text-2xl">Log a visit</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Existing client becomes a new order. New client is created on the platform.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Which firm?</p>
        <CompanyPick companies={companies} value={companyId} onChange={setCompanyId} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setKind("existing")}
          className={cn(
            "min-h-16 rounded-2xl border text-sm font-semibold",
            kind === "existing" ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border bg-card",
          )}
        >
          Existing client
        </button>
        <button
          type="button"
          onClick={() => setKind("new")}
          className={cn(
            "min-h-16 rounded-2xl border text-sm font-semibold",
            kind === "new" ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border bg-card",
          )}
        >
          New client
        </button>
      </div>

      {kind === "existing" ? (
        <label className="block text-sm font-medium">
          Client
          <select
            className={`${fieldInput} mt-1`}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : "")}
            disabled={!companyId}
          >
            <option value="">{companyId ? "Select client…" : "Pick a firm first"}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.phone ? ` · ${c.phone}` : ""}
              </option>
            ))}
          </select>
          {companyId && !customers.length && (
            <span className="mt-1 block text-xs text-muted-foreground">No clients on this firm yet — use New client.</span>
          )}
        </label>
      ) : (
        <>
          <label className="block text-sm font-medium">
            Business name
            <input className={`${fieldInput} mt-1`} value={site} onChange={(e) => setSite(e.target.value)} placeholder="New customer name" />
          </label>
          <label className="block text-sm font-medium">
            Contact
            <input className={`${fieldInput} mt-1`} value={contact} onChange={(e) => setContact(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Phone
            <input className={`${fieldInput} mt-1`} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
        </>
      )}

      <VoiceNote url={voice} onChange={setVoice} companyId={companyId} />

      <label className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 text-sm">
        <input type="checkbox" checked={onSite} onChange={(e) => setOnSite(e.target.checked)} className="size-5" />
        I&apos;m on site — add GPS + proof photos
      </label>

      {onSite && (
        <div className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-3">
          <GpsPill geo={geo} onFix={() => void pin()} busy={geoBusy} />
          <GeoPhotos photos={photos} onAdd={(p) => setPhotos((list) => [...list, p])} companyId={companyId} />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="flex min-h-16 w-full items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-primary-foreground disabled:opacity-60"
      >
        {saving ? "Saving…" : kind === "existing" ? "Save as new order" : "Create client & visit"}
      </button>
    </div>
  );
}
