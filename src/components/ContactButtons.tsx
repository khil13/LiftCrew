import type { BusinessPhone } from "@/lib/contact";

const SMS_BODY = encodeURIComponent("Hi LiftCrew, I need moving help.");

/** Tap-to-call and tap-to-text links. Renders nothing when no business phone is configured. */
export default function ContactButtons({ phone, className = "" }: { phone: BusinessPhone | null; className?: string }) {
  if (!phone) return null;
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {/* "?&body=" works on both iOS and Android. */}
      <a href={`sms:${phone.e164}?&body=${SMS_BODY}`} className="btn-primary">
        Text us
      </a>
      <a href={`tel:${phone.e164}`} className="btn-secondary">
        Call us
      </a>
    </div>
  );
}
