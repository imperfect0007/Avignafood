"use client";

import { FormEvent, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Lead = {
  id: number;
  business_name: string;
  phone: string | null;
  status: string;
  lead_type: string | null;
  customer_id: number | null;
};

const STATUSES = ["new", "contacted", "qualified", "visit_required", "quotation", "negotiation", "won", "lost"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setLeads(await api<Lead[]>("/api/v1/leads"));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/v1/leads", {
        method: "POST",
        body: JSON.stringify({ business_name: name, phone, lead_type: "wholesale", source: "manual" }),
      });
      setName("");
      setPhone("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl">Leads / CRM</h2>
      {error && <p className="text-accent text-sm">{error}</p>}
      {msg && <p className="text-leaf text-sm">{msg}</p>}
      <form onSubmit={onCreate} className="flex flex-wrap gap-2 items-end bg-white/70 border border-sand p-4 rounded-lg">
        <label className="text-sm">
          Business
          <input className="block border border-sand rounded px-2 py-1 mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="text-sm">
          Phone
          <input className="block border border-sand rounded px-2 py-1 mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <button className="bg-leaf text-white px-4 py-2 rounded text-sm">Add lead</button>
      </form>
      <div className="overflow-x-auto bg-white/70 border border-sand rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-sand/40 text-left">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Business</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr key={l.id} className="border-t border-sand/60">
                <td className="p-3">{l.id}</td>
                <td className="p-3">{l.business_name}</td>
                <td className="p-3">{l.phone}</td>
                <td className="p-3">
                  <select
                    className="border border-sand rounded px-1"
                    value={l.status}
                    onChange={async (e) => {
                      try {
                        await api(`/api/v1/leads/${l.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ status: e.target.value }),
                        });
                        await load();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Failed");
                      }
                    }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3">
                  {!l.customer_id && (
                    <button
                      className="text-leaf underline"
                      onClick={async () => {
                        try {
                          const c = await api<{ id: number }>(`/api/v1/leads/${l.id}/convert`, { method: "POST" });
                          setMsg(`Converted to customer #${c.id}`);
                          await load();
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Failed");
                        }
                      }}
                    >
                      Convert
                    </button>
                  )}
                  {l.customer_id && <span className="text-ink/50">Customer #{l.customer_id}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
