// Legal documents (Phase 5). Drafts until a New Jersey lawyer reviews them.
// Bump LEGAL_VERSION whenever the Terms, Customer Release, or Helper Agreement
// change in a way users must re-accept; it is stored with each acceptance.

export const LEGAL_VERSION = "2026-10-14";
export const LEGAL_EFFECTIVE_DATE = "October 14, 2026";

/** Update to the registered LLC name (e.g. "LiftCrew LLC") once it is formed. */
export const LEGAL_ENTITY = "LiftCrew";
export const SUPPORT_EMAIL = "support@liftcrewnj.com";
export const SITE_URL = "https://www.liftcrewnj.com";

export const LEGAL_DOCS = [
  { href: "/terms", title: "Terms of Service" },
  { href: "/privacy", title: "Privacy Policy" },
  { href: "/customer-release", title: "Customer Booking Terms & Release" },
  { href: "/helper-agreement", title: "Helper Agreement" },
] as const;

export const LEGAL_PATHS: string[] = LEGAL_DOCS.map((d) => d.href);
