import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: { intent?: string } }) {
  if (await getSession()) redirect("/home");
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-bold">Sign in to LiftCrew</h1>
      <p className="mt-1 text-sm text-slate-600">
        We&apos;ll send you a one-time code. New here? This creates your account.
      </p>
      <div className="mt-6">
        <LoginForm intent={searchParams.intent === "helper" ? "helper" : undefined} />
      </div>
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
  );
}
