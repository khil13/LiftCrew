import { toE164 } from "@/lib/phone";

/** The business phone shown on the site, from BUSINESS_PHONE (server-side). Null hides call/text buttons. */
export type BusinessPhone = { e164: string; display: string };

export function parseBusinessPhone(raw: string | null | undefined): BusinessPhone | null {
  const e164 = toE164(raw);
  if (!e164) return null;
  const d = e164.slice(2);
  return { e164, display: `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` };
}

/** Text for the confirmation SMS sent to a customer after a quote request. */
export function quoteConfirmationText(name: string, business: BusinessPhone | null): string {
  const first = name.trim().split(/\s+/)[0] || "there";
  const reach = business ? ` You can also call or text us at ${business.display}.` : "";
  return `Hi ${first}, thanks for contacting LiftCrew! We got your moving help request and will reach out shortly.${reach} Reply STOP to opt out.`;
}
