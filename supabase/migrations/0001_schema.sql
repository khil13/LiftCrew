-- 0001_schema.sql
-- Core tables for LiftCrew. Money is always stored in integer cents.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Users & roles
-- ---------------------------------------------------------------------------
create type user_role as enum ('helper', 'customer', 'company', 'admin');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text not null check (length(trim(full_name)) > 0),
  phone text,                              -- private: not readable by other users (see 0003_rls.sql)
  avatar_url text,
  city text,
  created_at timestamptz not null default now()
);

create table helper_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  bio text,
  years_experience int not null default 0 check (years_experience >= 0),
  skills text[] not null default '{}',     -- restricted to allowed job types (0002_compliance.sql)
  hourly_rate_cents int not null check (hourly_rate_cents > 0),
  has_own_ride_to_jobs boolean not null default false, -- how the helper gets to the job ONLY; never used to haul customer goods
  service_radius_miles int not null default 25 check (service_radius_miles between 1 and 100),
  home_lat double precision,               -- private
  home_lng double precision,               -- private
  is_verified boolean not null default false,  -- background check passed (admin-only)
  stripe_account_id text,                  -- private
  stripe_onboarded boolean not null default false,
  rating_avg numeric(2,1) not null default 0,
  rating_count int not null default 0,
  jobs_completed int not null default 0
);

create table companies (
  id uuid primary key references profiles(id) on delete cascade,
  business_name text not null check (length(trim(business_name)) > 0),
  license_number text,
  website text,
  is_approved boolean not null default false  -- admin-only
);

create table availability (
  id uuid primary key default gen_random_uuid(),
  helper_id uuid not null references helper_profiles(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

-- ---------------------------------------------------------------------------
-- Jobs
-- ---------------------------------------------------------------------------
create type job_status as enum ('draft','open','filled','in_progress','completed','cancelled','disputed');

create table jobs (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references profiles(id),       -- customer or company
  title text not null,
  description text,
  job_type text[] not null default '{}',                 -- loading, unloading, packing, etc.
  start_address text not null,
  start_state char(2) not null,          -- 2-letter code from Google Places, must be in allowed_states
  start_lat double precision,
  start_lng double precision,
  end_address text,
  end_state char(2),                     -- if present, must equal start_state and be in allowed_states
  end_lat double precision,
  end_lng double precision,
  scheduled_start timestamptz not null,
  estimated_hours numeric(4,1) not null check (estimated_hours > 0),
  helpers_needed int not null default 2 check (helpers_needed between 1 and 10),
  pay_rate_cents int not null check (pay_rate_cents > 0),  -- per helper per hour
  has_stairs boolean not null default false,
  has_heavy_items boolean not null default false,
  truck_provided_by_customer boolean not null default true
    check (truck_provided_by_customer = true),   -- labor-only: helpers never supply or drive the truck
  customer_attested_labor_only boolean not null default false,
  status job_status not null default 'open',
  created_at timestamptz not null default now()
);

create index jobs_status_idx on jobs (status);
create index jobs_poster_idx on jobs (poster_id);

create type application_status as enum ('applied','accepted','declined','withdrawn');

create table job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  helper_id uuid not null references helper_profiles(id) on delete cascade,
  status application_status not null default 'applied',
  message text,
  created_at timestamptz not null default now(),
  unique (job_id, helper_id)
);

create table job_assignments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  helper_id uuid not null references helper_profiles(id),
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  hours_worked numeric(4,1),
  unique (job_id, helper_id)
);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create type payment_status as enum ('pending','held','released','refunded','failed');

create table payments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  payer_id uuid references profiles(id),
  amount_cents int not null check (amount_cents >= 0),
  platform_fee_cents int not null check (platform_fee_cents >= 0),
  stripe_payment_intent_id text,
  status payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table payouts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references job_assignments(id),
  helper_id uuid references helper_profiles(id),
  amount_cents int not null check (amount_cents >= 0),
  stripe_transfer_id text,
  status payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------------
create table conversations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table conversation_members (
  conversation_id uuid references conversations(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  primary key (conversation_id, profile_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text not null check (length(body) > 0),
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Reviews (both directions)
-- ---------------------------------------------------------------------------
create table reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  reviewer_id uuid references profiles(id),
  reviewee_id uuid references profiles(id),
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (job_id, reviewer_id, reviewee_id)
);

-- ---------------------------------------------------------------------------
-- Favorites (companies re-hiring the same helpers)
-- ---------------------------------------------------------------------------
create table favorite_helpers (
  company_id uuid references companies(id) on delete cascade,
  helper_id uuid references helper_profiles(id) on delete cascade,
  primary key (company_id, helper_id)
);

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------
create table app_settings (
  key text primary key,
  value jsonb not null
);

insert into app_settings (key, value) values
  ('platform_fee_percent', '15'),
  -- Replace XX with the launch state code, e.g. '["NJ"]'. Until then no job or
  -- helper home address can pass the allowed-state checks.
  ('allowed_states', '["XX"]'),
  ('cancellation_policy', '{
    "full_refund_hours_before": 24,
    "late_cancel_min_paid_hours_per_helper": 1,
    "no_show_strikes_to_suspend": 3
  }'),
  ('auto_release_hours', '48');
