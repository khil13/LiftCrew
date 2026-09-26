/** Normalizes a US phone number to E.164 (+1XXXXXXXXXX), or null. */
export function toE164(input: string | null | undefined): string | null {
  const digits = (input ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
