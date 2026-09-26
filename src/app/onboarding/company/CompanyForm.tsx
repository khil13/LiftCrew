"use client";

import { useFormState } from "react-dom";
import FormError from "@/components/FormError";
import SubmitButton from "@/components/SubmitButton";
import type { Company } from "@/lib/types";
import { saveCompany } from "./actions";

export default function CompanyForm({ company }: { company: Company | null }) {
  const [state, action] = useFormState(saveCompany, {});
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="business_name" className="label">
          Business name
        </label>
        <input
          id="business_name"
          name="business_name"
          className="input"
          autoComplete="organization"
          defaultValue={company?.business_name}
          required
        />
      </div>
      <div>
        <label htmlFor="license_number" className="label">
          Business license number <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input id="license_number" name="license_number" className="input" defaultValue={company?.license_number ?? ""} />
      </div>
      <div>
        <label htmlFor="website" className="label">
          Website <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          id="website"
          name="website"
          type="url"
          className="input"
          placeholder="https://"
          defaultValue={company?.website ?? ""}
        />
      </div>
      <div>
        <label htmlFor="transport_credentials" className="label">
          USDOT / state mover license <span className="font-normal text-slate-500">(if you transport goods)</span>
        </label>
        <input
          id="transport_credentials"
          name="transport_credentials"
          className="input"
          defaultValue={company?.transport_credentials ?? ""}
        />
        <p className="mt-1 text-xs text-slate-500">
          LiftCrew helpers provide labor only. If your company transports goods, you remain responsible for your own
          licensing and your own drivers.
        </p>
      </div>
      <FormError message={state.error} />
      <SubmitButton>Submit for review</SubmitButton>
    </form>
  );
}
