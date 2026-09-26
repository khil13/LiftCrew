import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let configured: boolean | null = null;

function configure(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  configured = Boolean(publicKey && privateKey && subject);
  if (configured) webpush.setVapidDetails(subject!, publicKey!, privateKey!);
  return configured;
}

/** Sends a web push to every device the user subscribed. Best effort. */
export async function pushToUser(profileId: string, message: { title: string; body: string; url: string }) {
  const admin = createAdminClient();
  if (!admin || !configure()) return;
  const { data } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("profile_id", profileId);
  await Promise.all(
    (data ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(message),
          { TTL: 60 * 60 * 24 },
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id); // device unsubscribed
        } else {
          console.error("Push failed", err);
        }
      }
    }),
  );
}
