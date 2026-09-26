"use client";

import { useFormState, useFormStatus } from "react-dom";

type State = { error?: string; ok?: boolean };

function Button({ label, variant }: { label: string; variant: "primary" | "secondary" | "danger" }) {
  const { pending } = useFormStatus();
  const cls =
    variant === "primary"
      ? "btn-primary"
      : variant === "danger"
        ? "btn-secondary border-red-200 text-red-700 hover:bg-red-50"
        : "btn-secondary";
  return (
    <button type="submit" className={`${cls} py-2 text-sm`} disabled={pending}>
      {pending ? "…" : label}
    </button>
  );
}

/** A one-button form that runs a server action and shows its error inline. */
export default function ActionForm({
  action,
  fields,
  label,
  variant = "secondary",
  confirm,
  children,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  fields: Record<string, string>;
  label: string;
  variant?: "primary" | "secondary" | "danger";
  confirm?: string;
  children?: React.ReactNode;
}) {
  const [state, formAction] = useFormState(action, {});
  return (
    <form
      action={formAction}
      className="flex-1 space-y-2"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      <Button label={label} variant={variant} />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
