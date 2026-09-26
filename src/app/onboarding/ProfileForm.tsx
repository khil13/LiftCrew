"use client";

import { useFormState } from "react-dom";
import FormError from "@/components/FormError";
import SubmitButton from "@/components/SubmitButton";
import { createProfile } from "./actions";

const ROLES = [
  { value: "helper", title: "I want moving work", body: "Get paid to load, unload, and pack." },
  { value: "customer", title: "I'm moving", body: "Hire 1–4 helpers for a few hours." },
  { value: "company", title: "I run a moving company", body: "Add extra crew for busy days." },
] as const;

export default function ProfileForm({ defaultRole, defaultPhone }: { defaultRole?: string; defaultPhone: string }) {
  const [state, action] = useFormState(createProfile, {});
  return (
    <form action={action} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="label">How will you use LiftCrew?</legend>
        {ROLES.map((r) => (
          <label
            key={r.value}
            className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-white p-4 has-[:checked]:border-brand-500 has-[:checked]:ring-2 has-[:checked]:ring-brand-100"
          >
            <input type="radio" name="role" value={r.value} defaultChecked={r.value === defaultRole} className="mt-1" required />
            <span>
              <span className="block font-semibold">{r.title}</span>
              <span className="block text-sm text-slate-600">{r.body}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div>
        <label htmlFor="full_name" className="label">
          Full name
        </label>
        <input id="full_name" name="full_name" className="input" autoComplete="name" required />
      </div>
      <div>
        <label htmlFor="phone" className="label">
          Mobile number
        </label>
        <input id="phone" name="phone" type="tel" className="input" autoComplete="tel" defaultValue={defaultPhone} />
        <p className="mt-1 text-xs text-slate-500">Kept private. Used for job reminders and account recovery.</p>
      </div>
      <div>
        <label htmlFor="city" className="label">
          City
        </label>
        <input id="city" name="city" className="input" autoComplete="address-level2" />
      </div>
      <FormError message={state.error} />
      <SubmitButton>Continue</SubmitButton>
    </form>
  );
}
