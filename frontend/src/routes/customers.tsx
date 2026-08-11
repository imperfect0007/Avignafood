import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { useCompany } from "@/lib/company-context";
import { byFirm, customers as mockCustomers, inr } from "@/lib/erp-data";
import { Badge, Bar, Kpi, PageHeader, Panel, Table, Td } from "@/components/erp/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers · Avighna ERP" },
      { name: "description", content: "Recurring B2B buyers with credit terms, limits, outstanding balances and order history." },
      { property: "og:title", content: "Customers · Avighna ERP" },
      { property: "og:description", content: "Credit terms, limits and outstanding for every recurring buyer." },
    ],
  }),
  component: Customers,
});

type CustomerRow = {
  id: number | string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  credit_limit: number;
  credit_days: number;
  is_active: boolean;
  // display-only (mock / later invoices)
  industry: string;
  state: string;
  outstanding: number;
  lastOrder: string;
  health: "Good" | "Watch" | "Risk";
  revenue: number;
};

type ApiCustomer = {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  address: string | null;
  credit_limit: string | number;
  credit_days: number;
  is_active: boolean;
};

type FormState = {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  credit_limit: string;
  credit_days: string;
  is_active: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  gstin: "",
  address: "",
  credit_limit: "0",
  credit_days: "30",
  is_active: true,
});

const inputCls =
  "mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

function fromApi(c: ApiCustomer): CustomerRow {
  return {
    id: c.id,
    name: c.name,
    contact_person: c.contact_person || "",
    phone: c.phone || "",
    email: c.email || "",
    gstin: c.gstin || "",
    address: c.address || "",
    credit_limit: Number(c.credit_limit) || 0,
    credit_days: c.credit_days ?? 30,
    is_active: c.is_active,
    industry: "—",
    state: "—",
    outstanding: 0,
    lastOrder: "—",
    health: "Good",
    revenue: 0,
  };
}

function fromMock(firm: Parameters<typeof byFirm>[1]): CustomerRow[] {
  // ponytail: negative ids = local-only mock rows (PATCH skipped)
  return byFirm(mockCustomers, firm).map((c, i) => ({
    id: -(i + 1),
    name: c.name,
    contact_person: "",
    phone: "",
    email: "",
    gstin: "",
    address: "",
    credit_limit: c.creditLimit,
    credit_days: c.creditDays,
    is_active: true,
    industry: c.industry,
    state: c.state,
    outstanding: c.outstanding,
    lastOrder: c.lastOrder,
    health: c.health,
    revenue: c.revenue,
  }));
}

