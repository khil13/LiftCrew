import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Sends a plain-text email via Resend. No-ops (with a log) when not configured. */
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

async function emailFor(profileId: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.auth.admin.getUserById(profileId);
  return data.user?.email ?? null;
}

/**
 * Email a user about a job. Best effort: never throws, so a mail problem can't
 * fail the action that triggered it. In-app notifications are written by the DB.
 */
export async function emailAboutJob(profileId: string, jobId: string, subject: string, intro: string): Promise<void> {
  try {
    const to = await emailFor(profileId);
    if (!to) return;
    await sendEmail(to, subject, `${intro}\n\nView the job: ${SITE_URL}/jobs/${jobId}\n\n— LiftCrew`);
  } catch (err) {
    console.error("Email notification failed", err);
  }
}
