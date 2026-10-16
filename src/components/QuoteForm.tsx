"use client";

import { useFormState } from "react-dom";
import FormError from "@/components/FormError";
import SubmitButton from "@/components/SubmitButton";
import { requestQuote } from "@/app/quote-actions";

export default function QuoteForm() {
  const [state, action] = useFormState(requestQuote, {});
  const today = new Date().toISOString().slice(0, 10);

  if (state.sent) {
    return (
      <div className="rounded-card border border-slate-200 p-6 text-center shadow-float" role="status">
        <p className="text-3xl">✓</p>
        <h3 className="mt-2 text-xl font-bold">Got it! We&apos;ll text you shortly.</h3>
        <p className="mt-2 text-slate-500">
          Expect a call or text from LiftCrew soon with your price and available times.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-card border border-slate-200 p-5 shadow-float sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="q-name" className="label">
            Name
          </label>
          <input id="q-name" name="name" className="input" autoComplete="name" required maxLength={100} />
        </div>
        <div>
          <label htmlFor="q-phone" className="label">
            Mobile number
          </label>
          <input
            id="q-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            className="input"
            autoComplete="tel"
            placeholder="(973) 555-0123"
            required
          />
        </div>
        <div>
          <label htmlFor="q-town" className="label">
            Town or ZIP
          </label>
          <input id="q-town" name="town" className="input" placeholder="Irvington" required maxLength={100} />
        </div>
        <div>
          <label htmlFor="q-date" className="label">
            Move date <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input id="q-date" name="move_date" type="date" min={today} className="input" />
        </div>
      </div>
      <div>
        <label htmlFor="q-helpers" className="label">
          Helpers needed
        </label>
        <select id="q-helpers" name="helpers" className="input" defaultValue="2">
          <option value="1">1 helper</option>
          <option value="2">2 helpers</option>
          <option value="3">3 helpers</option>
          <option value="4">4 helpers</option>
        </select>
      </div>
      <div>
        <label htmlFor="q-details" className="label">
          What needs moving? <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          id="q-details"
          name="details"
          rows={3}
          maxLength={2000}
          className="input"
          placeholder="Load a 15' U-Haul. 2-bedroom, 3rd floor walk-up, couch and queen bed."
        />
      </div>
      {/* Honeypot for bots; hidden from people and screen readers. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="q-website">Website</label>
        <input id="q-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <FormError message={state.error} />
      <SubmitButton pendingText="Sending…">Get my free quote</SubmitButton>
      <p className="text-center text-xs text-slate-500">
        No account needed. We&apos;ll call or text you about this request only. Labor only: you provide the truck.
      </p>
    </form>
  );
}