function Customers() {
  const { firm } = useCompany();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [fromApiFlag, setFromApiFlag] = useState(false);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api<ApiCustomer[]>("/api/v1/customers");
      if (data.length) {
        setRows(data.map(fromApi));
        setFromApiFlag(true);
        return;
      }
    } catch {
      /* fall through */
    }
    setRows(fromMock(firm));
    setFromApiFlag(false);
  }

  useEffect(() => {
    load();
  }, [firm]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setError("");
    setModal("add");
  }

  function openEdit(c: CustomerRow) {
    setEditing(c);
    setForm({
      name: c.name,
      contact_person: c.contact_person,
      phone: c.phone,
      email: c.email,
      gstin: c.gstin,
      address: c.address,
      credit_limit: String(c.credit_limit || 0),
      credit_days: String(c.credit_days || 30),
      is_active: c.is_active,
    });
    setError("");
    setModal("edit");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const body = {
      name: form.name.trim(),
      contact_person: form.contact_person.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      gstin: form.gstin.trim() || null,
      address: form.address.trim() || null,
      credit_limit: Number(form.credit_limit) || 0,
      credit_days: Number(form.credit_days) || 30,
      ...(modal === "edit" ? { is_active: form.is_active } : {}),
    };
    try {
      if (modal === "add") {
        try {
          await api("/api/v1/customers", { method: "POST", body: JSON.stringify(body) });
          await load();
        } catch {
          // offline / no company — keep local
          setRows((r) => [
            {
              id: Date.now(),
              name: body.name,
              contact_person: body.contact_person || "",
              phone: body.phone || "",
              email: body.email || "",
              gstin: body.gstin || "",
              address: body.address || "",
              credit_limit: body.credit_limit,
              credit_days: body.credit_days,
              is_active: true,
              industry: "—",
              state: "—",
              outstanding: 0,
              lastOrder: "—",
              health: "Good",
              revenue: 0,
            },
            ...r,
          ]);
        }
      } else if (editing) {
        const id = editing.id;
        if (typeof id === "number" && id > 0 && fromApiFlag) {
          await api(`/api/v1/customers/${id}`, { method: "PATCH", body: JSON.stringify(body) });
          await load();
        } else {
          setRows((list) =>
            list.map((c) =>
              c.id === id
                ? {
                    ...c,
                    name: body.name,
                    contact_person: body.contact_person || "",
                    phone: body.phone || "",
                    email: body.email || "",
                    gstin: body.gstin || "",
                    address: body.address || "",
                    credit_limit: body.credit_limit,
                    credit_days: body.credit_days,
                    is_active: form.is_active,
                  }
                : c,
            ),
          );
        }
      }
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const revenue = rows.reduce((a, c) => a + c.revenue, 0);
  const outstanding = rows.reduce((a, c) => a + c.outstanding, 0);

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Tap a row to edit · add buyers to the active company"
        action={
          <button
            type="button"
            onClick={openAdd}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            + Add customer
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Active accounts" value={String(rows.filter((c) => c.is_active).length)} meta="Recurring monthly buyers" />
        <Kpi label="Revenue" value={revenue ? inr(revenue) : "—"} meta="Financial year to date" />
        <Kpi label="Outstanding" value={outstanding ? inr(outstanding) : "—"} tone="warn" meta="Across all open invoices" />
      </div>

      <Panel title="Customer book" hint={`${rows.length} accounts · tap to edit`} className="mt-6">
        <Table head={["Customer", "Contact", "Terms", "Credit used", "Outstanding", "Health"]}>
          {rows.map((c) => {
            const used = c.credit_limit > 0 ? (c.outstanding / c.credit_limit) * 100 : 0;
            return (
              <tr
                key={String(c.id)}
                className="cursor-pointer hover:bg-secondary/40"
                onClick={() => openEdit(c)}
              >
                <Td>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {[c.industry !== "—" ? c.industry : null, c.state !== "—" ? c.state : null, c.gstin || null]
                      .filter(Boolean)
                      .join(" · ") || (c.is_active ? "Active" : "Inactive")}
                  </p>
                </Td>
                <Td className="text-muted-foreground">
                  {[c.contact_person, c.phone].filter(Boolean).join(" · ") || "—"}
                </Td>
                <Td className="tabular-nums">{c.credit_days} days</Td>
                <Td>
                  <Bar
                    value={used}
                    tone={used > 85 ? "destructive" : used > 60 ? "warning" : "primary"}
                  />
                </Td>
                <Td className="tabular-nums">{c.outstanding ? inr(c.outstanding) : "—"}</Td>
                <Td>
                  <Badge tone={c.health === "Good" ? "good" : c.health === "Watch" ? "warn" : "bad"}>
                    {c.is_active ? c.health : "Inactive"}
                  </Badge>
                </Td>
              </tr>
            );
          })}
        </Table>
        {!rows.length && <p className="py-8 text-center text-sm text-muted-foreground">No customers yet.</p>}
      </Panel>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button type="button" className="absolute inset-0 bg-foreground/40" aria-label="Close" onClick={() => setModal(null)} />
          <form
            onSubmit={save}
            className="relative z-10 w-full max-h-[88dvh] overflow-y-auto rounded-t-2xl border border-border bg-card p-5 sm:max-w-md sm:rounded-2xl"
          >
            <h2 className="text-lg font-semibold">{modal === "add" ? "Add customer" : "Edit customer"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {modal === "add" ? "Saved to the active company." : editing?.name}
            </p>

            <div className="mt-4 space-y-3">
              {(
                [
                  ["name", "Business name", "text", true],
                  ["contact_person", "Contact person", "text", false],
                  ["phone", "Phone", "tel", false],
                  ["email", "Email", "email", false],
                  ["gstin", "GSTIN", "text", false],
                  ["address", "Address", "text", false],
                  ["credit_limit", "Credit limit (₹)", "number", false],
                  ["credit_days", "Credit days", "number", false],
                ] as const
              ).map(([key, label, type, required]) => (
                <label key={key} className="block text-sm text-muted-foreground">
                  {label}
                  <input
                    required={required}
                    type={type}
                    className={inputCls}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </label>
              ))}
              {modal === "edit" && (
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    className="size-4 rounded border-border"
                  />
                  Active account
                </label>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="submit"
                disabled={busy}
                className={cn(
                  "rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground",
                  busy && "opacity-60",
                )}
              >
                {busy ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-border py-2.5 text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
