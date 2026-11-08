import Link from "next/link";
import type { Metadata } from "next";
import QuoteForm from "@/components/QuoteForm";
import BusinessJsonLd from "@/components/BusinessJsonLd";
import MarketingShell from "@/components/MarketingShell";
import Icon, { IconBadge } from "@/components/Icon";
import { PRIMARY_CTA, SECONDARY_CTA } from "@/lib/cta";
import { parseBusinessPhone } from "@/lib/contact";
import { envValue } from "@/lib/env";
import { TOWNS } from "@/lib/towns";

export const metadata: Metadata = {
  title: "Moving Help in Essex & Union County, NJ | LiftCrew",
  description:
    "Hourly moving labor from our base in Irvington, NJ: Newark, Union, Maplewood, East Orange, Hillside, South Orange, Orange, and the rest of New Jersey. You bring the truck, we do the lifting.",
  alternates: { canonical: "/moving-help" },
  openGraph: {
    title: "Moving Help in Essex & Union County, NJ | LiftCrew",
    description: "Local moving labor by the hour. One price, pay when it's done.",
    url: "/moving-help",
    siteName: "LiftCrew",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function AreasPage() {
  const phone = parseBusinessPhone(envValue("BUSINESS_PHONE"));
  const counties = ["Essex", "Union"] as const;
  return (
    <MarketingShell
      phone={phone}
      hero={
        <section className="pb-14 pt-10 sm:pt-14">
          <p className="eyebrow">Essex &amp; Union County, NJ</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Areas we serve</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
            LiftCrew is based in Irvington, NJ. We provide labor-only moving help across Essex and Union County and
            anywhere in New Jersey: loading and unloading trucks, packing, and heavy lifting, by the hour.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={PRIMARY_CTA.href} className="btn-primary min-h-14 px-8 text-lg sm:w-auto">
              {PRIMARY_CTA.label}
            </Link>
            <a href={SECONDARY_CTA.href} className="btn-secondary min-h-14 px-8 text-lg sm:w-auto">
              {SECONDARY_CTA.label}
            </a>
          </div>
        </section>
      }
    >
      <BusinessJsonLd phone={phone} />
      {counties.map((c) => (
        <section key={c} className="border-t border-slate-200 py-12 first:border-t-0">
          <h2 className="section-title">{c} County</h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {TOWNS.filter((t) => t.county === c).map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/moving-help/${t.slug}`}
                  className="group flex h-full gap-4 rounded-card border border-slate-200 bg-white p-6 shadow-card transition hover:border-brand-600"
                >
                  <IconBadge name="pin" />
                  <span>
                    <span className="flex items-center gap-2 font-semibold text-slate-900 group-hover:text-brand-600">
                      Moving help in {t.name}, NJ
                      <Icon name="arrow" className="h-4 w-4" />
                    </span>
                    <span className="mt-1 block leading-relaxed text-slate-600">{t.blurb}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section id="quote" className="scroll-mt-20 border-t border-slate-200 py-14">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="section-title">Don&apos;t see your town?</h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              We work anywhere in New Jersey. Send a quote request and we&apos;ll call or text you with a price and
              available times.
            </p>
          </div>
          <QuoteForm />
        </div>
      </section>
    </MarketingShell>
  );
}
