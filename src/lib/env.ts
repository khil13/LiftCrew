/**
 * Reads an environment variable and removes whitespace, line breaks, and
 * surrounding quotes, which are easy to paste into a hosting dashboard by
 * accident and make API keys silently fail.
 */
export function envValue(name: string): string | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const cleaned = raw.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  return cleaned || undefined;
}
