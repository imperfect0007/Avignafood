import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useCompany } from "@/lib/company-context";
import { useMe } from "@/lib/me-context";
import { byFirm, firms, inr, leads as mockLeads } from "@/lib/erp-data";
import { Badge, PageHeader } from "@/components/erp/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Leads · Avighna ERP" },
      { name: "description", content: "Organization-wide lead pipeline across companies." },
      { property: "og:title", content: "Leads · Avighna ERP" },
    ],
  }),
  component: Leads,
});

type LeadRow = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  source: string;
  type: string;
  requirement: string;
  value: number;
  stage: string;
  assigned: string;
  company: string;
};

type ApiLead = {
  id: number;
  business_name: string;
  contact_person: string | null;
  phone: string | null;
  source: string | null;
  lead_type: string | null;
  product_requirement: string | null;
  quantity: string | null;
  estimated_value: string | number | null;
  status: string;
  assigned_to_id: number | null;
  company_id: number;
};

const PIPELINE = ["new", "contacted", "qualified", "visit_required", "quotation", "negotiation", "won", "lost"] as const;

const STAGE_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  visit_required: "Visit",
  quotation: "Quote",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

const MOCK_STAGE: Record<string, string> = {
  New: "new",
  Contacted: "contacted",
  Meeting: "visit_required",
  "Follow-up": "qualified",
  Negotiation: "negotiation",
  Won: "won",
  Lost: "lost",
};

const MOCK_VALUE: Record<string, number> = {
  "LD-1041": 540000,
  "LD-1040": 320000,
  "LD-1039": 680000,
  "LD-1038": 150000,
  "LD-1037": 40000,
  "LD-1036": 900000,
};

function stageTone(stage: string): "good" | "bad" | "warn" | "neutral" {
  if (stage === "won") return "good";
  if (stage === "lost") return "bad";
  if (stage === "negotiation" || stage === "quotation") return "warn";
  return "neutral";
}

function mockAsRows(firm: Parameters<typeof byFirm>[1]): LeadRow[] {
  return byFirm(mockLeads, firm).map((l) => ({
    id: l.id,
    name: l.company,
    contact: l.contact,
    phone: "—",
    source: l.source,
    type: l.type,
    requirement: l.requirement,
    value: MOCK_VALUE[l.id] || 0,
    stage: MOCK_STAGE[l.stage] || "new",
    assigned: l.stage === "New" ? "Unassigned" : "Sales",
    company: firms.find((f) => f.id === l.firm)?.short || l.firm,
  }));
}

function apiAsRows(rows: ApiLead[]): LeadRow[] {
  return rows.map((l) => ({
    id: `LD-${l.id}`,
    name: l.business_name,
    contact: l.contact_person || "—",
    phone: l.phone || "—",
    source: l.source || "—",
    type: l.lead_type || "—",
    requirement: [l.product_requirement, l.quantity].filter(Boolean).join(" · ") || "—",
    value: Number(l.estimated_value) || 0,
    stage: l.status,
    assigned: l.assigned_to_id ? `#${l.assigned_to_id}` : "Unassigned",
    company: firms.find((f) => f.companyId === l.company_id)?.short || `Co ${l.company_id}`,
  }));
}

const inputCls =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function SalesGoesToVisit() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/field" });
  }, [navigate]);
  return null;
}

function Leads() {
  const { me } = useMe();
  if (me?.user.role === "sales") return <SalesGoesToVisit />;
  return <LeadsDesk />;
}

