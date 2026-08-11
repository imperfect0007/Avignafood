"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Dash = {
  today_sales: string;
  month_sales: string;
  outstanding: string;
  open_orders: number;
  active_customers: number;
  open_leads: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Dash>("/api/v1/dashboard")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const cards = data
    ? [
        { label: "Today sales", value: `₹${data.today_sales}` },
        { label: "Month sales", value: `₹${data.month_sales}` },
        { label: "Outstanding", value: `₹${data.outstanding}` },
        { label: "Open orders", value: String(data.open_orders) },
        { label: "Customers", value: String(data.active_customers) },
        { label: "Open leads", value: String(data.open_leads) },
      ]
    : [];

  return (
    <div>
      <h2 className="font-display text-xl mb-4">Owner dashboard</h2>
      {error && <p className="text-accent">{error}</p>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white/70 border border-sand rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-ink/50">{c.label}</div>
            <div className="text-2xl font-display mt-1">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
