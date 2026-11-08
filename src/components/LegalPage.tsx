import Link from "next/link";
import type { ReactNode } from "react";
import MarketingShell from "@/components/MarketingShell";
import { parseBusinessPhone } from "@/lib/contact";
import { envValue } from "@/lib/env";
import { LEGAL_DOCS, LEGAL_EFFECTIVE_DATE } from "@/lib/legal";

export default function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <MarketingShell phone={parseBusinessPhone(envValue("BUSINESS_PHONE"))} quoteHref="/#quote">
      <article className="legal mx-auto max-w-2xl space-y-4 py-10 text-sm leading-relaxed text-slate-700 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-xs text-slate-500">Effective {LEGAL_EFFECTIVE_DATE}</p>
        {intro}
        {children}
        <nav className="border-t border-slate-200 pt-4 text-xs" aria-label="Legal">
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {LEGAL_DOCS.map((d) => (
              <li key={d.href}>
                <Link href={d.href} className="text-brand-600 underline underline-offset-2">
                  {d.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </MarketingShell>
  );
}

/** A numbered section heading plus body. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="pt-2 text-base font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}
