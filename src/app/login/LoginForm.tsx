"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Method = "email" | "phone";

/** Normalizes a US phone number to E.164 (+1XXXXXXXXXX), or null. */
function toE164(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export default function LoginForm({ intent }: { intent?: "helper" }) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("email");
  const [identifier, setIdentifier] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    let target = identifier.trim();
    if (method === "phone") {
      const phone = toE164(target);
      if (!phone) return setError("Enter a 10-digit US phone number.");
      target = phone;
    }
    setBusy(true);
    const { error } =
      method === "email"
        ? await supabase.auth.signInWithOtp({
            email: target,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
          })
        : await supabase.auth.signInWithOtp({ phone: target });
    setBusy(false);
    if (error) return setError(error.message);
    setSentTo(target);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!sentTo) return;
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } =
      method === "email"
        ? await supabase.auth.verifyOtp({ email: sentTo, token: code.trim(), type: "email" })
        : await supabase.auth.verifyOtp({ phone: sentTo, token: code.trim(), type: "sms" });
    setBusy(false);
    if (error) return setError(error.message);
    router.replace(intent ? `/onboarding?intent=${intent}` : "/onboarding");
    router.refresh();
  }

  if (sentTo) {
    return (
      <form onSubmit={verifyCode} className="space-y-4">
        <p className="text-sm text-slate-600">
          Enter the code we sent to <span className="font-medium text-slate-900">{sentTo}</span>.
          {method === "email" && " You can also tap the link in the email."}
        </p>
        <div>
          <label htmlFor="code" className="label">
            Code
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="input tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary" disabled={busy}>
          {busy ? "Checking…" : "Continue"}
        </button>
        <button type="button" className="w-full text-sm text-slate-600 underline" onClick={() => setSentTo(null)}>
          Use a different {method === "email" ? "email" : "number"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={sendCode} className="space-y-4">
      <div className="grid grid-cols-2 rounded-lg bg-slate-200 p-1 text-sm font-medium">
        {(["email", "phone"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMethod(m);
              setIdentifier("");
              setError(null);
            }}
            className={`rounded-md py-2 ${method === m ? "bg-white shadow-sm" : "text-slate-600"}`}
          >
            {m === "email" ? "Email" : "Phone"}
          </button>
        ))}
      </div>
      <div>
        <label htmlFor="identifier" className="label">
          {method === "email" ? "Email address" : "Mobile number"}
        </label>
        <input
          id="identifier"
          type={method === "email" ? "email" : "tel"}
          autoComplete={method === "email" ? "email" : "tel"}
          className="input"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={method === "email" ? "you@example.com" : "(555) 123-4567"}
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary" disabled={busy}>
        {busy ? "Sending…" : "Send code"}
      </button>
    </form>
  );
}
