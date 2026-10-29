# SITMUN Viewer Application

[![License: EUPL v1.2](https://img.shields.io/badge/License-EUPL%20v1.2-blue.svg)](LICENSE)
![Version](https://img.shields.io/badge/version-1.2.9-blue.svg)

Angular 22 map viewer (`@angular/core` `^22.2.3`, `@angular/material` `^22.2.3`, `api-sitna` `^4.8.0`). Languages: CA, ES, EN, FR. The About window reads the installed `api-sitna` version. Run commands from `sitmun-viewer`.

## Toolchain

Node.js 24.22.0 is the repo root [`.nvmrc`](../.nvmrc) (`engines.node` is `>=24.22.0`); pnpm is the `packageManager` field in `package.json`; mise is optional.

## Install

```bash
git clone --branch dev https://github.com/sitmun/sitmun.git
cd sitmun/sitmun-viewer
pnpm ci
```

`pnpm install` updates `pnpm-lock.yaml`. `pnpm ci` installs from the lockfile.

## Commands

- `pnpm run start` — `ng serve` at <http://localhost:4200>. Development configuration, no dev-server proxy. `src/environments/environment.ts` sets `apiUrl` to `http://localhost:9000/backend`.
- `pnpm exec ng serve --port 4300` — same server, other port.
- `pnpm run start:e2e` — runs `build:e2e`, then serves `dist/viewer-app` on port 4400 (`PORT` or `--port`). Proxies `/backend` to `http://localhost:18080` and `/middleware` to `http://localhost:18082`. `src/environments/environment.e2e.ts` sets `apiUrl` to `/backend`.
- `pnpm run test`
- `pnpm run test:watch`
- `pnpm run test:coverage`
- `pnpm run test -- path/to/file.spec.ts`
- `pnpm run lint` — `ng lint` (ESLint)
- `pnpm run format` — `pnpm exec prettier --write src`
- `pnpm run build` — development configuration. Sets `NODE_OPTIONS=--max-old-space-size=8192` when unset.
- `pnpm run watch`
- `pnpm run clean`, `pnpm run clean:force`, `pnpm run clean:build`

## Build configurations

| Configuration | Environment file | Source maps |
| --- | --- | --- |
| `development` | `environment.ts` (`apiUrl` `http://localhost:9000/backend`) | yes |
| `docker-dev` | `environment.ts` (no `fileReplacements`) | yes |
| `e2e` | `environment.e2e.ts` (`apiUrl` `/backend`) | yes |
| `production` | `environment.prod.ts` (committed `apiUrl` `/backend`) | no |

```bash
pnpm run build -- --configuration=development
pnpm run build -- --configuration=docker-dev
pnpm run build -- --configuration=production
pnpm run build -- --configuration=production --base-href=/viewer/
pnpm run build:e2e
```

From the repo root, `compose.yaml` service `front`:

```bash
docker compose build front
ENVIRONMENT=development docker compose build front
```

`docker/front/Dockerfile` writes `environment.prod.ts` from `docker/front/viewer/environment.prod.ts.template` (`apiUrl` `${PUBLIC_BASE_PATH}backend`), then runs `--configuration=docker-dev` when `ENVIRONMENT=development` and `--configuration=production` otherwise. Only `production` compiles that generated file. That stage sets `NODE_OPTIONS=--max-old-space-size=4096`.

A non-root base path has to match `--base-href`, `<base href>`, runtime `SITNA_BASE_URL`, the service worker scope, and the webpack `SITNA_BASE_URL` define. `docker/front/viewer/` templates do that.

## License

EUPL-1.2. See [LICENSE](LICENSE).
