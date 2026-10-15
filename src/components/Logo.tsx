/** LiftCrew mark (the moving box from the app icon) plus wordmark. */
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 512 512" className="h-8 w-8" aria-hidden>
        <rect width="512" height="512" rx="112" fill="#1d4ed8" />
        <path d="M136 208 256 152l120 56v140l-120 56-120-56z" fill="#fff" />
        <path
          d="M136 208l120 56 120-56M256 264v140"
          fill="none"
          stroke="#1d4ed8"
          strokeWidth="18"
          strokeLinejoin="round"
        />
        <path d="M196 180l120 56" fill="none" stroke="#1d4ed8" strokeWidth="18" strokeLinecap="round" />
      </svg>
      <span className="text-xl font-bold tracking-tight text-brand-600">LiftCrew</span>
    </span>
  );
}
