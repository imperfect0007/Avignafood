import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useCompany } from "@/lib/company-context";
import { approvals, byFirm, inr } from "@/lib/erp-data";
import { Badge, Kpi, PageHeader, Panel, Table, Td } from "@/components/erp/ui-bits";
import { ApprovalPopup, usePendingApprovals } from "@/components/erp/ApprovalPopup";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Sales & price approvals · Avighna ERP" },
      { name: "description", content: "Negotiated prices go to the owner for approval in the app instead of over phone calls." },
      { property: "og:title", content: "Sales & price approvals · Avighna ERP" },
      { property: "og:description", content: "Approve, reject or counter a negotiated rate in one tap." },
    ],
  }),
  component: Sales,
});

type ApprovalRow = (typeof approvals)[number];

function Sales() {
  const { firm } = useCompany();
  const rows = byFirm(approvals, firm);
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [popupOpen, setPopupOpen] = useState(false);
  const [selected, setSelected] = useState<ApprovalRow | null>(null);
  const { items, dismiss, canApprove, refresh } = usePendingApprovals();

  const pending = rows.filter((r) => r.status === "Pending" && !decisions[r.id]);

  function statusOf(a: ApprovalRow) {
    return decisions[a.id] ?? a.status;
  }

  function decideSelected(action: "Approved" | "Rejected") {
    if (!selected) return;
    setDecisions((d) => ({ ...d, [selected.id]: action }));
    setSelected(null);
  }

  return (
    <>
      <PageHeader
        title="Sales & price approvals"
        subtitle={
          canApprove
            ? "Negotiated rates land here — approve or decline without leaving the page."
            : "Negotiated rates await owner approval. You can track status here."
        }
        action={
          canApprove && items.length > 0 ? (
            <button
              type="button"
              onClick={() => setPopupOpen(true)}
              className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Review {items.length}
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Kpi label="Awaiting" value={String(pending.length || items.length)} tone={pending.length || items.length ? "warn" : "good"} />
        <Kpi
          label="Approved"
          value={String(rows.filter((r) => r.status === "Approved").length + Object.values(decisions).filter((d) => d === "Approved").length)}
          tone="good"
        />
        <Kpi label="Pipeline value" value={inr(rows.length * 1850000)} meta="Est. from quotes" />
      </div>

      <div className="mt-5 grid gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-2">
        {rows
          .filter((r) => r.status === "Pending")
          .map((a) => {
            const decided = decisions[a.id];
            return (
              <Panel key={a.id} title={a.customer} hint={`${a.raised} · ${a.salesperson}`}>
                <button type="button" className="w-full text-left" onClick={() => setSelected(a)}>
                  <dl className="grid grid-cols-2 gap-y-2 text-sm sm:gap-y-3">
                    <dt className="text-muted-foreground">Product</dt>
                    <dd className="truncate">{a.product}</dd>
                    <dt className="text-muted-foreground">Qty</dt>
                    <dd className="tabular-nums">{a.qty}</dd>
                    <dt className="text-muted-foreground">Asked</dt>
                    <dd className="tabular-nums font-medium">{inr(a.askedPrice)}</dd>
                    <dt className="text-muted-foreground">Floor</dt>
                    <dd className="tabular-nums">{inr(a.floorPrice)}</dd>
                  </dl>
                </button>
                {decided ? (
                  <p className="mt-3 text-sm sm:mt-4">
                    <Badge tone={decided === "Approved" ? "good" : decided === "Rejected" ? "bad" : "warn"}>{decided}</Badge>
                  </p>
                ) : canApprove ? (
                  <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelected(a)}
                      className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecisions((d) => ({ ...d, [a.id]: "Approved" }))}
                      className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-secondary"
                    >
                      Quick approve
                    </button>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground sm:mt-4">
                    <Badge tone="warn">Awaiting owner approval</Badge>
                  </p>
                )}
              </Panel>
            );
          })}
      </div>

      <Panel title="Recent decisions" hint="Tap a row" className="mt-5 sm:mt-6">
        <Table head={["Request", "Customer", "Product", "Qty", "Rate", "Rep", "Status"]}>
          {rows.map((a) => {
            const st = statusOf(a);
            return (
              <tr
                key={a.id}
                className="cursor-pointer hover:bg-secondary/40"
                onClick={() => setSelected(a)}
              >
                <Td className="font-medium">{a.id}</Td>
                <Td>{a.customer}</Td>
                <Td className="text-muted-foreground">{a.product}</Td>
                <Td className="tabular-nums">{a.qty}</Td>
                <Td className="tabular-nums">{inr(a.askedPrice)}</Td>
                <Td className="text-muted-foreground">{a.salesperson}</Td>
                <Td>
                  <Badge tone={st === "Approved" ? "good" : st === "Rejected" ? "bad" : "warn"}>{st}</Badge>
                </Td>
              </tr>
            );
          })}
        </Table>
      </Panel>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0 bg-foreground/40" aria-label="Close" onClick={() => setSelected(null)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="decision-title"
            className="relative z-10 w-full max-h-[88dvh] overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] sm:max-w-md sm:rounded-2xl"
          >
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
              {selected.id} · {selected.raised}
            </p>
            <h2 id="decision-title" className="mt-1 text-xl font-semibold tracking-tight">
              {selected.customer}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{selected.salesperson}</p>

            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-secondary/60 px-3 py-2.5">
                <dt className="text-xs text-muted-foreground">Product</dt>
                <dd className="mt-0.5 font-medium">{selected.product}</dd>
              </div>
              <div className="rounded-xl bg-secondary/60 px-3 py-2.5">
                <dt className="text-xs text-muted-foreground">Qty</dt>
                <dd className="mt-0.5 font-medium tabular-nums">{selected.qty}</dd>
              </div>
              <div className="rounded-xl bg-secondary/60 px-3 py-2.5">
                <dt className="text-xs text-muted-foreground">Asked</dt>
                <dd className="mt-0.5 font-medium tabular-nums">{inr(selected.askedPrice)}</dd>
              </div>
              <div className="rounded-xl bg-secondary/60 px-3 py-2.5">
                <dt className="text-xs text-muted-foreground">Floor</dt>
                <dd className="mt-0.5 font-medium tabular-nums">{inr(selected.floorPrice)}</dd>
              </div>
            </dl>

            {selected.askedPrice < selected.floorPrice && statusOf(selected) === "Pending" && (
              <p className="mt-3 text-xs text-destructive">
                {inr(selected.floorPrice - selected.askedPrice)} below floor
              </p>
            )}

            <div className="mt-4">
              <Badge tone={statusOf(selected) === "Approved" ? "good" : statusOf(selected) === "Rejected" ? "bad" : "warn"}>
                {statusOf(selected)}
              </Badge>
            </div>

            {canApprove && statusOf(selected) === "Pending" ? (
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => decideSelected("Approved")}
                  className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => decideSelected("Rejected")}
                  className="rounded-xl border border-border px-4 py-3 text-sm text-destructive"
                >
                  Decline
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="mt-5 w-full rounded-xl border border-border py-3 text-sm"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

      <ApprovalPopup
        open={popupOpen && items.length > 0}
        onClose={() => {
          setPopupOpen(false);
          refresh();
        }}
        items={items}
        onDecided={(key, action) => {
          dismiss(key);
          const mockId = key.startsWith("m-") ? key.slice(2) : null;
          if (mockId && action === "approve") setDecisions((d) => ({ ...d, [mockId]: "Approved" }));
          if (mockId && action === "reject") setDecisions((d) => ({ ...d, [mockId]: "Rejected" }));
        }}
      />
    </>
  );
}
