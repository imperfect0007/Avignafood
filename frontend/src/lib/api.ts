export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type Me = {
  user: {
    id: number;
    email: string;
    full_name: string;
    organization_id: number;
    role: string;
    company_ids: number[];
  };
  permissions: string[];
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function getCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("companyId");
}

export function setAuth(token: string, companyId?: number) {
  localStorage.setItem("token", token);
  if (companyId != null) localStorage.setItem("companyId", String(companyId));
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("companyId");
}

export async function api<T>(
  path: string,
  options: RequestInit & { form?: boolean } = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const companyId = getCompanyId();
  if (companyId) headers.set("X-Company-Id", companyId);
  if (options.body && !options.form && !(options.body instanceof URLSearchParams)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
