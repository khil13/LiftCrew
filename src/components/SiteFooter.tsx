import Link from "next/link";
import Logo from "@/components/Logo";
import type { BusinessPhone } from "@/lib/contact";
import { PRIMARY_CTA } from "@/lib/cta";
import { LEGAL_DOCS, SUPPORT_EMAIL } from "@/lib/legal";
import { TOWNS } from "@/lib/towns";

/** Navy footer shared by every public page. */
export default function SiteFooter({ phone, state = "New Jersey" }: { phone: BusinessPhone | null; state?: string }) {
  const link = "rounded hover:text-white hover:underline underline-offset-4";
  return (
    <footer className="bg-navy text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-12 text-sm sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo tone="light" />
            <p className="mt-4 leading-relaxed">
              Local, labor-only moving help based in Irvington, NJ. You bring the truck, we do the heavy lifting.
            </p>
            <p className="mt-3 text-xs">A labor-only marketplace in {state}. Not a moving company or broker.</p>
          </div>
          <div>
            <h2 className="font-semibold text-white">LiftCrew</h2>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href={PRIMARY_CTA.href} className={link}>
                  {PRIMARY_CTA.label}
                </Link>
              </li>
              <li>
                <Link href="/#quote" className={link}>
                  Get a Free Quote
                </Link>
              </li>
              <li>
                <Link href="/login?intent=helper" className={link}>
                  Become a helper
                </Link>
              </li>
              {phone && (
                <li>
                  <a href={`tel:${phone.e164}`} className={link}>
                    {phone.display}
                  </a>
                </li>
              )}
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`} className={link}>
                  {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="font-semibold text-white">Areas we serve</h2>
            <ul className="mt-4 space-y-3">
              {TOWNS.map((t) => (
                <li key={t.slug}>
                  <Link href={`/moving-help/${t.slug}`} className={link}>
                    Moving help in {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold text-white">Legal</h2>
            <ul className="mt-4 space-y-3">
              {LEGAL_DOCS.map((d) => (
                <li key={d.href}>
                  <Link href={d.href} className={link}>
                    {d.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-10 border-t border-white/10 pt-6 text-xs">
          © {new Date().getFullYear()} LiftCrew · {state}
        </p>
      </div>
    </footer>
  );
}
