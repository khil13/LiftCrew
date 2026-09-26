-- 0006_marketplace.sql
-- Phase 2: job feed, apply / accept / decline, job status lifecycle, per-job
-- chat, and in-app notifications.
--
-- State changes that touch several tables (accepting a helper, moving a job
-- through its lifecycle) happen in security-definer functions so clients never
-- write job_assignments, conversations, or notifications directly.

-- ---------------------------------------------------------------------------
-- Allowed-state trigger: only re-check when the addresses change, so a job can
-- still be cancelled or completed if the allowed states are edited later.
-- ---------------------------------------------------------------------------
drop trigger jobs_allowed_state on jobs;
create trigger jobs_allowed_state
  before insert or update of start_state, end_state on jobs
  for each row execute function enforce_allowed_state();

-- ---------------------------------------------------------------------------
-- Visibility: helpers keep seeing jobs they applied to after the job fills.
-- ---------------------------------------------------------------------------
create or replace function has_applied_to_job(p_job_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from job_applications where job_id = p_job_id and helper_id = auth.uid()
  );
$$;

drop policy jobs_select on jobs;
create policy jobs_select on jobs for select to authenticated
  using (
    poster_id = auth.uid()
    or is_admin()
    or is_assigned_to_job(id)
    or has_applied_to_job(id)
    or (status = 'open' and current_user_role() = 'helper' and is_allowed_state(start_state))
  );

