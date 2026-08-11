import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Clock, CalendarDays } from "lucide-react";
import { useCompany } from "@/lib/company-context";
import { byFirm, visits } from "@/lib/erp-data";
import { Kpi, PageHeader, Panel } from "@/components/erp/ui-bits";

export const Route = createFileRoute("/field")({
  head: () => ({
    meta: [
      { title: "Field visits · Avighna ERP" },
      { name: "description", content: "GPS check-ins, meeting notes and follow-ups logged by salespeople from their phones." },
      { property: "og:title", content: "Field visits · Avighna ERP" },
      { property: "og:description", content: "See where the team went, how long they stayed and what happens next." },
    ],
  }),
  component: Field,
});

function Field() {
  const { firm } = useCompany();
  const rows = byFirm(visits, firm);

  return (
    <>
      <PageHeader title="Field visits" subtitle="Everything the mobile app captures: check-in, time spent, what the customer said, and the next step." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Visits today" value={String(rows.length)} meta="Across the field team" />
        <Kpi label="Average time on site" value="40 min" tone="good" />
        <Kpi label="Follow-ups scheduled" value={String(rows.length)} meta="All visits have a next date" />
      </div>

      <Panel title="Visit timeline" className="mt-6">
        <ol className="relative space-y-6 border-l border-border pl-6">
          {rows.map((v) => (
            <li key={v.id}>
              <span className="absolute -left-[7px] mt-1.5 size-3.5 rounded-full border-2 border-background bg-primary" />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-medium">{v.customer}</p>
                <span className="text-xs text-muted-foreground">{v.salesperson}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{v.outcome}</p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> GPS check-in {v.checkIn}</span>
                <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {v.duration}</span>
                <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" /> next {v.next}</span>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="On the phone" hint="What a salesperson sees" className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          {["Today's visit plan", "Check in / check out", "Notes, photos & voice", "Quote and follow-up"].map((s, i) => (
            <div key={s} className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Step {i + 1}</p>
              <p className="mt-1">{s}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Works offline; entries sync as soon as there is signal.</p>
      </Panel>
    </>
  );
}