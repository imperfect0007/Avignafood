"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Customer = { id: number; name: string; phone: string | null; gstin: string | null; credit_days: number };

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setRows(await api<Customer[]>("/api/v1/customers"));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/v1/customers", { method: "POST", body: JSON.stringify({ name, phone }) });
      setName("");
      setPhone("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl">Customers</h2>
      {error && <p className="text-accent text-sm">{error}</p>}
      <form onSubmit={onCreate} className="flex flex-wrap gap-2 items-end bg-white/70 border border-sand p-4 rounded-lg">
        <label className="text-sm">
          Name
          <input className="block border border-sand rounded px-2 py-1 mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="text-sm">
          Phone
          <input className="block border border-sand rounded px-2 py-1 mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <button className="bg-leaf text-white px-4 py-2 rounded text-sm">Add</button>
      </form>
      <table className="w-full text-sm bg-white/70 border border-sand rounded-lg overflow-hidden">
        <thead className="bg-sand/40 text-left">
          <tr>
            <th className="p-3">ID</th>
            <th className="p-3">Name</th>
            <th className="p-3">Phone</th>
            <th className="p-3">Credit days</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-sand/60">
              <td className="p-3">{r.id}</td>
              <td className="p-3">{r.name}</td>
              <td className="p-3">{r.phone}</td>
              <td className="p-3">{r.credit_days}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
