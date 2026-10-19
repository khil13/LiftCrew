import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { toE164 } from "@/lib/phone";
import { pushToUser } from "@/lib/push";
import { envValue } from "@/lib/env";

// Outbound email (Resend), SMS (Twilio), and web push. In-app notifications are written by
// DB triggers; these are best effort and never throw, so a provider problem
// can't fail the action that triggered them.

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Sends an email through Resend. Returns a short, secret-free status for logs and the database. */
async function sendEmail(to: string, subject: string, text: string): Promise<string> {
  const apiKey = envValue("RESEND_API_KEY");
  const from = envValue("RESEND_FROM_EMAIL");
  if (!apiKey || !from) {
    const missing = [!apiKey && "RESEND_API_KEY", !from && "RESEND_FROM_EMAIL"].filter(Boolean).join(", ");
    console.info(`[email skipped: missing ${missing}] ${subject}`);
    return `skipped: missing ${missing}`;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      console.error(`Resend failed (${res.status}): ${body}`);
      return `failed ${res.status} (from ${from}): ${body}`;
    }
    console.info(`[email sent] ${subject}`);
    return "sent";
  } catch (err) {
    console.error("Resend request failed", err);
    return `failed: ${err instanceof Error ? err.message : "network error"}`;
  }
}

async function sendSms(to: string, body: string): Promise<void> {
  const sid = envValue("TWILIO_ACCOUNT_SID");
  const token = envValue("TWILIO_AUTH_TOKEN");
  const from = envValue("TWILIO_PHONE_NUMBER");
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

/**
 * Alerts the business about a new quick-quote request (email, plus a text if LEAD_ALERT_PHONE is set).
 * Returns the email delivery status so it can be stored with the request.
 */
export async function notifyNewQuote(summary: string, name: string, town: string): Promise<string> {
  try {
    const email = envValue("LEAD_ALERT_EMAIL") || "liftcrewnj@gmail.com";
    const phone = toE164(envValue("LEAD_ALERT_PHONE"));
    const [status] = await Promise.all([
      sendEmail(
        email,
        `New quote request: ${name} (${town})`,
        `${summary}\n\nCall or text them back soon. Fast replies win jobs.\n\n— LiftCrew`,
      ),
      phone ? sendSms(phone, `LiftCrew quote: ${name}, ${town}. Check your email for details.`) : null,
    ]);
    return status;
  } catch (err) {
    console.error("Quote alert failed", err);
    return "failed: unexpected error";
  }
}
