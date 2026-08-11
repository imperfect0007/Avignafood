"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Product = { id: number; name: string; sku: string };
type Stock = { id: number; product_id: number; warehouse_id: number; quantity: string };

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("1000");
  const [error, setError] = useState("");

  async function load() {
    const [p, s] = await Promise.all([
      api<Product[]>("/api/v1/products"),
      api<Stock[]>("/api/v1/inventory/stock"),
    ]);
    setProducts(p);
    setStock(s);
    if (!productId && p[0]) setProductId(String(p[0].id));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onSet(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/v1/inventory/stock", {
        method: "POST",
        body: JSON.stringify({ product_id: Number(productId), quantity: qty }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  const nameOf = (id: number) => products.find((p) => p.id === id)?.name || `#${id}`;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl">Opening stock</h2>
      {error && <p className="text-accent text-sm">{error}</p>}
      <form onSubmit={onSet} className="flex flex-wrap gap-2 items-end bg-white/70 border border-sand p-4 rounded-lg">
        <label className="text-sm">
          Product
          <select className="block border border-sand rounded px-2 py-1 mt-1" value={productId} onChange={(e) => setProductId(e.target.value)}>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} — {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Quantity
          <input className="block border border-sand rounded px-2 py-1 mt-1" value={qty} onChange={(e) => setQty(e.target.value)} required />
        </label>
        <button className="bg-leaf text-white px-4 py-2 rounded text-sm">Set stock</button>
      </form>
      <table className="w-full text-sm bg-white/70 border border-sand rounded-lg overflow-hidden">
        <thead className="bg-sand/40 text-left">
          <tr>
            <th className="p-3">Product</th>
            <th className="p-3">Warehouse</th>
            <th className="p-3">Qty</th>
          </tr>
        </thead>
        <tbody>
          {stock.map((s) => (
            <tr key={s.id} className="border-t border-sand/60">
              <td className="p-3">{nameOf(s.product_id)}</td>
              <td className="p-3">#{s.warehouse_id}</td>
              <td className="p-3">{s.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
