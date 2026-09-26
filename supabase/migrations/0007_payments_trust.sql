-- 0007_payments_trust.sql
-- Phase 3: pay at booking, check-in / check-out, no-shows and strikes,
-- reviews, disputes, and manual verification.
--
-- Money moves in server code (Stripe); this migration adds the state it needs
-- and the rules users must not be able to bypass.

-- ---------------------------------------------------------------------------
-- Jobs are drafts until paid. Only the server (service role, after the Stripe
-- webhook) or the lifecycle functions below may change a job's status.
-- ---------------------------------------------------------------------------
alter table jobs alter column status set default 'draft';
alter table jobs
  add column cancelled_at timestamptz,
  add column completed_at timestamptz,
  add column reminder_sent_at timestamptz;

-- SECURITY INVOKER on purpose: current_user is the API caller here, but the
-- owner when the change comes from a security-definer function.
create or replace function guard_job_status() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' and new.status <> 'draft' then
      raise exception 'New jobs start as drafts until payment' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      raise exception 'Job status changes go through the job actions' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

create trigger jobs_guard_status
  before insert or update of status on jobs
  for each row execute function guard_job_status();

-- Every job, including drafts, carries the customer's labor-only confirmation.
alter table jobs drop constraint jobs_labor_only_attested;
alter table jobs add constraint jobs_labor_only_attested check (customer_attested_labor_only = true);

drop policy jobs_insert_own on jobs;
create policy jobs_insert_own on jobs for insert to authenticated
  with check (
    poster_id = auth.uid()
    and status = 'draft'
    and (
      current_user_role() = 'customer'
      or (current_user_role() = 'company' and company_is_approved())
    )
  );

-- ---------------------------------------------------------------------------
-- Payments: one per job; refunds and Stripe ids tracked for idempotency.
-- ---------------------------------------------------------------------------
alter table payments
  add column stripe_checkout_session_id text unique,
  add column stripe_charge_id text,
  add column refunded_cents int not null default 0 check (refunded_cents >= 0),
  add column updated_at timestamptz not null default now();
create unique index payments_job_idx on payments (job_id);

create unique index payouts_assignment_idx on payouts (assignment_id);

-- ---------------------------------------------------------------------------
-- Check-in / check-out and no-shows
-- ---------------------------------------------------------------------------
alter table job_assignments
  add column check_in_lat double precision,
  add column check_in_lng double precision,
  add column check_in_distance_miles numeric(6,1),
  add column no_show boolean not null default false;

alter table helper_profiles
  add column strikes int not null default 0,
  add column suspended_at timestamptz;

create or replace function distance_miles(lat1 double precision, lng1 double precision,
                                          lat2 double precision, lng2 double precision)
returns double precision language sql immutable set search_path = '' as $$
  select 3958.8 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

-- Helpers can apply only with labor-only terms agreed, payouts set up, and no suspension.
create or replace function helper_can_apply() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from helper_profiles
    where id = auth.uid()
      and agreed_labor_only_terms_at is not null
      and stripe_onboarded
      and suspended_at is null
  );
$$;

drop policy applications_insert_helper on job_applications;
create policy applications_insert_helper on job_applications for insert to authenticated
  with check (
    helper_id = auth.uid()
    and status = 'applied'
    and current_user_role() = 'helper'
    and helper_can_apply()
    and exists (
      select 1 from jobs j
      where j.id = job_id and j.status = 'open' and is_allowed_state(j.start_state)
    )
  );

