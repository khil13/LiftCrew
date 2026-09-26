import ActionForm from "@/components/ActionForm";
import { formatAllowedStates } from "@/lib/compliance/states";
import { getAllowedStates, getPlatformFeePercent } from "@/lib/settings";
import { updatePlatformFee } from "../actions";

export default async function AdminSettings() {
  const [fee, states] = await Promise.all([getPlatformFeePercent(), getAllowedStates()]);
  return (
    <div className="space-y-4">
      <div className="card space-y-2 text-sm">
        <ActionForm action={updatePlatformFee} fields={{}} label="Save fee" variant="primary">
          <label htmlFor="fee" className="label">
            Platform fee (%)
          </label>
          <input id="fee" name="fee" type="number" min={0} max={30} step={0.5} defaultValue={fee} className="input" />
          <p className="text-xs text-slate-500">
            Applies to jobs paid after you save. Paid jobs keep the fee they were charged.
          </p>
        </ActionForm>
      </div>
      <div className="card space-y-1 text-sm">
        <p className="font-medium">Service area</p>
        <p className="text-slate-600">{formatAllowedStates(states) || "Not set"}</p>
        <p className="text-xs text-slate-500">
          Changing the allowed states affects compliance (Section 7), so it&apos;s done in SQL, not here.
        </p>
      </div>
    </div>
  );
}
