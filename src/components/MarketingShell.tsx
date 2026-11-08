import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MobileCtaBar from "@/components/MobileCtaBar";
import type { BusinessPhone } from "@/lib/contact";

/**
 * Header, footer and mobile booking bar for public marketing pages outside the landing page.
 * `hero` renders full width on the light-blue band; children sit in the page container.
 */
export default function MarketingShell({
  phone,
  hero,
  quoteHref = "#quote",
  children,
}: {
  phone: BusinessPhone | null;
  hero?: ReactNode;
  /** Where "Get a Free Quote" goes; pages without a quote form use "/#quote". */
  quoteHref?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-navy pb-24 sm:pb-0">
      <SiteHeader phone={phone} />
      <main className="bg-white">
        {hero && (
          <div className="bg-gradient-to-b from-brand-50 to-slate-50">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">{hero}</div>
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">{children}</div>
      </main>
      <SiteFooter phone={phone} />
      <MobileCtaBar quoteHref={quoteHref} />
    </div>
  );
}
