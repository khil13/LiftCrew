import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyCrew, releasePendingPayouts, settleJob } from "@/lib/payments";
import { formatJobTime } from "@/lib/format";

// Hourly maintenance (vercel.json). Vercel sends "Authorization: Bearer $CRON_SECRET".
//   1. Auto-complete jobs 48 hours after their scheduled end (no dispute).
//   2. Settle completed/cancelled jobs whose payment is still held.
//   3. Retry payouts that were waiting on Stripe onboarding or failed.
//   4. Text/email booked helpers the day before their job.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const summary = { autoCompleted: 0, settled: 0, payoutsReleased: 0, reminders: 0, errors: 0 };

  const { data: completed, error } = await admin.rpc("auto_complete_jobs");
  if (error) console.error(error);
  summary.autoCompleted = (completed as string[] | null)?.length ?? 0;

  const { data: held } = await admin
    .from("payments")
    .select("job_id, job:jobs!inner(status)")
    .eq("status", "held")
    .in("job.status", ["completed", "cancelled"])
    .limit(50);
  for (const p of held ?? []) {
    try {
      await settleJob(p.job_id);
      summary.settled++;
    } catch (err) {
      console.error(`Settling ${p.job_id} failed`, err);
      summary.errors++;
    }
  }

  try {
    summary.payoutsReleased = await releasePendingPayouts();
  } catch (err) {
    console.error(err);
    summary.errors++;
  }

  const now = Date.now();
  const { data: upcoming } = await admin
    .from("jobs")
    .select("id, title, scheduled_start")
    .in("status", ["open", "filled"])
    .is("reminder_sent_at", null)
    .gt("scheduled_start", new Date(now).toISOString())
    .lt("scheduled_start", new Date(now + 24 * 3_600_000).toISOString())
    .limit(50);
  for (const job of upcoming ?? []) {
    const { data: claimed } = await admin
      .from("jobs")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", job.id)
      .is("reminder_sent_at", null)
      .select("id");
    if (!claimed?.length) continue;
    const when = formatJobTime(job.scheduled_start);
    await notifyCrew(job.id, {
      subject: `Reminder: "${job.title}" is ${when}`,
      text: `Reminder: you're booked for "${job.title}" on ${when}. Check in from the job page when you arrive.`,
      sms: `Reminder: "${job.title}" is ${when}. Check in when you arrive.`,
    });
    summary.reminders++;
  }

  return NextResponse.json(summary);
}
