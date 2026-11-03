import Link from "next/link";
import type { Metadata } from "next";
import QuoteForm from "@/components/QuoteForm";
import BusinessJsonLd from "@/components/BusinessJsonLd";
import MarketingShell from "@/components/MarketingShell";
import { parseBusinessPhone } from "@/lib/contact";
import { envValue } from "@/lib/env";
import { TOWNS } from "@/lib/towns";

export const metadata: Metadata = {
  title: "Moving Help in Essex & Union County, NJ | LiftCrew",
  description:
    "Hourly moving labor from our base in Irvington, NJ: Newark, Union, Maplewood, East Orange, Hillside, South Orange, Orange, and the rest of New Jersey. You bring the truck, we do the lifting.",
  alternates: { canonical: "/moving-help" },
};

export default function AreasPage() {
  const phone = parseBusinessPhone(envValue("BUSINESS_PHONE"));
  const counties = ["Essex", "Union"] as const;
  return (
    <MarketingShell phone={phone}>
      <BusinessJsonLd phone={phone} />
      <section className="pb-8 pt-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Areas we serve</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-500">
          LiftCrew is based in Irvington, NJ. We provide labor-only moving help across Essex and Union County and
          anywhere in New Jersey: loading and unloading trucks, packing, and heavy lifting, by the hour.
        </p>
      </section>
      {counties.map((c) => (
        <section key={c} className="border-t border-slate-200 py-8">
          <h2 className="text-2xl font-bold tracking-tight">{c} County</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {TOWNS.filter((t) => t.county === c).map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/moving-help/${t.slug}`}
                  className="block h-full rounded-card border border-slate-200 p-5 transition-shadow hover:shadow-float"
                >
                  <span className="font-semibold">Moving help in {t.name}, NJ</span>
                  <span className="mt-1 block text-sm leading-relaxed text-slate-500">{t.blurb}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section id="quote" className="scroll-mt-6 border-t border-slate-200 py-10">
        <div className="grid gap-8 sm:grid-cols-2 sm:items-start">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Don&apos;t see your town?</h2>
            <p className="mt-3 leading-relaxed text-slate-500">
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
