import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { estimateJobPrice } from "@/lib/pricing";
import { formatCents, formatJobTime } from "@/lib/format";
import { SITE_URL, notifyUser } from "@/lib/notify";
import {
  cancellationSettlement,
  completionSettlement,
  type CancellationPolicy,
  type CrewMember,
  type Settlement,
} from "@/lib/settlement";

// Money flow ("separate charges and transfers"):
//   1. The poster pays the full estimate upfront through Stripe Checkout. The
//      charge lands in the platform balance and the job goes from draft to open.
//   2. When the job is completed (or cancelled), settleJob() transfers each
//      helper's share to their Stripe Express account and refunds the rest.
// Every Stripe call uses an idempotency key and every DB write is guarded by
// the row's current status, so the webhook, the job actions, and the cron job
// can all call these safely more than once.

export class PaymentsUnavailableError extends Error {
  constructor() {
    super("Payments aren't set up yet.");
  }
}

function clients() {
  const stripe = getStripe();
  const admin = createAdminClient();
  if (!stripe || !admin) throw new PaymentsUnavailableError();
  return { stripe, admin };
}

type JobRow = {
  id: string;
  poster_id: string;
  title: string;
  status: string;
  scheduled_start: string;
  estimated_hours: number;
  helpers_needed: number;
  pay_rate_cents: number;
  cancelled_at: string | null;
  dispute_resolution: string | null;
};

type PaymentRow = {
  id: string;
  job_id: string;
  amount_cents: number;
  platform_fee_cents: number;
  status: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  refunded_cents: number;
};

async function readSetting<T>(admin: ReturnType<typeof clients>["admin"], key: string): Promise<T | null> {
  const { data } = await admin.from("app_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? null;
}

// ---------------------------------------------------------------------------
// 1. Pay at booking
// ---------------------------------------------------------------------------

/**
 * Creates one Checkout Session for one or more draft jobs from the same poster
 * (a weekly shift series is paid in one go) and returns its URL.
 */
export async function createJobCheckout(
  jobIds: string | string[],
  posterId: string,
  posterEmail: string | null,
): Promise<string> {
  const { stripe, admin } = clients();
  const ids = Array.isArray(jobIds) ? jobIds : [jobIds];
  const { data } = await admin.from("jobs").select("*").in("id", ids).order("scheduled_start");
  const jobs = (data ?? []) as JobRow[];
  if (jobs.length !== ids.length || jobs.some((j) => j.poster_id !== posterId)) throw new Error("Job not found");
  if (jobs.some((j) => j.status !== "draft")) throw new Error("This job is already paid for.");
  if (jobs.some((j) => new Date(j.scheduled_start).getTime() < Date.now() + 60 * 60 * 1000)) {
    throw new Error("This job starts too soon to book. Post a new job with a later start time.");
  }

  const feePercent = Number((await readSetting<number>(admin, "platform_fee_percent")) ?? 15);
  const { data: existingRows } = await admin.from("payments").select("*").in("job_id", ids);
  const existing = new Map(((existingRows ?? []) as PaymentRow[]).map((p) => [p.job_id, p]));
  if ([...existing.values()].some((p) => p.status !== "pending" && p.status !== "failed")) {
    throw new Error("This job is already paid for.");
  }

  const lines: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const paymentIds: string[] = [];
  for (const job of jobs) {
    const estimate = estimateJobPrice({
      helpers: job.helpers_needed,
      hours: Number(job.estimated_hours),
      rateCents: job.pay_rate_cents,
      feePercent,
    });
    const fields = {
      job_id: job.id,
      payer_id: posterId,
      amount_cents: estimate.totalCents,
      platform_fee_cents: estimate.feeCents,
      status: "pending",
      updated_at: new Date().toISOString(),
    };
    const prior = existing.get(job.id);
    const { data: payment, error } = prior
      ? await admin.from("payments").update(fields).eq("id", prior.id).select("id").single()
      : await admin.from("payments").insert(fields).select("id").single();
    if (error || !payment) throw new Error("Could not start checkout.");
    paymentIds.push(payment.id);
    lines.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: estimate.totalCents,
        product_data: {
          name: `${job.title} · ${formatJobTime(job.scheduled_start)}`,
          description:
            `${job.helpers_needed} helper(s) × ${Number(job.estimated_hours)} hrs × ${formatCents(job.pay_rate_cents)}` +
            ` + ${feePercent}% service fee. Labor only; no transport.`,
        },
      },
    });
  }

  const single = jobs.length === 1;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: posterEmail ?? undefined,
    client_reference_id: jobs[0].id,
    line_items: lines,
    metadata: { job_count: String(jobs.length) },
    payment_intent_data: { transfer_group: single ? jobs[0].id : `series-${jobs[0].id}` },
    success_url: single ? `${SITE_URL}/jobs/${jobs[0].id}?paid=1` : `${SITE_URL}/jobs?paid=1`,
    cancel_url: single ? `${SITE_URL}/jobs/${jobs[0].id}` : `${SITE_URL}/jobs`,
  });
  await admin.from("payments").update({ stripe_checkout_session_id: session.id }).in("id", paymentIds);
  if (!session.url) throw new Error("Could not start checkout.");
  return session.url;
}

