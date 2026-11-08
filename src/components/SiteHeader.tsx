import Link from "next/link";
import Logo from "@/components/Logo";
import Icon from "@/components/Icon";
import type { BusinessPhone } from "@/lib/contact";
import { PRIMARY_CTA } from "@/lib/cta";

const NAV = [
  { href: "/#how", label: "How it works" },
  { href: "/#prices", label: "Prices" },
  { href: "/moving-help", label: "Areas" },
  { href: "/login?intent=helper", label: "Become a helper" },
];

/** Sticky header for every public page: logo, page links, phone, sign in and the booking button. */
export default function SiteHeader({ phone }: { phone: BusinessPhone | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-6">
        <Link href="/" aria-label="LiftCrew home" className="shrink-0 rounded-lg">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 text-sm font-medium text-slate-700 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 hover:bg-slate-50 hover:text-slate-900">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 text-sm font-semibold sm:gap-2">
          {phone && (
            <a
              href={`tel:${phone.e164}`}
              className="flex h-11 items-center gap-2 rounded-lg px-3 text-slate-900 hover:bg-slate-50"
              aria-label={`Call LiftCrew at ${phone.display}`}
            >
              <Icon name="phone" className="h-5 w-5 text-brand-600" />
              <span className="hidden xl:inline">{phone.display}</span>
            </a>
          )}
          <Link href="/login" className="flex h-11 items-center rounded-lg px-3 text-slate-900 hover:bg-slate-50">
            Sign in
          </Link>
          <Link href={PRIMARY_CTA.href} className="btn-primary hidden min-h-11 w-auto px-5 py-2 text-sm sm:inline-flex">
            {PRIMARY_CTA.label}
          </Link>
        </div>
      </div>
    </header>
  );
}
