import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import QuoteForm from "@/components/QuoteForm";
import ContactButtons from "@/components/ContactButtons";
import BusinessJsonLd from "@/components/BusinessJsonLd";
import MarketingShell from "@/components/MarketingShell";
import { parseBusinessPhone } from "@/lib/contact";
import { envValue } from "@/lib/env";
import { MIN_JOB_HOURS } from "@/lib/pricing";
import { HOME_BASE, TOWNS, getTown } from "@/lib/towns";

export const dynamicParams = false;

// The payment promises on these static pages ("pay when it's done", "no
// deposit", "free cancellation") match pay-in-person mode. Update them if
// payments move to Stripe at booking.

export function generateStaticParams() {
  return TOWNS.map((t) => ({ town: t.slug }));
}

export function generateMetadata({ params }: { params: { town: string } }): Metadata {
  const town = getTown(params.town);
  if (!town) return {};
  const title = `Moving Help & Labor in ${town.name}, NJ | LiftCrew`;
  const description = `${town.blurb} One price, pay when it's done: no deposit, no hidden fees, free cancellation. ${MIN_JOB_HOURS}-hour minimum. You bring the truck.`;
  const path = `/moving-help/${town.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: "LiftCrew", type: "website" },
    twitter: { card: "summary_large_image" },
  };
}

const SERVICES = [
  ["Truck loading", "We pack your rental truck, trailer, or container tightly so nothing shifts."],
  ["Truck unloading", "We carry everything into your new place and put it in the right rooms."],
  ["Packing & unpacking", "You supply boxes and tape; we pack, label, and unpack."],
  ["Heavy lifting", "Couches, dressers, mattresses, and appliances, up and down stairs."],
  ["Furniture assembly", "Beds, tables, and shelving taken apart and put back together."],
  ["Moving within a home", "Rearranging rooms or moving items between floors."],
];

export default function TownPage({ params }: { params: { town: string } }) {
  const town = getTown(params.town);
  if (!town) notFound();
  const phone = parseBusinessPhone(envValue("BUSINESS_PHONE"));
  const nearby = town.nearby.map(getTown).filter((t) => t !== undefined);
  const faqs: [string, string][] = [
    ...town.faqs,
    [
      "Do you bring a truck?",
      `No. LiftCrew is labor only. You rent or provide the truck, trailer, or container and do all the driving. Our helpers load, unload, pack, and carry.`,
    ],
    [
      `How much does moving help in ${town.name} cost?`,
      `You pay by the hour for each helper, with a ${MIN_JOB_HOURS}-hour minimum. Send a quote request with your move details and we'll text you one total price. There's no deposit and no hidden fees: you pay at the end of the job by cash, Cash App, or Zelle, and cancelling before the job is free.`,
    ],
  ];
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <MarketingShell phone={phone}>
      <BusinessJsonLd phone={phone} town={town.name} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />

      <nav className="pt-6 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/moving-help" className="hover:underline">
          Areas we serve
        </Link>{" "}
        / <span className="text-slate-900">{town.name}</span>
      </nav>

      <section className="pb-10 pt-6 sm:pt-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          {town.name}, {town.county} County, NJ
        </p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">Moving help in {town.name}, NJ</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-500">{town.intro}</p>
        <p className="mt-3 max-w-2xl text-lg font-semibold">One price, pay when it&apos;s done.</p>
        <ul className="mt-6 flex flex-wrap gap-2 text-sm">
          {[
            "Pay when it's done",
            "No deposit",
            "No hidden fees",
            "Free cancellation",
            `${MIN_JOB_HOURS}-hour minimum`,
            "Labor only: you bring the truck",
          ].map((b) => (
            <li key={b} className="rounded-full border border-slate-200 px-3 py-1.5 font-medium">
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:max-w-md">
          <a href="#quote" className="btn-primary">
            Get a free quote
          </a>
          <ContactButtons phone={phone} />
        </div>
      </section>

      <section className="border-t border-slate-200 py-10" aria-labelledby="local">
        <h2 id="local" className="text-2xl font-bold tracking-tight">
          Moving in {town.name}: what to know
        </h2>
        <ul className="mt-4 max-w-3xl space-y-3 leading-relaxed text-slate-700">
          {town.local.map((l) => (
            <li key={l} className="flex gap-3">
              <span className="mt-1 text-brand-600" aria-hidden>
                ✓
              </span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
        <h3 className="mt-8 font-semibold">Areas of {town.name} we cover</h3>
        <p className="mt-2 text-slate-500">
          {town.areas.join(" · ")}, and the rest of {town.name}.
        </p>
      </section>

      <section className="border-t border-slate-200 py-10" aria-labelledby="services">
        <h2 id="services" className="text-2xl font-bold tracking-tight">
          What our {town.name} helpers do
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {SERVICES.map(([t, d]) => (
            <div key={t} className="rounded-card border border-slate-200 p-5">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-sm text-slate-500">
          LiftCrew is a labor-only marketplace, not a moving company or broker. Helpers don&apos;t drive, haul, or
          transport your belongings. Both addresses on a job must be in New Jersey.
        </p>
      </section>

      <section id="quote" className="scroll-mt-6 border-t border-slate-200 py-10" aria-labelledby="quote-title">
        <div className="grid gap-8 sm:grid-cols-2 sm:items-start">
          <div>
            <h2 id="quote-title" className="text-2xl font-bold tracking-tight">
              Get a free quote in {town.name}
            </h2>
            <p className="mt-3 leading-relaxed text-slate-500">
              Tell us about your move and we&apos;ll call or text you with a price and available times. No account, no
              commitment.
            </p>
            <p className="mt-3 text-sm">
              <Link href="/#prices" className="font-semibold underline underline-offset-4">
                See typical prices
              </Link>
            </p>
            {town.name !== HOME_BASE && (
              <p className="mt-3 text-sm text-slate-500">
                We&apos;re based in nearby {HOME_BASE}, so {town.name} is part of our regular service area.
              </p>
            )}
          </div>
          <QuoteForm defaultTown={`${town.name}, NJ`} />
        </div>
      </section>

      <section className="border-t border-slate-200 py-10" aria-labelledby="faq">
        <h2 id="faq" className="text-2xl font-bold tracking-tight">
          {town.name} moving help questions
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
      </section>

      <section className="border-t border-slate-200 py-10" aria-labelledby="nearby">
        <h2 id="nearby" className="text-2xl font-bold tracking-tight">
          Also serving near {town.name}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-4">
          {nearby.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/moving-help/${t.slug}`}
                className="block rounded-card border border-slate-200 p-4 font-semibold transition-shadow hover:shadow-float"
              >
                Moving help in {t.name}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <Link href="/moving-help" className="font-semibold underline underline-offset-4">
            See all areas we serve
          </Link>
        </p>
      </section>
    </MarketingShell>
  );
}
