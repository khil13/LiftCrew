-- Minimal stand-in for the Supabase auth/storage schemas and roles, so the
-- migrations can be tested against a plain Postgres database.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema auth; create schema storage;
grant usage on schema public, auth, storage to anon, authenticated;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
create publication supabase_realtime;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
grant usage on schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant execute on functions to service_role;
