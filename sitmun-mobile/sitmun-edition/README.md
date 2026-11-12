# SITMUN Mobile Editor

The name on the device is SITMUN Mobile Editor. The server application type stays `ED`. The directory stays `sitmun-mobile/sitmun-edition`.

## Plataforma de desarrollo

**edition-mobile-app** usa Ionic, Angular y Capacitor.

## Requisitos

Las versiones salen del `catalog` de [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml).

- Node.js 24.22.0 ([`.nvmrc`](../../.nvmrc)) y pnpm (`packageManager` en el `package.json` de la raíz)
- Angular 22, Ionic 8 y Capacitor 8
- JDK 21 y Android SDK 36 para compilar Android. Capacitor 8 compila con Java 21 y `compileSdk` 36. La versión mínima de Android es la 7.0 (`minSdk` 24). No hay proyecto `android/` versionado.

## Instalación

Desde la raíz del repositorio:

```bash
pnpm ci --filter ./sitmun-mobile/sitmun-edition...
```

## Integración con Capacitor

Añadir la plataforma Android (no está en el repositorio):

```bash
pnpm exec cap add android
```

Copiar `resources/android/AndroidManifest.xml` a `android/app/src/main`.

## Compilar y abrir Android Studio

```bash
pnpm run android
```

El script hace `pnpm exec ng build`, `pnpm exec cap sync android`, `pnpm exec cap copy android` y `pnpm exec cap open android`. La APK de depuración generada en Android Studio queda en `android/app/build/outputs/apk/debug`.

## Authentication and proxy

Environment files set `authenticationPath` (default `/api/authenticate/mobile`).

Login stores an in-memory `access_token` for backend client configuration and exchanges it at `POST /api/authenticate/proxy` for a short-lived `proxy_token` used only on the middleware origin. Authorization headers are attached only when the request origin exactly matches the selected backend or middleware origin.

MBTiles estimate/create/status/file call `/proxy/{appId}/{terId}/mbtiles...` on the middleware base derived from the instance URL (`…/backend` → sibling `…/middleware`). Requests send service and layer IDs, never tile-source URLs.
