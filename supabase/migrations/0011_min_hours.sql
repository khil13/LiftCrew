-- Every job is booked for at least 2 hours (MIN_JOB_HOURS in src/lib/pricing.ts).
alter table jobs add constraint jobs_min_hours check (estimated_hours >= 2);
