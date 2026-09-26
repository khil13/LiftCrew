import "server-only";
import { createClient } from "@supabase/supabase-js";
import { envValue } from "@/lib/env";

/**
 * Service-role client. Server-only: bypasses RLS, so use it only for things
 * users can't do themselves (e.g. looking up an email address to notify).
 * Returns null when SUPABASE_SERVICE_ROLE_KEY is not configured.
 */
export function createAdminClient() {
  const key = envValue("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) return null;
  return createClient(envValue("NEXT_PUBLIC_SUPABASE_URL")!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
