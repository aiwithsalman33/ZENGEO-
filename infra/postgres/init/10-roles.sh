#!/bin/bash
# Runs once, as the postgres superuser, the first time the data volume is created.
#
# Sets up two separate database identities (spec section 10, "least privilege"):
#   * POSTGRES_USER  - schema owner. Alembic migrations connect as this role.
#   * APP_DB_USER    - runtime role used by the API and worker. It can read and
#                      write rows but cannot create, alter or drop objects, so a
#                      SQL-injection foothold in the app cannot reshape the schema.
set -euo pipefail

# users.email needs CITEXT regardless of which role the app connects as.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
     -c "CREATE EXTENSION IF NOT EXISTS citext;"

if [ -z "${APP_DB_USER:-}" ] || [ -z "${APP_DB_PASSWORD:-}" ]; then
  echo "[init] APP_DB_USER/APP_DB_PASSWORD not set - skipping runtime role creation."
  echo "[init] The application will fall back to connecting as ${POSTGRES_USER}."
  exit 0
fi

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_DB_USER}') THEN
            CREATE ROLE ${APP_DB_USER} LOGIN PASSWORD '${APP_DB_PASSWORD}';
        ELSE
            ALTER ROLE ${APP_DB_USER} WITH LOGIN PASSWORD '${APP_DB_PASSWORD}';
        END IF;
    END
    \$\$;

    -- No object creation for anyone but the owner.
    REVOKE CREATE ON SCHEMA public FROM PUBLIC;
    REVOKE ALL ON DATABASE ${POSTGRES_DB} FROM PUBLIC;

    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${APP_DB_USER};
    GRANT USAGE ON SCHEMA public TO ${APP_DB_USER};

    -- Existing objects (none on a fresh volume, but keeps re-runs correct).
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_DB_USER};
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_DB_USER};

    -- Anything Alembic creates later is granted automatically.
    ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_DB_USER};
    ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA public
        GRANT USAGE, SELECT ON SEQUENCES TO ${APP_DB_USER};
    ALTER DEFAULT PRIVILEGES FOR ROLE ${POSTGRES_USER} IN SCHEMA public
        GRANT EXECUTE ON FUNCTIONS TO ${APP_DB_USER};
EOSQL

echo "[init] Runtime role '${APP_DB_USER}' created with DML-only privileges."
