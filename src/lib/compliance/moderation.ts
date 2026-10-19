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

// Truck-rental brand names ("U-Haul") contain "haul" but are how customers
// describe their own rental, so they are removed before matching.
const RENTAL_BRANDS = /\bu[\s-]?haul/gi;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Phrases found in the text, matched at the start of a word ("deliver" matches "delivery", not "redeliver"). */
export function matchModerationPhrases(
  text: string,
  phrases: readonly string[] = DEFAULT_MODERATION_PHRASES,
): string[] {
  const cleaned = text.replace(RENTAL_BRANDS, " ");
  return phrases.filter((p) => new RegExp(`\\b${escapeRegExp(p)}`, "i").test(cleaned));
}
