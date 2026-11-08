"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import FormError from "@/components/FormError";
import SubmitButton from "@/components/SubmitButton";
import Icon from "@/components/Icon";
import { requestQuote } from "@/app/quote-actions";
import { todayInNewJersey } from "@/lib/quotes";

export default function QuoteForm({ defaultTown }: { defaultTown?: string } = {}) {
  const [state, action] = useFormState(requestQuote, {});
  // Worked out in the browser after load: the server runs in UTC (already
  // tomorrow on NJ evenings) and town pages are pre-built on deploy day.
  const [today, setToday] = useState<string>();
  useEffect(() => setToday(todayInNewJersey()), []);

  if (state.sent) {
    return (
      <div className="rounded-card border border-slate-200 bg-white p-8 text-center shadow-float" role="status">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Icon name="check" className="h-7 w-7" />
        </span>
        <h3 className="mt-4 text-xl font-bold">Got it! We&apos;ll text you shortly.</h3>
        <p className="mt-2 text-slate-600">
          Expect a call or text from LiftCrew soon with your price and available times.
        </p>
        <p className="mt-4 text-sm text-slate-500">Nothing to pay now. No account needed.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5 rounded-card border border-slate-200 bg-white p-5 shadow-float sm:p-7">
      <div>
        <p className="text-lg font-bold text-slate-900">Request your free quote</p>
        <p className="mt-1 text-sm text-slate-500">Takes about a minute. We reply by call or text.</p>
      </div>
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
          <input
            id="q-town"
            name="town"
            className="input"
            placeholder="Irvington"
            defaultValue={defaultTown}
            required
            maxLength={100}
          />
        </div>
        <div>
          <label htmlFor="q-date" className="label">
            Move date <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input id="q-date" name="move_date" type="date" min={today} className="input" />
        </div>
      </div>
      <fieldset>
        <legend className="label">Helpers needed</legend>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" name="helpers" value={n} defaultChecked={n === 2} className="peer sr-only" />
              <span className="flex h-12 items-center justify-center rounded-xl border border-slate-300 bg-white font-semibold text-slate-900 transition-colors hover:border-slate-900 peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600">
                {n}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
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
