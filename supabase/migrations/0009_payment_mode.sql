-- 0009_payment_mode.sql
-- Lets the business run without Stripe for a while (pilot): customers pay in
-- person (cash, Cash App, Zelle) and jobs go live as soon as they're posted.
-- Switch app_settings.payment_mode back to "stripe" to require online payment.

insert into app_settings (key, value) values
  ('payment_mode', '"stripe"'),
  ('offline_payment_instructions',
   '"Pay at the end of the job by cash, Cash App, or Zelle. Your crew will share the details."')
on conflict (key) do nothing;

create or replace function payments_offline() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select value #>> '{}' from app_settings where key = 'payment_mode') = 'offline', false);
$$;

-- Helpers need Stripe payouts only when payments go through Stripe.
create or replace function helper_can_apply() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from helper_profiles
    where id = auth.uid()
      and agreed_labor_only_terms_at is not null
      and (stripe_onboarded or payments_offline())
      and suspended_at is null
  );
$$;

-- In pay-in-person mode the poster publishes a draft directly.
create or replace function publish_job(p_job_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare j jobs;
begin
  if not payments_offline() then
    raise exception 'Jobs are published after online payment' using errcode = 'P0001';
  end if;
  select * into j from jobs where id = p_job_id for update;
  if j.id is null or j.poster_id is distinct from auth.uid() then
    raise exception 'Only the poster can publish this job' using errcode = '42501';
  end if;
  if j.status <> 'draft' then
    raise exception 'This job is already published' using errcode = 'P0001';
  end if;
  if j.scheduled_start <= now() then
    raise exception 'This job''s start time has passed. Post a new job.' using errcode = 'P0001';
  end if;
  update jobs set status = 'open' where id = j.id;
end $$;

revoke execute on function payments_offline() from public, anon;
revoke execute on function publish_job(uuid) from public, anon;
grant execute on function payments_offline() to authenticated;
grant execute on function publish_job(uuid) to authenticated;
