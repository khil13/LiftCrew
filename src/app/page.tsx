import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Logo from "@/components/Logo";
import QuoteForm from "@/components/QuoteForm";
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

function SearchOrb() {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

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

  const steps = [
    ["Post your job", "Add the address, date, hours, how many helpers you need, and the hourly rate you'll pay."],
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
  ];

  const faqs = [
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
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:h-20 sm:px-6">
          <Link href="/" aria-label="LiftCrew home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2 text-sm font-semibold">
            <Link
              href="/login?intent=helper"
              className="hidden rounded-full px-4 py-2.5 hover:bg-slate-50 sm:inline-block"
            >
              Become a helper
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-slate-200 px-4 py-2.5 transition-shadow hover:shadow-float"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Hero */}
        <section className="pb-12 pt-10 text-center sm:pt-16">
          <h1 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
            Moving help in {state}, by the hour.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-500 sm:text-lg">
            You bring the truck, our crew brings the muscle. Local helpers to load, unload, pack, and carry the heavy
            stuff.
          </p>

          {/* Pill booking bar */}
          <Link
            href="/login?intent=hire"
            className="mx-auto mt-8 flex max-w-3xl items-center rounded-full border border-slate-200 bg-white p-2 pl-6 text-left shadow-float transition-shadow hover:shadow-lg"
          >
            <span className="min-w-0 flex-1 sm:hidden">
              <span className="block text-sm font-semibold">Book moving help</span>
              <span className="block truncate text-xs text-slate-500">
                Anywhere in {state} · Any day · {MIN_JOB_HOURS}-hr min
              </span>
            </span>
            <span className="hidden min-w-0 flex-1 grid-cols-3 divide-x divide-slate-200 sm:grid">
              <span className="pr-6">
                <span className="block text-xs font-semibold">Where</span>
                <span className="block truncate text-sm text-slate-500">Anywhere in {state}</span>
              </span>
              <span className="px-6">
                <span className="block text-xs font-semibold">When</span>
                <span className="block text-sm text-slate-500">Same day or ahead</span>
              </span>
              <span className="px-6">
                <span className="block text-xs font-semibold">Crew</span>
                <span className="block text-sm text-slate-500">1–4 helpers · {MIN_JOB_HOURS}-hr min</span>
              </span>
            </span>
            <SearchOrb />
          </Link>

          <ul className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-700">
            <li>★ Rated helpers</li>
            <li>You set the rate</li>
            <li>{offline ? "Pay after the job" : "Paid only after the job"}</li>
          </ul>
          <a href="#quote" className="mt-6 inline-block text-sm font-semibold underline underline-offset-4">
            Rather talk to someone? Get a free quote, no account needed
          </a>
        </section>

        {/* Quick quote */}
        <section id="quote" className="scroll-mt-6 border-t border-slate-200 py-12" aria-labelledby="quote-title">
          <div className="grid gap-8 sm:grid-cols-2 sm:items-start">
            <div>
              <h2 id="quote-title" className="text-2xl font-bold tracking-tight">
                Get a free quote
              </h2>
              <p className="mt-3 leading-relaxed text-slate-500">
                Tell us about your move and we&apos;ll call or text you with a price and available times. No account, no
                commitment.
              </p>
              <ul className="mt-5 space-y-2 text-slate-700">
                <li>✓ Fast reply by call or text</li>
                <li>✓ {MIN_JOB_HOURS}-hour minimum, priced by the hour</li>
                <li>✓ Serving Irvington, Newark, Union, Maplewood &amp; all of {state}</li>
              </ul>
            </div>
            <QuoteForm />
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-slate-200 py-12" aria-labelledby="how">
          <h2 id="how" className="text-2xl font-bold tracking-tight">
            How it works
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {steps.map(([title, body], i) => (
              <li key={title} className="card">
                <span className="text-sm font-semibold text-brand-600">Step {i + 1}</span>
                <h3 className="mt-1 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Services */}
        <section className="border-t border-slate-200 py-12" aria-labelledby="services">
          <h2 id="services" className="text-2xl font-bold tracking-tight">
            What our helpers do
          </h2>
          <p className="mt-2 text-slate-500">
            Labor only. Rent a truck or container yourself (U-Haul, Penske, PODS) and we&apos;ll load and unload it.
          </p>
          <div className="mt-6 grid gap-x-10 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold">Included</h3>
              <ul className="mt-1 divide-y divide-slate-200">
                {ALLOWED_JOB_TYPES.map((t) => (
                  <li key={t} className="flex items-center gap-3 py-3">
                    <span className="text-brand-600">✓</span>
                    {JOB_TYPE_LABELS[t]}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 sm:mt-0">
              <h3 className="text-sm font-semibold">Not included</h3>
              <ul className="mt-1 divide-y divide-slate-200 text-slate-500">
                {[
                  "Driving your truck or belongings",
                  "Bringing a truck or trailer",
                  "Hauling, delivery, or storage",
                  `Moves outside ${state}`,
                ].map((x) => (
                  <li key={x} className="flex items-center gap-3 py-3">
                    <span>✕</span>
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section
          className="grid gap-8 border-t border-slate-200 py-12 sm:grid-cols-2 sm:items-center"
          aria-labelledby="pricing"
        >
          <div>
            <h2 id="pricing" className="text-2xl font-bold tracking-tight">
              Simple hourly pricing
            </h2>
            <p className="mt-3 leading-relaxed text-slate-500">
              You choose the rate per helper ($15–$200 an hour). Every job has a {MIN_JOB_HOURS}-hour minimum, and most
              moves use 2 helpers for 2–4 hours. You see the full price before you book.
            </p>
          </div>
          <div className="rounded-card border border-slate-200 p-6 shadow-float">
            <p className="text-2xl font-bold">
              {formatCents(EXAMPLE.rateCents)}
              <span className="text-base font-normal text-slate-500"> / helper / hour</span>
            </p>
            <dl className="mt-5 space-y-3 text-slate-700">
              <div className="flex justify-between">
                <dt className="underline decoration-slate-300 underline-offset-4">
                  {EXAMPLE.helpers} helpers × {EXAMPLE.hours} hours
                </dt>
                <dd>{formatCents(example.laborCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="underline decoration-slate-300 underline-offset-4">Service fee ({feePercent}%)</dt>
                <dd>{formatCents(example.feeCents)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-4 font-semibold text-slate-900">
                <dt>Total</dt>
                <dd>{formatCents(example.totalCents)}</dd>
              </div>
            </dl>
            <Link href="/login?intent=hire" className="btn-primary mt-6">
              Book helpers
            </Link>
            <p className="mt-3 text-center text-sm text-slate-500">
              {offline ? "No payment now. Pay after the job." : "Paid only after the job is done."}
            </p>
          </div>
        </section>

        {/* Helpers */}
        <section className="border-t border-slate-200 py-12" aria-labelledby="helpers">
          <div className="rounded-card bg-slate-50 p-6 sm:flex sm:items-center sm:justify-between sm:gap-10 sm:p-10">
            <div>
              <h2 id="helpers" className="text-2xl font-bold tracking-tight">
                Strong and reliable? Earn by the hour.
              </h2>
              <p className="mt-2 max-w-xl text-slate-500">
                Pick the jobs you want near home, set your own hours, and get rated for great work. No truck needed. You
                must live in {state} and be 18 or older.
                {offline
                  ? " Customers pay you in person at the end of each job."
                  : " Get paid to your bank through Stripe."}
              </p>
            </div>
            <Link href="/login?intent=helper" className="btn-secondary mt-6 shrink-0 sm:mt-0 sm:w-auto">
              Become a helper
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-slate-200 py-12" aria-labelledby="faq">
          <h2 id="faq" className="text-2xl font-bold tracking-tight">
            Questions
          </h2>
          <div className="mt-4 divide-y divide-slate-200 border-b border-slate-200">
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                  {q}
                  <span className="text-xl text-slate-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 max-w-2xl leading-relaxed text-slate-500">{a}</p>
              </details>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/login?intent=hire" className="btn-primary sm:w-auto sm:px-10">
              Get moving help
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-10 text-sm sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <Logo />
              <p className="mt-3 text-slate-500">
                A labor-only marketplace in {state}. Not a moving company or broker.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">LiftCrew</h3>
              <ul className="mt-3 space-y-2 text-slate-500">
                <li>
                  <Link href="/login?intent=hire" className="hover:underline">
                    Hire helpers
                  </Link>
                </li>
                <li>
                  <Link href="/login?intent=helper" className="hover:underline">
                    Become a helper
                  </Link>
                </li>
                <li>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:underline">
                    {SUPPORT_EMAIL}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Legal</h3>
              <ul className="mt-3 space-y-2 text-slate-500">
                {LEGAL_DOCS.map((d) => (
                  <li key={d.href}>
                    <Link href={d.href} className="hover:underline">
                      {d.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-8 border-t border-slate-200 pt-6 text-xs text-slate-500">
            © {new Date().getFullYear()} LiftCrew · {state}
          </p>
        </div>
      </footer>
    </div>
  );
}
