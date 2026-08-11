import { inr } from "@/lib/erp-data";

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function money(v: string | number) {
  return inr(Number(v) || 0);
}
