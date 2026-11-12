# SITMUN

[![License: EUPL v1.2](https://img.shields.io/badge/License-EUPL%20v1.2-blue.svg)](LICENSE)
![Version](https://img.shields.io/badge/version-1.2.9-blue.svg)

SITMUN (Sistema de Información Territorial de la Mancomunidad de Municipios) is a geospatial information system. This repository is [sitmun/sitmun](https://github.com/sitmun/sitmun).

## Showcase

### Using the showcase

The showcase is three maps you can open in a browser: SDI Viewer, Camí de Cavalls, and Case processing support.

Open http://localhost:9000/viewer/. SDI Viewer and Camí de Cavalls open with no login. The user `demo` and the password `demo` open all three.

The first time you open Admin, it asks you to choose a password and a language.

The text is in English. Spanish and Catalan are available as translations. To show Spanish by default, sign in to Admin, turn off French and Aranese, and set the default language to Spanish.

Background maps come from other organisations. One failed background map blocks the whole map. Street View has no Google key.

### Install the showcase

You need Docker Desktop. Run these commands in an existing checkout. The release checkout will be the annotated tag once that tag exists.

Windows:

```powershell
Copy-Item profiles\showcase.env .env
.\setup.ps1
docker compose -p sitmun-showcase up -d --pull always --no-build
```

Linux:

```bash
cp profiles/showcase.env .env
./setup.sh
docker compose -p sitmun-showcase up -d --pull always --no-build
```

If another SITMUN is already running, stop it first (`docker compose stop`).

To save a copy of the database after setup:

```text
docker compose -p sitmun-showcase exec -T postgres pg_dump -U sitmun3 -d sitmun3 -Fc > sitmun-showcase.dump
```

That copy matches only the backend image it was taken from. Restore it into an empty showcase volume before starting the backend.

## For developers

### Modules

| Path | Runtime | Compose |
| --- | --- | --- |
| `sitmun-admin` | Angular 22 | `front` (`/admin/`) |
| `sitmun-viewer` | Angular 22 | `front` (`/viewer/`) |
| `sitmun-mobile/sitmun-edition` | Ionic 8, Angular 22 | none |
| `sitmun-mobile/sitmun-touristic` | Ionic 8, Angular 22 | none |
| `sitmun-backend` | Spring Boot 4, Java 17 | `backend` |
| `sitmun-proxy` | Spring Boot 4, Java 17 | `proxy` |
| `sitmun-addons/sitmun-mbtiles` | Spring Boot 4, Java 17 | `mbtiles` (profile, no host port) |
| `sitmun-common` | Java 17 libraries | none |

Image definitions are under `docker/`. The Compose file is `compose.yaml`.

Common, proxy, MBTiles, and the backend are one Gradle build. From the repository root:

```powershell
.\gradlew.bat :sitmun-backend:test :sitmun-proxy:test :sitmun-mbtiles:test :sitmun-spring-upstream:test :sitmun-proxy-contract:test
```

```bash
./gradlew :sitmun-backend:test :sitmun-proxy:test :sitmun-mbtiles:test :sitmun-spring-upstream:test :sitmun-proxy-contract:test
```

### Toolchain

Java is the root `.java-version` (17). Gradle provisions that JDK itself through the Foojay resolver (`org.gradle.java.installations.auto-detect=false` in `gradle.properties`) and ignores the host JDK. After a JDK security release, delete the old directory under `~/.gradle/jdks` so Gradle downloads the patched build. Node is the root `.nvmrc` (24.22.0). pnpm is the `packageManager` field on the root `package.json`. mise is optional and reads those files. CI does not use mise: `actions/setup-node` with `node-version-file: .nvmrc` and `pnpm/action-setup`, then `pnpm ci`.

The root `pnpm-workspace.yaml` lists `sitmun-admin`, `sitmun-viewer`, `sitmun-mobile/sitmun-edition`, and `sitmun-mobile/sitmun-touristic`. Shared dependency versions live in its `catalog`. The root `package.json` is the Playwright harness. Each app's `engines.node` is `>=24.22.0`.

Commands: `pnpm ci`, `pnpm install`, `pnpm add`, `pnpm run`, `pnpm exec`.

Every development path needs a checkout, because `front` mounts `docker/front/config` and `backend` mounts `profiles/`.

### Development setup

`docker compose up -d` on `dev` builds from this checkout (`pull_policy: build`). `ENVIRONMENT` defaults to `development` unless the profile sets it. `setup.ps1` and `setup.sh` copy `profiles/development-postgres.env` to `.env` only when `.env` is missing, then append the three secrets when those keys are absent.

Windows:

```powershell
git clone --branch dev https://github.com/sitmun/sitmun.git
cd sitmun
.\setup.ps1
docker compose up -d
```

Linux:

```bash
git clone --branch dev https://github.com/sitmun/sitmun.git
cd sitmun
./setup.sh
docker compose up -d
```

To choose a profile yourself, copy one file to `.env` and run `setup.ps1` or `setup.sh`. Compose marks the three secrets required (`:?`) and refuses to start without them.

| Profile | Use |
| --- | --- |
| `profiles/showcase.env` | Showcase PostgreSQL. Published images, three demo applications. |
| `profiles/development-postgres.env` | Development PostgreSQL. This is what setup copies when `.env` is missing. |
| `profiles/development-oracle.env` | Development Oracle |
| `profiles/development-lvh.env` | Development PostgreSQL announced as `http://lvh.me:9000` |
| `profiles/postgres.env` | Production PostgreSQL (`ENVIRONMENT=production`, minimal seed) |
| `profiles/oracle.env` | Production Oracle (`ENVIRONMENT=production`, minimal seed) |

Copying a profile over an existing `.env` drops secrets already appended. Append them again.

On a development database the administrator is `admin` / `admin`. On a new production database, and on the showcase, the first visit to Admin asks for a password and a language. For a deployment other than a local demo, replace the database password (Compose falls back to `sitmun3` / `sitmun3`).

| URL | What |
| --- | --- |
| http://localhost:9000/viewer/ | Viewer. Public applications do not require a login. |
| http://localhost:9000/admin/ | Admin. Requires authentication. |
| http://localhost:9000/backend/ | Backend through nginx |
| http://localhost:9001/swagger-ui/index.html | Swagger UI on the backend port |
| http://localhost:9001/api/dashboard/health | Backend health |
| http://localhost:9002/actuator/health | Proxy health |

### Published images

1.3.0 runs from `ghcr.io/sitmun/front`, `backend`, `proxy`, and `mbtiles` at tag `1.3.0`. Each image is `linux/amd64` and `linux/arm64`, so an Apple M1 pulls a native image with no `--platform` flag. Run these commands in an existing checkout, so `compose.yaml` and `profiles/` match those images. The release checkout will be the annotated tag once that tag exists. Copy a production profile, then start without building:

Use `profiles\oracle.env` on Windows, or `profiles/oracle.env` on Linux, instead of the PostgreSQL profile for Oracle.

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

Add `--profile mbtiles` for MBTiles. `setup.ps1` and `setup.sh` append `SITMUN_USER_SECRET`, `MIDDLEWARE_SECRET`, and `SITMUN_MBTILES_JOB_HANDLE_SECRET` when those keys are absent, including on an `.env` you already copied. Do not commit the values.

Publishing and republishing a tag is in [RELEASE.md](RELEASE.md#images).

The published front image is built for `PUBLIC_BASE_PATH=/`. A deployment under a path prefix rebuilds `front`. See [DEPLOYMENT.md](DEPLOYMENT.md).

An upgrade from 1.2.8 or 1.2.9 sets `SITMUN_UPGRADE_DEFAULT_LANGUAGE` in `.env` before that start. See [Upgrade 1.2.9 to 1.3.0](docs/upgrade/1.2.9-to-1.3.0.md) and [Upgrade 1.2.8 to 1.3.0](docs/upgrade/1.2.8-to-1.3.0.md).

## Configuration

Compose `:-` defaults below apply when the variable is unset. Runtime `FROM` lines in `docker/**/Dockerfile` are literal `image:tag@sha256:<index digest>`. Dependabot bumps those digests. `tools/tests/test_version_pins.py` checks the Corretto major against `.java-version`. `ARG NODE_VERSION` stays in `docker/front/Dockerfile`, and `ARG JDK_VERSION` stays on the Java build stages, so `docker compose build` works with no `.env`.

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

`SecuritySecretValidator` (backend) and `ProxySecretValidator` (proxy) abort startup with `IllegalStateException` when a secret is blank or shorter than 32 characters.

Docker frontend builds read each app version from that app's `package.json`. The About dialog shows that value.

### Databases

The oldest PostgreSQL server SITMUN must accept is 12 (`sitmun.db.postgres.min` in `gradle.properties`). SQL sent to PostgreSQL must stay valid on PostgreSQL 12. The Oracle floor is Oracle 11g Release 2 (`sitmun.db.oracle.min=11.2`). SQL sent to Oracle must stay within that grammar. Compose and the Liquibase scripts use `postgres:16-alpine` as the runtime image. That image is not the floor. The Oracle Compose image is `gvenzl/oracle-free:23-slim`.

Root Playwright and backend tests use in-memory H2. Compose does not start H2.

| | PostgreSQL | Oracle |
| --- | --- | --- |
| Compose service | `postgres` | `oracle` |
| Image | `postgres:16-alpine` | `gvenzl/oracle-free:23-slim` |
| Host port | `9003:5432` | `9004:1521` |
| `COMPOSE_PROFILES` | `postgres` | `oracle` |
| JDBC prefix | `jdbc:postgresql://postgres:5432/` | `jdbc:oracle:thin:@//oracle:1521/` |
| Profile file | `profiles/postgres/application-postgres.yml` or `profiles/development/backend/application-postgres.yml` | `application-oracle.yml` (profile `oracle`) or `application-oracle-11.yml` (profile `oracle-11`) in `profiles/oracle/` and `profiles/development/backend/` |
| `hibernate.dialect` in that file | `org.hibernate.dialect.PostgreSQLDialect` | `org.sitmun.infrastructure.persistence.dialect.SitmunOracleDialect` for `oracle`. `org.sitmun.infrastructure.persistence.dialect.SitmunOracleLegacyDialect` for `oracle-11` |

`compose.yaml` also sets `SPRING_JPA_DATABASE_PLATFORM` to `org.hibernate.dialect.PostgreSQLDialect`. That is `spring.jpa.database-platform`. The mounted profile sets `spring.jpa.properties.hibernate.dialect`. Spring keeps a dialect that is already set, so the Compose value does not replace the Sitmun Oracle dialect. Confirmed in Spring ORM `AbstractEntityManagerFactoryBean` (vendor dialect is applied only when `hibernate.dialect` is absent) on the Spring ORM 7.0.10 sources used with Spring Boot 4.1.2.

Development profiles mount `profiles/development/backend` (`SITMUN_CONFIG_DIR` default). `profiles/postgres.env` sets `SITMUN_CONFIG_DIR=postgres`. `profiles/oracle.env` sets `SITMUN_CONFIG_DIR=oracle`. `profiles/showcase.env` sets `SITMUN_CONFIG_DIR=showcase` and `SPRING_LIQUIBASE_CONTEXTS=showcase`. Liquibase runs on backend startup.

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

Oracle uses the same steps with `profiles\oracle.env` on Windows, or `profiles/oracle.env` on Linux, before setup.

Oracle's first start waits on its healthcheck (`start_period: 60s`). Follow it with `docker compose logs -f oracle`.

To point at a database outside Compose, leave `COMPOSE_PROFILES` empty and set `SPRING_PROFILES_ACTIVE`, `DATABASE_URL`, `DATABASE`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, and the three secrets. `depends_on.required: false` skips a profiled database that is not started, so `docker compose up -d --pull always --no-build` starts `front`, `backend`, and `proxy` only. A development checkout uses `docker compose up -d` and builds those images.

Switch databases with `docker compose down`, copy the other profile to `.env`, run `setup.ps1` or `setup.sh`, then `docker compose up -d --pull always --no-build`.

#### Example database

Compose service `example`, host port `9005`, image `postgres:16-alpine`. Opt in with `COMPOSE_PROFILES=postgres,demo` (or `oracle,demo`). Init scripts live in `profiles/development/demo-data/`. Credentials: `example` / `example`. Read-only role: `example_reader` / `example_reader`. Tourism tasks that use `jdbc:postgresql://example/example` need this container. The main database starts without it.

#### MBTiles

Opt in with `,mbtiles`. The service is only on the Compose network. Nginx returns 404 for `/mbtiles`. Admin, viewer, and WMS/WFS proxy traffic do not need it. Root Playwright starts MBTiles with `pnpm run e2e:mbtiles` on port 18084, not this Compose service.

### Frontend files

Admin `environment.ts` sets `apiBaseURL`. Viewer `environment.ts` sets `apiUrl` and `hashLocationStrategy: false`. Viewer `environment.prod.ts` sets `hashLocationStrategy: true`.

| Angular configuration | When | API URL | Source maps |
| --- | --- | --- | --- |
| `development` | `pnpm start` (`ng serve`) | `http://localhost:9000/backend` | yes |
| `docker-dev` | Docker build when `ENVIRONMENT=development` | `environment.ts` (`http://localhost:9000/backend`). No `fileReplacements`. | yes |
| `production` | Docker build when `ENVIRONMENT` is not `development` | `environment.prod.ts` after `envsubst` on `docker/front/*/environment.prod.ts.template` | no |

`docker compose build front` follows the Compose default `ENVIRONMENT=development`, so it builds `docker-dev`. A production image needs `ENVIRONMENT=production` (set in `profiles/postgres.env` and `profiles/oracle.env`).

```text
docker/front/admin/environment.prod.ts.template
docker/front/viewer/environment.prod.ts.template
sitmun-admin/src/environments/environment.ts
sitmun-admin/src/environments/environment.prod.ts
sitmun-viewer/src/environments/environment.ts
sitmun-viewer/src/environments/environment.prod.ts
```

Backend properties: `sitmun-backend/src/main/resources/application.yml`. User and proxy token lifetime there is `900000` milliseconds. The mounted profile under `profiles/${SITMUN_CONFIG_DIR}` supplies the database dialect and Liquibase changelog.

## Services

With `PUBLIC_BASE_PATH=/` and nginx on port 9000:

| Path | Upstream |
| --- | --- |
| `/viewer/` | Viewer static files |
| `/admin/` | Admin static files |
| `/backend/` | `backend:8080` |
| `/middleware/` | `proxy:8080` (prefix stripped) |
| `/mbtiles` | 404 |

Direct host ports: backend `9001`, proxy `9002`, PostgreSQL `9003`, Oracle `9004`, example database `9005`.

```text
Viewer ──┐
         ├── Backend ── Database
Admin ───┘
         └── Proxy ── upstream WMS/WMTS/WFS, SQL, API
```

## Development

### End-to-end tests

Root Playwright runs admin and viewer against backend-core on in-memory H2. No Docker Compose. Coverage: [e2e/README.md](e2e/README.md).

`pnpm run e2e`, `pnpm run e2e:viewer`, `pnpm run e2e:mia-cross`, `pnpm run e2e:application-contact`, `pnpm run e2e:first-run`, and `pnpm run e2e:mobile:web` share port 18080. Run one at a time.

```text
pnpm ci
pnpm run e2e:install
pnpm run e2e
```

Install the suite from the repository root before the browser suites: `pnpm ci --filter . --filter ./sitmun-admin...` or `--filter ./sitmun-viewer...`. Optional Android emulator flow: `pnpm run e2e:mobile:android` (see `e2e/README.md`).

### Apps and backend

```text
pnpm ci --filter ./sitmun-admin...
cd sitmun-admin
pnpm start
```

From the repository root again:

```text
pnpm ci --filter ./sitmun-viewer...
cd sitmun-viewer
pnpm start
```

`pnpm start` is `ng serve` with the `development` configuration. For edition or touristic, install from the repository root with `pnpm ci --filter ./sitmun-mobile/sitmun-edition...` or `--filter ./sitmun-mobile/sitmun-touristic...`, then run `pnpm start` in that app.

```powershell
.\gradlew.bat :sitmun-backend:bootRun
.\gradlew.bat :sitmun-proxy:bootRun --args='--spring.profiles.active=dev'
```

```bash
./gradlew :sitmun-backend:bootRun
./gradlew :sitmun-proxy:bootRun --args='--spring.profiles.active=dev'
```

The proxy dev profile is `sitmun-proxy/src/main/resources/application-dev.yml`. Run both from the repository root.

Backend has no `application-dev.yml`. Supply `SITMUN_USER_SECRET`, `SITMUN_PROXY_MIDDLEWARE_SECRET`, and a datasource. The H2 arguments used by Playwright are in `e2e/scripts/e2e-backend.mjs`.

### Checks

```text
cd sitmun-admin
pnpm run lint
pnpm test
```

From the repository root, then the viewer:

```text
cd sitmun-viewer
pnpm run lint
pnpm test
```

```powershell
.\gradlew.bat :sitmun-backend:test :sitmun-backend:spotlessCheck
.\gradlew.bat :sitmun-proxy:test :sitmun-proxy:spotlessCheck
.\gradlew.bat :sitmun-mbtiles:test :sitmun-mbtiles:spotlessCheck
```

```bash
./gradlew :sitmun-backend:test :sitmun-backend:spotlessCheck
./gradlew :sitmun-proxy:test :sitmun-proxy:spotlessCheck
./gradlew :sitmun-mbtiles:test :sitmun-mbtiles:spotlessCheck
```

Run the Gradle checks from the repository root.

Rebuild one Compose service:

```text
docker compose build service_name
docker compose up service_name -d
```

## API

Swagger UI: http://localhost:9001/swagger-ui/index.html

OpenAPI files: `sitmun-backend/src/main/resources/static/v3/`.

Actuator on the backend exposes `health` and `info` at `/api/dashboard` (`GET /api/dashboard/health`, `GET /api/dashboard/info`). `metrics` is not in that include list.

| Method | Path | Role |
| --- | --- | --- |
| `POST` | `/api/authenticate` | Viewer login. Sets cookie `viewer_access_token`. |
| `POST` | `/api/authenticate/admin` | Admin login. Sets cookie `admin_access_token`. |
| `POST` | `/api/authenticate/mobile` | Edition login. JSON `access_token`. |
| `POST` | `/api/authenticate/logout` | Clears the session cookie. |
| `GET` | `/api/account` | Current account. |
| `GET` | `/api/config/client/application` | Client applications. |
| `GET` | `/api/config/client/territory` | Client territories. |
| `GET` | `/api/config/client/profile/{appId}/{territoryId}` | Client profile. |
| `POST` | `/api/config/proxy` | Proxy configuration. Backend, not the proxy process. |

The legacy cookie name `access_token` is deprecated.

Proxy process, on port 9002 or under `/middleware/` after nginx strips that prefix:

| Method | Path |
| --- | --- |
| `GET` | `/actuator/health` |
| `GET`, `POST` | `/proxy/{appId}/{terId}/{type}/{typeId}` |

`ProxyMiddlewareConstants` types: `WMS`, `WMTS`, `SQL`, `API`. Backend cartography service types: `WMS`, `WMTS`, `WFS`.

## Security

Authentication in this tree is username/password, LDAP when the `ldap` profile is active, and OIDC when the `oidc` profile is active. Browser sessions use the cookies above. `WebSecurityConfigurer.corsConfigurationSource()` allows credentials, all headers, methods `OPTIONS`, `GET`, `POST`, `PUT`, and `DELETE`, and `allowedOriginPattern("*")`.

`setup.ps1` and `setup.sh` generate the three secrets. To make one by hand:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
($bytes | ForEach-Object { $_.ToString('x2') }) -join ''
```

```bash
openssl rand -hex 32
```

`SITMUN_USER_SECRET` stays on the backend. `MIDDLEWARE_SECRET` must match on both sides. Do not commit secrets.

## Troubleshooting

```text
docker compose ps
docker compose logs -f backend
```

```powershell
curl.exe http://localhost:9001/api/dashboard/health
curl.exe http://localhost:9002/actuator/health
```

```bash
curl http://localhost:9001/api/dashboard/health
curl http://localhost:9002/actuator/health
```

PowerShell's `curl` name is a different command. Use `curl.exe` there.

`SITMUN_CONFIG_DIR`, `SPRING_PROFILES_ACTIVE`, and `COMPOSE_PROFILES` have to name the same database. PostgreSQL JDBC prefix: `jdbc:postgresql://postgres:5432/`. Oracle: `jdbc:oracle:thin:@//oracle:1521/`. Host ports 9003 and 9004 must be free.

```text
docker compose exec postgres pg_isready -U sitmun3
docker compose exec -it postgres psql -U sitmun3 -d sitmun3
```

Admin login on a development database (cookie `admin_access_token`):

```powershell
curl.exe -X POST http://localhost:9001/api/authenticate/admin -c cookies.txt -H "Content-Type: application/json" -d '{"username":"admin","password":"admin"}'
curl.exe -b cookies.txt -H "X-SITMUN-Client: admin" http://localhost:9001/api/account
```

```bash
curl -X POST http://localhost:9001/api/authenticate/admin -c cookies.txt -H "Content-Type: application/json" -d '{"username":"admin","password":"admin"}'
curl -b cookies.txt -H "X-SITMUN-Client: admin" http://localhost:9001/api/account
```

The backend reads `admin_access_token` only when the request sends `X-SITMUN-Client: admin` ([`AuthenticationController.resolveSessionCookieName`](sitmun-backend/src/main/java/org/sitmun/authentication/controller/AuthenticationController.java)). Without it, `/api/account` returns 401.

Reinstall from the repository root. Node must match `.nvmrc`. Java must match `.java-version`.

```powershell
Remove-Item -Recurse -Force node_modules
pnpm ci
.\gradlew.bat :sitmun-backend:clean
.\gradlew.bat :sitmun-proxy:clean
```

```bash
rm -rf node_modules
pnpm ci
./gradlew :sitmun-backend:clean
./gradlew :sitmun-proxy:clean
```

`LOGGING_LEVEL_ORG_SITMUN` is passed through Compose (default `DEBUG`). Set it in `.env` and run `docker compose up -d backend proxy`.

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md).

Issues: https://github.com/sitmun/sitmun/issues

## License

European Union Public Licence v1.2. See [LICENSE](LICENSE).
