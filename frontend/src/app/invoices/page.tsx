"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Invoice = {
  id: number;
  number: string;
  status: string;
  total: string;
  amount_paid: string;
  outstanding: string;
};

export default function InvoicesPage() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const data = await api<Invoice[]>("/api/v1/invoices");
    setRows(data);
    if (!invoiceId && data[0]) {
      setInvoiceId(String(data[0].id));
      setAmount(String(data[0].outstanding));
    }
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onPay(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/v1/payments", {
        method: "POST",
        body: JSON.stringify({ invoice_id: Number(invoiceId), amount, method: "bank" }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl">Invoices & payments</h2>
      {error && <p className="text-accent text-sm">{error}</p>}
      <form onSubmit={onPay} className="flex flex-wrap gap-2 items-end bg-white/70 border border-sand p-4 rounded-lg">
        <label className="text-sm">
          Invoice
          <select
            className="block border border-sand rounded px-2 py-1 mt-1"
            value={invoiceId}
            onChange={(e) => {
              setInvoiceId(e.target.value);
              const inv = rows.find((r) => String(r.id) === e.target.value);
              if (inv) setAmount(String(inv.outstanding));
            }}
          >
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.number} · outstanding ₹{r.outstanding}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Amount
          <input className="block border border-sand rounded px-2 py-1 mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <button className="bg-leaf text-white px-4 py-2 rounded text-sm">Record payment</button>
      </form>
      <table className="w-full text-sm bg-white/70 border border-sand rounded-lg overflow-hidden">
        <thead className="bg-sand/40 text-left">
          <tr>
            <th className="p-3">Number</th>
            <th className="p-3">Status</th>
            <th className="p-3">Total</th>
            <th className="p-3">Paid</th>
            <th className="p-3">Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-sand/60">
              <td className="p-3">{r.number}</td>
              <td className="p-3">{r.status}</td>
              <td className="p-3">₹{r.total}</td>
              <td className="p-3">₹{r.amount_paid}</td>
              <td className="p-3">₹{r.outstanding}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
