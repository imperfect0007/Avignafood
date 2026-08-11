"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, setAuth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
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
      setAuth(data.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md bg-white/80 backdrop-blur border border-sand shadow-sm p-8 rounded-lg"
      >
        <div className="font-display text-3xl text-leaf mb-1">Avighnya Foods</div>
        <p className="text-sm text-ink/60 mb-6">Sign in to manage distribution</p>
        {error && <p className="text-sm text-accent mb-3">{error}</p>}
        <label className="block text-sm mb-3">
          Email
          <input
            className="mt-1 w-full border border-sand rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </label>
        <label className="block text-sm mb-6">
          Password
          <input
            className="mt-1 w-full border border-sand rounded px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-leaf text-white py-2.5 rounded hover:bg-leaf/90 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
