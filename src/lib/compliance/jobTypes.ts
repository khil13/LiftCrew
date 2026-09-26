// Rule 2 (Section 7): labor only, no transport. Keep in sync with
// allowed_job_types() in supabase/migrations/0002_compliance.sql.

export const ALLOWED_JOB_TYPES = [
  "loading",
  "unloading",
  "packing",
  "unpacking",
  "furniture_assembly",
  "in_home_moving",
  "heavy_item_lifting",
] as const;

export type JobType = (typeof ALLOWED_JOB_TYPES)[number];

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  loading: "Loading",
  unloading: "Unloading",
  packing: "Packing",
  unpacking: "Unpacking",
  furniture_assembly: "Furniture assembly",
  in_home_moving: "Moving items within a home",
  heavy_item_lifting: "Heavy item lifting",
};

export function isAllowedJobType(value: string): value is JobType {
  return (ALLOWED_JOB_TYPES as readonly string[]).includes(value);
}

/** Returns the values that are not allowed job types (empty when all are valid). */
export function invalidJobTypes(values: readonly string[]): string[] {
  return values.filter((v) => !isAllowedJobType(v));
}

export const CUSTOMER_LABOR_ONLY_ATTESTATION =
  "I am providing my own truck or container. Helpers provide labor only and will not drive or transport my belongings.";

export const HELPER_LABOR_ONLY_TERMS =
  "I provide labor only: loading, unloading, packing, unpacking, assembly, and moving items on foot within or between rooms and buildings. I will never drive, haul, or transport a customer's belongings, and I will not bring or supply a truck for customer goods.";
