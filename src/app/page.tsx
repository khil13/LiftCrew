import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { getAllowedStates, getPaymentMode, getPlatformFeePercent } from "@/lib/settings";
import { formatAllowedStates } from "@/lib/compliance/states";
import { ALLOWED_JOB_TYPES, JOB_TYPE_LABELS } from "@/lib/compliance/jobTypes";
import { MIN_JOB_HOURS, estimateJobPrice } from "@/lib/pricing";
import { formatCents } from "@/lib/format";
import { LEGAL_DOCS, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "LiftCrew · Moving help in New Jersey, by the hour",
  description:
    "Book local moving helpers in New Jersey to load or unload your truck, pack, and lift heavy furniture. You bring the truck, we bring the muscle. Labor only, priced by the hour.",
};

const EXAMPLE = { helpers: 2, hours: 3, rateCents: 3000 };

export default async function LandingPage() {
  if (await getSession()) redirect("/home");
  const [mode, allowed, feePercent] = await Promise.all([
    getPaymentMode(),
    getAllowedStates(),
    getPlatformFeePercent(),
  ]);
  const offline = mode === "offline";
  const state = formatAllowedStates(allowed) || "New Jersey";
  const example = estimateJobPrice({ ...EXAMPLE, feePercent });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">LiftCrew</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">Moving help in {state}, by the hour.</h1>
        <p className="mt-3 text-slate-600">
          Book local helpers to load or unload your truck, pack, and carry the heavy stuff. You bring the truck, our
          crew brings the muscle.
        </p>
        <ul className="mt-5 space-y-2 text-sm text-slate-700">
          <li>✓ You set the hourly rate and pick your crew</li>
          <li>✓ Helpers rated by real customers</li>
          <li>
            ✓{" "}
            {offline
              ? "Pay after the job: cash, Cash App, or Zelle"
              : "Pay upfront, released to helpers only after the job is done"}
          </li>
        </ul>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/login?intent=hire" className="btn-primary">
            Hire helpers
          </Link>
          <Link href="/login?intent=helper" className="btn-secondary">
            Find moving work
          </Link>
        </div>
      </header>

      <section className="mt-12" aria-labelledby="how">
        <h2 id="how" className="text-xl font-bold">
          How it works
        </h2>
        <ol className="mt-4 space-y-3">
          {[
            [
              "Post your job",
              "Add the address, date, hours, how many helpers you need, and the hourly rate you'll pay.",
            ],
            [
              "Pick your crew",
              "Nearby helpers apply. Check their ratings and experience, accept the ones you want, and message them in the app.",
            ],
            [
              "We do the heavy lifting",
              offline
                ? "Your crew shows up, checks in, and gets to work. Pay at the end by cash, Cash App, or Zelle."
                : "Your crew shows up, checks in, and gets to work. Helpers are paid only after the job is done.",
            ],
          ].map(([title, body], i) => (
            <li key={title} className="card flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12" aria-labelledby="services">
        <h2 id="services" className="text-xl font-bold">
          What our helpers do
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="card">
            <h3 className="font-semibold text-emerald-700">Yes</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {ALLOWED_JOB_TYPES.map((t) => (
                <li key={t}>✓ {JOB_TYPE_LABELS[t]}</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h3 className="font-semibold text-red-700">No</h3>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              <li>✕ Driving your truck or belongings</li>
              <li>✕ Bringing a truck or trailer</li>
              <li>✕ Hauling, delivery, or storage</li>
              <li>✕ Moves outside {state}</li>
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              Rent a truck or container yourself (U-Haul, Penske, PODS, etc.) and we&apos;ll load and unload it.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="pricing">
        <h2 id="pricing" className="text-xl font-bold">
          Simple hourly pricing
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          You choose the rate per helper ($15–$200 an hour). Every job has a {MIN_JOB_HOURS}-hour minimum, and most
          moves use 2 helpers for 2–4 hours. You see the full price before you book. Example:
        </p>
        <dl className="card mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">
              {EXAMPLE.helpers} helpers × {EXAMPLE.hours} hours × {formatCents(EXAMPLE.rateCents)}/hr
            </dt>
            <dd>{formatCents(example.laborCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Service fee ({feePercent}%)</dt>
            <dd>{formatCents(example.feeCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
            <dt>Total</dt>
            <dd>{formatCents(example.totalCents)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-12" aria-labelledby="helpers">
        <h2 id="helpers" className="text-xl font-bold">
          Strong and reliable? Earn by the hour.
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Pick the jobs you want near home, set your own hours, and get rated for great work. No truck needed. You must
          live in {state} and be 18 or older.
          {offline ? " Customers pay you in person at the end of each job." : " Get paid to your bank through Stripe."}
        </p>
        <Link href="/login?intent=helper" className="btn-secondary mt-4 sm:w-auto sm:px-6">
          Become a helper
        </Link>
      </section>

      <section className="mt-12" aria-labelledby="faq">
        <h2 id="faq" className="text-xl font-bold">
          Questions
        </h2>
        <div className="mt-4 space-y-2">
          {[
            [
              "Do you bring a truck?",
              "No. LiftCrew is labor only. You rent or provide the truck, trailer, or container and do any driving; our helpers load, unload, pack, and carry.",
            ],
            ["Where do you work?", `Anywhere in ${state}. Both addresses on a job must be in ${state}.`],
            [
              "How do I pay?",
              offline
                ? "Nothing is charged when you book. Pay the total shown in the app at the end of the job by cash, Cash App, or Zelle."
                : "You pay by card when you book. We hold the payment and release it to your crew after the job.",
            ],
            [
              "What if my plans change?",
              offline
                ? "Cancel from the job page any time before it starts. Please give your crew as much notice as you can."
                : "Cancel more than 24 hours ahead for a full refund. Later cancellations pay each booked helper for 1 hour.",
            ],
            [
              "Who are the helpers?",
              "Local independent contractors who agree to our labor-only rules. You see each helper's rating, experience, and jobs completed before you accept them.",
            ],
            ["How fast can I book?", "Jobs can start as soon as 1 hour from now, or up to 90 days ahead."],
          ].map(([q, a]) => (
            <details key={q} className="card group">
              <summary className="cursor-pointer list-none font-semibold">
                {q}
                <span className="float-right text-slate-400 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-12 text-center">
        <Link href="/login?intent=hire" className="btn-primary sm:w-auto sm:px-8">
          Get moving help
        </Link>
      </section>

      <footer className="mt-12 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">
        <p>LiftCrew is a labor-only marketplace, not a moving company or broker.</p>
        <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          {LEGAL_DOCS.map((d) => (
            <Link key={d.href} href={d.href} className="underline">
              {d.title}
            </Link>
          ))}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </footer>
    </main>
  );
}
