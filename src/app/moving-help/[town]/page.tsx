import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import QuoteForm from "@/components/QuoteForm";
import ContactButtons from "@/components/ContactButtons";
import BusinessJsonLd from "@/components/BusinessJsonLd";
import MarketingShell from "@/components/MarketingShell";
import Icon from "@/components/Icon";
import { PRIMARY_CTA, SECONDARY_CTA } from "@/lib/cta";
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

  const hero = (
    <>
      <nav className="pt-6 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-slate-900 hover:underline">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/moving-help" className="hover:text-slate-900 hover:underline">
          Areas we serve
        </Link>{" "}
        / <span className="font-medium text-slate-900">{town.name}</span>
      </nav>

      <section className="pb-14 pt-6 sm:pt-10">
        <p className="eyebrow">
          {town.name}, {town.county} County, NJ
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Moving help in {town.name}, NJ
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">{town.intro}</p>
        <p className="mt-4 max-w-2xl text-xl font-bold text-brand-600">One price, pay when it&apos;s done.</p>
        <ul className="mt-6 flex flex-wrap gap-2 text-sm">
          {[
            "Pay when it's done",
            "No deposit",
            "No hidden fees",
            "Free cancellation",
            `${MIN_JOB_HOURS}-hour minimum`,
            "Labor only: you bring the truck",
          ].map((b) => (
            <li
              key={b}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-900"
            >
              <Icon name="check" className="h-4 w-4 text-brand-600" />
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={PRIMARY_CTA.href} className="btn-primary min-h-14 px-8 text-lg sm:w-auto">
            {PRIMARY_CTA.label}
          </Link>
          <a href={SECONDARY_CTA.href} className="btn-secondary min-h-14 px-8 text-lg sm:w-auto">
            {SECONDARY_CTA.label}
          </a>
        </div>
        <ContactButtons phone={phone} className="mt-3 sm:max-w-md" />
      </section>
    </>
  );

  return (
    <MarketingShell phone={phone} hero={hero}>
      <BusinessJsonLd phone={phone} town={town.name} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />

      <section className="border-t border-slate-200 py-14" aria-labelledby="local">
        <h2 id="local" className="section-title">
          Moving in {town.name}: what to know
        </h2>
        <ul className="mt-6 max-w-3xl space-y-4 text-lg leading-relaxed text-slate-700">
          {town.local.map((l) => (
            <li key={l} className="flex gap-3">
              <Icon name="check" className="mt-1 h-5 w-5 shrink-0 text-brand-600" />
              <span>{l}</span>
            </li>
          ))}
        </ul>
        <h3 className="mt-8 font-semibold">Areas of {town.name} we cover</h3>
        <p className="mt-2 text-slate-500">
          {town.areas.join(" · ")}, and the rest of {town.name}.
        </p>
      </section>

      <section className="border-t border-slate-200 py-14" aria-labelledby="services">
        <h2 id="services" className="section-title">
          What our {town.name} helpers do
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(([t, d]) => (
            <div key={t} className="card">
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-sm text-slate-500">
          LiftCrew is a labor-only marketplace, not a moving company or broker. Helpers don&apos;t drive, haul, or
          transport your belongings. Both addresses on a job must be in New Jersey.
        </p>
      </section>

      <section id="quote" className="scroll-mt-20 border-t border-slate-200 py-14" aria-labelledby="quote-title">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 id="quote-title" className="section-title">
              Get a free quote in {town.name}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Tell us about your move and we&apos;ll call or text you with a price and available times. No account, no
              commitment.
            </p>
            <p className="mt-3 text-sm">
              <Link href="/#prices" className="link">
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

      <section className="border-t border-slate-200 py-14" aria-labelledby="faq">
        <h2 id="faq" className="section-title">
          {town.name} moving help questions
        </h2>
        <div className="mt-8 max-w-3xl divide-y divide-slate-200 rounded-card border border-slate-200 bg-white px-5 shadow-card sm:px-6">
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
      </section>

      <section className="border-t border-slate-200 py-14" aria-labelledby="nearby">
        <h2 id="nearby" className="section-title">
          Also serving near {town.name}
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {nearby.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/moving-help/${t.slug}`}
                className="flex items-center justify-between gap-2 rounded-card border border-slate-200 bg-white p-4 font-semibold text-slate-900 shadow-card transition hover:border-brand-600 hover:text-brand-600"
              >
                Moving help in {t.name}
                <Icon name="arrow" className="h-4 w-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          <Link href="/moving-help" className="link">
            See all areas we serve
          </Link>
        </p>
      </section>
    </MarketingShell>
  );
}
