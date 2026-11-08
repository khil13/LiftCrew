"use client";

import { useFormStatus } from "react-dom";

/** Primary submit button that shows a spinner and pending text while the form is sending. */
export default function SubmitButton({ children, pendingText }: { children: React.ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending} aria-busy={pending}>
      {pending && <Spinner />}
      {pending ? (pendingText ?? "Saving…") : children}
    </button>
  );
}

export function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin motion-reduce:hidden" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
