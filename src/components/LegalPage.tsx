import Link from "next/link";
import type { ReactNode } from "react";
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
    <main className="legal mx-auto max-w-2xl space-y-4 px-4 py-10 text-sm leading-relaxed text-slate-700">
      <Link href="/" className="text-sm font-semibold uppercase tracking-wide text-brand-600">
        LiftCrew
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="text-xs text-slate-500">Effective {LEGAL_EFFECTIVE_DATE}</p>
      {intro}
      {children}
      <nav className="border-t border-slate-200 pt-4 text-xs" aria-label="Legal">
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {LEGAL_DOCS.map((d) => (
            <li key={d.href}>
              <Link href={d.href} className="underline">
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
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
