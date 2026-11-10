# Changelog

## [Unreleased]

### Added

- **Auth**: Configurable `authenticationPath` (default `/api/authenticate/mobile`); two-token lifecycle (`access_token` for backend, `proxy_token` for middleware); trusted-origin Authorization helper (exact origin match).
- **MBTiles**: Estimate/create/status/file through authenticated middleware routes using service/layer IDs.

### Changed

- **Language**: The unused `download.scope` label is removed from every language file. `i18n-parity.spec.ts` requires each language file to match the English keys and to contain no empty value.
- **Android**: Capacitor 8, API 36, and `CapacitorHttp`. SQLite is `@capacitor-community/sqlite` 8.1.1. Port of [edition-mobile-app#27](https://github.com/sitmun/edition-mobile-app/pull/27), which replaces [edition-mobile-app#26](https://github.com/sitmun/edition-mobile-app/pull/26).
- **WFS**: Map layers and offline feature download use `layer.url` when the profile sets a per-layer proxy address ([sitmun-application-stack#90](https://github.com/sitmun/sitmun-application-stack/issues/90)).
- **Auth**: Login field is `access_token` (not `id_token`); Bearer attachment matches trusted base URL path prefixes (middleware first) so gateways send `proxy_token` to `/middleware/**` and `access_token` to `/backend/**`.
- **MBTiles** / **Proxy**: Downloads use Capacitor HTTP `downloadFile` with Bearer; map/resource and MBTiles URLs share the middleware base (`…/middleware/proxy/{app}/{ter}/…`); removed `config.mbtilesUrl`, backend→middleware string rewrite, and dead `localhost:8080/proxy` default.

### Fixed

- **Applications**: Main list and offline cache show `name` when `title` is null ([#5](https://github.com/sitmun/edition-mobile-app/issues/5)).
- **Map**: Delete stays hidden while a point is added ([#189](https://github.com/sitmun/sitmun/issues/189)).
- **Map**: Saving a point closes the form ([#190](https://github.com/sitmun/sitmun/issues/190)).
- **Map**: Closing the form clears the selected point. Editing its geometry does not ([#184](https://github.com/sitmun/sitmun/issues/184)).
- **Applications**: An empty list while offline says that no applications are saved on the device ([#192](https://github.com/sitmun/sitmun/issues/192)).
- **MBTiles**: Estimate and download send numeric service and layer ids ([#203](https://github.com/sitmun/sitmun/issues/203)).
- **Upload**: A refused change says the user is not allowed, and the server text stays as a detail. No connection says the changes stay on the device. An expired session says the session expired ([#187](https://github.com/sitmun/sitmun/issues/187)).
- **Map**: A new point reuses a fix from the last minute and stops waiting after 15 seconds. The accuracy is shown. If there is no position, the point is not placed. The location button lets the user choose the place on the map ([#191](https://github.com/sitmun/sitmun/issues/191)).
- **WFS**: Relative `/proxy/{app}/{ter}/WFS/{id}` task URLs resolve against the middleware base instead of the Capacitor WebView origin. GetFeature/Transaction send `Authorization: Bearer` for the middleware origin ([#6](https://github.com/sitmun/edition-mobile-app/issues/6)).
- **Auth** / **i18n**: Failed login shows an error message; validation errors use i18n keys (`home.loginError`, `home.instanceRequired`) instead of hardcoded Spanish.
