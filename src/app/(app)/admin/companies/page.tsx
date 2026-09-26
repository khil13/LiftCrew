import ActionForm from "@/components/ActionForm";
import { createClient } from "@/lib/supabase/server";
import { setCompanyApproved } from "../actions";

type CompanyRow = {
  id: string;
  business_name: string;
  license_number: string | null;
  website: string | null;
  transport_credentials: string | null;
  is_approved: boolean;
  profile: { full_name: string; city: string | null; created_at: string } | null;
};

export default async function AdminCompanies() {
  const { data } = await createClient()
    .from("companies")
    .select(
      "id, business_name, license_number, website, transport_credentials, is_approved, profile:profiles(full_name, city, created_at)",
    )
    .order("is_approved")
    .limit(200);
  const companies = (data ?? []) as unknown as CompanyRow[];

  return (
    <ul className="space-y-2">
      {companies.length === 0 && <p className="text-sm text-slate-500">No companies yet.</p>}
      {companies.map((c) => (
        <li key={c.id} className="card space-y-2 text-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">{c.business_name}</p>
            <span className={c.is_approved ? "text-green-700" : "font-medium text-amber-700"}>
              {c.is_approved ? "Approved" : "Pending"}
            </span>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-slate-600">
            <dt>Contact</dt>
            <dd>
              {c.profile?.full_name}
              {c.profile?.city ? `, ${c.profile.city}` : ""}
            </dd>
            <dt>License</dt>
            <dd>{c.license_number || "—"}</dd>
            <dt>USDOT / mover</dt>
            <dd>{c.transport_credentials || "—"}</dd>
            <dt>Website</dt>
            <dd className="break-all">{c.website || "—"}</dd>
          </dl>
          <ActionForm
            action={setCompanyApproved}
            fields={{ company_id: c.id, approved: String(!c.is_approved) }}
            label={c.is_approved ? "Revoke approval" : "Approve"}
            variant={c.is_approved ? "danger" : "primary"}
            confirm={c.is_approved ? "Revoke approval? They won't be able to post new shifts." : undefined}
          />
        </li>
      ))}
    </ul>
  );
}
