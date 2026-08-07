#!/bin/bash
# Creates one database per app from POSTGRES_MULTIPLE_DATABASES (comma-separated).
# Runs only on first init of an empty data volume (Postgres entrypoint contract).
set -euo pipefail

create_db() {
  local db="$1"
  echo "  init-multiple-dbs: creating database '$db'"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-SQL
	SELECT 'CREATE DATABASE "$db"'
	WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\gexec
SQL
}

if [ -n "${POSTGRES_MULTIPLE_DATABASES:-}" ]; then
  echo "init-multiple-dbs: requested -> $POSTGRES_MULTIPLE_DATABASES"
  IFS=',' read -ra DBS <<< "$POSTGRES_MULTIPLE_DATABASES"
  for db in "${DBS[@]}"; do
    create_db "$(echo "$db" | xargs)"
  done
  echo "init-multiple-dbs: done"
fi
