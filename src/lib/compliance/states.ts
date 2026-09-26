// Rule 1 (Section 7): same-state jobs only. Mirrors the DB constraint + trigger
// in supabase/migrations/0002_compliance.sql.

export const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

export function normalizeState(code: string | null | undefined): string | null {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  return upper in US_STATES ? upper : null;
}

export function isAllowedState(code: string | null | undefined, allowedStates: readonly string[]): boolean {
  const state = normalizeState(code);
  return state !== null && allowedStates.map((s) => s.toUpperCase()).includes(state);
}

/** "New Jersey", "New Jersey or New York", "New Jersey, New York, or Pennsylvania" */
export function formatAllowedStates(allowedStates: readonly string[]): string {
  const names = allowedStates.map((s) => US_STATES[s.toUpperCase()] ?? s.toUpperCase());
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} or ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, or ${names[names.length - 1]}`;
}

export function outOfStateMessage(allowedStates: readonly string[]): string {
  const where = formatAllowedStates(allowedStates);
  return `Right now we only support moves within ${where}. Both addresses must be in ${where}.`;
}

export type JobLocationInput = {
  startState: string | null | undefined;
  /** Omit or null when the job has a single address. */
  endState?: string | null;
  /** True when the job has an end address at all. */
  hasEndAddress?: boolean;
};

export type ValidationResult = { ok: true } | { ok: false; error: string };

/**
 * Validates that a job stays inside one allowed state. States must come from
 * Google Places (administrative_area_level_1), never from user-typed text.
 */
export function validateJobLocation(
  input: JobLocationInput,
  allowedStates: readonly string[],
): ValidationResult {
  const fail = { ok: false as const, error: outOfStateMessage(allowedStates) };
  const start = normalizeState(input.startState);
  if (!start || !isAllowedState(start, allowedStates)) return fail;

  const hasEnd = input.hasEndAddress ?? Boolean(input.endState);
  if (!hasEnd) return { ok: true };

  const end = normalizeState(input.endState);
  if (!end || !isAllowedState(end, allowedStates)) return fail;
  if (end !== start) return fail;
  return { ok: true };
}