-- Posters may decline directly; accepting goes through accept_application()
-- so the assignment, chat membership, and fill status stay consistent.
drop policy applications_decide_poster on job_applications;
create policy applications_decline_poster on job_applications for update to authenticated
  using (is_job_poster(job_id) and status = 'applied')
  with check (is_job_poster(job_id) and status = 'declined');

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  kind text not null,
  job_id uuid references jobs(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_profile_idx on notifications (profile_id, created_at desc);

alter table notifications enable row level security;
revoke all on notifications from anon, authenticated;
grant select on notifications to authenticated;
grant update (read_at) on notifications to authenticated;

create policy notifications_select_own on notifications for select to authenticated
  using (profile_id = auth.uid());
create policy notifications_update_own on notifications for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create or replace function notify(p_profile_id uuid, p_kind text, p_job_id uuid, p_body text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (profile_id, kind, job_id, body)
  values (p_profile_id, p_kind, p_job_id, p_body);
$$;

-- Application events → notifications.
create or replace function on_application_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare j jobs;
begin
  select * into j from jobs where id = new.job_id;
  if tg_op = 'INSERT' then
    perform notify(j.poster_id, 'application_new', j.id, format('New applicant for "%s"', j.title));
  elsif new.status is distinct from old.status then
    if new.status = 'accepted' then
      perform notify(new.helper_id, 'application_accepted', j.id, format('You''re booked for "%s"', j.title));
    elsif new.status = 'declined' then
      perform notify(new.helper_id, 'application_declined', j.id,
        format('Your application for "%s" wasn''t accepted', j.title));
    elsif new.status = 'withdrawn' then
      perform notify(j.poster_id, 'application_withdrawn', j.id,
        format('An applicant withdrew from "%s"', j.title));
    end if;
  end if;
  return new;
end $$;

create trigger job_applications_notify
  after insert or update of status on job_applications
  for each row execute function on_application_change();

-- ---------------------------------------------------------------------------
-- Chat: one conversation per job (poster + accepted helpers).
-- ---------------------------------------------------------------------------
create unique index conversations_job_idx on conversations (job_id);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table messages;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Accept an applicant (poster only).
-- ---------------------------------------------------------------------------
create or replace function accept_application(p_application_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  app job_applications;
  j jobs;
  conv uuid;
  crew int;
begin
  select * into app from job_applications where id = p_application_id;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  select * into j from jobs where id = app.job_id for update;
  if j.poster_id is distinct from auth.uid() then
    raise exception 'Only the poster can accept applicants' using errcode = '42501';
  end if;
  if j.status <> 'open' then
    raise exception 'This job is no longer taking helpers' using errcode = 'P0001';
  end if;
  if app.status <> 'applied' then
    raise exception 'This application is no longer pending' using errcode = 'P0001';
  end if;

  update job_applications set status = 'accepted' where id = app.id;
  insert into job_assignments (job_id, helper_id) values (j.id, app.helper_id);

  insert into conversations (job_id) values (j.id)
    on conflict (job_id) do update set job_id = excluded.job_id
    returning id into conv;
  insert into conversation_members (conversation_id, profile_id)
    values (conv, j.poster_id), (conv, app.helper_id)
    on conflict do nothing;

  select count(*) into crew from job_assignments where job_id = j.id;
  if crew >= j.helpers_needed then
    update jobs set status = 'filled' where id = j.id;
    update job_applications set status = 'declined' where job_id = j.id and status = 'applied';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Job lifecycle (poster only).
--   open | filled | draft → cancelled
--   open (with crew) | filled → in_progress   (from 2 hours before start)
--   in_progress → completed
-- Payments, refunds, and check-in hook into these transitions in Phase 3.
-- ---------------------------------------------------------------------------
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

  select count(*) into crew from job_assignments where job_id = j.id;

  if p_status = 'cancelled' and j.status in ('draft', 'open', 'filled') then
    update job_applications set status = 'declined' where job_id = j.id and status = 'applied';
    for helper in select helper_id from job_assignments where job_id = j.id loop
      perform notify(helper, 'job_cancelled', j.id, format('"%s" was cancelled', j.title));
    end loop;
  elsif p_status = 'in_progress' and j.status in ('open', 'filled') then
    if crew = 0 then
      raise exception 'Accept at least one helper before starting' using errcode = 'P0001';
    end if;
    if now() < j.scheduled_start - interval '2 hours' then
      raise exception 'You can start the job up to 2 hours before its scheduled time' using errcode = 'P0001';
    end if;
    update job_applications set status = 'declined' where job_id = j.id and status = 'applied';
  elsif p_status = 'completed' and j.status = 'in_progress' then
    update helper_profiles set jobs_completed = jobs_completed + 1
      where id in (select helper_id from job_assignments where job_id = j.id);
    for helper in select helper_id from job_assignments where job_id = j.id loop
      perform notify(helper, 'job_completed', j.id, format('"%s" was marked complete', j.title));
    end loop;
  else
    raise exception 'Can''t change a % job to %', j.status, p_status using errcode = 'P0001';
  end if;

  update jobs set status = p_status where id = j.id;
end $$;

-- ---------------------------------------------------------------------------
-- Helper job feed: open, upcoming jobs in allowed states within the helper's
-- service radius (haversine distance from their home).
-- ---------------------------------------------------------------------------
create or replace function job_feed(
  p_max_miles int default null,
  p_on_date date default null,
  p_time_zone text default 'America/New_York',
  p_min_pay_cents int default null,
  p_job_type text default null
)
returns table (
  id uuid,
  title text,
  job_type text[],
  start_address text,
  end_address text,
  scheduled_start timestamptz,
  estimated_hours numeric,
  helpers_needed int,
  pay_rate_cents int,
  has_stairs boolean,
  has_heavy_items boolean,
  distance_miles double precision,
  applied boolean
)
language sql stable security definer set search_path = public as $$
  with me as (
    select home_lat, home_lng, service_radius_miles
    from helper_profiles
    where id = auth.uid() and home_lat is not null and home_lng is not null
  )
  select
    j.id, j.title, j.job_type, j.start_address, j.end_address, j.scheduled_start,
    j.estimated_hours, j.helpers_needed, j.pay_rate_cents, j.has_stairs, j.has_heavy_items,
    round(d.miles::numeric, 1)::double precision,
    exists (select 1 from job_applications a where a.job_id = j.id and a.helper_id = auth.uid())
  from jobs j
  cross join me
  cross join lateral (
    select 3958.8 * 2 * asin(sqrt(
      power(sin(radians(j.start_lat - me.home_lat) / 2), 2)
      + cos(radians(me.home_lat)) * cos(radians(j.start_lat))
        * power(sin(radians(j.start_lng - me.home_lng) / 2), 2)
    )) as miles
  ) d
  where j.status = 'open'
    and is_allowed_state(j.start_state)
    and j.scheduled_start > now()
    and j.start_lat is not null and j.start_lng is not null
    and d.miles <= least(me.service_radius_miles, coalesce(p_max_miles, me.service_radius_miles))
    and (p_on_date is null or (j.scheduled_start at time zone p_time_zone)::date = p_on_date)
    and (p_min_pay_cents is null or j.pay_rate_cents >= p_min_pay_cents)
    and (p_job_type is null or p_job_type = any (j.job_type))
  order by j.scheduled_start
  limit 100;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges (Supabase grants EXECUTE on new functions by default).
-- ---------------------------------------------------------------------------
revoke execute on function has_applied_to_job(uuid) from public, anon;
revoke execute on function notify(uuid, text, uuid, text) from public, anon, authenticated;
revoke execute on function on_application_change() from public, anon, authenticated;
revoke execute on function accept_application(uuid) from public, anon;
revoke execute on function set_job_status(uuid, job_status) from public, anon;
revoke execute on function job_feed(int, date, text, int, text) from public, anon;

grant execute on function has_applied_to_job(uuid) to authenticated;
grant execute on function accept_application(uuid) to authenticated;
grant execute on function set_job_status(uuid, job_status) to authenticated;
grant execute on function job_feed(int, date, text, int, text) to authenticated;