/**
 * Webhook: checkout.session.completed. Holds the funds and opens each job the
 * session paid for. Jobs that can no longer be booked are refunded their share.
 */
export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const { stripe, admin } = clients();
  if (session.payment_status !== "paid" || typeof session.payment_intent !== "string") return;

  const [{ data: rows }, intent] = await Promise.all([
    admin.from("payments").select("*").eq("stripe_checkout_session_id", session.id),
    stripe.paymentIntents.retrieve(session.payment_intent),
  ]);
  const payments = (rows ?? []) as PaymentRow[];

  // A stale checkout (the poster started a newer one, or discarded the job): give the money back.
  if (payments.length === 0) {
    await stripe.refunds.create({ payment_intent: intent.id }, { idempotencyKey: `refund-full-${intent.id}` });
    console.warn(`Refunded superseded checkout ${session.id}`);
    return;
  }

  const chargeId = typeof intent.latest_charge === "string" ? intent.latest_charge : (intent.latest_charge?.id ?? null);
  const stripeIds = { stripe_payment_intent_id: intent.id, stripe_charge_id: chargeId };

  for (const payment of payments) {
    if (payment.stripe_payment_intent_id === intent.id) continue; // already processed
    const { data: job } = await admin.from("jobs").select("*").eq("id", payment.job_id).single<JobRow>();
    const bookable =
      payment.status === "pending" && job?.status === "draft" && new Date(job.scheduled_start).getTime() > Date.now();

    if (!bookable) {
      await stripe.refunds.create(
        { payment_intent: intent.id, amount: payment.amount_cents },
        { idempotencyKey: `refund-unbookable-${payment.id}-${intent.id}` },
      );
      await admin
        .from("payments")
        .update({ ...stripeIds, status: "refunded", refunded_cents: payment.amount_cents, updated_at: new Date().toISOString() })
        .eq("id", payment.id);
      continue;
    }

    const { data: held } = await admin
      .from("payments")
      .update({ ...stripeIds, status: "held", updated_at: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("status", "pending")
      .select("id");
    if (held?.length) await admin.from("jobs").update({ status: "open" }).eq("id", payment.job_id).eq("status", "draft");
  }
}

/** Webhook: checkout.session.expired. */
export async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  const { admin } = clients();
  await admin
    .from("payments")
    .update({ status: "failed", updated_at: new Date().toISOString() })
    .eq("stripe_checkout_session_id", session.id)
    .eq("status", "pending");
}

// ---------------------------------------------------------------------------
// 2. Settle when the job ends
// ---------------------------------------------------------------------------

