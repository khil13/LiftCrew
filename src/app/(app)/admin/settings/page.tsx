import ActionForm from "@/components/ActionForm";
import { formatAllowedStates } from "@/lib/compliance/states";
import { getAllowedStates, getOfflinePaymentInstructions, getPaymentMode, getPlatformFeePercent } from "@/lib/settings";
import { updatePaymentSettings, updatePlatformFee } from "../actions";

export default async function AdminSettings() {
  const [fee, states, mode, instructions] = await Promise.all([
    getPlatformFeePercent(),
    getAllowedStates(),
    getPaymentMode(),
    getOfflinePaymentInstructions(),
  ]);
  return (
    <div className="space-y-4">
      <div className="card space-y-2 text-sm">
        <ActionForm action={updatePaymentSettings} fields={{}} label="Save payment settings" variant="primary">
          <fieldset className="space-y-2">
            <legend className="label">How customers pay</legend>
            <label className="flex gap-2">
              <input type="radio" name="mode" value="offline" defaultChecked={mode === "offline"} className="mt-1" />
              <span>
                <span className="font-medium">In person</span>
                <span className="block text-xs text-slate-500">
                  Jobs go live as soon as they&apos;re posted; customers pay at the job. Helpers don&apos;t need Stripe.
                </span>
              </span>
            </label>
            <label className="flex gap-2">
              <input type="radio" name="mode" value="stripe" defaultChecked={mode === "stripe"} className="mt-1" />
              <span>
                <span className="font-medium">Online with Stripe</span>
                <span className="block text-xs text-slate-500">
                  Customers pay when booking; helpers are paid out automatically. Needs live Stripe keys.
                </span>
              </span>
            </label>
          </fieldset>
          <label htmlFor="instructions" className="label">
            In-person payment instructions (shown to customers)
          </label>
          <textarea
            id="instructions"
            name="instructions"
            rows={3}
            maxLength={300}
            defaultValue={instructions}
            className="input"
          />
        </ActionForm>
      </div>
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
