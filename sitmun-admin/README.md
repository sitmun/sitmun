# SITMUN Administration Application

[![License: EUPL v1.2](https://img.shields.io/badge/License-EUPL%20v1.2-blue.svg)](LICENSE)
![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)

Angular 22 admin UI for the SITMUN backend. Install from the repository root, then run the app from `sitmun-admin`.

## Setup

Node.js is 24.22.0 from the repo root [`.nvmrc`](../.nvmrc) (`engines.node` is `>=24.22.0`). pnpm is the root `packageManager`. Shared versions are the root [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) catalog. The root `.npmrc` sets `strict-peer-dependencies=false`.

```bash
git clone --branch dev https://github.com/sitmun/sitmun.git
cd sitmun
pnpm ci --filter ./sitmun-admin...
cd sitmun-admin
pnpm start
```

`pnpm ci` from the repository root installs from `pnpm-lock.yaml`. `pnpm install` there updates the lockfile.

`pnpm start` serves http://localhost:4200 and calls `http://localhost:9000/backend` (`src/environments/environment.ts`).

## Commands

- `pnpm start` — `ng serve` (development)
- `pnpm run start:e2e` — `ng serve --configuration=e2e`
- `pnpm exec ng serve --port 4300` — same server, another port
- `pnpm test` — Jest
- `pnpm run test:watch`
- `pnpm test -- --testNamePattern=UserComponent`
- `pnpm run test:coverage` — writes `coverage/admin-app/lcov.info`
- `pnpm run lint`
- `pnpm run lint -- --fix`
- `pnpm run build` — development configuration
- `pnpm run build -- --configuration=docker-dev`
- `pnpm run build -- --configuration=production`
- `pnpm run build -- --configuration=production --base-href=/admin/`

Covered browser flows run from the repo root: `pnpm run e2e`.

## Build configurations

| Configuration | Environment file | API URL | Source maps |
|---------------|------------------|---------|-------------|
| `development` | `environment.ts` | `http://localhost:9000/backend` | yes |
| `docker-dev` | `environment.ts` (no replacement) | `http://localhost:9000/backend` | yes |
| `production` | `environment.prod.ts` | `/backend` | no |
| `e2e` | `environment.e2e.ts` | `/backend` | yes |

`docker/front/Dockerfile` (`ARG NODE_VERSION=24.22.0`) writes `environment.prod.ts` from `docker/front/admin/environment.prod.ts.template` (`apiBaseURL` `${PUBLIC_BASE_PATH}backend`), then runs `--configuration=docker-dev` when `ENVIRONMENT=development` and `--configuration=production` otherwise. The published stack runs `ghcr.io/sitmun/front:1.3.0` from the repository root with `docker compose up -d --pull always --no-build`. These commands build the local image:

```bash
docker compose build front
ENVIRONMENT=development docker compose build front
```

## API

`AuthInterceptor` sets `withCredentials: true`. Backend URLs also get `X-SITMUN-Client: admin`.

## License

EUPL-1.2. See [LICENSE](LICENSE).