function LeadsDesk() {
  const { firm } = useCompany();
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [source, setSource] = useState("all");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    business_name: "",
    contact_person: "",
    phone: "",
    source: "WhatsApp",
    lead_type: "wholesale",
    product_requirement: "",
    estimated_value: "",
  });

  async function load() {
    try {
      const data = await api<ApiLead[]>("/api/v1/leads");
      setRows(data.length ? apiAsRows(data) : mockAsRows(firm));
    } catch {
      setRows(mockAsRows(firm));
    }
  }

  useEffect(() => {
    load();
  }, [firm]);

  const sources = useMemo(
    () => Array.from(new Set(rows.map((r) => r.source).filter((s) => s && s !== "—"))),
    [rows],
  );

  const filtered = rows.filter((r) => {
    if (stage !== "all" && r.stage !== stage) return false;
    if (source !== "all" && r.source !== source) return false;
    if (!q.trim()) return true;
    return `${r.id} ${r.name} ${r.contact} ${r.phone} ${r.requirement}`.toLowerCase().includes(q.trim().toLowerCase());
  });

  // ponytail: one pass for stage tallies instead of re-filtering per stage
  const stageCounts = useMemo(() => {
    const bag = new Map<string, { n: number; value: number }>();
    for (const r of rows) {
      const cur = bag.get(r.stage) ?? { n: 0, value: 0 };
      cur.n += 1;
      cur.value += r.value;
      bag.set(r.stage, cur);
    }
    return PIPELINE.map((key) => {
      const t = bag.get(key) ?? { n: 0, value: 0 };
      return { key, label: STAGE_LABEL[key], ...t };
    });
  }, [rows]);

  const total = rows.length;
  const nAt = (k: string) => stageCounts.find((s) => s.key === k)?.n ?? 0;
  const pipelineValue = rows.filter((r) => r.stage !== "won" && r.stage !== "lost").reduce((s, r) => s + r.value, 0);
  const unassigned = rows.filter((r) => r.assigned === "Unassigned").length;
  const wonN = nAt("won");
  const winRate = total ? Math.round((wonN / total) * 100) : 0;

  async function createLead(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/v1/leads", {
        method: "POST",
        body: JSON.stringify({
          business_name: form.business_name,
          contact_person: form.contact_person || null,
          phone: form.phone || null,
          source: form.source || null,
          lead_type: form.lead_type || null,
          product_requirement: form.product_requirement || null,
          estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
        }),
      });
      setAdding(false);
      setForm({
        business_name: "",
        contact_person: "",
        phone: "",
        source: "WhatsApp",
        lead_type: "wholesale",
        product_requirement: "",
        estimated_value: "",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create lead");
    }
  }

  function contactLine(l: LeadRow) {
    return [l.contact !== "—" ? l.contact : null, l.phone !== "—" ? l.phone : null].filter(Boolean).join(" · ") || "—";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader
        title="Leads"
        subtitle={`${total} total · ${pipelineValue ? inr(pipelineValue) + " in pipeline" : "pipeline empty"} · ${winRate}% won`}
        action={
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            + Add lead
          </button>
        }
      />

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3 sm:p-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search leads…"
            className={cn(inputCls, "min-w-[12rem] flex-1")}
          />
          <select value={source} onChange={(e) => setSource(e.target.value)} className={inputCls}>
            <option value="all">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {(stage !== "all" || source !== "all" || q) && (
            <button
              type="button"
              className="rounded-lg border border-border px-2.5 py-2 text-sm text-muted-foreground hover:bg-secondary"
              onClick={() => {
                setStage("all");
                setSource("all");
                setQ("");
              }}
            >
              Clear
            </button>
          )}
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {filtered.length}/{total}
          </span>
        </div>

        {/* stage tabs — full-width, larger */}
        <div className="grid w-full grid-cols-3 border-b border-border sm:grid-cols-5 lg:grid-cols-9">
          <button
            type="button"
            onClick={() => setStage("all")}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 border-b-2 px-1 py-3.5 transition-colors sm:py-4",
              stage === "all"
                ? "border-primary bg-primary-soft/30 text-foreground"
                : "border-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
            )}
          >
            <span className="text-[0.65rem] font-medium uppercase tracking-[0.08em] sm:text-xs">All</span>
            <span className="text-xl font-semibold tabular-nums leading-none sm:text-2xl">{total}</span>
          </button>
          {stageCounts.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setStage(stage === s.key ? "all" : s.key)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 border-b-2 px-1 py-3.5 transition-colors sm:py-4",
                stage === s.key
                  ? "border-primary bg-primary-soft/30 text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                s.key === "won" && s.n > 0 && stage !== s.key && "text-success",
                s.key === "lost" && s.n > 0 && stage !== s.key && "text-destructive",
              )}
            >
              <span className="text-[0.65rem] font-medium uppercase tracking-[0.08em] sm:text-xs">{s.label}</span>
              <span className="text-xl font-semibold tabular-nums leading-none sm:text-2xl">{s.n}</span>
            </button>
          ))}
        </div>

        {/* distribution bar */}
        {total > 0 && (
          <div className="flex h-1.5 w-full overflow-hidden bg-muted">
            {stageCounts.map((s) =>
              s.n ? (
                <div
                  key={s.key}
                  title={`${s.label}: ${s.n}`}
                  className={cn(
                    s.key === "won" ? "bg-success" : s.key === "lost" ? "bg-destructive/70" : "bg-primary",
                    s.key === "new" && "bg-primary/40",
                    s.key === "negotiation" && "bg-warning",
                  )}
                  style={{ width: `${(s.n / total) * 100}%` }}
                />
              ) : null,
            )}
          </div>
        )}

        {unassigned > 0 && (
          <p className="border-b border-border bg-primary-soft/30 px-3 py-2 text-xs text-foreground sm:px-4">
            {unassigned} unassigned — open a lead to assign.
          </p>
        )}

        <ul className="divide-y divide-border sm:hidden">
          {filtered.map((l) => (
            <li key={l.id} className="px-3 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{l.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {l.id} · {contactLine(l)}
                  </p>
                </div>
                <Badge tone={stageTone(l.stage)}>{STAGE_LABEL[l.stage] || l.stage}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {l.source} · <span className="tabular-nums text-foreground">{l.value ? inr(l.value) : "—"}</span> · {l.assigned}
              </p>
            </li>
          ))}
          {!filtered.length && <li className="px-3 py-10 text-center text-sm text-muted-foreground">No leads match.</li>}
        </ul>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-left text-[0.65rem] uppercase tracking-[0.08em] text-muted-foreground">
                {["ID", "Business", "Contact", "Source", "Stage", "Value", "Assigned"].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium first:pl-4 last:pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                  <td className="px-3 py-2.5 pl-4 font-medium tabular-nums">{l.id}</td>
                  <td className="max-w-[14rem] px-3 py-2.5">
                    <p className="truncate font-medium">{l.name}</p>
                    {l.requirement !== "—" && (
                      <p className="truncate text-xs text-muted-foreground">{l.requirement}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{contactLine(l)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{l.source}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={stageTone(l.stage)}>{STAGE_LABEL[l.stage] || l.stage}</Badge>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{l.value ? inr(l.value) : "—"}</td>
                  <td className="px-3 py-2.5 pr-4 text-muted-foreground">{l.assigned}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <p className="py-10 text-center text-sm text-muted-foreground">No leads match.</p>}
        </div>
      </section>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0 bg-foreground/40" aria-label="Close" onClick={() => setAdding(false)} />
          <form
            onSubmit={createLead}
            className="relative z-10 w-full max-h-[88dvh] overflow-y-auto rounded-t-2xl border border-border bg-card p-5 sm:max-w-md sm:rounded-2xl"
          >
            <h2 className="text-lg font-semibold">Add lead</h2>
            <div className="mt-4 space-y-3">
              {(
                [
                  ["business_name", "Business name", "text", true],
                  ["contact_person", "Contact person", "text", false],
                  ["phone", "Phone", "tel", false],
                  ["product_requirement", "Requirement", "text", false],
                  ["estimated_value", "Est. value (₹)", "number", false],
                ] as const
              ).map(([key, label, type, required]) => (
                <label key={key} className="block text-sm text-muted-foreground">
                  {label}
                  <input
                    required={required}
                    type={type}
                    className={cn(inputCls, "mt-1 w-full text-foreground")}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </label>
              ))}
              <label className="block text-sm text-muted-foreground">
                Source
                <select
                  className={cn(inputCls, "mt-1 w-full")}
                  value={form.source}
                  onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                >
                  <option>WhatsApp</option>
                  <option>Referral</option>
                  <option>Field visit</option>
                  <option>Website</option>
                  <option>Other</option>
                </select>
              </label>
            </div>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="submit" className="rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground">
                Save
              </button>
              <button type="button" onClick={() => setAdding(false)} className="rounded-lg border border-border py-2.5 text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
