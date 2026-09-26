import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Launch state(s) from app_settings.allowed_states, e.g. ["NJ"]. Fails closed to []. */
export async function getAllowedStates(): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", "allowed_states").maybeSingle();
  const value = data?.value;
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}
