import Link from "next/link";
import JobStatusBadge from "@/components/JobStatusBadge";
import { requireOnboarded } from "@/lib/auth";
import { formatJobTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/lib/types";

type Thread = {
  id: string;
  job: { id: string; title: string; status: JobStatus; scheduled_start: string } | null;
  messages: { body: string; created_at: string }[];
};

export default async function MessagesPage() {
  await requireOnboarded();
  const supabase = createClient();
  const { data } = await supabase
    .from("conversations")
    .select("id, job:jobs(id, title, status, scheduled_start), messages(body, created_at)")
    .order("created_at", { referencedTable: "messages", ascending: false })
    .limit(1, { referencedTable: "messages" });
  const threads = ((data ?? []) as unknown as Thread[])
    .filter((t) => t.job)
    .sort((a, b) => (b.messages[0]?.created_at ?? "").localeCompare(a.messages[0]?.created_at ?? ""));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Messages</h1>
      {threads.length === 0 ? (
        <p className="card text-sm text-slate-600">
          A chat opens for each job once a helper is booked, so the crew and the poster can coordinate.
        </p>
      ) : (
        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={t.id}>
              <Link href={`/messages/${t.id}`} className="card block space-y-1 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{t.job!.title}</p>
                  <JobStatusBadge status={t.job!.status} />
                </div>
                <p className="text-slate-500">{formatJobTime(t.job!.scheduled_start)}</p>
                <p className="truncate text-slate-700">{t.messages[0]?.body ?? "No messages yet"}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
