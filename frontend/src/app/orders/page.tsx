"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Quotation = { id: number; customer_id: number; status: string };
type Order = { id: number; customer_id: number; status: string; quotation_id: number | null };

export default function OrdersPage() {
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [quoteId, setQuoteId] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [q, o] = await Promise.all([
      api<Quotation[]>("/api/v1/quotations"),
      api<Order[]>("/api/v1/sales-orders"),
    ]);
    setQuotes(q.filter((x) => x.status === "accepted" || x.status === "approved"));
    setOrders(o);
    if (!quoteId && q[0]) setQuoteId(String(q[0].id));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const q = quotes.find((x) => String(x.id) === quoteId) || (await api<Quotation[]>(`/api/v1/quotations`)).find((x) => String(x.id) === quoteId);
    if (!q) return;
    try {
      await api("/api/v1/sales-orders", {
        method: "POST",
        body: JSON.stringify({ customer_id: q.customer_id, quotation_id: q.id, lines: [] }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl">Sales orders</h2>
      {error && <p className="text-accent text-sm">{error}</p>}
      <form onSubmit={onCreate} className="flex flex-wrap gap-2 items-end bg-white/70 border border-sand p-4 rounded-lg">
        <label className="text-sm">
          From quotation
          <select className="block border border-sand rounded px-2 py-1 mt-1" value={quoteId} onChange={(e) => setQuoteId(e.target.value)}>
            {quotes.map((q) => (
              <option key={q.id} value={q.id}>
                Q#{q.id} customer #{q.customer_id} ({q.status})
              </option>
            ))}
          </select>
        </label>
        <button className="bg-leaf text-white px-4 py-2 rounded text-sm">Create SO</button>
      </form>
      <table className="w-full text-sm bg-white/70 border border-sand rounded-lg overflow-hidden">
        <thead className="bg-sand/40 text-left">
          <tr>
            <th className="p-3">ID</th>
            <th className="p-3">Customer</th>
            <th className="p-3">Quote</th>
            <th className="p-3">Status</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t border-sand/60">
              <td className="p-3">{o.id}</td>
              <td className="p-3">#{o.customer_id}</td>
              <td className="p-3">{o.quotation_id ? `#${o.quotation_id}` : "—"}</td>
              <td className="p-3">{o.status}</td>
              <td className="p-3 space-x-2">
                {o.status === "draft" && (
                  <button
                    className="text-leaf underline"
                    onClick={async () => {
                      try {
                        await api(`/api/v1/sales-orders/${o.id}/confirm`, { method: "POST" });
                        await load();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed");
                      }
                    }}
                  >
                    Confirm (stock check)
                  </button>
                )}
                {o.status === "confirmed" && (
                  <button
                    className="text-leaf underline"
                    onClick={async () => {
                      try {
                        await api(`/api/v1/invoices/from-order/${o.id}`, { method: "POST" });
                        await load();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed");
                      }
                    }}
                  >
                    Create invoice
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
