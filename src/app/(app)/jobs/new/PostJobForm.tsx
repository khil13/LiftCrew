"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import AddressAutocomplete, { type AddressCheck } from "@/components/AddressAutocomplete";
import FormError from "@/components/FormError";
import SubmitButton from "@/components/SubmitButton";
import {
  ALLOWED_JOB_TYPES,
  CUSTOMER_LABOR_ONLY_ATTESTATION,
  JOB_TYPE_LABELS,
  type JobType,
} from "@/lib/compliance/jobTypes";
import { matchModerationPhrases } from "@/lib/compliance/moderation";
import { dollarsToCents, formatCents } from "@/lib/format";
import { estimateJobPrice } from "@/lib/pricing";
import { postJob } from "./actions";

const STEPS = ["Addresses", "Date & time", "Hours & helpers", "Details", "Review"] as const;

export default function PostJobForm({
  feePercent,
  maxHelpers,
  outOfStateMessage,
}: {
  feePercent: number;
  maxHelpers: number;
  outOfStateMessage: string;
}) {
  const [state, action] = useFormState(postJob, {});
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);

  const [start, setStart] = useState<AddressCheck | null>(null);
  const [end, setEnd] = useState<AddressCheck | null>(null);
  const [hasEndText, setHasEndText] = useState(false);
  const [localStart, setLocalStart] = useState("");
  const [hours, setHours] = useState("3");
  const [helpers, setHelpers] = useState("2");
  const [rate, setRate] = useState("30.00");
  const [types, setTypes] = useState<JobType[]>(["loading"]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const scheduledIso = localStart ? new Date(localStart).toISOString() : "";
  const rateCents = dollarsToCents(rate);
  const estimate =
    rateCents !== null
      ? estimateJobPrice({ helpers: Number(helpers), hours: Number(hours), rateCents, feePercent })
      : null;
  const flagged = matchModerationPhrases(`${title} ${description}`);

  function validate(i: number): string | null {
    if (i === 0) {
      if (!start) return "Pick the starting address from the list.";
      if (!start.ok) return start.error ?? outOfStateMessage;
      if (hasEndText && !end) return "Pick the ending address from the list, or clear it.";
      if (end && !end.ok) return end.error ?? outOfStateMessage;
      if (end && start.state !== end.state) return outOfStateMessage;
    }
    if (i === 1) {
      if (!localStart) return "Pick a date and start time.";
      if (new Date(localStart).getTime() < Date.now() + 60 * 60 * 1000) return "Pick a start time at least 1 hour from now.";
    }
    if (i === 2) {
      const h = Number(hours);
      if (!(h >= 1 && h <= 12 && Number.isInteger(h * 2))) return "Hours must be 1–12, in half hours.";
      if (rateCents === null || rateCents < 1500 || rateCents > 20000) return "Pay rate must be between $15 and $200.";
    }
    if (i === 3) {
      if (types.length === 0) return "Pick at least one type of help.";
      if (title.trim().length < 3) return "Add a short title.";
    }
    return null;
  }

  function next() {
    const error = validate(step);
    setStepError(error);
    if (!error) setStep((s) => s + 1);
  }

  return (
    <form
      action={action}
      className="space-y-5"
      onKeyDown={(e) => {
        // Enter moves forward a step instead of submitting early.
        if (e.key === "Enter" && step < STEPS.length - 1 && (e.target as HTMLElement).tagName !== "TEXTAREA") {
          e.preventDefault();
          next();
        }
      }}
    >
      <ol className="flex gap-1" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand-600" : "bg-slate-200"}`}>
            <span className="sr-only">
              {label}
              {i === step ? " (current)" : ""}
            </span>
          </li>
        ))}
      </ol>
      <h2 className="text-lg font-semibold">{STEPS[step]}</h2>

      {/* Every step stays mounted so all fields are submitted together. */}
      <div className={step === 0 ? "space-y-4" : "hidden"}>
        <AddressAutocomplete name="start" label="Where do helpers meet you?" onCheck={setStart} />
        <div onInput={(e) => setHasEndText(Boolean((e.target as HTMLInputElement).value))}>
          <AddressAutocomplete name="end" label="Second address (optional)" onCheck={setEnd} />
        </div>
        <p className="text-xs text-slate-500">
          Add a second address only if helpers also unload at your new place. Both addresses must be in the same state.
        </p>
      </div>

      <div className={step === 1 ? "space-y-2" : "hidden"}>
        <label htmlFor="local_start" className="label">
          Start date and time
        </label>
        <input
          id="local_start"
          type="datetime-local"
          className="input"
          value={localStart}
          onChange={(e) => setLocalStart(e.target.value)}
        />
        <input type="hidden" name="scheduled_start" value={scheduledIso} />
      </div>

      <div className={step === 2 ? "space-y-4" : "hidden"}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="estimated_hours" className="label">
              Hours
            </label>
            <input
              id="estimated_hours"
              name="estimated_hours"
              type="number"
              min={1}
              max={12}
              step={0.5}
              className="input"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="helpers_needed" className="label">
              Helpers
            </label>
            <select
              id="helpers_needed"
              name="helpers_needed"
              className="input"
              value={helpers}
              onChange={(e) => setHelpers(e.target.value)}
            >
              {Array.from({ length: maxHelpers }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="pay_rate" className="label">
            Pay per helper per hour ($)
          </label>
          <input
            id="pay_rate"
            name="pay_rate"
            inputMode="decimal"
            className="input"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>
      </div>

      <div className={step === 3 ? "space-y-4" : "hidden"}>
        <fieldset>
          <legend className="label">What do you need help with?</legend>
          <div className="grid grid-cols-1 gap-2">
            {ALLOWED_JOB_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                <input
                  type="checkbox"
                  name="job_type"
                  value={t}
                  checked={types.includes(t)}
                  onChange={(e) => setTypes((prev) => (e.target.checked ? [...prev, t] : prev.filter((x) => x !== t)))}
                />
                <span className="text-sm">{JOB_TYPE_LABELS[t]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="has_stairs" /> Stairs
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="has_heavy_items" /> Heavy items
          </label>
        </div>
        <div>
          <label htmlFor="title" className="label">
            Title
          </label>
          <input
            id="title"
            name="title"
            className="input"
            placeholder="Load a 15' rental truck"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="description" className="label">
            Details <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="input"
            placeholder="2-bedroom apartment, 3rd floor walk-up. Sofa, queen bed, 30 boxes."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {flagged.length > 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            LiftCrew helpers provide labor only. They can&apos;t bring a truck, drive, or deliver your belongings. Posts
            that mention this are reviewed by our team.
          </p>
        )}
      </div>

      <div className={step === 4 ? "space-y-4" : "hidden"}>
        {estimate && (
          <dl className="card space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">
                {helpers} helper{helpers === "1" ? "" : "s"} × {hours} hrs × {formatCents(rateCents!)}
              </dt>
              <dd>{formatCents(estimate.laborCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Service fee ({feePercent}%)</dt>
              <dd>{formatCents(estimate.feeCents)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
              <dt>Estimated total</dt>
              <dd>{formatCents(estimate.totalCents)}</dd>
            </div>
          </dl>
        )}
        <p className="text-xs text-slate-500">
          You won&apos;t be charged yet. Payment at booking is coming soon; for now, posting lets helpers apply.
        </p>
        <label className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <input type="checkbox" name="attest_labor_only" className="mt-1" />
          <span>{CUSTOMER_LABOR_ONLY_ATTESTATION}</span>
        </label>
      </div>

      <FormError message={stepError ?? state.error} />

      <div className="flex gap-3">
        {step > 0 && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setStepError(null);
              setStep((s) => s - 1);
            }}
          >
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" className="btn-primary" onClick={next}>
            Next
          </button>
        ) : (
          <SubmitButton pendingText="Posting…">Post job</SubmitButton>
        )}
      </div>
    </form>
  );
}
