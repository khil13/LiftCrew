# LiftCrew — Build Plan

A two-sided marketplace connecting moving helpers with customers and moving
companies who need extra hands. (The original plan used the working name
"MoveCrew".)

## 1. Product summary

**Who uses it**

- **Helpers**: people who want paid moving work (loading, unloading, packing, heavy lifting). They build a profile, set availability, browse jobs, accept jobs, get paid.
- **Customers**: individuals moving who need 1–4 helpers for a few hours (they already have a truck or a rental).
- **Companies**: moving companies that need extra crew for busy days. They post shifts and hire vetted helpers repeatedly.

**How money works**

- Customer/company pays upfront when booking (held via Stripe).
- Funds released to helpers after the job is marked complete (or auto-release after 48 hours if no dispute).
- Platform fee: 15% default (configurable in `app_settings`).

**Launch strategy**: one city only. Recruit 20–30 helpers and 3–5 local moving companies before opening to the public.

## 2. Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind, mobile-first PWA |
| Backend / DB / Auth | Supabase (Postgres, Auth, Storage, Realtime) |
| Payments | Stripe Connect (Express accounts) |
| Maps | Google Places API (New) for address entry, Distance Matrix or haversine for "jobs near me" |
| Notifications | Email via Resend; SMS via Twilio (Phase 3) |
| Background checks | Checkr API (Phase 3) |
| Hosting | Vercel (app) + Supabase (database) |

## 3. Database

Schema, compliance rules, RLS and storage live in `supabase/migrations/`
(numbered files). `supabase/tests/run.sh` applies them to a scratch Postgres
and checks the compliance rules and RLS.

## 4. Screens

**Shared**: landing page, sign up / log in (email + phone OTP) with role selection, messages inbox + chat thread, notifications, settings.

**Helper**: onboarding (profile, skills, rate, radius, photo, Stripe Connect), job feed (list + map, filters), job detail → apply, my jobs, check-in / check-out, earnings dashboard, public profile with ratings.

**Customer**: post a job (addresses → date/time → hours & helpers → details → price summary → pay), review applicants → accept, job status page, confirm completion + reviews.

**Company**: onboarding (business info, approval pending), post shifts (+ "repeat weekly"), favorite helpers + invite, crew roster per job, billing history.

**Admin**: approve companies, verify helpers, resolve disputes, adjust platform fee, basic metrics (jobs posted, fill rate, GMV).

## 5. Key flows

**Booking and payment**

1. Poster creates job → sees price estimate: helpers × hours × rate + platform fee.
2. Poster pays → Stripe PaymentIntent with `capture_method: manual` (hold), or charge immediately and hold funds on platform.
3. Helpers apply → poster accepts until `helpers_needed` filled → job status `filled`.
4. Job day: helpers check in/out → hours recorded.
5. Poster confirms completion (or auto-confirm after 48 hrs).
6. Platform transfers each helper's share via Stripe Connect transfers; keeps fee.
7. Both sides prompted to review.

**Cancellation policy** (stored in `app_settings.cancellation_policy`)

- Poster cancels >24 hrs before: full refund.
- Poster cancels <24 hrs: helpers receive 1 hr minimum pay each.
- Helper no-show: flagged, strike system (3 strikes = suspended).

**Instant job alerts**: when a job is posted, notify helpers whose radius covers the start address and whose availability matches the time.

## 6. Build phases

### Phase 1 — Foundation (week 1–2)

- [x] Scaffold Next.js + TypeScript + Tailwind project
- [x] Set up Supabase schema migrations and RLS policies (`supabase/migrations/0001`–`0004`)
- [x] Create the Supabase project and apply the migrations (project `LiftCrew`, ref `iksscoylmloyojoetvvy`)
- [x] Auth (email + phone OTP), role selection, profile creation
- [x] Helper onboarding form (Stripe Connect step deferred to Phase 3)
- [x] Customer/company onboarding (company approval-pending state)
- [x] Compliance foundation: `allowed_states` setting, state constraint + trigger, labor-only attestations (Section 7)
- [x] Mobile-first layout with bottom navigation
- [x] Tests for the state checks (unit tests + DB checks)

### Phase 2 — Core marketplace (week 3–4)

- [x] Post-a-job multi-step form with Google Places autocomplete (payment step comes in Phase 3)
- [x] Job feed with distance filter (haversine query, `job_feed()`)
- [x] Apply / accept / decline flow
- [x] Job status lifecycle (open → filled → in progress → completed, or cancelled)
- [x] Realtime chat per job (Supabase Realtime)
- [x] Email notifications for new applications and acceptances (Resend), plus in-app alerts

### Phase 3 — Payments & trust (week 5–6)

