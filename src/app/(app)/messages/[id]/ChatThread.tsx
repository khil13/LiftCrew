"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { matchModerationPhrases } from "@/lib/compliance/moderation";
import { TIME_ZONE } from "@/lib/format";

export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };

export default function ChatThread({
  conversationId,
  userId,
  names,
  initialMessages,
}: {
  conversationId: string;
  userId: string;
  names: Record<string, string>;
  initialMessages: ChatMessage[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const add = (m: ChatMessage) => setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));

  // Live updates via Supabase Realtime (RLS limits them to conversation members).
  useEffect(() => {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => add(payload.new as ChatMessage),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, conversationId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError(null);
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: userId, body: body.slice(0, 2000) })
      .select("id, sender_id, body, created_at")
      .single();
    setSending(false);
    if (error || !data) return setError("Message not sent. Try again.");
    add(data as ChatMessage);
    setDraft("");
  }

  const flagged = matchModerationPhrases(draft).length > 0;

  return (
    <>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {messages.length === 0 && <p className="text-center text-sm text-slate-500">Say hi to your crew.</p>}
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-brand-600 text-white" : "border border-slate-200 bg-white"
                }`}
              >
                {!mine && <p className="text-xs font-semibold text-slate-500">{names[m.sender_id] ?? "Member"}</p>}
                <p className="whitespace-pre-line break-words">{m.body}</p>
                <p className={`mt-0.5 text-[10px] ${mine ? "text-brand-100" : "text-slate-400"}`}>
                  {new Date(m.created_at).toLocaleTimeString("en-US", {
                    timeZone: TIME_ZONE,
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {flagged && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Reminder: helpers provide labor only and can&apos;t drive or transport belongings.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message"
          aria-label="Message"
          maxLength={2000}
        />
        <button className="rounded-lg bg-brand-600 px-4 font-semibold text-white disabled:opacity-60" disabled={sending}>
          Send
        </button>
      </form>
    </>
  );
}
