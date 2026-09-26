-- 0008_company_admin.sql
-- Phase 4: favorite helpers and invites, weekly shift series, disputes with
-- admin resolution, admin tools and metrics, and web push subscriptions.

-- ---------------------------------------------------------------------------
-- Weekly shift series: one checkout can pay for several jobs.
-- ---------------------------------------------------------------------------
alter table jobs add column series_id uuid;
create index jobs_series_idx on jobs (series_id) where series_id is not null;

alter table payments drop constraint payments_stripe_checkout_session_id_key;
create index payments_checkout_session_idx on payments (stripe_checkout_session_id);

-- ---------------------------------------------------------------------------
-- Invites: a company invites one of its favorite helpers to an open job.
-- ---------------------------------------------------------------------------
create table job_invites (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  helper_id uuid not null references helper_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (job_id, helper_id)
);

alter table job_invites enable row level security;
revoke all on job_invites from anon, authenticated;
grant select on job_invites to authenticated;

create policy job_invites_select on job_invites for select to authenticated
  using (helper_id = auth.uid() or is_job_poster(job_id) or is_admin());

create or replace function invite_helper(p_job_id uuid, p_helper_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare j jobs;
begin
  select * into j from jobs where id = p_job_id;
  if j.id is null or j.poster_id is distinct from auth.uid() then
    raise exception 'Only the poster can invite helpers' using errcode = '42501';
  end if;
  if j.status <> 'open' then
    raise exception 'You can only invite helpers to open jobs' using errcode = 'P0001';
  end if;
  if not exists (select 1 from favorite_helpers where company_id = auth.uid() and helper_id = p_helper_id) then
    raise exception 'Add this helper to your favorites first' using errcode = 'P0001';
  end if;
  if exists (select 1 from job_applications where job_id = j.id and helper_id = p_helper_id) then
    raise exception 'This helper already applied' using errcode = 'P0001';
  end if;
  insert into job_invites (job_id, helper_id) values (j.id, p_helper_id);
  perform notify(p_helper_id, 'job_invite', j.id, format('You''re invited to apply for "%s"', j.title));
exception when unique_violation then
  raise exception 'This helper is already invited' using errcode = 'P0001';
end $$;

-- Favorites are for companies (Section 4, Company screens).
drop policy favorites_own on favorite_helpers;
create policy favorites_select_own on favorite_helpers for select to authenticated
  using (company_id = auth.uid());
create policy favorites_insert_own on favorite_helpers for insert to authenticated
  with check (company_id = auth.uid() and current_user_role() = 'company');
create policy favorites_delete_own on favorite_helpers for delete to authenticated
  using (company_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Disputes: the poster explains the problem; an admin releases or refunds.
-- ---------------------------------------------------------------------------
alter table jobs
  add column dispute_reason text,
  add column dispute_resolution text check (dispute_resolution in ('released', 'refunded')),
  add column dispute_note text;

create or replace function notify_admins(p_kind text, p_job_id uuid, p_body text) returns void
language sql security definer set search_path = public as $$
  insert into notifications (profile_id, kind, job_id, body)
  select id, p_kind, p_job_id, p_body from profiles where role = 'admin';
$$;

create or replace function open_dispute(p_job_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  j jobs;
  helper uuid;
begin
  select * into j from jobs where id = p_job_id for update;
  if j.id is null or j.poster_id is distinct from auth.uid() then
    raise exception 'Only the poster can report a problem' using errcode = '42501';
  end if;
  if j.status <> 'in_progress' then
    raise exception 'You can report a problem while the job is in progress' using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 10 then
    raise exception 'Tell us what went wrong (at least a sentence)' using errcode = 'P0001';
  end if;
  update jobs set status = 'disputed', dispute_reason = left(trim(p_reason), 2000) where id = j.id;
  for helper in select helper_id from job_assignments where job_id = j.id and not no_show loop
    perform notify(helper, 'job_disputed', j.id, format('The poster reported a problem with "%s". Payment is on hold while we review.', j.title));
  end loop;
  perform notify_admins('dispute_opened', j.id, format('Dispute opened: "%s"', j.title));
end $$;

-- Posters now go through open_dispute() so every dispute has a reason.
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
  else
    raise exception 'Can''t change a % job to %', j.status, p_status using errcode = 'P0001';
  end if;
end $$;

-- Completion also closes disputes resolved in the helpers' favor.
create or replace function complete_job_internal(p_job_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  j jobs;
  helper uuid;
begin
  update jobs set status = 'completed', completed_at = now()
    where id = p_job_id and status in ('in_progress', 'disputed')
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

create or replace function admin_resolve_dispute(p_job_id uuid, p_outcome text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  j jobs;
  helper uuid;
begin
  if not is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  select * into j from jobs where id = p_job_id for update;
  if j.id is null or j.status <> 'disputed' then
    raise exception 'This job has no open dispute' using errcode = 'P0001';
  end if;
  if p_outcome = 'released' then
    update jobs set dispute_resolution = 'released', dispute_note = p_note where id = j.id;
    perform complete_job_internal(j.id);
    perform notify(j.poster_id, 'dispute_resolved', j.id,
      format('We reviewed "%s" and released payment to the crew.', j.title));
  elsif p_outcome = 'refunded' then
    update jobs set status = 'cancelled', cancelled_at = now(), dispute_resolution = 'refunded', dispute_note = p_note
      where id = j.id;
    perform notify(j.poster_id, 'dispute_resolved', j.id,
      format('We reviewed "%s" and refunded your payment in full.', j.title));
    for helper in select helper_id from job_assignments where job_id = j.id and not no_show loop
      perform notify(helper, 'dispute_resolved', j.id,
        format('We reviewed the problem reported on "%s" and refunded the poster.', j.title));
    end loop;
  else
    raise exception 'Outcome must be released or refunded' using errcode = 'P0001';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Admin tools
-- ---------------------------------------------------------------------------
create or replace function admin_set_helper_suspended(p_helper_id uuid, p_suspended boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  if p_suspended then
    update helper_profiles set suspended_at = coalesce(suspended_at, now()) where id = p_helper_id;
  else
    update helper_profiles set suspended_at = null, strikes = 0 where id = p_helper_id;
  end if;
end $$;

-- Admins see strikes and suspension status for the helpers list.
create or replace function admin_list_helpers() returns table (
  id uuid, full_name text, city text, home_state char(2), is_verified boolean, stripe_onboarded boolean,
  strikes int, suspended_at timestamptz, rating_avg numeric, rating_count int, jobs_completed int, created_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query
    select h.id, p.full_name, p.city, h.home_state, h.is_verified, h.stripe_onboarded, h.strikes, h.suspended_at,
           h.rating_avg, h.rating_count, h.jobs_completed, p.created_at
    from helper_profiles h join profiles p on p.id = h.id
    order by h.is_verified, p.created_at desc;
end $$;

-- Basic marketplace metrics for the last p_days days.
create or replace function admin_metrics(p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := now() - make_interval(days => p_days);
  result jsonb;
begin
  if not is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'jobs_posted', (select count(*) from jobs where created_at >= since and status <> 'draft'),
    'jobs_filled', (select count(*) from jobs where created_at >= since
                      and status in ('filled', 'in_progress', 'completed', 'disputed')),
    'jobs_completed', (select count(*) from jobs where completed_at >= since),
    'gmv_cents', (select coalesce(sum(amount_cents - refunded_cents), 0) from payments
                   where created_at >= since and status in ('held', 'released')),
    'fees_cents', (select coalesce(sum(platform_fee_cents), 0) from payments
                    where created_at >= since and status = 'released'),
    'helpers', (select count(*) from helper_profiles),
    'helpers_unverified', (select count(*) from helper_profiles where not is_verified),
    'companies_pending', (select count(*) from companies where not is_approved),
    'disputes_open', (select count(*) from jobs where status = 'disputed'),
    'flags_open', (select count(*) from content_flags where resolved_at is null)
  ) into result;
  return result;
end $$;

-- Tell admins when a company signs up and needs approval.
create or replace function on_company_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform notify_admins('company_pending', null, format('New company awaiting approval: %s', new.business_name));
  return new;
end $$;

create trigger companies_notify_admins
  after insert on companies
  for each row execute function on_company_created();

-- ---------------------------------------------------------------------------
-- Web push subscriptions (one row per browser/device).
-- ---------------------------------------------------------------------------
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;
revoke all on push_subscriptions from anon, authenticated;
grant select, insert, delete on push_subscriptions to authenticated;

create policy push_subscriptions_own on push_subscriptions for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke execute on function invite_helper(uuid, uuid) from public, anon;
revoke execute on function notify_admins(text, uuid, text) from public, anon, authenticated;
revoke execute on function open_dispute(uuid, text) from public, anon;
revoke execute on function set_job_status(uuid, job_status) from public, anon;
revoke execute on function complete_job_internal(uuid) from public, anon, authenticated;
revoke execute on function admin_resolve_dispute(uuid, text, text) from public, anon;
revoke execute on function admin_set_helper_suspended(uuid, boolean) from public, anon;
revoke execute on function admin_list_helpers() from public, anon;
revoke execute on function admin_metrics(int) from public, anon;
revoke execute on function on_company_created() from public, anon, authenticated;

grant execute on function invite_helper(uuid, uuid) to authenticated;
grant execute on function open_dispute(uuid, text) to authenticated;
grant execute on function set_job_status(uuid, job_status) to authenticated;
grant execute on function admin_resolve_dispute(uuid, text, text) to authenticated;
grant execute on function admin_set_helper_suspended(uuid, boolean) to authenticated;
grant execute on function admin_list_helpers() to authenticated;
grant execute on function admin_metrics(int) to authenticated;
