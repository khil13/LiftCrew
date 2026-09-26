import ActionForm from "@/components/ActionForm";
import { createClient } from "@/lib/supabase/server";
import { setHelperSuspended, setHelperVerified } from "../actions";

type HelperRow = {
  id: string;
  full_name: string;
  city: string | null;
  home_state: string | null;
  is_verified: boolean;
  stripe_onboarded: boolean;
  strikes: number;
  suspended_at: string | null;
  rating_avg: number;
  rating_count: number;
  jobs_completed: number;
};

// Verification is manual for now: check ID and references, then mark verified.
export default async function AdminHelpers() {
  const { data, error } = await createClient().rpc("admin_list_helpers");
  if (error) return <p className="card text-sm text-red-700">Could not load helpers.</p>;
  const helpers = (data ?? []) as HelperRow[];

  return (
    <ul className="space-y-2">
      {helpers.length === 0 && <p className="text-sm text-slate-500">No helpers yet.</p>}
      {helpers.map((h) => (
        <li key={h.id} className="card space-y-2 text-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">{h.full_name}</p>
            <span className={h.is_verified ? "text-green-700" : "font-medium text-amber-700"}>
              {h.is_verified ? "✓ Verified" : "Unverified"}
            </span>
          </div>
          <p className="text-slate-600">
            {[h.city, h.home_state].filter(Boolean).join(", ") || "No location"} · {h.jobs_completed} jobs ·{" "}
            {h.rating_count > 0 ? `★ ${h.rating_avg} (${h.rating_count})` : "no reviews"} ·{" "}
            {h.stripe_onboarded ? "payouts ready" : "no payouts"}
          </p>
          {(h.strikes > 0 || h.suspended_at) && (
            <p className="font-medium text-red-700">
              {h.strikes} strike{h.strikes === 1 ? "" : "s"}
              {h.suspended_at ? " · suspended" : ""}
            </p>
          )}
          <div className="flex gap-2">
            <ActionForm
              action={setHelperVerified}
              fields={{ helper_id: h.id, verified: String(!h.is_verified) }}
              label={h.is_verified ? "Unverify" : "Mark verified"}
              variant={h.is_verified ? "secondary" : "primary"}
            />
            <ActionForm
              action={setHelperSuspended}
              fields={{ helper_id: h.id, suspended: String(!h.suspended_at) }}
              label={h.suspended_at ? "Lift suspension" : "Suspend"}
              variant={h.suspended_at ? "secondary" : "danger"}
              confirm={h.suspended_at ? "Lift the suspension and reset strikes?" : "Suspend this helper?"}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
