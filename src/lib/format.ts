export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

/** "25" or "25.50" dollars → 2550 cents. Returns null for invalid input. */
export function dollarsToCents(value: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, frac = ""] = value.trim().split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}