- [x] Stripe Connect Express onboarding for helpers (required before applying)
- [x] Payment at booking, hold, release on completion (Checkout + separate transfers; auto-confirm after 48 hrs)
- [x] Check-in / check-out with timestamp (optional GPS check)
- [x] Reviews and rating averages (DB trigger to update `rating_avg`)
- [x] Cancellation + refund logic, no-show strikes (3 = suspended)
- [x] Manual verification to start (`admin_set_helper_verified`; admin UI in Phase 4). Checkr later.
- [x] SMS alerts via Twilio (booked, cancelled, day-before reminder)

### Phase 4 — Company tools & admin (week 7–8)

- [x] Favorite helpers + direct invites
- [x] Recurring shifts (repeat weekly for up to 8 weeks, one checkout)
- [x] Admin dashboard: metrics, company approval, helper verification and suspensions, moderation queue, platform fee
- [x] Dispute handling (poster gives a reason; admin releases to crew or refunds in full)
- [x] PWA install prompt + push notifications (Web Push with VAPID keys)

### Phase 5 — Launch

- [ ] Terms of Service, Privacy Policy, helper independent-contractor agreement (have a lawyer review; `/terms` is a draft)
- [ ] Liability waiver shown at booking
- [ ] Seed helpers in launch city, sign first companies
- [ ] Analytics (PostHog or Plausible)

## 7. Compliance rules (MUST be enforced in code)

The app operates as a labor-only marketplace inside a single state. This is
what keeps it outside mover licensing rules (USDOT, FMCSA operating
authority, broker bonds, state mover permits). Every rule is enforced in the
UI, the API routes / server actions, and the database.

**Rule 1: Same-state jobs only**

- Launch state lives in `app_settings.allowed_states` (e.g. `["NJ"]`). Adding a state later = updating that setting, not code.
- Addresses come from Google Places restricted to the US; the state is read from `administrative_area_level_1` server-side. Never trust a state typed by the user.
- Reject any job where the start or end address is outside the allowed state(s), or where start and end are in different states: form validation, server route, and DB constraint + trigger.
- Error message: "Right now we only support moves within [State]. Both addresses must be in [State]."
- Helper job feed only shows jobs in allowed states; helper home location must be in an allowed state.

**Rule 2: Labor only, no transport**

- Helpers load, unload, pack, unpack, assemble, and move items within or between rooms/buildings on foot. They never drive customer belongings.
- No "truck included", "I'll bring a truck", or "delivery" options anywhere in helper profiles, job types, or pricing.
- Job form requires the customer to confirm: "I am providing my own truck or container. Helpers provide labor only and will not drive or transport my belongings." Stored as `customer_attested_labor_only = true`; posting blocked without it.
- Helper onboarding requires agreeing to labor-only terms (`agreed_labor_only_terms_at`); no job applications until agreed.
- Allowed `job_type` values only: loading, unloading, packing, unpacking, furniture_assembly, in_home_moving, heavy_item_lifting. Validated server-side.

**Rule 3: No brokering**

- The platform never books, rents, recommends, or resells trucks, containers, or moving companies' transport services. No affiliate links to truck rental companies.
- Companies post labor shifts for their own crews. If a company transports goods, it enters its own `transport_credentials` and remains responsible for its licensing. Admin approves companies before they can post.

**Rule 4: Content moderation**

- Flag job descriptions or chat messages containing phrases like "bring your truck", "drive my stuff", "deliver", "haul", or out-of-state city names; show the admin a review queue.

**Rule 5: Terms of Service must state**

- The platform is a labor-only marketplace, not a moving company or broker.
- Service is limited to the allowed state(s).
- Helpers are independent contractors (have a lawyer review).

## 8. Business and legal checklist (non-code)

- [ ] Form an LLC
- [ ] General liability insurance; look into occupational accident coverage for helpers
- [ ] Decide helper classification (independent contractor is typical; rules vary by state)
- [ ] Confirm the launch state has no special rule for labor-only moving help
- [ ] Local business license where the LLC is registered
- [ ] Pricing research: HireAHelper, TaskRabbit, Dolly
- [ ] Recruitment: Facebook groups, Craigslist gigs, college campuses, gyms
- [ ] Company outreach: call 20 local movers about peak-day staffing

## 9. Working rules

- Work one phase at a time; check off tasks here as they are completed.
- SQL goes in `supabase/migrations/` as numbered files, with RLS policies alongside every new table.
- Keep all money in integer cents.
- Never expose the Supabase service role key or Stripe secret key to the client.
- Handle Stripe events through `/api/stripe/webhook`, not client callbacks.
- Mobile-first UI: design for a 390px-wide screen first.
- Section 7 is non-negotiable. If a requested feature would break a compliance rule, stop and flag it instead of building it.

## 10. Implementation notes (Phase 1)

Decisions made while building that go beyond the original plan:

