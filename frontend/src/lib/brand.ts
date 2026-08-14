import type { FirmId } from "./erp-data";

/** Brand tokens sampled from each company logo. Applied as CSS vars on <html>. */
export type BrandVars = Partial<Record<string, string>>;

const defaultBrand: BrandVars = {
  "--background": "oklch(0.986 0.005 95)",
  "--foreground": "oklch(0.28 0.018 150)",
  "--card": "oklch(1 0.002 95)",
  "--primary": "oklch(0.46 0.062 158)",
  "--primary-foreground": "oklch(0.985 0.008 120)",
  "--primary-soft": "oklch(0.93 0.032 158)",
  "--secondary": "oklch(0.955 0.011 95)",
  "--accent": "oklch(0.93 0.045 75)",
  "--ring": "oklch(0.62 0.05 158)",
  "--sidebar": "oklch(0.972 0.008 95)",
  "--sidebar-foreground": "oklch(0.34 0.018 150)",
  "--sidebar-primary": "oklch(0.46 0.062 158)",
  "--sidebar-primary-foreground": "oklch(0.985 0.008 120)",
  "--sidebar-accent": "oklch(0.93 0.025 130)",
  "--sidebar-accent-foreground": "oklch(0.3 0.03 158)",
  "--sidebar-border": "oklch(0.91 0.01 100)",
  "--chart-1": "oklch(0.55 0.075 158)",
  "--chart-2": "oklch(0.7 0.09 75)",
};

/** Asian Apex — cream ground + lime leaf from logo */
const asianApex: BrandVars = {
  "--background": "oklch(0.985 0.02 105)",
  "--foreground": "oklch(0.22 0.02 140)",
  "--card": "oklch(0.995 0.01 105)",
  "--primary": "oklch(0.72 0.18 135)",
  "--primary-foreground": "oklch(0.22 0.04 140)",
  "--primary-soft": "oklch(0.94 0.06 135)",
  "--secondary": "oklch(0.96 0.03 105)",
  "--accent": "oklch(0.92 0.08 95)",
  "--ring": "oklch(0.65 0.15 135)",
  "--sidebar": "oklch(0.975 0.025 105)",
  "--sidebar-foreground": "oklch(0.28 0.03 140)",
  "--sidebar-primary": "oklch(0.72 0.18 135)",
  "--sidebar-primary-foreground": "oklch(0.22 0.04 140)",
  "--sidebar-accent": "oklch(0.93 0.08 135)",
  "--sidebar-accent-foreground": "oklch(0.28 0.06 140)",
  "--sidebar-border": "oklch(0.9 0.03 105)",
  "--chart-1": "oklch(0.72 0.18 135)",
  "--chart-2": "oklch(0.65 0.14 230)",
  "--chart-3": "oklch(0.7 0.14 95)",
  "--chart-4": "oklch(0.58 0.2 25)",
};

/** Avighna — warm cream ground + burnt orange from the mark */
const avighna: BrandVars = {
  "--background": "oklch(0.985 0.012 70)",
  "--foreground": "oklch(0.28 0.02 50)",
  "--card": "oklch(0.995 0.008 70)",
  "--primary": "oklch(0.7 0.13 55)",
  "--primary-foreground": "oklch(0.99 0.01 70)",
  "--primary-soft": "oklch(0.94 0.05 60)",
  "--secondary": "oklch(0.96 0.02 70)",
  "--accent": "oklch(0.93 0.06 75)",
  "--ring": "oklch(0.65 0.12 55)",
  "--sidebar": "oklch(0.978 0.016 70)",
  "--sidebar-foreground": "oklch(0.3 0.025 50)",
  "--sidebar-primary": "oklch(0.7 0.13 55)",
  "--sidebar-primary-foreground": "oklch(0.99 0.01 70)",
  "--sidebar-accent": "oklch(0.94 0.05 60)",
  "--sidebar-accent-foreground": "oklch(0.32 0.06 50)",
  "--sidebar-border": "oklch(0.9 0.02 70)",
  "--chart-1": "oklch(0.7 0.13 55)",
  "--chart-2": "oklch(0.78 0.1 80)",
  "--chart-3": "oklch(0.55 0.08 40)",
};

/** Ganesh Inc — light cream sidebar with crimson red, not dark */
const ganesh: BrandVars = {
  "--background": "oklch(0.99 0.008 25)",
  "--foreground": "oklch(0.25 0.04 25)",
  "--card": "oklch(1 0.004 25)",
  "--primary": "oklch(0.52 0.19 25)",
  "--primary-foreground": "oklch(0.99 0.01 25)",
  "--primary-soft": "oklch(0.94 0.05 25)",
  "--secondary": "oklch(0.96 0.02 25)",
  "--accent": "oklch(0.93 0.06 25)",
  "--ring": "oklch(0.52 0.18 25)",
  "--sidebar": "oklch(0.955 0.025 25)",
  "--sidebar-foreground": "oklch(0.28 0.06 25)",
  "--sidebar-primary": "oklch(0.52 0.19 25)",
  "--sidebar-primary-foreground": "oklch(0.99 0.01 25)",
  "--sidebar-accent": "oklch(0.92 0.07 25)",
  "--sidebar-accent-foreground": "oklch(0.38 0.14 25)",
  "--sidebar-border": "oklch(0.88 0.04 25)",
  "--chart-1": "oklch(0.52 0.19 25)",
  "--chart-2": "oklch(0.62 0.1 40)",
  "--chart-3": "oklch(0.55 0.08 50)",
};

/** Atharva Associates — bold red AA mark on transparent → light UI + vivid red */
const atharva: BrandVars = {
  "--background": "oklch(0.99 0.005 25)",
  "--foreground": "oklch(0.2 0.03 25)",
  "--card": "oklch(1 0.002 25)",
  "--primary": "oklch(0.55 0.22 25)",
  "--primary-foreground": "oklch(0.99 0.01 25)",
  "--primary-soft": "oklch(0.94 0.04 25)",
  "--secondary": "oklch(0.96 0.01 25)",
  "--accent": "oklch(0.92 0.05 30)",
  "--ring": "oklch(0.55 0.2 25)",
  "--sidebar": "oklch(0.985 0.008 25)",
  "--sidebar-foreground": "oklch(0.25 0.04 25)",
  "--sidebar-primary": "oklch(0.55 0.22 25)",
  "--sidebar-primary-foreground": "oklch(0.99 0.01 25)",
  "--sidebar-accent": "oklch(0.94 0.05 25)",
  "--sidebar-accent-foreground": "oklch(0.4 0.15 25)",
  "--sidebar-border": "oklch(0.9 0.02 25)",
  "--chart-1": "oklch(0.55 0.22 25)",
  "--chart-2": "oklch(0.45 0.08 40)",
  "--chart-3": "oklch(0.6 0.06 240)",
};

const byFirm: Record<Exclude<FirmId, "all">, BrandVars> = {
  f1: asianApex,
  f2: avighna,
  f3: ganesh,
  f4: atharva,
};

const KEYS = Object.keys(defaultBrand);

export function brandFor(firm: FirmId): BrandVars {
  if (firm === "all") return defaultBrand;
  return byFirm[firm] ?? defaultBrand;
}

export function applyBrand(firm: FirmId) {
  const root = document.documentElement;
  const vars = brandFor(firm);
  root.dataset.firm = firm;
  for (const k of KEYS) {
    const v = vars[k] ?? defaultBrand[k];
    if (v) root.style.setProperty(k, v);
  }
}
