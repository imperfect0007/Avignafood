"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Customer = { id: number; name: string };
type Product = { id: number; name: string; base_price: string };
type Quotation = {
  id: number;
  customer_id: number;
  status: string;
  needs_price_approval: boolean;
  lines: { product_id: number; quantity: number; unit_price: number }[];
};

export default function QuotationsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rows, setRows] = useState<Quotation[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("100");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [c, p, q] = await Promise.all([
      api<Customer[]>("/api/v1/customers"),
      api<Product[]>("/api/v1/products"),
      api<Quotation[]>("/api/v1/quotations"),
    ]);
    setCustomers(c);
    setProducts(p);
    setRows(q);
    if (!customerId && c[0]) setCustomerId(String(c[0].id));
    if (!productId && p[0]) {
      setProductId(String(p[0].id));
      setPrice(String(p[0].base_price));
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/v1/quotations", {
        method: "POST",
        body: JSON.stringify({
          customer_id: Number(customerId),
          lines: [{ product_id: Number(productId), quantity: qty, unit_price: price }],
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl">Quotations</h2>
      {error && <p className="text-accent text-sm">{error}</p>}
      <form onSubmit={onCreate} className="flex flex-wrap gap-2 items-end bg-white/70 border border-sand p-4 rounded-lg">
        <label className="text-sm">
          Customer
          <select className="block border border-sand rounded px-2 py-1 mt-1" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Product
          <select
            className="block border border-sand rounded px-2 py-1 mt-1"
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              const p = products.find((x) => String(x.id) === e.target.value);
              if (p) setPrice(String(p.base_price));
            }}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Qty
          <input className="block border border-sand rounded px-2 py-1 mt-1 w-24" value={qty} onChange={(e) => setQty(e.target.value)} />
        </label>
        <label className="text-sm">
          Unit price
          <input className="block border border-sand rounded px-2 py-1 mt-1 w-28" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <button className="bg-leaf text-white px-4 py-2 rounded text-sm">Create</button>
      </form>
      <table className="w-full text-sm bg-white/70 border border-sand rounded-lg overflow-hidden">
        <thead className="bg-sand/40 text-left">
          <tr>
            <th className="p-3">ID</th>
            <th className="p-3">Customer</th>
            <th className="p-3">Status</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-sand/60">
              <td className="p-3">{r.id}</td>
              <td className="p-3">#{r.customer_id}</td>
              <td className="p-3">
                {r.status}
                {r.needs_price_approval ? " (price)" : ""}
              </td>
              <td className="p-3 space-x-2">
                {r.status === "pending_approval" && (
                  <button
                    className="text-leaf underline"
                    onClick={async () => {
                      await api(`/api/v1/quotations/${r.id}/approve`, { method: "POST" });
                      await load();
                    }}
                  >
                    Approve
                  </button>
                )}
                {(r.status === "approved" || r.status === "accepted") && (
                  <button
                    className="text-leaf underline"
                    onClick={async () => {
                      await api(`/api/v1/quotations/${r.id}/accept`, { method: "POST" });
                      await load();
                    }}
                  >
                    Accept
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
