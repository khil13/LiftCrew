-- 0003_rls.sql
-- Row-level security for every table, plus column privileges so users cannot
-- read private fields (phone, home location, Stripe IDs) of other users or
-- write fields that only admins / the server may change (role, is_verified,
-- is_approved, ratings, Stripe status).
--
-- Because of the column privileges, client queries on profiles and
-- helper_profiles must list columns explicitly (no `select *`). Owners read
-- their own private fields through the my_profile / my_helper_profile views.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function current_user_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(current_user_role() = 'admin', false);
$$;

create or replace function is_job_poster(p_job_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from jobs where id = p_job_id and poster_id = auth.uid());
$$;

create or replace function is_assigned_to_job(p_job_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from job_assignments where job_id = p_job_id and helper_id = auth.uid()
  );
$$;

create or replace function is_conversation_member(p_conversation_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversation_members
    where conversation_id = p_conversation_id and profile_id = auth.uid()
  );
$$;

create or replace function helper_agreed_labor_only_terms() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from helper_profiles
    where id = auth.uid() and agreed_labor_only_terms_at is not null
  );
$$;

create or replace function company_is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from companies where id = auth.uid() and is_approved);
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table helper_profiles enable row level security;
alter table companies enable row level security;
alter table availability enable row level security;
alter table jobs enable row level security;
alter table job_applications enable row level security;
alter table job_assignments enable row level security;
alter table payments enable row level security;
alter table payouts enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;
alter table reviews enable row level security;
alter table favorite_helpers enable row level security;
alter table app_settings enable row level security;
alter table content_flags enable row level security;

-- Nothing is available to signed-out users except public settings.
revoke all on all tables in schema public from anon;
grant select on app_settings to anon;

-- ---------------------------------------------------------------------------
-- Profiles: anyone logged in can read public fields; only the owner updates.
-- ---------------------------------------------------------------------------
revoke all on profiles from authenticated;
grant select (id, role, full_name, avatar_url, city, created_at) on profiles to authenticated;
grant insert (id, role, full_name, phone, avatar_url, city) on profiles to authenticated;
grant update (full_name, phone, avatar_url, city) on profiles to authenticated;

create policy profiles_select on profiles for select to authenticated
  using (true);
create policy profiles_insert_own on profiles for insert to authenticated
  with check (id = auth.uid() and role <> 'admin');
create policy profiles_update_own on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create view my_profile as
  select * from profiles where id = auth.uid();
revoke all on my_profile from anon;
grant select on my_profile to authenticated;

-- ---------------------------------------------------------------------------
-- Helper profiles
-- ---------------------------------------------------------------------------
revoke all on helper_profiles from authenticated;
grant select (id, bio, years_experience, skills, hourly_rate_cents, has_own_ride_to_jobs,
              service_radius_miles, is_verified, stripe_onboarded, rating_avg, rating_count,
              jobs_completed)
  on helper_profiles to authenticated;
grant insert (id, bio, years_experience, skills, hourly_rate_cents, has_own_ride_to_jobs,
              service_radius_miles, home_lat, home_lng, home_state, agreed_labor_only_terms_at)
  on helper_profiles to authenticated;
grant update (bio, years_experience, skills, hourly_rate_cents, has_own_ride_to_jobs,
              service_radius_miles, home_lat, home_lng, home_state, agreed_labor_only_terms_at)
  on helper_profiles to authenticated;

create policy helper_profiles_select on helper_profiles for select to authenticated
  using (true);
create policy helper_profiles_insert_own on helper_profiles for insert to authenticated
  with check (id = auth.uid() and current_user_role() = 'helper');
create policy helper_profiles_update_own on helper_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create view my_helper_profile as
  select * from helper_profiles where id = auth.uid();
revoke all on my_helper_profile from anon;
grant select on my_helper_profile to authenticated;

-- ---------------------------------------------------------------------------
-- Companies (is_approved is admin-only)
-- ---------------------------------------------------------------------------
revoke all on companies from authenticated;
grant select on companies to authenticated;
grant insert (id, business_name, license_number, website, transport_credentials)
  on companies to authenticated;
grant update (business_name, license_number, website, transport_credentials)
  on companies to authenticated;

create policy companies_select on companies for select to authenticated
  using (true);
create policy companies_insert_own on companies for insert to authenticated
  with check (id = auth.uid() and current_user_role() = 'company');
create policy companies_update_own on companies for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Availability
-- ---------------------------------------------------------------------------
create policy availability_select on availability for select to authenticated
  using (true);
