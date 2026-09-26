import Link from "next/link";
import { requireOnboarded } from "@/lib/auth";
import { TIME_ZONE } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { markAllRead } from "./actions";

type Notification = { id: string; body: string; job_id: string | null; read_at: string | null; created_at: string };

export default async function NotificationsPage() {
  await requireOnboarded();
  const supabase = createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, body, job_id, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const items = (data ?? []) as Notification[];
  const unread = items.some((n) => !n.read_at);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Alerts</h1>
        {unread && (
          <form action={markAllRead}>
            <button className="text-sm font-medium text-brand-600">Mark all read</button>
          </form>
        )}
      </div>
      {items.length === 0 ? (
        <p className="card text-sm text-slate-600">Applications, bookings, and job updates will show up here.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const body = (
              <>
                <p className={n.read_at ? "text-slate-700" : "font-semibold"}>{n.body}</p>
                <p className="text-xs text-slate-500">
                  {new Date(n.created_at).toLocaleString("en-US", {
                    timeZone: TIME_ZONE,
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </>
            );
            return (
              <li key={n.id}>
                {n.job_id ? (
                  <Link href={`/jobs/${n.job_id}`} className={`card block text-sm ${n.read_at ? "" : "border-brand-500"}`}>
                    {body}
                  </Link>
                ) : (
                  <div className="card text-sm">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
