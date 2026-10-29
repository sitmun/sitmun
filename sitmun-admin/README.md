# SITMUN Administration Application

[![License: EUPL v1.2](https://img.shields.io/badge/License-EUPL%20v1.2-blue.svg)](LICENSE)
![Version](https://img.shields.io/badge/version-1.2.9-blue.svg)

Angular 22 admin UI for the SITMUN backend. Run the commands below from `sitmun-admin`.

## Setup

Node.js is 24.22.0 from the repo root [`.nvmrc`](../.nvmrc) (`engines.node` is `>=24.22.0`). pnpm is the `packageManager` field in `package.json`. mise is optional.

- `.npmrc` sets `strict-peer-dependencies=false`.
- `pnpm-workspace.yaml` is `allowBuilds` only.

```bash
git clone --branch dev https://github.com/sitmun/sitmun.git
cd sitmun/sitmun-admin
pnpm ci
pnpm start
```

`pnpm ci` installs from `pnpm-lock.yaml`. `pnpm install` updates the lockfile.

`pnpm start` serves http://localhost:4200 and calls `http://localhost:9000/backend` (`src/environments/environment.ts`).

## Commands

- `pnpm start` — `ng serve` (development)
- `pnpm run start:e2e` — `ng serve --configuration=e2e`
- `pnpm exec ng serve --port 4300` — same server, another port
- `pnpm test` — Jest
- `pnpm run test:watch`
- `pnpm test -- --testNamePattern=UserComponent`
- `pnpm run test:coverage` — writes `coverage/admin-app/lcov.info` and `reports/ut_report.xml`
- `pnpm run lint`
- `pnpm run lint -- --fix`
- `pnpm run build` — development configuration
- `pnpm run build -- --configuration=docker-dev`
- `pnpm run build -- --configuration=production`
- `pnpm run build -- --configuration=production --base-href=/admin/`
- `pnpm run sonar` — `sonar-scanner`

Covered browser flows run from the repo root: `pnpm run e2e`.

## Build configurations

| Configuration | Environment file | API URL | Source maps |
|---------------|------------------|---------|-------------|
| `development` | `environment.ts` | `http://localhost:9000/backend` | yes |
| `docker-dev` | `environment.ts` (no replacement) | `http://localhost:9000/backend` | yes |
| `production` | `environment.prod.ts` | `/backend` | no |
| `e2e` | `environment.e2e.ts` | `/backend` | yes |

`docker/front/Dockerfile` (`ARG NODE_VERSION=24.22.0`) writes `environment.prod.ts` from `docker/front/admin/environment.prod.ts.template` (`apiBaseURL` `${PUBLIC_BASE_PATH}backend`), then runs `--configuration=docker-dev` when `ENVIRONMENT=development` and `--configuration=production` otherwise. From the repo root:

```bash
docker compose build front
ENVIRONMENT=development docker compose build front
```

## API

`AuthInterceptor` sets `withCredentials: true`. Backend URLs also get `X-SITMUN-Client: admin`.

## License

EUPL-1.2. See [LICENSE](LICENSE).
