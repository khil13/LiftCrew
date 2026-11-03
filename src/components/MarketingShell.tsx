import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/Logo";
import type { BusinessPhone } from "@/lib/contact";
import { LEGAL_DOCS, SUPPORT_EMAIL } from "@/lib/legal";
import { TOWNS } from "@/lib/towns";

/** Header and footer for public marketing pages outside the landing page. */
export default function MarketingShell({ phone, children }: { phone: BusinessPhone | null; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:h-20 sm:px-6">
          <Link href="/" aria-label="LiftCrew home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-2 text-sm font-semibold">
            {phone && (
              <a
                href={`tel:${phone.e164}`}
                className="hidden rounded-full px-3 py-2.5 hover:bg-slate-50 sm:inline-block"
              >
                {phone.display}
              </a>
            )}
            <a href="#quote" className="rounded-full bg-brand-600 px-4 py-2.5 text-white hover:bg-brand-700">
              Free quote
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 sm:px-6">{children}</main>
      <footer className="mt-12 border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-10 text-sm sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <Logo />
              <p className="mt-3 text-slate-500">
                A labor-only marketplace based in Irvington, NJ. Not a moving company or broker. You provide the truck.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Areas we serve</h3>
              <ul className="mt-3 grid grid-cols-2 gap-2 text-slate-500">
                {TOWNS.map((t) => (
                  <li key={t.slug}>
                    <Link href={`/moving-help/${t.slug}`} className="hover:underline">
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">LiftCrew</h3>
              <ul className="mt-3 space-y-2 text-slate-500">
                <li>
                  <Link href="/login?intent=hire" className="hover:underline">
                    Book helpers in the app
                  </Link>
                </li>
                {phone && (
                  <li>
                    <a href={`tel:${phone.e164}`} className="hover:underline">
                      {phone.display}
                    </a>
                  </li>
                )}
                <li>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:underline">
                    {SUPPORT_EMAIL}
                  </a>
                </li>
                {LEGAL_DOCS.slice(0, 2).map((d) => (
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
            © {new Date().getFullYear()} LiftCrew · New Jersey
          </p>
        </div>
      </footer>
    </div>
  );
}
