import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api, clearAuth } from "@/lib/api";
import { useMe } from "@/lib/me-context";
import { nameInitials } from "@/lib/format";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [{ title: "Profile · Avighna" }],
  }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const { me, refresh } = useMe();
  const name = me?.user.full_name || "User";
  const email = me?.user.email || "";
  const [profileName, setProfileName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setProfileName(me?.user.full_name || "");
    setPhone(me?.user.phone || "");
  }, [me?.user.full_name, me?.user.phone]);

  async function save() {
    setError("");
    const next = profileName.trim();
    if (!next) {
      setError("Enter your name");
      return;
    }
    setSaving(true);
    try {
      await api("/api/v1/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ full_name: next, phone: phone.trim() || null }),
      });
      await refresh();
      navigate({ to: "/" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
          {nameInitials(name) || "S"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name}</p>
          {email ? <p className="truncate text-sm text-muted-foreground">{email}</p> : null}
          <p className="text-xs capitalize text-muted-foreground">{me?.user.role?.replaceAll("_", " ") || "User"}</p>
        </div>
        <button
          type="button"
          aria-label="Close profile"
          onClick={() => navigate({ to: "/" })}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border"
        >
          <X className="size-5" />
        </button>
      </div>

      <label className="block text-sm font-medium">
        Name
        <input
          type="text"
          autoComplete="name"
          placeholder="Your name"
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      </label>
      <label className="block text-sm font-medium">
        Mobile number
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Enter mobile number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="flex min-h-12 w-full items-center justify-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save profile"}
      </button>
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-border text-sm font-medium"
        onClick={() => {
          clearAuth();
          navigate({ to: "/login" });
        }}
      >
        Log out
      </button>
    </div>
  );
}
