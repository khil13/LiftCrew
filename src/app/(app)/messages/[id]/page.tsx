import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOnboarded } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ChatThread, { type ChatMessage } from "./ChatThread";

type Member = { profile_id: string; profile: { full_name: string } | null };

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const session = await requireOnboarded();
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();

  const supabase = createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, job:jobs(id, title)")
    .eq("id", params.id)
    .maybeSingle<{ id: string; job: { id: string; title: string } | null }>();
  if (!conversation) notFound();

  const [{ data: members }, { data: messages }] = await Promise.all([
    supabase.from("conversation_members").select("profile_id, profile:profiles(full_name)").eq("conversation_id", params.id),
    supabase
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", params.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const names = Object.fromEntries(
    ((members ?? []) as unknown as Member[]).map((m) => [m.profile_id, m.profile?.full_name ?? "Member"]),
  );

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      <div className="mb-3">
        <Link href="/messages" className="text-sm text-slate-500">
          ← Messages
        </Link>
        {conversation.job && (
          <Link href={`/jobs/${conversation.job.id}`} className="block text-lg font-bold">
            {conversation.job.title}
          </Link>
        )}
        <p className="text-xs text-slate-500">{Object.values(names).join(", ")}</p>
      </div>
      <ChatThread
        conversationId={conversation.id}
        userId={session.userId}
        names={names}
        initialMessages={((messages ?? []) as ChatMessage[]).reverse()}
      />
    </div>
  );
}
