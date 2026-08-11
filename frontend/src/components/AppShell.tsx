"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { api, clearAuth, getCompanyId, Me } from "@/lib/api";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "CRM" },
  { href: "/customers", label: "Customers" },
  { href: "/products", label: "Products" },
  { href: "/inventory", label: "Stock" },
  { href: "/quotations", label: "Quotations" },
  { href: "/orders", label: "Orders" },
  { href: "/invoices", label: "Invoices" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [companies, setCompanies] = useState<{ id: number; legal_name: string }[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (pathname === "/login") return;
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    setCompanyId(getCompanyId());
    (async () => {
      try {
        const m = await api<Me>("/api/v1/auth/me");
        setMe(m);
        const cs = await api<{ id: number; legal_name: string }[]>("/api/v1/companies");
        setCompanies(cs);
        if (!getCompanyId() && cs.length) {
          localStorage.setItem("companyId", String(cs[0].id));
          setCompanyId(String(cs[0].id));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Auth failed");
        clearAuth();
        router.replace("/login");
      }
    })();
  }, [pathname, router]);

  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-56 bg-ink text-cream p-4 shrink-0">
        <div className="font-display text-xl tracking-wide mb-1">Avighnya</div>
        <div className="text-xs text-sand/80 mb-6">Foods ERP</div>
        <nav className="flex md:flex-col gap-1 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded text-sm whitespace-nowrap ${
                pathname.startsWith(item.href) ? "bg-leaf text-white" : "hover:bg-white/10"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          className="mt-8 text-xs text-sand/70 hover:text-white"
          onClick={() => {
            clearAuth();
            router.push("/login");
          }}
        >
          Log out
        </button>
      </aside>
      <main className="flex-1 p-4 md:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display text-2xl text-ink">Operations</h1>
            {me && (
              <p className="text-sm text-ink/60">
                {me.user.full_name} · {me.user.role}
              </p>
            )}
          </div>
          <label className="text-sm flex items-center gap-2">
            Company
            <select
              className="border border-sand bg-white rounded px-2 py-1"
              value={companyId || ""}
              onChange={(e) => {
                localStorage.setItem("companyId", e.target.value);
                setCompanyId(e.target.value);
                window.location.reload();
              }}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.legal_name}
                </option>
              ))}
            </select>
          </label>
        </header>
        {error && <p className="text-accent mb-4">{error}</p>}
        {children}
      </main>
    </div>
  );
}
