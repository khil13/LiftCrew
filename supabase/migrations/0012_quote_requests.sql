-- Quick quotes: visitors can ask for a quote without an account. Rows are
-- written only by the server (service role) after validation and rate limits;
-- signed-in admins can read them. Nobody else can read or write.

create table quote_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 100),
  phone text not null check (phone ~ '^\+1[0-9]{10}$'),
  town text not null check (char_length(town) between 2 and 100),
  move_date date,
  helpers int check (helpers between 1 and 4),
  details text check (char_length(details) <= 2000),
  flagged_phrases text[] not null default '{}',
  status text not null default 'new' check (status in ('new', 'contacted', 'booked', 'closed'))
);

create index quote_requests_created_at_idx on quote_requests (created_at desc);
create index quote_requests_phone_idx on quote_requests (phone, created_at desc);

alter table quote_requests enable row level security;
revoke all on quote_requests from anon, authenticated;
grant select on quote_requests to authenticated;
create policy quote_requests_admin_select on quote_requests for select to authenticated using (is_admin());
