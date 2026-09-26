import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { toE164 } from "@/lib/phone";
import { pushToUser } from "@/lib/push";

// Outbound email (Resend), SMS (Twilio), and web push. In-app notifications are written by
// DB triggers; these are best effort and never throw, so a provider problem
// can't fail the action that triggered them.

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.info(`[email skipped: Resend not configured] ${subject}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!res.ok) console.error(`Resend failed (${res.status}): ${await res.text()}`);
}

async function sendSms(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    console.info(`[sms skipped: Twilio not configured] ${body}`);
    return;
  }
  const params = new URLSearchParams({ To: to, Body: body });
  // A Messaging Service SID (MG...) or a phone number both work as the sender.
  params.set(from.startsWith("MG") ? "MessagingServiceSid" : "From", from);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  if (!res.ok) console.error(`Twilio failed (${res.status}): ${await res.text()}`);
}

async function contactFor(profileId: string): Promise<{ email: string | null; phone: string | null }> {
  const admin = createAdminClient();
  if (!admin) return { email: null, phone: null };
  const [{ data: user }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(profileId),
    admin.from("profiles").select("phone").eq("id", profileId).maybeSingle(),
  ]);
  return {
    email: user.user?.email ?? null,
    phone: toE164(profile?.phone) ?? toE164(user.user?.phone),
  };
}

/** Email (and optionally text) a user about a job. */
export async function notifyUser(
  profileId: string,
  jobId: string,
  message: { subject: string; text: string; sms?: string },
): Promise<void> {
  try {
    const { email, phone } = await contactFor(profileId);
    const link = `${SITE_URL}/jobs/${jobId}`;
    await Promise.all([
      email ? sendEmail(email, message.subject, `${message.text}\n\nView the job: ${link}\n\n— LiftCrew`) : null,
      phone && message.sms ? sendSms(phone, `LiftCrew: ${message.sms} ${link}`) : null,
      pushToUser(profileId, { title: message.subject, body: message.sms ?? message.text, url: `/jobs/${jobId}` }),
    ]);
  } catch (err) {
    console.error("Notification failed", err);
  }
}
