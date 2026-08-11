import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { API_URL, setAuth, api } from "@/lib/api";
import { firms } from "@/lib/erp-data";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@avighnya.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = new URLSearchParams();
      body.set("username", email);
      body.set("password", password);
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      setAuth(data.access_token, firms[0].companyId);
      // Prefer first company from API when available
      try {
        const companies = await api<{ id: number }[]>("/api/v1/companies");
        if (companies[0]) localStorage.setItem("companyId", String(companies[0].id));
      } catch {
        /* keep default */
      }
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
        <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
          {firms.filter((f) => f.logo).map((f) => (
            <img key={f.id} src={f.logo!} alt={f.short} className="h-12 w-auto max-w-[100px] object-contain rounded-md border border-border bg-background px-2 py-1" />
          ))}
        </div>
        <div className="mb-1 text-center font-[Fraunces,Georgia,serif] text-3xl tracking-tight">Avighna Group</div>
        <p className="mb-6 text-center text-sm text-muted-foreground">Sign in — UI follows the company you pick</p>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        <label className="mb-3 block text-sm text-muted-foreground">
          Email
          <input
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </label>
        <label className="mb-6 block text-sm text-muted-foreground">
          Password
          <input
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