create or replace function check_in(p_job_id uuid, p_lat double precision default null,
                                    p_lng double precision default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  j jobs;
  a job_assignments;
begin
  select * into j from jobs where id = p_job_id for update;
  select * into a from job_assignments where job_id = p_job_id and helper_id = auth.uid();
  if j.id is null or a.id is null then
    raise exception 'You''re not booked on this job' using errcode = '42501';
  end if;
  if j.status not in ('open', 'filled', 'in_progress') or a.no_show then
    raise exception 'This job can''t be checked into' using errcode = 'P0001';
  end if;
  if a.checked_in_at is not null then
    raise exception 'You''re already checked in' using errcode = 'P0001';
  end if;
  if now() < j.scheduled_start - interval '1 hour' then
    raise exception 'Check-in opens 1 hour before the start time' using errcode = 'P0001';
  end if;
  if now() > j.scheduled_start + interval '12 hours' then
    raise exception 'Check-in for this job has closed' using errcode = 'P0001';
  end if;

  update job_assignments set
    checked_in_at = now(),
    check_in_lat = p_lat,
    check_in_lng = p_lng,
    check_in_distance_miles = case
      when p_lat is not null and p_lng is not null and j.start_lat is not null
      then round(distance_miles(p_lat, p_lng, j.start_lat, j.start_lng)::numeric, 1)
    end
  where id = a.id;

  if j.status in ('open', 'filled') then
    update job_applications set status = 'declined' where job_id = j.id and status = 'applied';
    update jobs set status = 'in_progress' where id = j.id;
  end if;
end $$;

create or replace function check_out(p_job_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare a job_assignments;
begin
  select * into a from job_assignments where job_id = p_job_id and helper_id = auth.uid() for update;
  if a.id is null then
    raise exception 'You''re not booked on this job' using errcode = '42501';
  end if;
  if a.checked_in_at is null then
    raise exception 'Check in first' using errcode = 'P0001';
  end if;
  if a.checked_out_at is not null then
    raise exception 'You''re already checked out' using errcode = 'P0001';
  end if;
  update job_assignments set
    checked_out_at = now(),
    hours_worked = least(round((extract(epoch from now() - a.checked_in_at) / 3600)::numeric, 1), 99.9)
  where id = a.id;
end $$;

-- Poster reports a booked helper who never showed up (30+ minutes after start).
create or replace function mark_no_show(p_assignment_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  a job_assignments;
  j jobs;
  max_strikes int;
  strikes_now int;
begin
  select * into a from job_assignments where id = p_assignment_id for update;
  select * into j from jobs where id = a.job_id;
  if a.id is null or j.poster_id is distinct from auth.uid() then
    raise exception 'Only the poster can report a no-show' using errcode = '42501';
  end if;
  if j.status not in ('open', 'filled', 'in_progress') then
    raise exception 'This job is already closed' using errcode = 'P0001';
  end if;
  if now() < j.scheduled_start + interval '30 minutes' then
    raise exception 'You can report a no-show 30 minutes after the start time' using errcode = 'P0001';
  end if;
  if a.checked_in_at is not null or a.no_show then
    raise exception 'This helper checked in or was already reported' using errcode = 'P0001';
  end if;

  update job_assignments set no_show = true where id = a.id;

  select coalesce((value ->> 'no_show_strikes_to_suspend')::int, 3) into max_strikes
    from app_settings where key = 'cancellation_policy';
  update helper_profiles set strikes = strikes + 1 where id = a.helper_id
    returning strikes into strikes_now;
  if strikes_now >= coalesce(max_strikes, 3) then
    update helper_profiles set suspended_at = now() where id = a.helper_id and suspended_at is null;
  end if;

  perform notify(a.helper_id, 'no_show', j.id,
    format('You were reported as a no-show for "%s" (strike %s of %s)', j.title, strikes_now, coalesce(max_strikes, 3)));
end $$;

-- ---------------------------------------------------------------------------
-- Lifecycle (replaces the Phase 2 version).
--   draft | open | filled → cancelled          (refund rules applied by the server)
--   open (with crew) | filled → in_progress    (also set by the first check-in)
--   in_progress → completed                     (releases payouts)
--   in_progress → disputed                      (holds funds for admin review)
-- ---------------------------------------------------------------------------
create or replace function complete_job_internal(p_job_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  j jobs;
  helper uuid;
begin
  update jobs set status = 'completed', completed_at = now()
    where id = p_job_id and status = 'in_progress'
    returning * into j;
  if j.id is null then
    return;
  end if;
  update helper_profiles set jobs_completed = jobs_completed + 1
    where id in (select helper_id from job_assignments where job_id = j.id and not no_show);
  for helper in select helper_id from job_assignments where job_id = j.id and not no_show loop
    perform notify(helper, 'job_completed', j.id, format('"%s" is complete. Your payout is on its way.', j.title));
  end loop;
end $$;

create or replace function set_job_status(p_job_id uuid, p_status job_status) returns void
language plpgsql security definer set search_path = public as $$
declare
  j jobs;
  crew int;
  helper uuid;
begin
  select * into j from jobs where id = p_job_id for update;
  if not found then
    raise exception 'Job not found' using errcode = 'P0002';
  end if;
  if j.poster_id is distinct from auth.uid() then
    raise exception 'Only the poster can change this job' using errcode = '42501';
  end if;

  select count(*) into crew from job_assignments where job_id = j.id and not no_show;

  if p_status = 'cancelled' and j.status in ('draft', 'open', 'filled') then
    update job_applications set status = 'declined' where job_id = j.id and status = 'applied';
    for helper in select helper_id from job_assignments where job_id = j.id loop
      perform notify(helper, 'job_cancelled', j.id, format('"%s" was cancelled', j.title));
    end loop;
    update jobs set status = 'cancelled', cancelled_at = now() where id = j.id;
  elsif p_status = 'in_progress' and j.status in ('open', 'filled') then
    if crew = 0 then
      raise exception 'Accept at least one helper before starting' using errcode = 'P0001';
    end if;
    if now() < j.scheduled_start - interval '2 hours' then
      raise exception 'You can start the job up to 2 hours before its scheduled time' using errcode = 'P0001';
    end if;
    update job_applications set status = 'declined' where job_id = j.id and status = 'applied';
    update jobs set status = 'in_progress' where id = j.id;
  elsif p_status = 'completed' and j.status = 'in_progress' then
    perform complete_job_internal(j.id);
  elsif p_status = 'disputed' and j.status = 'in_progress' then
    update jobs set status = 'disputed' where id = j.id;
  else
    raise exception 'Can''t change a % job to %', j.status, p_status using errcode = 'P0001';
  end if;
end $$;

-- Auto-confirm jobs 48 hours (app_settings.auto_release_hours) after their
-- scheduled end when nobody disputed. Called by the server's cron route.
create or replace function auto_complete_jobs() returns setof uuid
language plpgsql security definer set search_path = public as $$
declare
  hours int;
  jid uuid;
begin
  select coalesce((value #>> '{}')::int, 48) into hours from app_settings where key = 'auto_release_hours';
  for jid in
    select id from jobs
    where status = 'in_progress'
      and scheduled_start + make_interval(mins => (estimated_hours * 60)::int)
          + make_interval(hours => coalesce(hours, 48)) < now()
  loop
    perform complete_job_internal(jid);
    return next jid;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Reviews (both directions, after completion) and rating averages.
-- ---------------------------------------------------------------------------
create or replace function submit_review(p_job_id uuid, p_reviewee_id uuid, p_rating int,
                                         p_comment text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  j jobs;
  me uuid := auth.uid();
  allowed boolean;
begin
  select * into j from jobs where id = p_job_id;
  if j.id is null or j.status <> 'completed' then
    raise exception 'You can review once the job is complete' using errcode = 'P0001';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Pick a rating from 1 to 5' using errcode = 'P0001';
  end if;

  allowed :=
    -- poster reviewing a helper who worked the job
    (j.poster_id = me and exists (
      select 1 from job_assignments where job_id = j.id and helper_id = p_reviewee_id and not no_show))
    -- helper who worked the job reviewing the poster
    or (p_reviewee_id = j.poster_id and exists (
      select 1 from job_assignments where job_id = j.id and helper_id = me and not no_show));
  if not allowed then
    raise exception 'You can only review people you worked with on this job' using errcode = '42501';
  end if;

  insert into reviews (job_id, reviewer_id, reviewee_id, rating, comment)
  values (j.id, me, p_reviewee_id, p_rating, nullif(left(trim(p_comment), 1000), ''));
exception when unique_violation then
  raise exception 'You already reviewed this person for this job' using errcode = 'P0001';
end $$;

create or replace function update_helper_rating() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update helper_profiles h set
    rating_count = s.n,
    rating_avg = round(s.avg_rating, 1)
  from (
    select count(*) as n, coalesce(avg(rating), 0) as avg_rating
    from reviews where reviewee_id = new.reviewee_id
  ) s
  where h.id = new.reviewee_id;
  return new;
end $$;

create trigger reviews_update_rating
  after insert on reviews
  for each row execute function update_helper_rating();

-- ---------------------------------------------------------------------------
-- Manual verification (Checkr integration can replace this later).
-- ---------------------------------------------------------------------------
create or replace function admin_set_helper_verified(p_helper_id uuid, p_verified boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  update helper_profiles set is_verified = p_verified where id = p_helper_id;
end $$;

create or replace function admin_set_company_approved(p_company_id uuid, p_approved boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  update companies set is_approved = p_approved where id = p_company_id;
end $$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke execute on function guard_job_status() from public, anon, authenticated;
revoke execute on function distance_miles(double precision, double precision, double precision, double precision) from public, anon;
revoke execute on function helper_can_apply() from public, anon;
revoke execute on function check_in(uuid, double precision, double precision) from public, anon;
revoke execute on function check_out(uuid) from public, anon;
revoke execute on function mark_no_show(uuid) from public, anon;
revoke execute on function complete_job_internal(uuid) from public, anon, authenticated;
revoke execute on function set_job_status(uuid, job_status) from public, anon;
revoke execute on function auto_complete_jobs() from public, anon, authenticated;
revoke execute on function submit_review(uuid, uuid, int, text) from public, anon;
revoke execute on function update_helper_rating() from public, anon, authenticated;
revoke execute on function admin_set_helper_verified(uuid, boolean) from public, anon;
revoke execute on function admin_set_company_approved(uuid, boolean) from public, anon;

grant execute on function distance_miles(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function helper_can_apply() to authenticated;
grant execute on function check_in(uuid, double precision, double precision) to authenticated;
grant execute on function check_out(uuid) to authenticated;
grant execute on function mark_no_show(uuid) to authenticated;
grant execute on function set_job_status(uuid, job_status) to authenticated;
grant execute on function submit_review(uuid, uuid, int, text) to authenticated;
grant execute on function admin_set_helper_verified(uuid, boolean) to authenticated;
grant execute on function admin_set_company_approved(uuid, boolean) to authenticated;
grant execute on function auto_complete_jobs() to service_role;
