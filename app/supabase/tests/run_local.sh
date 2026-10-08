#!/usr/bin/env bash
# Lokaler Testlauf: frische DB → Stub → Migrationen → Seeds → Engine-Tests
# Voraussetzung: lokaler Postgres (PGHOST/PGPORT/PGUSER gesetzt). Nicht gegen Supabase ausführen.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${KF_TEST_DB:-kf_test}"
psql -q -c "drop database if exists $DB;" -c "create database $DB;"
psql -q -d "$DB" -v ON_ERROR_STOP=1 -f tests/00_supabase_stub.sql
for f in migrations/*.sql seed/seed.sql seed/seed_demo.sql; do
  psql -q -d "$DB" -v ON_ERROR_STOP=1 -f "$f"
done
psql -d "$DB" -1 -v ON_ERROR_STOP=1 -f tests/10_engine_test.sql 2>&1 | grep -E "NOTICE:  ok|ERROR|LINE|BESTANDEN|DETAIL|CONTEXT|ASSERT" | sed 's/^psql:[^:]*:[0-9]*: //'
