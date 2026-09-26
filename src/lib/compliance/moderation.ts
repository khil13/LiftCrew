// Rule 4 (Section 7): flag transport / brokering language for admin review.
// The DB trigger (0002_compliance.sql) is the source of truth for the review
// queue; this mirror lets the UI warn users before they submit.

export const DEFAULT_MODERATION_PHRASES = [
  "bring your truck",
  "bring a truck",
  "your truck",
  "use your truck",
  "drive my stuff",
  "drive my things",
  "drive my belongings",
  "deliver",
  "haul",
  "transport my",
  "pick up my stuff",
] as const;

export function matchModerationPhrases(
  text: string,
  phrases: readonly string[] = DEFAULT_MODERATION_PHRASES,
): string[] {
  const lower = text.toLowerCase();
  return phrases.filter((p) => lower.includes(p.toLowerCase()));
}
