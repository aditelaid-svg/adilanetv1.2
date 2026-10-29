# Deploy AdilaNet with Dockge

This guide applies to a new self-hosted installation. It does not authorize
changing an existing STB/VPS. The repository does not currently identify a
published GHCR image tag; do not guess one. Compose intentionally requires
`ADILANET_IMAGE` and fails validation when it is unset.

On an empty production database, startup creates the schema and system-default
settings but does not insert demo users, routers, packages, or promo banners.
Demo fixtures are restricted to `NODE_ENV=test`. A secure first-admin
provisioning path for a new production database is not included here; resolve
that separately before making a fresh installation available to users.

## Required configuration

Create the stack in Dockge using `docker-compose.yml` and a private `.env` in
the stack directory. Never commit or share `.env`.

Required values:

- `ADILANET_IMAGE`: exact, published image reference confirmed in GHCR.
- `POSTGRES_PASSWORD`: password for a newly initialized Compose PostgreSQL
  volume. For an existing volume, it must match the database's existing
  password; changing this environment value does not rotate the database role.
- `DATABASE_URL`: PostgreSQL connection URL for this stack's `db` service and
  database/user `adilanet`. URL-encode special characters in the password.
- `SESSION_SECRET`: long random secret, kept private.

Optional:

- `DIGIFLAZZ_USERNAME`, `DIGIFLAZZ_API_KEY`, `DIGIFLAZZ_WEBHOOK_SECRET`.
- `COOKIE_SECURE`: use `true` only when the application is behind HTTPS; the
  default is `false` for local HTTP access.
- `GEMINI_API_KEY` if that optional feature is used.

The Compose file exposes application port 5000, keeps PostgreSQL on the
internal `adilanet_net` network, and persists PostgreSQL data in `db_data`.
Do not change the database service, volume, or existing credentials as part of
an application-only update. For public access, place the app behind a TLS
reverse proxy before enabling secure cookies.

## Backup and verification

Before an update, create a backup from the stack directory. This example writes
an archive file and does not delete or replace database data:

```sh
mkdir -p backups
backup="backups/adilanet-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose exec -T db pg_dump -U adilanet -d adilanet -Fc > "$backup"
pg_restore --list "$backup" >/dev/null
sha256sum "$backup"
```

Keep the backup outside the container and protect it as sensitive customer
data. A successful `pg_restore --list` checks that the archive is readable; it
does not prove that it can be restored. Verify restoration only in a separate,
isolated PostgreSQL instance/database before relying on the backup.

## Restore test in an isolated database

Use a separate test database, never the production database name:

```sh
docker compose exec db createdb -U adilanet adilanet_restore_test
docker compose exec -T db pg_restore -U adilanet -d adilanet_restore_test \
  --no-owner --no-privileges < backups/FILE.dump
docker compose exec db pg_isready -U adilanet -d adilanet_restore_test
```

This restore test is documented but has not been run by this change. Do not
drop the test database automatically; clean it up only after verifying that it
is isolated and after separate approval.

## Application update and rollback

Before updating, record the currently running image reference and its image ID,
and keep the matching previous tag available. Set `ADILANET_IMAGE` to the
verified immutable candidate tag in Dockge, then use Dockge's pull/recreate
action for the `app` service only. Do not run `docker compose down -v`.

To roll back the application, set `ADILANET_IMAGE` back to the recorded
previous image reference, then pull and recreate only the app service:

```sh
docker compose pull app
docker compose up -d --no-deps app
```

The application initializes/updates database schemas at startup. This guide
does not provide an automatic schema downgrade. A previous image may not be
compatible with a schema already changed by a newer image; verify rollback
against an isolated restored backup before using it operationally. Database
restore or production recovery requires a separate reviewed procedure.

## Health checks

PostgreSQL uses `pg_isready`. The application health endpoint reports database
connectivity separately from schema readiness. A healthy response does not
verify Digiflazz credentials or supplier connectivity. Do not perform a live
purchase as a deployment health check.
