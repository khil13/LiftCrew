-- 0002_compliance.sql
-- Section 7 of the build plan: LiftCrew is a labor-only marketplace inside a
-- single state. These rules are enforced here (DB), in the API routes, and in
-- the UI. Do not relax them without a legal review.

-- ---------------------------------------------------------------------------
-- Rule 1: same-state jobs only
-- ---------------------------------------------------------------------------

-- Every job must stay inside one state.
alter table jobs add constraint job_single_state
  check (end_state is null or end_state = start_state);

-- Returns true when the 2-letter code is listed in app_settings.allowed_states.
create or replace function is_allowed_state(code text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select value ? upper(code) from app_settings where key = 'allowed_states'),
    false
  );
$$;

create or replace function enforce_allowed_state() returns trigger
language plpgsql security definer set search_path = public as $$
declare allowed jsonb;
begin
  select value into allowed from app_settings where key = 'allowed_states';
  if not is_allowed_state(new.start_state)
     or (new.end_state is not null and not is_allowed_state(new.end_state)) then
    raise exception 'Jobs are only available in: %', allowed
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger jobs_allowed_state
  before insert or update on jobs
  for each row execute function enforce_allowed_state();

-- Helper home location must be inside an allowed state. The state is resolved
-- server-side from Google Places, never typed by the user.
alter table helper_profiles add column home_state char(2);
alter table helper_profiles add constraint helper_home_state_required
  check ((home_lat is null and home_lng is null) or home_state is not null);

create or replace function enforce_helper_home_state() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.home_state is not null and not is_allowed_state(new.home_state) then
    raise exception 'Helpers must live in a supported state'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger helper_profiles_allowed_state
  before insert or update of home_state on helper_profiles
  for each row execute function enforce_helper_home_state();

-- ---------------------------------------------------------------------------
-- Rule 2: labor only, no transport
-- ---------------------------------------------------------------------------

-- Keep in sync with ALLOWED_JOB_TYPES in src/lib/compliance/jobTypes.ts.
create or replace function allowed_job_types() returns text[]
language sql immutable as $$
  select array[
    'loading', 'unloading', 'packing', 'unpacking',
    'furniture_assembly', 'in_home_moving', 'heavy_item_lifting'
  ]::text[];
$$;

alter table jobs add constraint jobs_job_type_allowed
  check (job_type <@ allowed_job_types());
alter table jobs add constraint jobs_job_type_required
  check (status = 'draft' or cardinality(job_type) > 0);

-- A job can only leave draft once the customer has attested labor-only.
alter table jobs add constraint jobs_labor_only_attested
  check (status = 'draft' or customer_attested_labor_only = true);

alter table helper_profiles add constraint helper_skills_allowed
  check (skills <@ allowed_job_types());

-- Helper must agree to labor-only terms before applying to jobs (checked in RLS).
alter table helper_profiles add column agreed_labor_only_terms_at timestamptz;

-- ---------------------------------------------------------------------------
-- Rule 3: no brokering
-- ---------------------------------------------------------------------------

-- USDOT / state mover license, if the company transports goods with its own crews.
alter table companies add column transport_credentials text;

-- ---------------------------------------------------------------------------
-- Rule 4: content moderation
-- ---------------------------------------------------------------------------

insert into app_settings (key, value) values
  ('moderation_phrases', '[
    "bring your truck", "bring a truck", "your truck", "use your truck",
    "drive my stuff", "drive my things", "drive my belongings",
    "deliver", "haul", "transport my", "pick up my stuff"
  ]');

create table content_flags (
  id uuid primary key default gen_random_uuid(),
  source_table text not null check (source_table in ('jobs', 'messages')),
  source_id uuid not null,
  matched_phrases text[] not null,
  excerpt text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references profiles(id)
);

create index content_flags_open_idx on content_flags (created_at) where resolved_at is null;

-- Case-insensitive phrase matches against app_settings.moderation_phrases.
create or replace function match_moderation_phrases(body text) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(phrase), '{}')
  from app_settings s,
       jsonb_array_elements_text(s.value) as phrase
  where s.key = 'moderation_phrases'
    and body ilike '%' || phrase || '%';
$$;

create or replace function flag_job_content() returns trigger
language plpgsql security definer set search_path = public as $$
declare matched text[];
begin
  matched := match_moderation_phrases(coalesce(new.title, '') || ' ' || coalesce(new.description, ''));
  if cardinality(matched) > 0 then
    insert into content_flags (source_table, source_id, matched_phrases, excerpt)
    values ('jobs', new.id, matched, left(coalesce(new.title, '') || ' — ' || coalesce(new.description, ''), 500));
  end if;
  return new;
end $$;

create trigger jobs_flag_content
  after insert or update of title, description on jobs
  for each row execute function flag_job_content();

create or replace function flag_message_content() returns trigger
language plpgsql security definer set search_path = public as $$
declare matched text[];
begin
  matched := match_moderation_phrases(new.body);
  if cardinality(matched) > 0 then
    insert into content_flags (source_table, source_id, matched_phrases, excerpt)
    values ('messages', new.id, matched, left(new.body, 500));
  end if;
  return new;
end $$;

create trigger messages_flag_content
  after insert on messages
  for each row execute function flag_message_content();
