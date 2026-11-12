# SITMUN

[![License: EUPL v1.2](https://img.shields.io/badge/License-EUPL%20v1.2-blue.svg)](LICENSE)
![Version](https://img.shields.io/badge/version-1.2.9-blue.svg)

SITMUN is a geospatial information system. This repository is [sitmun/sitmun](https://github.com/sitmun/sitmun).

## Showcase

### Using the showcase

The showcase is for someone who wants to look at SITMUN in a browser.

Open http://localhost:9000/viewer/. SDI Viewer and Camí de Cavalls open straight away. Case processing support is for a signed-in user. The user `demo` and the password `demo` open it.

Admin is at http://localhost:9000/admin/. That account has no password yet. The first visit asks you to choose a password and a language. Anyone who can reach port 9000 can make that first visit, so run the showcase on your own computer, or put `SITMUN_BOOTSTRAP_ADMIN_PASSWORD=<your password>` in `.env` before you start it.

The default language for the system is English. Spanish and Catalan are included. You choose the default language on that first visit to http://localhost:9000/admin/.

### Install the showcase

You need Git and Docker (Docker Desktop on Windows and macOS). The showcase uses ports 9000 to 9003. Stop any other SITMUN first.

Windows:

```powershell
git clone https://github.com/sitmun/sitmun.git
cd sitmun
Copy-Item profiles\showcase.env .env
.\setup.ps1
docker compose -p sitmun-showcase up -d --pull always --no-build
```

macOS or Linux:

```bash
git clone https://github.com/sitmun/sitmun.git
cd sitmun
cp profiles/showcase.env .env
./setup.sh
docker compose -p sitmun-showcase up -d --pull always --no-build
```

To stop it, run `docker compose -p sitmun-showcase down` in the same folder. Add `-v` to delete its database and start over.

## Modules

| Path | Runtime | Compose |
| --- | --- | --- |
| `sitmun-admin` | Angular 22 | `front` (`/admin/`) |
| `sitmun-viewer` | Angular 22 | `front` (`/viewer/`) |
| `sitmun-mobile/sitmun-edition` | Ionic 8, Angular 22, Capacitor 8 | none |
| `sitmun-mobile/sitmun-touristic` | Ionic 8, Angular 22, Capacitor 8 | none |
| `sitmun-backend` | Spring Boot 4.1, Java 17 | `backend` |
| `sitmun-proxy` | Spring Boot 4.1, Java 17 | `proxy` |
| `sitmun-addons/sitmun-mbtiles` | Spring Boot 4.1, Java 17 | `mbtiles` |
| `sitmun-common` | Java 17 libraries | none |

## Toolchain

- Java 17 (`.java-version`)
- Node 24.22.0 (`.nvmrc`)
- pnpm 12.15.0 (`packageManager` in the root `package.json`)

Install JavaScript dependencies from the repository root with `pnpm ci`.

## Development

`docker compose up -d` on `dev` builds from this checkout. `setup.ps1` and `setup.sh` copy `profiles/development-postgres.env` to `.env` only when `.env` is missing, then append the three secrets when those keys are absent. Do not commit the values.

Windows:

```powershell
git clone --branch dev https://github.com/sitmun/sitmun.git
cd sitmun
.\setup.ps1
docker compose up -d
```

macOS or Linux:

```bash
git clone --branch dev https://github.com/sitmun/sitmun.git
cd sitmun
./setup.sh
docker compose up -d
```

To choose a profile yourself, copy one file to `.env` and run `setup.ps1` or `setup.sh`. Compose refuses to start when the three secrets are missing.

| Profile | Use |
| --- | --- |
| `profiles/showcase.env` | Showcase PostgreSQL. Published images, three demo applications. |
| `profiles/development-postgres.env` | Development PostgreSQL. This is what setup copies when `.env` is missing. |
| `profiles/development-oracle.env` | Development Oracle |
| `profiles/development-lvh.env` | Development PostgreSQL announced as `http://lvh.me:9000` |
| `profiles/postgres.env` | Production PostgreSQL. No demo data. |
| `profiles/oracle.env` | Production Oracle. No demo data. |

Copying a profile over an existing `.env` drops secrets already appended. Append them again.

On a development database the administrator is `admin` / `admin`.

| URL | What |
| --- | --- |
| http://localhost:9000/viewer/ | Viewer. Public applications do not require a login. |
| http://localhost:9000/admin/ | Admin |
| http://localhost:9000/backend/ | Backend through nginx |
| http://localhost:9001/api/dashboard/health | Backend health |
| http://localhost:9002/actuator/health | Proxy health |

Run one app from its own README: [sitmun-admin](sitmun-admin/README.md), [sitmun-viewer](sitmun-viewer/README.md), [sitmun-mobile/sitmun-edition](sitmun-mobile/sitmun-edition/README.md), [sitmun-mobile/sitmun-touristic](sitmun-mobile/sitmun-touristic/README.md), [sitmun-backend](sitmun-backend/README.md), [sitmun-proxy](sitmun-proxy/README.md).

Tests and checks are in [CONTRIBUTING.md](CONTRIBUTING.md) and [e2e/README.md](e2e/README.md).

## Deployment

Published images, configuration, databases, and backup are in [DEPLOYMENT.md](DEPLOYMENT.md). Image tags are in [RELEASE.md](RELEASE.md#images). An upgrade from 1.2.8 or 1.2.9 is in [Upgrade 1.2.9 to 1.3.0](docs/upgrade/1.2.9-to-1.3.0.md) and [Upgrade 1.2.8 to 1.3.0](docs/upgrade/1.2.8-to-1.3.0.md).

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

## Troubleshooting

For the showcase, add `-p sitmun-showcase` after `docker compose`.

```text
docker compose ps
docker compose logs -f backend
```

Windows:

```powershell
curl.exe http://localhost:9001/api/dashboard/health
curl.exe http://localhost:9002/actuator/health
```

macOS or Linux:

```bash
curl http://localhost:9001/api/dashboard/health
curl http://localhost:9002/actuator/health
```

PowerShell's `curl` name is a different command. Use `curl.exe` there.

## More

- API: Swagger UI at http://localhost:9001/swagger-ui/index.html
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)
- Issues: https://github.com/sitmun/sitmun/issues

## License

European Union Public Licence v1.2. See [LICENSE](LICENSE).
