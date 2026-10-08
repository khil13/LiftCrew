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

export type PaymentMode = "stripe" | "offline";

/** "offline" = customers pay in person; jobs go live without online payment. */
export async function getPaymentMode(): Promise<PaymentMode> {
  return (await getSetting("payment_mode")) === "offline" ? "offline" : "stripe";
}

/** What customers are told about paying in person (offline mode). */
export async function getOfflinePaymentInstructions(): Promise<string> {
  const value = await getSetting("offline_payment_instructions");
  return typeof value === "string" && value.trim()
    ? value
    : "Pay at the end of the job by cash, Cash App, or Zelle.";
}
