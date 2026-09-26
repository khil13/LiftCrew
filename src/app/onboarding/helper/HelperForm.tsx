"use client";

import { useFormState } from "react-dom";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import AvatarUpload from "@/components/AvatarUpload";
import FormError from "@/components/FormError";
import SubmitButton from "@/components/SubmitButton";
import { ALLOWED_JOB_TYPES, HELPER_LABOR_ONLY_TERMS, JOB_TYPE_LABELS } from "@/lib/compliance/jobTypes";
import type { HelperProfile } from "@/lib/types";
import { saveHelperProfile } from "./actions";

export default function HelperForm({
  userId,
  avatarUrl,
  helper,
}: {
  userId: string;
  avatarUrl: string | null;
  helper: HelperProfile | null;
}) {
  const [state, action] = useFormState(saveHelperProfile, {});
  return (
    <form action={action} className="space-y-5">
      <AvatarUpload userId={userId} defaultUrl={avatarUrl} />

      <div>
        <label htmlFor="bio" className="label">
          About you
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          className="input"
          defaultValue={helper?.bio ?? ""}
          placeholder="Strong, careful, on time. 3 years with a local moving company."
        />
      </div>

      <fieldset>
        <legend className="label">What can you help with?</legend>
        <div className="grid grid-cols-1 gap-2">
          {ALLOWED_JOB_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
              <input type="checkbox" name="skills" value={t} defaultChecked={helper?.skills.includes(t)} />
              <span className="text-sm">{JOB_TYPE_LABELS[t]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="hourly_rate" className="label">
            Hourly rate ($)
          </label>
          <input
            id="hourly_rate"
            name="hourly_rate"
            inputMode="decimal"
            className="input"
            defaultValue={helper ? (helper.hourly_rate_cents / 100).toFixed(2) : "25.00"}
            required
          />
        </div>
        <div>
          <label htmlFor="years_experience" className="label">
            Years of experience
          </label>
          <input
            id="years_experience"
            name="years_experience"
            type="number"
            min={0}
            max={60}
            className="input"
            defaultValue={helper?.years_experience ?? 0}
            required
          />
        </div>
      </div>

      <AddressAutocomplete
        name="home"
        label={helper?.home_state ? "Home address (leave as is to keep it)" : "Home address"}
        required={!helper?.home_state}
      />
      <p className="-mt-3 text-xs text-slate-500">Private. Used only to find jobs near you.</p>

      <div>
        <label htmlFor="service_radius_miles" className="label">
          How far will you travel? (miles)
        </label>
        <input
          id="service_radius_miles"
          name="service_radius_miles"
          type="number"
          min={1}
          max={100}
          className="input"
          defaultValue={helper?.service_radius_miles ?? 25}
          required
        />
      </div>

      <label className="flex gap-3 text-sm">
        <input type="checkbox" name="has_own_ride_to_jobs" defaultChecked={helper?.has_own_ride_to_jobs} className="mt-1" />
        <span>
          I have my own way to get to jobs.
          <span className="block text-xs text-slate-500">
            This is only about how you get there. Helpers never drive or carry customer belongings in a vehicle.
          </span>
        </span>
      </label>

      <label className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
        <input
          type="checkbox"
          name="agree_labor_only"
          defaultChecked={Boolean(helper?.agreed_labor_only_terms_at)}
          className="mt-1"
          required
        />
        <span>{HELPER_LABOR_ONLY_TERMS}</span>
      </label>

      <p className="text-xs text-slate-500">Payout setup (Stripe) comes later, before your first job.</p>

      <FormError message={state.error} />
      <SubmitButton>Save profile</SubmitButton>
    </form>
  );
}
