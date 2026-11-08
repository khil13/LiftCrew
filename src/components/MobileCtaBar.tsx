import Link from "next/link";
import { PRIMARY_CTA, SECONDARY_CTA } from "@/lib/cta";

/** Phone-only bar pinned to the bottom so booking is always one tap away. Pages add bottom padding for it. */
export default function MobileCtaBar({ quoteHref = SECONDARY_CTA.href }: { quoteHref?: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(32,43,69,0.08)] backdrop-blur sm:hidden">
      <div className="grid grid-cols-2 gap-3">
        <a href={quoteHref} className="btn-secondary min-h-12 px-3 text-[15px]">
          {SECONDARY_CTA.label}
        </a>
        <Link href={PRIMARY_CTA.href} className="btn-primary min-h-12 px-3 text-[15px]">
          {PRIMARY_CTA.label}
        </Link>
      </div>
    </div>
  );
}
