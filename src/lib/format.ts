export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

/** "25" or "25.50" dollars → 2550 cents. Returns null for invalid input. */
export function dollarsToCents(value: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, frac = ""] = value.trim().split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** Launch-area time zone used to show and filter job times. */
export const TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE || "America/New_York";

/** "Sat, Oct 4 · 9:00 AM" in the launch time zone. */
export function formatJobTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-US", { timeZone: TIME_ZONE, weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

export function formatHours(hours: number): string {
  return `${Number(hours)} hr${Number(hours) === 1 ? "" : "s"}`;
}