- **Private fields.** `profiles.phone`, `helper_profiles.home_lat/home_lng/stripe_account_id` are hidden from other users with column privileges. Owners read them through the `get_my_profile()` / `get_my_helper_profile()` functions. Queries on those tables must list columns (no `select *`).
- **Protected fields.** Users cannot set their own `role` after signup, pick `admin`, or change `is_verified`, `is_approved`, ratings, or Stripe status. Admin changes will go through server code in Phase 4.
- **Helper home state.** Added `helper_profiles.home_state` (from Google Places) with a trigger that requires it to be an allowed state.
- **Helper skills** are limited to the allowed job types, so no transport options can appear on a profile.
- **Moderation.** Added `content_flags` plus DB triggers that match `app_settings.moderation_phrases` against job titles/descriptions and chat messages. Out-of-state city detection is not done yet.
- **Addresses** are looked up through a server route with `GOOGLE_MAPS_SERVER_API_KEY` (Places API New). The client only ever submits a place id.
- **Server-managed tables.** Job assignments, payments, payouts, conversations, and reviews are read-only for clients; the server will write them in Phases 2–3.

## 11. Implementation notes (Phase 2)

- **Multi-table changes run in DB functions.** `accept_application()` books the helper, adds them to the job chat, and marks the job filled when the crew is complete (declining the rest). `set_job_status()` enforces the lifecycle: cancel from open/filled, start from 2 hours before the scheduled time with at least one helper, complete from in progress. Posters can no longer mark an application accepted by editing it directly.
- **Job feed.** `job_feed()` returns open, upcoming jobs in allowed states within the helper's service radius (haversine from their private home location, which is never returned). Filters: distance, date, minimum pay, job type.
- **Address checks happen three times.** The form checks each picked address as soon as it is chosen (`/api/places/check`), the server action re-resolves both place ids and validates, and the DB constraint + trigger check again.
- **Notifications.** DB triggers write in-app notifications for new applications, bookings, declines, withdrawals, cancellations, and completion. Emails for new applications and acceptances are best-effort: they need `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `SUPABASE_SERVICE_ROLE_KEY` (server-only, used to look up the recipient's email) and are skipped when those aren't set.
- **Chat.** One conversation per job, created on the first acceptance. Messages stream through Supabase Realtime, which applies the same RLS.
- **Not yet:** instant job alerts to nearby helpers, helpers withdrawing after being booked (Phase 3 cancellation / no-show rules), company "repeat weekly" shifts (Phase 4).

## 12. Implementation notes (Phase 3)

- **Draft until paid.** Posting creates a draft job and sends the poster to Stripe Checkout. Only the Stripe webhook (`checkout.session.completed`) opens the job. A DB trigger stops users from changing any job's status directly; changes go through the job functions or the server.
- **Money model: separate charges and transfers.** The full estimate is charged upfront into the platform balance (a 7-day card hold would expire for jobs booked weeks ahead). When the job ends, `settleJob()` transfers each helper's share to their Express account and refunds the rest. The math lives in `src/lib/settlement.ts` and is unit-tested.
  - Completed: each helper who showed up is paid for the booked hours; unfilled spots and no-shows are refunded, along with their share of the fee.
  - Cancelled more than 24 hours before (or with nobody booked): full refund. Inside 24 hours: each booked helper gets 1 hour of pay (setting `cancellation_policy`), the rest is refunded.
  - Disputed: nothing moves until an admin decides (Phase 4).
- **Payouts wait for onboarding.** Helpers must finish Stripe onboarding to apply. If an account later becomes restricted, the payout stays pending and is retried when Stripe reports the account ready, and by the hourly cron.
- **Hours.** Helpers are paid the booked hours. Checked-in/out hours are recorded for the poster and for disputes, not used for pay yet.
- **Hourly cron** (`/api/cron`, `vercel.json`): auto-confirms jobs 48 hours after their scheduled end, settles anything still held, retries payouts, and sends day-before reminders. Vercel's Hobby plan only runs crons once a day; Pro runs it hourly.
- **Idempotency.** Every Stripe call has an idempotency key and every DB write checks the row's current status, so the webhook, actions, and cron can overlap safely.

## 13. Implementation notes (Phase 4)

- **Admins** are created in SQL, never through the app: `update profiles set role = 'admin' where id = '<user id>';`. They get an Admin tab with metrics (jobs posted, fill rate, GMV, fees), company approvals, helper verification and suspensions, disputes, the moderation queue, and the platform fee. Changing the allowed states stays a SQL-only operation because it affects compliance.
- **Disputes.** The poster must describe the problem. Admins see the reason and each helper's check-in/out record, then either release payment to the crew (no-shows excluded) or refund the poster in full. Both sides are notified.
- **Favorites and invites** are for companies. Invites go only to favorited helpers, show up in the helper's alerts (plus email, SMS, and push), and put a banner on the job. Invited helpers still apply normally, so every labor-only and payout check still applies.
- **Weekly shifts.** A company can repeat a shift weekly for up to 8 weeks. Each week is its own job with its own crew, all paid in one Stripe Checkout; each shift settles and refunds on its own.
- **PWA.** Manifest with icons, a service worker for install and push, an install banner (with iPhone instructions), and a push on/off toggle in Settings. Pushes go out wherever email/SMS notifications do.
