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
$P -c "update app_settings set value = '[\"NJ\"]' where key = 'allowed_states';
       insert into auth.users values ('$C'), ('$H'), ('$CO'), ('$X');" || exit 1

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
check $C  ok   "poster accepts application"        "update job_applications set status = 'accepted'"

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

echo
if [ $failures -eq 0 ]; then echo "All DB checks passed"; else echo "$failures DB check(s) failed"; exit 1; fi
