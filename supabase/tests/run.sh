#!/usr/bin/env bash
# Applies the migrations to a scratch Postgres database (with a Supabase stub)
# and checks the Section 7 compliance rules and key RLS policies.
#
#   DATABASE_URL=postgres://postgres:pass@localhost:5432/postgres supabase/tests/run.sh
#
# The database "liftcrew_test" on that server is dropped and recreated.
set -uo pipefail
cd "$(dirname "$0")/../.."

ADMIN_URL=${DATABASE_URL:?set DATABASE_URL to a Postgres superuser connection}
DB=liftcrew_test
TEST_URL="${ADMIN_URL%/*}/$DB"
psql -q -X "$ADMIN_URL" -c "drop database if exists $DB" -c "create database $DB" >/dev/null || exit 1

P="psql -q -X -v ON_ERROR_STOP=1 -tA $TEST_URL"
$P -f supabase/tests/supabase_stub.sql || exit 1
for f in supabase/migrations/*.sql; do
  $P -f "$f" || { echo "migration failed: $f"; exit 1; }
done

C=11111111-1111-1111-1111-111111111111   # customer
H=22222222-2222-2222-2222-222222222222   # helper
CO=33333333-3333-3333-3333-333333333333  # company
X=44444444-4444-4444-4444-444444444444   # would-be admin
H2=55555555-5555-5555-5555-555555555555  # second helper
A=66666666-6666-6666-6666-666666666666   # admin
$P -c "update app_settings set value = '[\"NJ\"]' where key = 'allowed_states';
       insert into auth.users values ('$C'), ('$H'), ('$CO'), ('$X'), ('$H2'), ('$A');
       insert into profiles (id, role, full_name) values ('$A', 'admin', 'Ada Admin');  -- admins are set up in SQL" || exit 1

failures=0

# check <uid> <ok|fail> <description> <sql>: runs sql as that signed-in user.
check() {
  local out rc
  out=$($P -c "begin; set local role authenticated; set local request.jwt.claim.sub = '$1'; $4; commit;" 2>&1)
  rc=$?
  if { [ "$2" = ok ] && [ $rc = 0 ]; } || { [ "$2" = fail ] && [ $rc != 0 ]; }; then
    echo "ok    $3"
  else
    echo "FAIL  $3 (expected $2) $out"
    failures=$((failures + 1))
  fi
}

JOB="insert into jobs (poster_id, title, job_type, start_address, start_state, end_address, end_state,
                       scheduled_start, estimated_hours, pay_rate_cents, customer_attested_labor_only)"

# Profiles and roles
check $C  ok   "customer creates profile"          "insert into profiles (id, role, full_name) values ('$C', 'customer', 'Cara')"
check $X  fail "cannot self-assign admin"          "insert into profiles (id, role, full_name) values ('$X', 'admin', 'Mallory')"
check $C  fail "cannot change own role"            "update profiles set role = 'admin' where id = '$C'"
check $H  ok   "helper creates profile"            "insert into profiles (id, role, full_name, phone) values ('$H', 'helper', 'Hal', '555')"
check $CO ok   "company creates profile"           "insert into profiles (id, role, full_name) values ('$CO', 'company', 'Co')"
check $C  fail "customer cannot be a helper"       "insert into helper_profiles (id, hourly_rate_cents) values ('$C', 2500)"

# Helper onboarding (Rule 1 + Rule 2)
check $H  fail "helper home out of state"          "insert into helper_profiles (id, hourly_rate_cents, skills, home_lat, home_lng, home_state) values ('$H', 2500, '{packing}', 40.7, -74.1, 'NY')"
check $H  fail "helper home without a state"       "insert into helper_profiles (id, hourly_rate_cents, skills, home_lat, home_lng) values ('$H', 2500, '{packing}', 40.7, -74.1)"
check $H  fail "transport skill rejected"          "insert into helper_profiles (id, hourly_rate_cents, skills) values ('$H', 2500, '{truck_driving}')"
check $H  ok   "helper home in state"              "insert into helper_profiles (id, hourly_rate_cents, skills, home_lat, home_lng, home_state) values ('$H', 2500, '{packing}', 40.7, -74.1, 'NJ')"
check $H  fail "helper cannot self-verify"         "update helper_profiles set is_verified = true where id = '$H'"

# Private columns
check $C  fail "other users' phone is private"     "select phone from profiles"
check $C  fail "helper home location is private"   "select home_lat from helper_profiles"
check $H  ok   "owner reads own phone"             "select phone from get_my_profile()"

# Jobs: same-state only (Rule 1)
check $C  ok   "in-state job passes"               "$JOB values ('$C', 'Move', '{loading}', 'a', 'NJ', 'b', 'NJ', now(), 3, 2500, true)"
check $C  fail "out-of-state start fails"          "$JOB values ('$C', 'Move', '{loading}', 'a', 'NY', null, null, now(), 3, 2500, true)"
check $C  fail "out-of-state end fails"            "$JOB values ('$C', 'Move', '{loading}', 'a', 'NJ', 'b', 'PA', now(), 3, 2500, true)"
check $C  fail "cross-state job fails"             "$JOB values ('$C', 'Move', '{loading}', 'a', 'NJ', 'b', 'NY', now(), 3, 2500, true)"

# Jobs: labor only (Rule 2)
check $C  fail "labor-only attestation required"   "$JOB values ('$C', 'Move', '{loading}', 'a', 'NJ', null, null, now(), 3, 2500, false)"
check $C  fail "transport job type rejected"       "$JOB values ('$C', 'Move', '{delivery}', 'a', 'NJ', null, null, now(), 3, 2500, true)"
check $C  fail "helper-supplied truck rejected"    "insert into jobs (poster_id, title, job_type, start_address, start_state, scheduled_start, estimated_hours, pay_rate_cents, customer_attested_labor_only, truck_provided_by_customer) values ('$C', 'Move', '{loading}', 'a', 'NJ', now(), 3, 2500, true, false)"
check $H  fail "helper cannot post jobs"           "$JOB values ('$H', 'Move', '{loading}', 'a', 'NJ', 'b', 'NJ', now(), 3, 2500, true)"

# Companies (Rule 3)
check $CO ok   "company onboards"                  "insert into companies (id, business_name) values ('$CO', 'Movers LLC')"
check $CO fail "company cannot self-approve"       "update companies set is_approved = true where id = '$CO'"
check $CO fail "unapproved company cannot post"    "$JOB values ('$CO', 'Shift', '{loading}', 'a', 'NJ', 'b', 'NJ', now(), 3, 2500, true)"

# Applications
check $C  fail "cannot post a job as already open"  "insert into jobs (poster_id, title, job_type, start_address, start_state, scheduled_start, estimated_hours, pay_rate_cents, customer_attested_labor_only, status) values ('$C', 'x', '{loading}', 'a', 'NJ', now(), 3, 2500, true, 'open')"
check $C  fail "cannot open own draft without paying" "update jobs set status = 'open' where poster_id = '$C'"
$P -c "update jobs set status = 'open'" >/dev/null   # payment webhook (service role) opens paid jobs
check $H  fail "cannot apply before labor terms"   "insert into job_applications (job_id, helper_id) select id, '$H' from jobs limit 1"
check $C  fail "signed-out cannot call helpers"     "reset role; set local role anon; select is_admin()"
check $H  ok   "helper agrees to labor-only terms" "update helper_profiles set agreed_labor_only_terms_at = now() where id = '$H'"
check $H  fail "cannot apply before payouts set up" "insert into job_applications (job_id, helper_id) select id, '$H' from jobs limit 1"
$P -c "update helper_profiles set stripe_onboarded = true where id = '$H'" >/dev/null   # Stripe onboarding webhook
check $H  ok   "helper applies after terms"        "insert into job_applications (job_id, helper_id) select id, '$H' from jobs limit 1"
check $C  fail "poster cannot accept by editing"   "update job_applications set status = 'accepted'"

# Settings are admin-only
# RLS silently skips rows, so the DO block raises when nothing was updated.
check $C  fail "customer cannot edit settings"     "do \$\$ declare n int; begin
  update app_settings set value = '[\"NJ\", \"NY\"]' where key = 'allowed_states';
  get diagnostics n = row_count; if n = 0 then raise exception 'no rows updated'; end if; end \$\$"

# Moderation (Rule 4)
check $C  ok   "flagged job still saves"           "$JOB values ('$C', 'Please bring your truck', '{loading}', 'a', 'NJ', null, null, now(), 3, 2500, true)"

flags=$($P -c "select count(*) from content_flags")
if [ "$flags" = 1 ]; then echo "ok    moderation queue has the flagged job"
else echo "FAIL  expected 1 content flag, got $flags"; failures=$((failures + 1)); fi

seen=$($P -c "begin; set local role authenticated; set local request.jwt.claim.sub = '$C'; select count(*) from content_flags; commit;")
if [ "$seen" = 0 ]; then echo "ok    non-admins cannot read the moderation queue"
else echo "FAIL  customer saw $seen flags"; failures=$((failures + 1)); fi

# ---------------------------------------------------------------------------
# Phase 2: feed, accept, chat, lifecycle
# ---------------------------------------------------------------------------
q() { $P -c "begin; set local role authenticated; set local request.jwt.claim.sub = '$1'; $2; commit;" 2>&1 | grep -v -E '^(BEGIN|SET|COMMIT)$'; }
expect() { # expect <description> <actual> <expected>
  if [ "$2" = "$3" ]; then echo "ok    $1"; else echo "FAIL  $1: got '$2', expected '$3'"; failures=$((failures + 1)); fi
}

check $H2 ok   "second helper onboards"            "insert into profiles (id, role, full_name) values ('$H2', 'helper', 'Hana');
  insert into helper_profiles (id, hourly_rate_cents, skills, home_lat, home_lng, home_state, agreed_labor_only_terms_at)
  values ('$H2', 2500, '{loading}', 40.72, -74.05, 'NJ', now())"
$P -c "update helper_profiles set stripe_onboarded = true where id = '$H2'" >/dev/null

GEO="insert into jobs (id, poster_id, title, job_type, start_address, start_state, start_lat, start_lng,
                     scheduled_start, estimated_hours, helpers_needed, pay_rate_cents, customer_attested_labor_only)"
NEAR=aaaaaaaa-0000-0000-0000-000000000001
FAR=aaaaaaaa-0000-0000-0000-000000000002
check $C  ok   "post nearby job (Newark)"          "$GEO values ('$NEAR', '$C', 'Load truck', '{loading}', 'Newark', 'NJ', 40.7357, -74.1724, now() + interval '3 days', 3, 2, 3000, true)"
check $C  ok   "post far job (Atlantic City)"      "$GEO values ('$FAR', '$C', 'Far job', '{packing}', 'AC', 'NJ', 39.3643, -74.4229, now() + interval '3 days', 2, 1, 3000, true)"
$P -c "update jobs set status = 'open' where id in ('$NEAR', '$FAR')" >/dev/null

expect "feed shows only jobs within radius"  "$(q $H "select string_agg(title, ',') from job_feed() where title in ('Load truck', 'Far job')")" "Load truck"
expect "feed distance is ~4.5 miles"         "$(q $H "select distance_miles between 3 and 6 from job_feed() where id = '$NEAR'")" "t"
expect "feed min-pay filter"                 "$(q $H "select count(*) from job_feed(p_min_pay_cents => 5000)")" "0"
expect "feed job-type filter"                "$(q $H "select count(*) from job_feed(p_job_type => 'packing') where id = '$NEAR'")" "0"
expect "customers get an empty feed"         "$(q $C "select count(*) from job_feed()")" "0"

check $H  ok   "helper 1 applies"                  "insert into job_applications (job_id, helper_id, message) values ('$NEAR', '$H', 'Hi')"
check $H2 ok   "helper 2 applies"                  "insert into job_applications (job_id, helper_id) values ('$NEAR', '$H2')"
expect "poster notified of applicants"       "$(q $C "select count(*) from notifications where kind = 'application_new' and job_id = '$NEAR'")" "2"
expect "feed marks applied jobs"             "$(q $H "select applied from job_feed() where id = '$NEAR'")" "t"

A1=$(q $C "select id from job_applications where job_id = '$NEAR' and helper_id = '$H'")
A2=$(q $C "select id from job_applications where job_id = '$NEAR' and helper_id = '$H2'")
check $H  fail "helper cannot accept"              "select accept_application('$A1')"
check $CO fail "other user cannot accept"          "select accept_application('$A1')"
check $C  ok   "poster accepts helper 1"           "select accept_application('$A1')"
check $C  fail "cannot accept twice"               "select accept_application('$A1')"
expect "assignment created"                  "$(q $H "select count(*) from job_assignments where job_id = '$NEAR'")" "1"
expect "job still open (1 of 2)"             "$(q $C "select status from jobs where id = '$NEAR'")" "open"
expect "helper 1 notified"                   "$(q $H "select count(*) from notifications where kind = 'application_accepted'")" "1"

CONV=$(q $C "select id from conversations where job_id = '$NEAR'")
check $H  ok   "crew member can chat"              "insert into messages (conversation_id, sender_id, body) values ('$CONV', '$H', 'On my way')"
check $H2 fail "non-member cannot chat"            "insert into messages (conversation_id, sender_id, body) values ('$CONV', '$H2', 'Hi')"
expect "non-member cannot read chat"         "$(q $H2 "select count(*) from messages where conversation_id = '$CONV'")" "0"
check $H  fail "cannot send as someone else"       "insert into messages (conversation_id, sender_id, body) values ('$CONV', '$C', 'fake')"

check $C  ok   "poster accepts helper 2"           "select accept_application('$A2')"
expect "job filled at 2 of 2"                "$(q $C "select status from jobs where id = '$NEAR'")" "filled"
expect "filled job leaves the feed"          "$(q $H "select count(*) from job_feed() where id = '$NEAR'")" "0"
expect "applied helper still sees filled job" "$(q $H2 "select count(*) from jobs where id = '$NEAR'")" "1"
expect "both helpers in chat"                "$(q $C "select count(*) from conversation_members where conversation_id = '$CONV'")" "3"

check $H  fail "helper cannot change job status"   "select set_job_status('$NEAR', 'cancelled')"
check $C  fail "cannot start 3 days early"         "select set_job_status('$NEAR', 'in_progress')"
check $C  fail "cannot complete before starting"   "select set_job_status('$NEAR', 'completed')"
$P -c "update jobs set scheduled_start = now() + interval '1 hour' where id = '$NEAR'" >/dev/null
check $C  ok   "start job near its time"           "select set_job_status('$NEAR', 'in_progress')"
check $C  fail "cannot cancel a job in progress"   "select set_job_status('$NEAR', 'cancelled')"
check $C  ok   "complete job"                      "select set_job_status('$NEAR', 'completed')"
expect "helpers' completed count updated"    "$(q $H "select jobs_completed from helper_profiles where id = '$H'")" "1"
check $C  fail "poster cannot edit completed job"  "do \$\$ declare n int; begin update jobs set title = 'x' where id = '$NEAR'; get diagnostics n = row_count; if n = 0 then raise exception 'no rows'; end if; end \$\$"

check $H  ok   "helper applies to far job"          "insert into job_applications (job_id, helper_id) values ('$FAR', '$H')"
check $C  ok   "cancel open job"                   "select set_job_status('$FAR', 'cancelled')"
expect "pending applicant declined on cancel" "$(q $H "select status from job_applications where job_id = '$FAR'")" "declined"
check $H  ok   "helper marks notifications read"   "update notifications set read_at = now() where profile_id = '$H'"
check $H  fail "cannot rewrite notification text"  "update notifications set body = 'x'"
check $H  fail "cannot create notifications"       "select notify('$H', 'x', null, 'spam')"

# ---------------------------------------------------------------------------
# Phase 3: check-in / check-out, no-shows, completion, reviews, admin
# ---------------------------------------------------------------------------
J3=aaaaaaaa-0000-0000-0000-000000000003
J4=aaaaaaaa-0000-0000-0000-000000000004
J5=aaaaaaaa-0000-0000-0000-000000000005
check $C  ok   "post job starting in 30 minutes"   "$GEO values ('$J3', '$C', 'Soon job', '{loading}', 'Newark', 'NJ', 40.7357, -74.1724, now() + interval '30 minutes', 2, 1, 3000, true)"
check $C  ok   "post job for no-show test"         "$GEO values ('$J4', '$C', 'No-show job', '{loading}', 'Newark', 'NJ', 40.7357, -74.1724, now() + interval '1 day', 2, 2, 3000, true)"
$P -c "update jobs set status = 'open' where id in ('$J3', '$J4')" >/dev/null
check $H  ok   "helper applies to soon job"        "insert into job_applications (job_id, helper_id) values ('$J3', '$H')"
check $C  ok   "poster books helper"               "select accept_application(id) from job_applications where job_id = '$J3'"
check $H2 fail "unbooked helper cannot check in"   "select check_in('$J3')"
check $H  ok   "booked helper checks in with GPS"  "select check_in('$J3', 40.7360, -74.1720)"
expect "check-in starts the job"             "$(q $C "select status from jobs where id = '$J3'")" "in_progress"
expect "check-in distance recorded"          "$(q $H "select check_in_distance_miles from job_assignments where job_id = '$J3'")" "0.0"
check $H  fail "cannot check in twice"             "select check_in('$J3')"
check $H  ok   "helper checks out"                 "select check_out('$J3')"
expect "hours worked recorded"               "$(q $H "select hours_worked is not null from job_assignments where job_id = '$J3'")" "t"
check $H  fail "cannot check out twice"            "select check_out('$J3')"

check $H  fail "cannot review before completion"   "select submit_review('$J3', '$C', 5, 'Great')"
check $C  ok   "poster completes job"              "select set_job_status('$J3', 'completed')"
expect "completion time recorded"            "$(q $C "select completed_at is not null from jobs where id = '$J3'")" "t"
check $C  ok   "poster reviews helper"             "select submit_review('$J3', '$H', 4, 'Careful and quick')"
check $C  fail "cannot review twice"               "select submit_review('$J3', '$H', 5, null)"
check $C  fail "rating must be 1-5"                "select submit_review('$J3', '$H', 6, null)"
check $H  ok   "helper reviews poster"             "select submit_review('$J3', '$C', 5, 'Clear instructions')"
check $H2 fail "outsider cannot review"            "select submit_review('$J3', '$H', 1, 'fake')"
check $C  fail "reviews not insertable directly"   "insert into reviews (job_id, reviewer_id, reviewee_id, rating) values ('$J3', '$C', '$H2', 1)"
expect "helper rating updated"               "$(q $C "select rating_avg || '/' || rating_count from helper_profiles where id = '$H'")" "4.0/1"

check $H  ok   "helper 1 applies (no-show job)"    "insert into job_applications (job_id, helper_id) values ('$J4', '$H')"
check $H2 ok   "helper 2 applies (no-show job)"    "insert into job_applications (job_id, helper_id) values ('$J4', '$H2')"
check $C  ok   "poster books both"                 "select accept_application(id) from job_applications where job_id = '$J4'"
check $C  fail "no-show only after start"          "select mark_no_show(id) from job_assignments where job_id = '$J4' and helper_id = '$H2'"
$P -c "update jobs set scheduled_start = now() - interval '1 hour' where id = '$J4'; update helper_profiles set strikes = 2 where id = '$H2'" >/dev/null
check $H  ok   "helper 1 checks in late"           "select check_in('$J4')"
NS=$($P -c "select id from job_assignments where job_id = '$J4' and helper_id = '$H2'")
check $H  fail "helper cannot report no-shows"     "select mark_no_show('$NS')"
check $C  fail "checked-in helper isn't a no-show" "select mark_no_show(id) from job_assignments where job_id = '$J4' and helper_id = '$H'"
check $C  ok   "poster reports helper 2 no-show"   "select mark_no_show(id) from job_assignments where job_id = '$J4' and helper_id = '$H2'"
expect "third strike suspends helper"        "$(q $H2 "select strikes || ',' || (suspended_at is not null) from get_my_helper_profile()")" "3,true"
check $H2 fail "no-show cannot check in"           "select check_in('$J4')"
check $C  ok   "post another job"                  "$GEO values ('$J5', '$C', 'Later job', '{loading}', 'Newark', 'NJ', 40.7357, -74.1724, now() + interval '2 days', 2, 1, 3000, true)"
$P -c "update jobs set status = 'open' where id = '$J5'" >/dev/null
check $H2 fail "suspended helper cannot apply"     "insert into job_applications (job_id, helper_id) values ('$J5', '$H2')"
check $C  fail "dispute needs a reason"            "select open_dispute('$J4', 'bad')"
check $C  fail "cannot dispute via status change"  "select set_job_status('$J4', 'disputed')"
check $C  ok   "poster disputes job in progress"   "select open_dispute('$J4', 'Helper 2 never came and we ran 2 hours over')"
check $C  fail "cannot complete a disputed job"    "select set_job_status('$J4', 'completed')"

check $H  ok   "helper applies to later job"       "insert into job_applications (job_id, helper_id) values ('$J5', '$H')"
check $C  ok   "poster books helper on later job"  "select accept_application(id) from job_applications where job_id = '$J5'"
$P -c "update jobs set status = 'in_progress', scheduled_start = now() - interval '4 days' where id = '$J5'" >/dev/null
check $C  fail "users cannot run auto-complete"    "select auto_complete_jobs()"
expect "auto-complete after 48 hours"        "$($P -c "select count(*) from auto_complete_jobs() where auto_complete_jobs = '$J5'")" "1"
expect "auto-completed job is complete"      "$(q $C "select status from jobs where id = '$J5'")" "completed"

check $C  fail "non-admin cannot verify helpers"   "select admin_set_helper_verified('$H', true)"
check $CO fail "non-admin cannot approve companies" "select admin_set_company_approved('$CO', true)"
check $C  fail "customers cannot write payments"   "insert into payments (job_id, payer_id, amount_cents, platform_fee_cents) values ('$J3', '$C', 1, 0)"
check $H  fail "helpers cannot write payouts"      "insert into payouts (helper_id, amount_cents) values ('$H', 100000)"

# ---------------------------------------------------------------------------
# Phase 4: favorites, invites, admin tools, push subscriptions
# ---------------------------------------------------------------------------
check $A  ok   "admin approves company"            "select admin_set_company_approved('$CO', true)"
check $A  ok   "admin verifies helper"             "select admin_set_helper_verified('$H', true)"
expect "helper shows as verified"            "$(q $C "select is_verified from helper_profiles where id = '$H'")" "t"

J6=aaaaaaaa-0000-0000-0000-000000000006
check $CO ok   "approved company posts a shift"    "$GEO values ('$J6', '$CO', 'Warehouse shift', '{loading}', 'Newark', 'NJ', 40.7357, -74.1724, now() + interval '5 days', 4, 2, 3200, true)"
$P -c "update jobs set status = 'open' where id = '$J6'" >/dev/null
check $C  fail "customers cannot keep favorites"   "insert into favorite_helpers (company_id, helper_id) values ('$C', '$H')"
check $CO ok   "company favorites a helper"        "insert into favorite_helpers (company_id, helper_id) values ('$CO', '$H')"
check $CO fail "cannot invite a non-favorite"      "select invite_helper('$J6', '$H2')"
check $C  fail "cannot invite to someone else's job" "select invite_helper('$J6', '$H')"
check $CO ok   "company invites favorite"          "select invite_helper('$J6', '$H')"
check $CO fail "cannot invite twice"               "select invite_helper('$J6', '$H')"
expect "helper sees the invite"              "$(q $H "select count(*) from job_invites where job_id = '$J6'")" "1"
expect "helper notified of invite"           "$(q $H "select count(*) from notifications where kind = 'job_invite'")" "1"
expect "others cannot see invites"           "$(q $H2 "select count(*) from job_invites")" "0"
check $H  fail "invites are not writable directly" "insert into job_invites (job_id, helper_id) values ('$J6', '$H2')"

expect "admin notified of dispute"           "$(q $A "select count(*) from notifications where kind = 'dispute_opened'")" "1"
check $C  fail "poster cannot resolve disputes"    "select admin_resolve_dispute('$J4', 'released')"
check $A  ok   "admin refunds disputed job"        "select admin_resolve_dispute('$J4', 'refunded', 'Crew was short')"
expect "refunded dispute is cancelled"       "$(q $C "select status || '/' || dispute_resolution from jobs where id = '$J4'")" "cancelled/refunded"
check $A  fail "cannot resolve twice"              "select admin_resolve_dispute('$J4', 'released')"

check $C  fail "customers cannot read metrics"     "select admin_metrics()"
expect "admin metrics count open flags"      "$(q $A "select (admin_metrics() ->> 'flags_open')::int >= 1")" "t"
expect "admin lists helpers with strikes"    "$(q $A "select strikes from admin_list_helpers() where id = '$H2'")" "3"
check $C  fail "customers cannot list helpers"     "select admin_list_helpers()"
check $A  ok   "admin lifts suspension"            "select admin_set_helper_suspended('$H2', false)"
expect "suspension lifted, strikes reset"    "$(q $H2 "select strikes || ',' || (suspended_at is null) from get_my_helper_profile()")" "0,true"
check $A  ok   "admin resolves a flag"             "update content_flags set resolved_at = now(), resolved_by = '$A' where resolved_at is null"
check $A  ok   "admin changes the platform fee"    "do \$\$ declare n int; begin update app_settings set value = '12' where key = 'platform_fee_percent'; get diagnostics n = row_count; if n = 0 then raise exception 'no rows'; end if; end \$\$"

check $H  ok   "helper saves push subscription"    "insert into push_subscriptions (profile_id, endpoint, p256dh, auth) values ('$H', 'https://push.example/1', 'k', 'a')"
check $H  fail "cannot save push for someone else" "insert into push_subscriptions (profile_id, endpoint, p256dh, auth) values ('$C', 'https://push.example/2', 'k', 'a')"
expect "push subscriptions are private"      "$(q $C "select count(*) from push_subscriptions")" "0"

echo
if [ $failures -eq 0 ]; then echo "All DB checks passed"; else echo "$failures DB check(s) failed"; exit 1; fi