create policy availability_write_own on availability for all to authenticated
  using (helper_id = auth.uid()) with check (helper_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Jobs: open jobs readable by helpers; only the poster edits/cancels.
-- Status transitions beyond draft/open/cancelled go through the server.
-- ---------------------------------------------------------------------------
create policy jobs_select on jobs for select to authenticated
  using (
    poster_id = auth.uid()
    or is_admin()
    or is_assigned_to_job(id)
    or (status = 'open' and current_user_role() = 'helper' and is_allowed_state(start_state))
  );

create policy jobs_insert_own on jobs for insert to authenticated
  with check (
    poster_id = auth.uid()
    and status in ('draft', 'open')
    and (
      current_user_role() = 'customer'
      or (current_user_role() = 'company' and company_is_approved())
    )
  );

create policy jobs_update_own on jobs for update to authenticated
  using (poster_id = auth.uid() and status in ('draft', 'open'))
  with check (poster_id = auth.uid() and status in ('draft', 'open', 'cancelled'));

create policy jobs_delete_own_draft on jobs for delete to authenticated
  using (poster_id = auth.uid() and status = 'draft');

-- ---------------------------------------------------------------------------
-- Applications: helper sees their own; poster sees applications on their jobs.
-- ---------------------------------------------------------------------------
revoke update on job_applications from authenticated;
grant update (status) on job_applications to authenticated;

create policy applications_select on job_applications for select to authenticated
  using (helper_id = auth.uid() or is_job_poster(job_id) or is_admin());

create policy applications_insert_helper on job_applications for insert to authenticated
  with check (
    helper_id = auth.uid()
    and status = 'applied'
    and current_user_role() = 'helper'
    and helper_agreed_labor_only_terms()
    and exists (
      select 1 from jobs j
      where j.id = job_id and j.status = 'open' and is_allowed_state(j.start_state)
    )
  );

create policy applications_withdraw_helper on job_applications for update to authenticated
  using (helper_id = auth.uid() and status = 'applied')
  with check (helper_id = auth.uid() and status = 'withdrawn');

create policy applications_decide_poster on job_applications for update to authenticated
  using (is_job_poster(job_id) and status = 'applied')
  with check (is_job_poster(job_id) and status in ('accepted', 'declined'));

-- ---------------------------------------------------------------------------
-- Assignments: written by the server only.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on job_assignments from authenticated;

create policy assignments_select on job_assignments for select to authenticated
  using (helper_id = auth.uid() or is_job_poster(job_id) or is_admin());

-- ---------------------------------------------------------------------------
-- Payments / payouts: payer, the relevant helper, and admins can read.
-- Written by the server (Stripe webhook) only.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on payments from authenticated;
revoke insert, update, delete on payouts from authenticated;

create policy payments_select on payments for select to authenticated
  using (payer_id = auth.uid() or is_assigned_to_job(job_id) or is_admin());

create policy payouts_select on payouts for select to authenticated
  using (helper_id = auth.uid() or is_admin());

-- ---------------------------------------------------------------------------
-- Messaging: only conversation members can read/write.
-- Conversations and memberships are created by the server.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on conversations from authenticated;
revoke insert, update, delete on conversation_members from authenticated;
revoke update, delete on messages from authenticated;

create policy conversations_select on conversations for select to authenticated
  using (is_conversation_member(id) or is_admin());

create policy conversation_members_select on conversation_members for select to authenticated
  using (is_conversation_member(conversation_id) or is_admin());

create policy messages_select on messages for select to authenticated
  using (is_conversation_member(conversation_id) or is_admin());

create policy messages_insert_member on messages for insert to authenticated
  with check (sender_id = auth.uid() and is_conversation_member(conversation_id));

-- ---------------------------------------------------------------------------
-- Reviews: public to logged-in users; written by the server after completion.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on reviews from authenticated;

create policy reviews_select on reviews for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Favorite helpers: company manages its own list.
-- ---------------------------------------------------------------------------
create policy favorites_own on favorite_helpers for all to authenticated
  using (company_id = auth.uid()) with check (company_id = auth.uid());

-- ---------------------------------------------------------------------------
-- App settings: readable by everyone; only admins change them.
-- ---------------------------------------------------------------------------
revoke insert, delete on app_settings from authenticated;

create policy app_settings_select on app_settings for select to anon, authenticated
  using (true);
create policy app_settings_admin_update on app_settings for update to authenticated
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Content flags: admin review queue only.
-- ---------------------------------------------------------------------------
revoke insert, delete on content_flags from authenticated;

create policy content_flags_admin_select on content_flags for select to authenticated
  using (is_admin());
create policy content_flags_admin_update on content_flags for update to authenticated
  using (is_admin()) with check (is_admin());
