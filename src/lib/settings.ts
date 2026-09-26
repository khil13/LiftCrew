import "server-only";
import { createClient } from "@/lib/supabase/server";

async function getSetting(key: string): Promise<unknown> {
  const supabase = createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
  return data?.value;
}

/** Launch state(s) from app_settings.allowed_states, e.g. ["NJ"]. Fails closed to []. */
export async function getAllowedStates(): Promise<string[]> {
  const value = await getSetting("allowed_states");
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/** Platform fee from app_settings.platform_fee_percent (default 15). */
export async function getPlatformFeePercent(): Promise<number> {
  const value = Number(await getSetting("platform_fee_percent"));
  return Number.isFinite(value) && value >= 0 ? value : 15;
}
