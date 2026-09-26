import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { TIME_ZONE } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { resolveFlag } from "../actions";

type Flag = {
  id: string;
  source_table: "jobs" | "messages";
  source_id: string;
  matched_phrases: string[];
  excerpt: string;
  created_at: string;
};

// Section 7, Rule 4: job posts and chat messages that mention transport or
// brokering. Review each one; talk to the user or cancel the job if needed.
export default async function AdminFlags() {
  const supabase = createClient();
  const { data } = await supabase
    .from("content_flags")
    .select("id, source_table, source_id, matched_phrases, excerpt, created_at")
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  const flags = (data ?? []) as Flag[];

  const messageIds = flags.filter((f) => f.source_table === "messages").map((f) => f.source_id);
  const { data: messages } = messageIds.length
    ? await supabase.from("messages").select("id, conversation_id").in("id", messageIds)
    : { data: [] };
  const conversationOf = new Map((messages ?? []).map((m) => [m.id as string, m.conversation_id as string]));

  if (flags.length === 0) return <p className="card text-sm text-slate-600">Nothing flagged. Nice.</p>;
  return (
    <ul className="space-y-2">
      {flags.map((f) => {
        const href =
          f.source_table === "jobs"
            ? `/jobs/${f.source_id}`
            : conversationOf.get(f.source_id)
              ? `/messages/${conversationOf.get(f.source_id)}`
              : null;
        return (
          <li key={f.id} className="card space-y-2 text-sm">
            <div className="flex justify-between gap-2 text-xs text-slate-500">
              <span>{f.source_table === "jobs" ? "Job post" : "Chat message"}</span>
              <span>
                {new Date(f.created_at).toLocaleString("en-US", {
                  timeZone: TIME_ZONE,
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="whitespace-pre-line">{f.excerpt}</p>
            <p className="text-xs text-red-700">Matched: {f.matched_phrases.join(", ")}</p>
            <div className="flex items-center gap-3">
              {href && (
                <Link href={href} className="font-medium text-brand-600">
                  Open
                </Link>
              )}
              <div className="flex-1">
                <ActionForm action={resolveFlag} fields={{ flag_id: f.id }} label="Mark reviewed" />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
