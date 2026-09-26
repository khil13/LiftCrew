import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/auth";
import { formatCents, formatJobTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type PaymentRow = {
  id: string;
  amount_cents: number;
  platform_fee_cents: number;
  refunded_cents: number;
  status: string;
  created_at: string;
  job: { id: string; title: string; scheduled_start: string } | null;
};

const STATUS: Record<string, string> = {
  pending: "Awaiting payment",
  held: "Paid · held",
  released: "Paid",
  refunded: "Refunded",
  failed: "Not completed",
};

export default async function BillingPage() {
  const { profile } = await requireOnboarded();
  if (profile.role !== "customer" && profile.role !== "company") redirect("/home");

  const supabase = createClient();
  const { data } = await supabase
    .from("payments")
    .select(
      "id, amount_cents, platform_fee_cents, refunded_cents, status, created_at, job:jobs(id, title, scheduled_start)",
    )
    .eq("payer_id", profile.id)
    .neq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(200);
  const payments = (data ?? []) as unknown as PaymentRow[];
  const charged = payments
    .filter((p) => p.status === "held" || p.status === "released" || p.status === "refunded")
    .reduce((sum, p) => sum + p.amount_cents - p.refunded_cents, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Billing</h1>
      <div className="card">
        <p className="text-xs text-slate-500">Total paid (after refunds)</p>
        <p className="text-xl font-bold">{formatCents(charged)}</p>
      </div>
      {payments.length === 0 ? (
        <p className="card text-sm text-slate-600">Payments for your jobs will show up here.</p>
      ) : (
        <ul className="space-y-2">
          {payments.map((p) => (
            <li key={p.id}>
              <Link href={p.job ? `/jobs/${p.job.id}` : "/billing"} className="card flex justify-between gap-3 text-sm">
                <span>
                  <span className="block font-semibold">{p.job?.title ?? "Job"}</span>
                  <span className="text-slate-600">{p.job ? formatJobTime(p.job.scheduled_start) : ""}</span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold">{formatCents(p.amount_cents)}</span>
                  <span className="text-xs text-slate-500">{STATUS[p.status] ?? p.status}</span>
                  {p.refunded_cents > 0 && (
                    <span className="block text-xs text-slate-500">−{formatCents(p.refunded_cents)} refunded</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
