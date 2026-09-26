"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({ children, pendingText }: { children: React.ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? (pendingText ?? "Saving…") : children}
    </button>
  );
}
