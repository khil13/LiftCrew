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
$P -c "update app_settings set value = '[\"NJ\"]' where key = 'allowed_states';
       insert into auth.users values ('$C'), ('$H'), ('$CO'), ('$X'), ('$H2');" || exit 1

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
check $H  fail "cannot apply before labor terms"   "insert into job_applications (job_id, helper_id) select id, '$H' from jobs limit 1"
check $C  fail "signed-out cannot call helpers"     "reset role; set local role anon; select is_admin()"
check $H  ok   "helper agrees to labor-only terms" "update helper_profiles set agreed_labor_only_terms_at = now() where id = '$H'"
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

GEO="insert into jobs (id, poster_id, title, job_type, start_address, start_state, start_lat, start_lng,
                     scheduled_start, estimated_hours, helpers_needed, pay_rate_cents, customer_attested_labor_only)"
NEAR=aaaaaaaa-0000-0000-0000-000000000001
FAR=aaaaaaaa-0000-0000-0000-000000000002
check $C  ok   "post nearby job (Newark)"          "$GEO values ('$NEAR', '$C', 'Load truck', '{loading}', 'Newark', 'NJ', 40.7357, -74.1724, now() + interval '3 days', 3, 2, 3000, true)"
check $C  ok   "post far job (Atlantic City)"      "$GEO values ('$FAR', '$C', 'Far job', '{packing}', 'AC', 'NJ', 39.3643, -74.4229, now() + interval '3 days', 2, 1, 3000, true)"

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

echo
if [ $failures -eq 0 ]; then echo "All DB checks passed"; else echo "$failures DB check(s) failed"; exit 1; fi
