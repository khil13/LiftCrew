-- Phase 5: record which version of the legal documents each user accepted.
--   helper_profiles: Helper Agreement (independent contractor), required to apply.
--   jobs: Customer Booking Terms & Release, accepted when the job is posted.

alter table helper_profiles
  add column helper_agreement_version text,
  add column agreed_helper_agreement_at timestamptz;

alter table jobs
  add column release_version text,
  add column release_accepted_at timestamptz;

grant insert (helper_agreement_version, agreed_helper_agreement_at) on helper_profiles to authenticated;
grant update (helper_agreement_version, agreed_helper_agreement_at) on helper_profiles to authenticated;

-- Helpers must accept the Helper Agreement (on top of the labor-only terms) before applying.
create or replace function helper_can_apply() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from helper_profiles
    where id = auth.uid()
      and agreed_labor_only_terms_at is not null
      and agreed_helper_agreement_at is not null
      and (stripe_onboarded or payments_offline())
      and suspended_at is null
  );
$$;
