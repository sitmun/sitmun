# SITMUN Edition Mobile Application

## Plataforma de desarrollo

**edition-mobile-app** usa Ionic, Angular y Capacitor.

## Requisitos

Node.js es 24.22.0 ([`.nvmrc`](../../.nvmrc) en la raíz; esta app no tiene `.nvmrc`). pnpm es `packageManager` en `package.json`. mise es opcional.

- Angular 18.2.13 (`@angular/cli` y `@angular/*`)
- Ionic `^8.4.1` (`@ionic/angular` y `@ionic/core`)
- Capacitor 6.2.1 (`@capacitor/core`); `@capacitor/cli` y `@capacitor/android` 6.1.2
- Java 17 ([`.java-version`](../../.java-version))
- Android SDK 34 (Capacitor 6; no hay proyecto `android/` versionado)

## Instalación

En `sitmun-mobile/sitmun-edition`:

```bash
pnpm ci
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

El script hace `ionic build`, `pnpm exec cap sync android`, `pnpm exec cap copy android` y `pnpm exec cap open android`. La APK de depuración generada en Android Studio queda en `android/app/build/outputs/apk/debug`.

## Authentication and proxy

Environment files set `authenticationPath` (default `/api/authenticate/mobile`).

Login stores an in-memory `access_token` for backend client configuration and exchanges it at `POST /api/authenticate/proxy` for a short-lived `proxy_token` used only on the middleware origin. Authorization headers are attached only when the request origin exactly matches the selected backend or middleware origin.

MBTiles estimate/create/status/file call `/proxy/{appId}/{terId}/mbtiles...` on the middleware base derived from the instance URL (`…/backend` → sibling `…/middleware`). Requests send service and layer IDs, never tile-source URLs.
