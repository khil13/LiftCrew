import Link from "next/link";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import Icon from "@/components/Icon";
import { getSession } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: { intent?: string } }) {
  if (await getSession()) redirect("/home");
  const helper = searchParams.intent === "helper";
  const hire = searchParams.intent === "hire";
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-slate-50">
      <main className="mx-auto max-w-md px-4 py-10 sm:py-16">
        <Link href="/" aria-label="LiftCrew home" className="inline-block rounded-lg">
          <Logo />
        </Link>
        <div className="mt-8 rounded-card border border-slate-200 bg-white p-6 shadow-float sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">
            {helper ? "Become a LiftCrew helper" : hire ? "Book moving help" : "Sign in to LiftCrew"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            We&apos;ll send you a one-time code. New here? This creates your account.
          </p>
          <div className="mt-6">
            <LoginForm intent={helper ? "helper" : undefined} />
          </div>
        </div>
        {!helper && (
          <ul className="mt-6 space-y-2 text-sm text-slate-600">
            {[
              "No password to remember",
              "Your price is shown before you book",
              "Rather not sign up? Get a free quote",
            ].map((x, i) => (
              <li key={x} className="flex items-center gap-2">
                <Icon name="check" className="h-4 w-4 shrink-0 text-brand-600" />
                {i === 2 ? (
                  <span>
                    Rather not sign up?{" "}
                    <Link href="/#quote" className="link">
                      Get a Free Quote
                    </Link>
                  </span>
                ) : (
                  x
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-xs text-slate-500">
          By continuing, you agree to the{" "}
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          . You must be 18 or older.
        </p>
      </main>
    </div>
  );
}
