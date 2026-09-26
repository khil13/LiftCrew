import Link from "next/link";
import { requireOnboarded } from "@/lib/auth";

export default async function SettingsPage() {
  const { profile, email, phone } = await requireOnboarded();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Settings</h1>
      <div className="card space-y-1 text-sm">
        <p className="font-semibold">{profile.full_name}</p>
        <p className="capitalize text-slate-600">{profile.role}</p>
        {email && <p className="text-slate-600">{email}</p>}
        {(profile.phone || phone) && <p className="text-slate-600">{profile.phone || phone}</p>}
        {profile.role === "helper" && (
          <Link href="/onboarding/helper" className="inline-block pt-1 font-semibold text-brand-600">
            Edit helper profile
          </Link>
        )}
        {profile.role === "company" && (
          <Link href="/onboarding/company" className="inline-block pt-1 font-semibold text-brand-600">
            Edit company details
          </Link>
        )}
      </div>
      <Link href="/terms" className="card block text-sm font-medium">
        Terms of Service
      </Link>
      <form action="/auth/signout" method="post">
        <button className="btn-secondary">Sign out</button>
      </form>
    </div>
  );
}
