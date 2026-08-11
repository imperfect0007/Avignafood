"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Company = { id: number; legal_name: string; gstin: string | null; invoice_prefix: string; is_active: boolean };
type User = { id: number; email: string; full_name: string; role: string };

export default function SettingsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api<Company[]>("/api/v1/companies"), api<User[]>("/api/v1/users")])
      .then(([c, u]) => {
        setCompanies(c);
        setUsers(u);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="space-y-8">
      <h2 className="font-display text-xl">Settings</h2>
      {error && <p className="text-accent text-sm">{error}</p>}
      <section>
        <h3 className="font-medium mb-2">Companies</h3>
        <ul className="bg-white/70 border border-sand rounded-lg divide-y divide-sand/60">
          {companies.map((c) => (
            <li key={c.id} className="p-3 text-sm flex justify-between gap-2">
              <span>
                {c.legal_name} <span className="text-ink/50">({c.invoice_prefix})</span>
              </span>
              <span className="text-ink/60">{c.gstin}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="font-medium mb-2">Users</h3>
        <ul className="bg-white/70 border border-sand rounded-lg divide-y divide-sand/60">
          {users.map((u) => (
            <li key={u.id} className="p-3 text-sm flex justify-between gap-2">
              <span>
                {u.full_name} · {u.email}
              </span>
              <span className="text-ink/60">{u.role}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
