# Deployment

Deploy [sitmun/sitmun](https://github.com/sitmun/sitmun). Components are directories in that repository. The Compose file is `compose.yaml`. Historical release tags are `legacy/<repository>/<tag>`.

1.3.0 runs from `ghcr.io/sitmun/front`, `backend`, `proxy`, and `mbtiles` at tag `1.3.0`. Run these commands in an existing checkout, because `front` mounts `docker/front/config` and `backend` mounts `profiles/` from that checkout. The release checkout will be the annotated tag once that tag exists. Copy `profiles/postgres.env` or `profiles/oracle.env` to `.env`. `setup.ps1` or `setup.sh` appends `SITMUN_USER_SECRET`, `MIDDLEWARE_SECRET`, and `SITMUN_MBTILES_JOB_HANDLE_SECRET`.

Windows:

```powershell
Copy-Item profiles\postgres.env .env
.\setup.ps1
docker compose up -d --pull always --no-build
```

Linux:

```bash
cp profiles/postgres.env .env
./setup.sh
docker compose up -d --pull always --no-build
```

`docker compose up -d` without `--no-build` builds this checkout. An upgrade from 1.2.8 or 1.2.9 sets `SITMUN_UPGRADE_DEFAULT_LANGUAGE` in `.env` before that start. See [Upgrade 1.2.9 to 1.3.0](docs/upgrade/1.2.9-to-1.3.0.md) and [Upgrade 1.2.8 to 1.3.0](docs/upgrade/1.2.8-to-1.3.0.md). Local URLs are in [README.md](README.md). Variables, databases, and backup are below.

## Configuration

Defaults below apply when the variable is unset.

| Variable | Role | Compose default |
| --- | --- | --- |
| `PUBLIC_URL_SCHEME` | `http` or `https` in generated public URLs | `http` |
| `PUBLIC_HOSTNAME` | Public hostname | `localhost` |
| `PUBLIC_PORT` | Public port in generated URLs | `9000` |
| `PUBLIC_BASE_PATH` | Public prefix. Must start and end with `/`. | `/` |
| `LOCAL_PORT` | Host port published by nginx | `9000` |
| `LOCAL_BASE_PATH` | Prefix inside the nginx container | `/` |
| `ENVIRONMENT` | Frontend image. `development` builds Angular `docker-dev`. Any other value builds `production`. | `development` |
| `COMPOSE_PROFILES` | `postgres` or `oracle`. Add `,demo` for the example database (`,dev` is a deprecated alias). Add `,mbtiles` for MBTiles. | unset |
| `DATABASE_TYPE` | Fallback Spring profile when `SPRING_PROFILES_ACTIVE` is unset | `postgres` |
| `SPRING_PROFILES_ACTIVE` | Backend Spring profiles | `DATABASE_TYPE`, else `postgres` |
| `SITMUN_CONFIG_DIR` | Directory under `profiles/` mounted at `/usr/src/config` | `development/backend` |
| `DATABASE_URL` | JDBC URL prefix. Compose appends `DATABASE`. | `jdbc:postgresql://postgres:5432/` |
| `DATABASE` | Database name | `sitmun3` |
| `DATABASE_USERNAME` | Database user | `sitmun3` |
| `DATABASE_PASSWORD` | Database password | `sitmun3` |
| `FORCE_USE_OF_PROXY` | Sets `SITMUN_PROXY_FORCE` | `false` |
| `SITMUN_PROXY_MIDDLEWARE_VALIDATE_USER_ACCESS` | Proxy access check | `true` |
| `SITMUN_USER_SECRET` | Backend JWT signing secret. Minimum 32 characters. | required |
| `MIDDLEWARE_SECRET` | Shared secret. Backend receives it as `SITMUN_PROXY_MIDDLEWARE_SECRET`. Proxy receives it as `SITMUN_BACKEND_CONFIG_SECRET`. | required |
| `SITMUN_MBTILES_JOB_HANDLE_SECRET` | Proxy MBTiles job-handle secret. Minimum 32 characters. | required |
| `SITMUN_UPGRADE_DEFAULT_LANGUAGE` | Language of existing database text on an upgrade. Must match `STM_CONF` `language.default`. Compose forwards it to the backend. Empty on a new install. | empty |
| `SITMUN_BOOTSTRAP_ADMIN_PASSWORD` | Password applied when the built-in admin password is empty. 8 to 50 characters, and not the username. Compose forwards it. Remove it from `.env` after `GET /api/dashboard/health` is UP. | empty |
| `SITMUN_BOOTSTRAP_LANGUAGE` | Database language applied with that password. An unknown, disabled, or already-current value does not change translations. | empty |

A secret that is blank or shorter than 32 characters stops the backend or the proxy from starting. `setup.ps1` and `setup.sh` append the three secrets when those keys are absent. Do not commit the values.

On a new production database the first visit to Admin asks for a password and a language. Replace the database password for a deployment other than a local demo. Compose falls back to `sitmun3` / `sitmun3`.

## Databases

The oldest PostgreSQL server the SQL must accept is 12. The oldest Oracle server is 11g Release 2. Compose runs `postgres:16-alpine` and `gvenzl/oracle-free:23-slim`. Those images are newer than the floors. Tests use in-memory H2. Compose does not start H2.

| | PostgreSQL | Oracle |
| --- | --- | --- |
| Compose service | `postgres` | `oracle` |
| Image | `postgres:16-alpine` | `gvenzl/oracle-free:23-slim` |
| Host port | `9003:5432` | `9004:1521` |
| `COMPOSE_PROFILES` | `postgres` | `oracle` |
| JDBC prefix | `jdbc:postgresql://postgres:5432/` | `jdbc:oracle:thin:@//oracle:1521/` |
| Profile file | `profiles/postgres/application-postgres.yml` or `profiles/development/backend/application-postgres.yml` | `application-oracle.yml` or `application-oracle-11.yml` in `profiles/oracle/` and `profiles/development/backend/` |

On Oracle the dialect in the mounted profile is the one that runs, and the Compose PostgreSQL dialect does not replace it.

Development profiles mount `profiles/development/backend`. `profiles/postgres.env` sets `SITMUN_CONFIG_DIR=postgres`. `profiles/oracle.env` sets `SITMUN_CONFIG_DIR=oracle`. `profiles/showcase.env` sets `SITMUN_CONFIG_DIR=showcase` and `SPRING_LIQUIBASE_CONTEXTS=showcase`. Liquibase runs on backend startup.

Oracle's first start waits on its healthcheck (`start_period: 60s`). Follow it with `docker compose logs -f oracle`.

To point at a database outside Compose, leave `COMPOSE_PROFILES` empty and set `SPRING_PROFILES_ACTIVE`, `DATABASE_URL`, `DATABASE`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, and the three secrets. A profiled database that is not started is skipped, so `docker compose up -d --pull always --no-build` starts `front`, `backend`, and `proxy` only. A development checkout uses `docker compose up -d` and builds those images.

Switch databases with `docker compose down`, copy the other profile to `.env`, run `setup.ps1` or `setup.sh`, then `docker compose up -d --pull always --no-build`.

### Example database

Compose service `example`, host port `9005`, image `postgres:16-alpine`. Opt in with `COMPOSE_PROFILES=postgres,demo` (or `oracle,demo`). Init scripts live in `profiles/development/demo-data/`. Credentials: `example` / `example`. Read-only role: `example_reader` / `example_reader`. Tourism tasks that use `jdbc:postgresql://example/example` need this container. The main database starts without it.

### MBTiles

Opt in with `,mbtiles`. The service is only on the Compose network. Nginx returns 404 for `/mbtiles`. Admin, viewer, and WMS/WFS proxy traffic do not need it. Root Playwright starts MBTiles with `pnpm run e2e:mbtiles` on port 18084, not this Compose service.

## Backup

After the showcase is up:

```text
docker compose -p sitmun-showcase exec -T postgres pg_dump -U sitmun3 -d sitmun3 -Fc > sitmun-showcase.dump
```

That copy matches only the backend image it was taken from. Restore it into an empty showcase volume before starting the backend.

## Troubleshooting

`SITMUN_CONFIG_DIR`, `SPRING_PROFILES_ACTIVE`, and `COMPOSE_PROFILES` have to name the same database. Host ports 9003 and 9004 must be free.

```text
docker compose exec postgres pg_isready -U sitmun3
```

Reinstall from the repository root. Node must match `.nvmrc`. Java must match `.java-version`.

Windows:

```powershell
Remove-Item -Recurse -Force node_modules
pnpm ci
.\gradlew.bat :sitmun-backend:clean
.\gradlew.bat :sitmun-proxy:clean
```

Linux:

```bash
rm -rf node_modules
pnpm ci
./gradlew :sitmun-backend:clean
./gradlew :sitmun-proxy:clean
```

`LOGGING_LEVEL_ORG_SITMUN` is passed through Compose (default `DEBUG`). Set it in `.env` and run `docker compose up -d backend proxy`.

## IIS as a reverse proxy

IIS (Internet Information Services) reverse-proxies to SITMUN with Application Request Routing (ARR) and URL Rewrite. SITMUN listens on port 9000 unless `LOCAL_PORT` says otherwise.

### Prerequisites

- [Application Request Routing (ARR)](https://learn.microsoft.com/en-us/iis/extensions/planning-for-arr/application-request-routing-version-2-overview) is installed.
- [URL Rewrite](https://learn.microsoft.com/en-us/iis/extensions/url-rewrite-module/using-the-url-rewrite-module) is installed.
- SITMUN is running.

### Own hostname

SITMUN answers at the root of a hostname, for example `https://sitmun3.example.com/`. The published images work unchanged. Set in `.env`:

```properties
PUBLIC_URL_SCHEME=https
PUBLIC_HOSTNAME=sitmun3.example.com
PUBLIC_PORT=
PUBLIC_BASE_PATH=/
```

### Path prefix

SITMUN answers under a path on another host, for example `https://example.com/sitmun3/`. The published front image has `/admin/`, `/viewer/`, and `/backend` built in ([docker/front/Dockerfile](docker/front/Dockerfile)), so build `front` from the checkout with the prefix. The IIS rule below forwards `/sitmun3/...` unchanged, so nginx also needs `LOCAL_BASE_PATH` ([default.conf.template](docker/front/config/default.conf.template)). Set in `.env`:

```properties
PUBLIC_URL_SCHEME=https
PUBLIC_HOSTNAME=example.com
PUBLIC_PORT=
PUBLIC_BASE_PATH=/sitmun3/
LOCAL_BASE_PATH=/sitmun3/
```

Then build `front`, pull the published `backend` and `proxy`, and start without pulling `front` again:

```text
docker compose build front
docker compose pull --policy always backend proxy
docker compose up -d --no-build
```

`--pull always` would replace the local `front` with the published one. `pull_policy: build` in `compose.yaml` makes a plain `docker compose pull` skip `backend` and `proxy`, so the pull needs `--policy always`. Add `mbtiles` to the pull when `COMPOSE_PROFILES` includes it.

### Enable Application Request Routing

1. Open IIS Manager.
2. In **Connections**, select the server node.
3. Double-click **Application Request Routing Cache**.
4. In **Actions**, select **Server Proxy Settings**.
5. Check **Enable Proxy**.
6. To pass the client address in `X-Forwarded-For`, enable **Preserve client IP**.
7. Click **Apply**.

Microsoft reference: [Creating a Forward Proxy Using Application Request Routing](https://learn.microsoft.com/en-us/iis/extensions/configuring-application-request-routing-arr/creating-a-forward-proxy-using-application-request-routing).

### Create the reverse proxy rule

1. In IIS Manager, at the server or the site, double-click **URL Rewrite**.
2. In **Actions**, click **Add Rule(s)**.
3. Choose **Blank Rule** under **Inbound rules** and click **OK**.
4. Name the rule **Reverse Proxy to SITMUN**.

In **Match URL**, set:

- Requested URL: **Matches the Pattern**
- Using: **Regular Expressions**
- Pattern: `.*` for an own hostname, or `^sitmun3(/.*)?$` for the `/sitmun3/` prefix. The prefix pattern matches `sitmun3` and `sitmun3/...`.
- Ignore case: checked

In **Action**, set:

- Action type: **Rewrite**
- Rewrite URL: `http://localhost:9000/{R:0}`
- Append query string: checked

Replace `localhost:9000` with the host and port SITMUN listens on.

Open the public URL in a browser. If it fails, check that port, the firewall, and the rewrite pattern.
