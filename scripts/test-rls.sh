#!/usr/bin/env bash
set -euo pipefail
: "${RLS_TEST_DATABASE_URL:?Set the URL of an isolated EMPTY PostgreSQL test database}"
# The bootstrap deliberately creates auth/storage schemas; never use a production database.
psql "$RLS_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/bootstrap-local.sql
psql "$RLS_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/schema.sql
for migration in supabase/migrations/*.sql; do
  psql "$RLS_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
done
psql "$RLS_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
