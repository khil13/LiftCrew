import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import QuoteForm from "@/components/QuoteForm";
import ContactButtons from "@/components/ContactButtons";
import BusinessJsonLd from "@/components/BusinessJsonLd";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MobileCtaBar from "@/components/MobileCtaBar";
import Icon, { IconBadge, type IconName } from "@/components/Icon";
import { PRIMARY_CTA, SECONDARY_CTA } from "@/lib/cta";
import { TOWNS } from "@/lib/towns";
import { parseBusinessPhone } from "@/lib/contact";
import { envValue } from "@/lib/env";
import { getSession } from "@/lib/auth";
import { getAllowedStates, getPaymentMode, getPlatformFeePercent } from "@/lib/settings";
import { formatAllowedStates } from "@/lib/compliance/states";
import { ALLOWED_JOB_TYPES, JOB_TYPE_LABELS } from "@/lib/compliance/jobTypes";
import { MIN_JOB_HOURS, SUGGESTED_RATE_CENTS, TYPICAL_JOBS, estimateJobPrice } from "@/lib/pricing";
import { formatCents } from "@/lib/format";

export const metadata: Metadata = {
  title: "LiftCrew · Moving help in New Jersey, by the hour",
  description:
    "Local moving helpers in New Jersey to load or unload your truck, pack, and lift heavy furniture. One price, pay when it's done: no deposit, no hidden fees, free cancellation. You bring the truck.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "LiftCrew · Moving help in North Jersey. One price, pay when it's done.",
    description: "Local helpers to load, unload, pack and carry. No deposit, no hidden fees, free cancellation.",
    url: "/",
    siteName: "LiftCrew",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

const EXAMPLE = { helpers: 2, hours: 3, rateCents: SUGGESTED_RATE_CENTS };

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
  const phone = parseBusinessPhone(envValue("BUSINESS_PHONE"));
  const smallMove = TYPICAL_JOBS[1];
  const smallMoveTotal = estimateJobPrice({
    helpers: smallMove.helpers,
    hours: smallMove.hours,
    rateCents: SUGGESTED_RATE_CENTS,
    feePercent,
  }).totalCents;

  const trust: [IconName, string][] = offline
    ? [
        ["cash", "No deposit, nothing upfront"],
        ["tag", "No hidden fees"],
        ["calendar", "Free cancellation before the job"],
        ["pin", "Local New Jersey helpers"],
      ]
    : [
        ["cash", "Paid only after the job"],
        ["tag", "Clear hourly pricing"],
        ["users", "You choose your crew"],
        ["pin", "Local New Jersey helpers"],
      ];

  const reasons: [IconName, string, string][] = [
    [
      "tag",
      "One clear price",
      "See the full total, service fee included, before you book. If a job runs long, you agree on any extra time first.",
    ],
    offline
      ? ["cash", "Pay when it's done", "No deposit and nothing upfront. Pay at the end by cash, Cash App, or Zelle."]
      : ["cash", "Paid only after the job", "Your payment is held and released to your crew after the work is done."],
    offline
      ? ["calendar", "Free cancellation", "Plans change. Cancel any time before the job starts, at no cost."]
      : ["calendar", "Flexible cancellation", "Cancel more than 24 hours ahead for a full refund."],
    [
      "pin",
      "Local to North Jersey",
      "Based in Irvington and serving Essex and Union County: walk-ups, tight stairs, and street parking included.",
    ],
    [
      "users",
      "You choose your crew",
      "See each helper's rating, experience, and jobs completed before you accept them.",
    ],
    [
      "chat",
      "Talk to a real person",
      phone
        ? `Call or text us at ${phone.display}, or message your crew right in the app.`
        : "Request a free quote and we'll call or text you back. Message your crew right in the app.",
    ],
  ];

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
    <div className="min-h-screen bg-navy pb-24 sm:pb-0">
      <BusinessJsonLd phone={phone} />
      <SiteHeader phone={phone} />

      <main className="bg-white">
        {/* Hero */}
        <section className="bg-gradient-to-b from-brand-50 to-slate-50">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:pb-14">
            <div>
              <p className="eyebrow">Local moving help · Essex &amp; Union County, NJ</p>
              <h1 className="mt-3 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                {offline ? "Moving help. One price, pay when it's done." : `Moving help in ${state}, by the hour.`}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                Local helpers in {state} to load, unload, pack, and carry the heavy stuff, by the hour. You bring the
                truck, our crew brings the muscle.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={PRIMARY_CTA.href} className="btn-primary min-h-14 px-8 text-lg sm:w-auto">
                  {PRIMARY_CTA.label}
                  <Icon name="arrow" className="h-5 w-5" />
                </Link>
                <a href={SECONDARY_CTA.href} className="btn-secondary min-h-14 px-8 text-lg sm:w-auto">
                  {SECONDARY_CTA.label}
                </a>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Free quotes need no account.
                {phone && (
                  <>
                    {" "}
                    Or call or text{" "}
                    <a href={`tel:${phone.e164}`} className="link">
                      {phone.display}
                    </a>
                    .
                  </>
                )}
              </p>
            </div>

            {/* Price preview card */}
            <div className="rounded-card border border-slate-200 bg-white p-6 shadow-float sm:p-8">
              <p className="text-sm font-semibold text-slate-500">Example: {smallMove.label.toLowerCase()}</p>
              <p className="mt-1 text-sm text-slate-500">
                {smallMove.helpers} helpers × {smallMove.hours} hours · {smallMove.note}
              </p>
              <p className="mt-4 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-slate-900">
                  {formatCents(smallMoveTotal)}
                </span>
                <span className="text-slate-500">total</span>
              </p>
              <ul className="mt-6 space-y-3 border-t border-slate-200 pt-6 text-slate-700">
                {[
                  `Anywhere in ${state}`,
                  "Same day or book ahead",
                  `1–4 helpers · ${MIN_JOB_HOURS}-hour minimum`,
                  offline ? "Pay at the end: cash, Cash App, or Zelle" : "Paid only after the job",
                ].map((x) => (
                  <li key={x} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                      <Icon name="check" className="h-4 w-4" />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
              <Link href={PRIMARY_CTA.href} className="btn-primary mt-7">
                {PRIMARY_CTA.label}
              </Link>
              <a href="#prices" className="mt-3 block text-center text-sm font-semibold text-brand-600 hover:underline">
                See all typical prices
              </a>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {trust.map(([icon, text]) => (
                <li
                  key={text}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-card"
                >
                  <Icon name={icon} className="h-5 w-5 shrink-0 text-brand-600" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Quick quote */}
        <section id="quote" className="scroll-mt-20 bg-white" aria-labelledby="quote-title">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="eyebrow">Free quote</p>
              <h2 id="quote-title" className="section-title mt-2">
                Get a free quote
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                Tell us about your move and we&apos;ll call or text you with a price and available times. No account, no
                commitment.
              </p>
              <ul className="mt-6 space-y-3 text-slate-700">
                {[
                  "Fast reply by call or text",
                  "The price we text you is the total. No hidden fees",
                  `${MIN_JOB_HOURS}-hour minimum, priced by the hour`,
                ].map((x) => (
                  <li key={x} className="flex items-start gap-3">
                    <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                    {x}
                  </li>
                ))}
                <li className="flex items-start gap-3">
                  <Icon name="pin" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  <span>
                    Serving{" "}
                    {TOWNS.slice(0, 4).map((t, i) => (
                      <span key={t.slug}>
                        {i > 0 && ", "}
                        <Link href={`/moving-help/${t.slug}`} className="link">
                          {t.name}
                        </Link>
                      </span>
                    ))}{" "}
                    &amp;{" "}
                    <Link href="/moving-help" className="link">
                      all of {state}
                    </Link>
                  </span>
                </li>
              </ul>
              {phone && (
                <div className="mt-8 rounded-card bg-slate-50 p-5">
                  <p className="font-semibold text-slate-900">Prefer to talk now?</p>
                  <ContactButtons phone={phone} className="mt-3" />
                </div>
              )}
            </div>
            <QuoteForm />
          </div>
        </section>

        {/* Why choose LiftCrew */}
        <section className="bg-slate-50" aria-labelledby="why">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="max-w-2xl">
              <p className="eyebrow">Why LiftCrew</p>
              <h2 id="why" className="section-title mt-2">
                Why choose LiftCrew?
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                Straightforward moving help from people in your area, with the price clear from the start.
              </p>
            </div>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {reasons.map(([icon, title, body]) => (
                <li key={title} className="card p-6">
                  <IconBadge name={icon} />
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 leading-relaxed text-slate-600">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 bg-white" aria-labelledby="how-title">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <p className="eyebrow">How it works</p>
            <h2 id="how-title" className="section-title mt-2">
              Booked in three steps
            </h2>
            <ol className="mt-10 grid gap-5 sm:grid-cols-3">
              {steps.map(([title, body], i) => (
                <li key={title} className="card p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 leading-relaxed text-slate-600">{body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href={PRIMARY_CTA.href} className="btn-primary sm:w-auto sm:px-8">
                {PRIMARY_CTA.label}
              </Link>
              <a href={SECONDARY_CTA.href} className="btn-secondary sm:w-auto sm:px-8">
                {SECONDARY_CTA.label}
              </a>
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="bg-slate-50" aria-labelledby="services">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <p className="eyebrow">Services</p>
            <h2 id="services" className="section-title mt-2">
              What our helpers do
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">
              Labor only. Rent a truck or container yourself (U-Haul, Penske, PODS) and we&apos;ll load and unload it.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              <div className="card p-6">
                <h3 className="font-semibold">Included</h3>
                <ul className="mt-2 divide-y divide-slate-200">
                  {ALLOWED_JOB_TYPES.map((t) => (
                    <li key={t} className="flex items-center gap-3 py-3 text-slate-700">
                      <Icon name="check" className="h-5 w-5 shrink-0 text-brand-600" />
                      {JOB_TYPE_LABELS[t]}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-6">
                <h3 className="font-semibold">Not included</h3>
                <ul className="mt-2 divide-y divide-slate-200 text-slate-500">
                  {[
                    "Driving your truck or belongings",
                    "Bringing a truck or trailer",
                    "Hauling, delivery, or storage",
                    `Moves outside ${state}`,
                  ].map((x) => (
                    <li key={x} className="flex items-center gap-3 py-3">
                      <Icon name="x" className="h-5 w-5 shrink-0 text-slate-400" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="prices" className="scroll-mt-20 bg-white" aria-labelledby="pricing">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="eyebrow">Pricing</p>
              <h2 id="pricing" className="section-title mt-2">
                Simple hourly pricing
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                {formatCents(SUGGESTED_RATE_CENTS)} an hour per helper is our suggested rate, and you can choose your
                own. Every job has a {MIN_JOB_HOURS}-hour minimum. The total you see, service fee included, is the total
                you pay{offline ? ": no deposit, nothing added later, and cancelling before the job is free." : "."}
              </p>
              <h3 className="mt-8 font-semibold">Typical prices</h3>
              <ul className="mt-3 divide-y divide-slate-200 rounded-card border border-slate-200 bg-white px-5 shadow-card">
                {TYPICAL_JOBS.map((j) => (
                  <li key={j.label} className="flex items-center justify-between gap-4 py-4">
                    <span>
                      <span className="block font-semibold text-slate-900">{j.label}</span>
                      <span className="block text-sm text-slate-500">
                        {j.helpers} helper{j.helpers > 1 ? "s" : ""} × {j.hours} hrs · {j.note}
                      </span>
                    </span>
                    <span className="shrink-0 text-lg font-bold text-slate-900">
                      {formatCents(
                        estimateJobPrice({
                          helpers: j.helpers,
                          hours: j.hours,
                          rateCents: SUGGESTED_RATE_CENTS,
                          feePercent,
                        }).totalCents,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">
                At {formatCents(SUGGESTED_RATE_CENTS)}/helper/hour, including the {feePercent}% service fee. Extra time
                is billed by the hour.
              </p>
            </div>
            <div className="rounded-card border border-slate-200 bg-white p-6 shadow-float sm:p-8">
              <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                {formatCents(EXAMPLE.rateCents)}
                <span className="text-base font-medium text-slate-500"> / helper / hour</span>
              </p>
              <dl className="mt-6 space-y-3 text-slate-700">
                <div className="flex justify-between">
                  <dt>
                    {EXAMPLE.helpers} helpers × {EXAMPLE.hours} hours
                  </dt>
                  <dd>{formatCents(example.laborCents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Service fee ({feePercent}%)</dt>
                  <dd>{formatCents(example.feeCents)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-4 text-lg font-bold text-slate-900">
                  <dt>Total</dt>
                  <dd>{formatCents(example.totalCents)}</dd>
                </div>
              </dl>
              <Link href={PRIMARY_CTA.href} className="btn-primary mt-7">
                {PRIMARY_CTA.label}
              </Link>
              <p className="mt-3 text-center text-sm text-slate-500">
                {offline ? "No payment now. Pay after the job." : "Paid only after the job is done."}
              </p>
            </div>
          </div>
        </section>

        {/* Helpers */}
        <section className="bg-white" aria-labelledby="helpers">
          <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
            <div className="rounded-card bg-navy p-8 sm:flex sm:items-center sm:justify-between sm:gap-10 sm:p-12">
              <div>
                <h2 id="helpers" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Strong and reliable? Earn by the hour.
                </h2>
                <p className="mt-3 max-w-xl leading-relaxed text-slate-300">
                  Pick the jobs you want near home, set your own hours, and get rated for great work. No truck needed.
                  You must live in {state} and be 18 or older.
                  {offline
                    ? " Customers pay you in person at the end of each job."
                    : " Get paid to your bank through Stripe."}
                </p>
              </div>
              <Link href="/login?intent=helper" className="btn-on-dark mt-6 shrink-0 sm:mt-0 sm:w-auto sm:px-8">
                Become a helper
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-slate-50" aria-labelledby="faq">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <p className="eyebrow text-center">FAQ</p>
            <h2 id="faq" className="section-title mt-2 text-center">
              Questions, answered
            </h2>
            <div className="mt-10 divide-y divide-slate-200 rounded-card border border-slate-200 bg-white px-5 shadow-card sm:px-6">
              {faqs.map(([q, a]) => (
                <details key={q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg font-semibold text-slate-900">
                    {q}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-xl text-brand-600 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-slate-600">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
            <h2 className="section-title">Ready to move?</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-slate-600">
              Book local helpers in a few minutes, or get a free quote by call or text.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={PRIMARY_CTA.href} className="btn-primary min-h-14 px-8 text-lg sm:w-auto">
                {PRIMARY_CTA.label}
              </Link>
              <a href={SECONDARY_CTA.href} className="btn-secondary min-h-14 px-8 text-lg sm:w-auto">
                {SECONDARY_CTA.label}
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter phone={phone} state={state} />
      <MobileCtaBar />
    </div>
  );
}
