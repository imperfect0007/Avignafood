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

export function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function telHref(phone: string) {
  return `tel:${digits(phone)}`;
}

export function mapsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function waHref(phone: string) {
  const n = digits(phone);
  const withCc = n.length === 10 ? `91${n}` : n;
  return `https://wa.me/${withCc}`;
}

export function nameInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