/** Pays helpers and refunds the poster for a completed or cancelled job. Safe to call repeatedly. */
export async function settleJob(jobId: string): Promise<void> {
  const { stripe, admin } = clients();
  const [{ data: job }, { data: payment }, { data: assignments }] = await Promise.all([
    admin.from("jobs").select("*").eq("id", jobId).single<JobRow>(),
    admin.from("payments").select("*").eq("job_id", jobId).eq("status", "held").maybeSingle<PaymentRow>(),
    admin.from("job_assignments").select("id, helper_id, no_show").eq("job_id", jobId),
  ]);
  if (!job || !payment || !payment.stripe_payment_intent_id) return;

  const crew: CrewMember[] = (assignments ?? []).map((a) => ({
    assignmentId: a.id,
    helperId: a.helper_id,
    noShow: a.no_show,
  }));
  const charge = { amountCents: payment.amount_cents, feeCents: payment.platform_fee_cents };
  const rates = { payRateCents: job.pay_rate_cents, estimatedHours: Number(job.estimated_hours) };

  let settlement: Settlement;
  if (job.status === "completed") {
    settlement = completionSettlement(charge, rates, crew);
  } else if (job.status === "cancelled" && job.dispute_resolution === "refunded") {
    settlement = { payouts: [], retainedFeeCents: 0, refundCents: charge.amountCents }; // admin refunded a dispute
  } else if (job.status === "cancelled") {
    const policy = (await readSetting<CancellationPolicy>(admin, "cancellation_policy")) ?? {
      full_refund_hours_before: 24,
      late_cancel_min_paid_hours_per_helper: 1,
    };
    settlement = cancellationSettlement(
      charge,
      { ...rates, scheduledStart: new Date(job.scheduled_start), cancelledAt: new Date(job.cancelled_at ?? Date.now()) },
      crew,
      policy,
    );
  } else {
    return; // still running, or disputed (an admin decides)
  }

  if (settlement.payouts.length > 0) {
    await admin.from("payouts").upsert(
      settlement.payouts.map((p) => ({
        assignment_id: p.assignmentId,
        helper_id: p.helperId,
        amount_cents: p.amountCents,
        status: "pending",
      })),
      { onConflict: "assignment_id", ignoreDuplicates: true },
    );
  }

  if (settlement.refundCents > 0 && payment.refunded_cents === 0) {
    await stripe.refunds.create(
      { payment_intent: payment.stripe_payment_intent_id, amount: settlement.refundCents },
      { idempotencyKey: `refund-${payment.id}` },
    );
    await admin.from("payments").update({ refunded_cents: settlement.refundCents }).eq("id", payment.id);
  }

  await admin
    .from("payments")
    .update({
      status: settlement.refundCents === payment.amount_cents ? "refunded" : "released",
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id)
    .eq("status", "held");

  await releasePendingPayouts({ jobId });
}

type PendingPayout = {
  id: string;
  amount_cents: number;
  helper_id: string;
  assignment: { job_id: string } | null;
  helper: { stripe_account_id: string | null; stripe_onboarded: boolean } | null;
};

/**
 * Transfers pending payouts to helpers whose Stripe account is ready. Payouts
 * for helpers who haven't finished Stripe onboarding wait until they do.
 */
export async function releasePendingPayouts(filter: { jobId?: string; helperId?: string } = {}): Promise<number> {
  const { stripe, admin } = clients();
  let query = admin
    .from("payouts")
    .select(
      "id, amount_cents, helper_id, assignment:job_assignments!inner(job_id), helper:helper_profiles(stripe_account_id, stripe_onboarded)",
    )
    .eq("status", "pending")
    .limit(100);
  if (filter.helperId) query = query.eq("helper_id", filter.helperId);
  if (filter.jobId) query = query.eq("assignment.job_id", filter.jobId);
  const { data } = await query;

  let released = 0;
  for (const payout of (data ?? []) as unknown as PendingPayout[]) {
    const jobId = payout.assignment?.job_id;
    const account = payout.helper?.stripe_account_id;
    if (!jobId || !account || !payout.helper?.stripe_onboarded) continue;
    const { data: payment } = await admin
      .from("payments")
      .select("stripe_charge_id")
      .eq("job_id", jobId)
      .maybeSingle<{ stripe_charge_id: string | null }>();
    try {
      const transfer = await stripe.transfers.create(
        {
          amount: payout.amount_cents,
          currency: "usd",
          destination: account,
          transfer_group: jobId,
          source_transaction: payment?.stripe_charge_id ?? undefined,
          metadata: { job_id: jobId, payout_id: payout.id },
        },
        { idempotencyKey: `payout-${payout.id}` },
      );
      await admin
        .from("payouts")
        .update({ status: "released", stripe_transfer_id: transfer.id })
        .eq("id", payout.id)
        .eq("status", "pending");
      released++;
    } catch (err) {
      console.error(`Transfer failed for payout ${payout.id}`, err);
    }
  }
  return released;
}

// ---------------------------------------------------------------------------
// 3. Helper payouts: Stripe Connect Express
// ---------------------------------------------------------------------------

/** Returns a Stripe-hosted onboarding link, creating the Express account on first use. */
export async function createConnectOnboardingLink(helperId: string, email: string | null): Promise<string> {
  const { stripe, admin } = clients();
  const { data: helper } = await admin
    .from("helper_profiles")
    .select("stripe_account_id")
    .eq("id", helperId)
    .single<{ stripe_account_id: string | null }>();
  if (!helper) throw new Error("Finish your helper profile first.");

  let accountId = helper.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create(
      {
        type: "express",
        country: "US",
        email: email ?? undefined,
        business_type: "individual",
        capabilities: { transfers: { requested: true } },
        metadata: { profile_id: helperId },
      },
      { idempotencyKey: `connect-account-${helperId}` },
    );
    accountId = account.id;
    await admin.from("helper_profiles").update({ stripe_account_id: accountId }).eq("id", helperId);
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${SITE_URL}/api/stripe/connect`,
    return_url: `${SITE_URL}/api/stripe/connect/return`,
  });
  return link.url;
}

/** Updates stripe_onboarded from the account and releases any payouts that were waiting. */
export async function syncConnectAccount(account: Stripe.Account): Promise<boolean> {
  const { admin } = clients();
  const ready = Boolean(account.details_submitted && account.payouts_enabled && account.capabilities?.transfers === "active");
  const { data } = await admin
    .from("helper_profiles")
    .update({ stripe_onboarded: ready })
    .eq("stripe_account_id", account.id)
    .select("id")
    .maybeSingle<{ id: string }>();
  if (ready && data) await releasePendingPayouts({ helperId: data.id });
  return ready;
}

export async function refreshConnectAccount(helperId: string): Promise<boolean> {
  const { stripe, admin } = clients();
  const { data: helper } = await admin
    .from("helper_profiles")
    .select("stripe_account_id")
    .eq("id", helperId)
    .single<{ stripe_account_id: string | null }>();
  if (!helper?.stripe_account_id) return false;
  return syncConnectAccount(await stripe.accounts.retrieve(helper.stripe_account_id));
}

/** One-time login link to the helper's Stripe Express dashboard. */
export async function createExpressDashboardLink(helperId: string): Promise<string | null> {
  const { stripe, admin } = clients();
  const { data: helper } = await admin
    .from("helper_profiles")
    .select("stripe_account_id, stripe_onboarded")
    .eq("id", helperId)
    .single<{ stripe_account_id: string | null; stripe_onboarded: boolean }>();
  if (!helper?.stripe_account_id || !helper.stripe_onboarded) return null;
  return (await stripe.accounts.createLoginLink(helper.stripe_account_id)).url;
}

// ---------------------------------------------------------------------------
// 4. Notifications that go out alongside job changes
// ---------------------------------------------------------------------------

export async function notifyCrew(jobId: string, message: { subject: string; text: string; sms?: string }) {
  const admin = createAdminClient();
  if (!admin) return;
  const { data } = await admin.from("job_assignments").select("helper_id").eq("job_id", jobId).eq("no_show", false);
  await Promise.all((data ?? []).map((a) => notifyUser(a.helper_id, jobId, message)));
}
