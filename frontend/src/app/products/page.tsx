"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Product = { id: number; sku: string; name: string; unit: string; base_price: string; gst_rate: string };

export default function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("100");
  const [error, setError] = useState("");

  async function load() {
    setRows(await api<Product[]>("/api/v1/products"));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/v1/products", {
        method: "POST",
        body: JSON.stringify({ sku, name, unit: "KG", base_price: price, gst_rate: "5" }),
      });
      setSku("");
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl">Products</h2>
      {error && <p className="text-accent text-sm">{error}</p>}
      <form onSubmit={onCreate} className="flex flex-wrap gap-2 items-end bg-white/70 border border-sand p-4 rounded-lg">
        <label className="text-sm">
          SKU
          <input className="block border border-sand rounded px-2 py-1 mt-1" value={sku} onChange={(e) => setSku(e.target.value)} required />
        </label>
        <label className="text-sm">
          Name
          <input className="block border border-sand rounded px-2 py-1 mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="text-sm">
          Base price
          <input className="block border border-sand rounded px-2 py-1 mt-1" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </label>
        <button className="bg-leaf text-white px-4 py-2 rounded text-sm">Add</button>
      </form>
      <table className="w-full text-sm bg-white/70 border border-sand rounded-lg overflow-hidden">
        <thead className="bg-sand/40 text-left">
          <tr>
            <th className="p-3">SKU</th>
            <th className="p-3">Name</th>
            <th className="p-3">Unit</th>
            <th className="p-3">Base</th>
            <th className="p-3">GST%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-sand/60">
              <td className="p-3">{r.sku}</td>
              <td className="p-3">{r.name}</td>
              <td className="p-3">{r.unit}</td>
              <td className="p-3">₹{r.base_price}</td>
              <td className="p-3">{r.gst_rate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
