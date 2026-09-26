-- 0005_hardening.sql
-- Fixes from the Supabase security advisor.

-- Owners read their own private fields through functions instead of
-- security-definer views. Both only ever return the caller's own row.
drop view my_profile;
drop view my_helper_profile;

create or replace function get_my_profile() returns setof profiles
language sql stable security definer set search_path = public as $$
  select * from profiles where id = auth.uid();
$$;

create or replace function get_my_helper_profile() returns setof helper_profiles
language sql stable security definer set search_path = public as $$
  select * from helper_profiles where id = auth.uid();
$$;

alter function allowed_job_types() set search_path = '';

-- Nothing here is callable by signed-out users.
revoke execute on all functions in schema public from public, anon;

-- Trigger functions and internal helpers are never called through the API.
-- (Postgres does not check EXECUTE when a trigger fires.)
revoke execute on function enforce_allowed_state() from authenticated;
revoke execute on function enforce_helper_home_state() from authenticated;
revoke execute on function flag_job_content() from authenticated;
revoke execute on function flag_message_content() from authenticated;
revoke execute on function match_moderation_phrases(text) from authenticated;

-- RLS helpers (current_user_role, is_admin, is_job_poster, is_assigned_to_job,
-- is_conversation_member, helper_agreed_labor_only_terms, company_is_approved,
-- is_allowed_state) and allowed_job_types stay executable by signed-in users:
-- policies and check constraints call them as the querying user, and they only
-- answer questions about the caller or public settings.
grant execute on function get_my_profile() to authenticated;
grant execute on function get_my_helper_profile() to authenticated;
