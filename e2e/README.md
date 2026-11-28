# SITMUN root end-to-end tests

Browser E2E against backend-core. The default database is in-memory H2. No Docker Compose.

## Coverage

`pnpm run e2e`, `e2e:viewer`, `e2e:mia-cross`, `e2e:application-contact`, `e2e:first-run`, `e2e:mobile:web`, and `e2e:mobile:android` bind backend port 18080. Run one at a time.

One row per behavior. The spec holds the assertions; this table says what each suite covers and where. Add a row for a new case rather than lengthening an existing one.

### Admin (`pnpm run e2e`)

Specs under `e2e/admin/`. Project `login` runs `login` and `language-chrome`; `admin-forms` runs everything under `forms/`.

| Spec | Covers | Issues |
|---|---|---|
| `login.spec.ts` | Login reaches `/#/dashboard`; session refresh keeps an operator with no positions signed in | [sitmun-backend-core#264](https://github.com/sitmun/sitmun-backend-core/issues/264) |
| `language-chrome.spec.ts` | Login language follows the browser, then `language.default`; the menu shows endonyms | |
| `forms/role-form.spec.ts` | Role **Details**: validation, create, edit, reload. Relation tabs not exercised | |
| `forms/user-form.spec.ts` | User **Details**: validation, create, edit, reload. **Roles per Territory** add dialog lists the right roles | [#386](https://github.com/sitmun/sitmun/issues/386) |
| `forms/user-positions.spec.ts` | User **Positions**: column order, empty dates, Alta/Baja edits, tooltip, hidden for `public`, opens in under 3 s | [sitmun-admin-app#462](https://github.com/sitmun/sitmun-admin-app/issues/462) |
| `forms/user-positions-review.spec.ts` | Records a review video of editing Alta then Baja | |
| `forms/territory-form.spec.ts` | Territory **Details**: validation, create with type, edit, reload. Relation tabs not exercised | |
| `forms/field-limits.spec.ts` | Application name and user email follow the dictionary column lengths | |
| `forms/tree-svg-image.spec.ts` | Tree and touristic node SVG images persist without raster scaling | [sitmun-admin-app#330](https://github.com/sitmun/sitmun-admin-app/issues/330) |
| `forms/layers-form.spec.ts` | Layer **Details**: validation, create, reload. Relation tabs load only when selected | [sitmun-application-stack#41](https://github.com/sitmun/sitmun-application-stack/issues/41) |
| `forms/layers-list-delete.spec.ts` | Deleting a layer from the grid removes it (204, then 404) | |
| `forms/layer-feature-type-schema.spec.ts` | **Load properties from the service** reads a WFS schema without an `xsd:` prefix | [#419](https://github.com/sitmun/sitmun/issues/419) |
| `forms/cartography-list.spec.ts` | `GET /api/cartographies?size=10000` answers 200 (MIA cartography autocomplete) | |
| `forms/service-type-options.spec.ts` | The service type list offers only WMS, WFS and WMTS | [sitmun-application-stack#101](https://github.com/sitmun/sitmun-application-stack/issues/101) |
| `forms/service-access-check.spec.ts` | The service access check shows each status with its observer and time | |
| `forms/service-capabilities-mapserver.spec.ts` | **Get Metadata** on a MapServer URL with `?map=` | [#391](https://github.com/sitmun/sitmun/issues/391) |
| `forms/service-capabilities-wfs.spec.ts` | **Get Metadata** and **Feature types** for a WFS service | [#382](https://github.com/sitmun/sitmun/issues/382) |
| `forms/service-layer-styles.spec.ts` | A layer registered from the Layers tab keeps all its styles | [#384](https://github.com/sitmun/sitmun/issues/384) |
| `forms/service-new-layer-status.spec.ts` | On a new service, only registered layers are created; edits and removals of unregistered rows are not saved | [#371](https://github.com/sitmun/sitmun/issues/371), [#430](https://github.com/sitmun/sitmun/issues/430), [#431](https://github.com/sitmun/sitmun/issues/431) |
| `forms/task-type-filter.spec.ts` | **Tarea → Localizador** lists only locator tasks | [#372](https://github.com/sitmun/sitmun/issues/372) |
| `forms/task-query-rules.spec.ts` | SQL query task save rules: placeholders, parameters, `MUN_INES`, `WITH`, reserved names | |
| `forms/task-query-test.spec.ts` | SQL query task **Probar** and **Formatear**: save-first state, bound values, paging, errors | |
| `forms/task-query-test-api.spec.ts` | SQL query test API: binding, saved command only, admin only, truncation | |
| `forms/mia-form.spec.ts` | More Info Advanced **Details**, parameters, child mapping, and render | |
| `forms/mia-unsaved-parameters.spec.ts` | An unsaved parameter row can be mapped and saves in one step | [#373](https://github.com/sitmun/sitmun/issues/373) |
| `forms/template-execute-child.spec.ts` | Plantilla preview and `execute-child` work without `appId` and `terId` | |
| `forms/template-nested-preview.spec.ts` | Nested Plantilla A→B preview, including the child's Catalan literal | |
| `forms/template-table-each-preview.spec.ts` | `data-sitmun-each` survives a visual edit and still expands rows | [sitmun-admin-app#441](https://github.com/sitmun/sitmun-admin-app/issues/441) |
| `forms/template-attr-mustache-preview.spec.ts` | Mustaches in `src` and `href` stay literal through visual edits and preview | |
| `forms/template-task-relations.spec.ts` | Plantilla role and territory assignments persist | [sitmun-admin-app#467](https://github.com/sitmun/sitmun-admin-app/issues/467) |
| `forms/template-default-language.spec.ts` | Plantilla `<t>` enrollment and preview follow `language.default` | |
| `forms/language-default.spec.ts` | Cancelling **Set as Default** leaves `language.default` unchanged | |
| `forms/language-order.spec.ts` | A disabled or reordered language changes the login menu | |
| `forms/literal-translation-form.spec.ts` | Literal translations grid: create and reload | |

### Viewer (`pnpm run e2e:viewer`)

Specs under `e2e/viewer/`. Every project depends on `viewer-setup`.

| Project | Spec | Covers | Issues |
|---|---|---|---|
| `viewer-public` | `language-chrome.spec.ts` | Login language chrome and endonyms | |
| `viewer-public` | `public-access.spec.ts` | Public dashboard; private profile and its WMS answer 403; contact email rules | |
| `viewer-password` | `password-access.spec.ts` | Password login, private profile, proxy token, secured WMS; session refresh; expired positions | [sitmun-backend-core#264](https://github.com/sitmun/sitmun-backend-core/issues/264), [sitmun-backend-core#184](https://github.com/sitmun/sitmun-backend-core/issues/184) |
| `viewer-password` | `profile-positions.spec.ts` | `/user/profile` positions table matches the admin wording | [sitmun-viewer-app#177](https://github.com/sitmun/sitmun-viewer-app/issues/177) |
| `viewer-password` | `restricted-share-link.spec.ts` | A restricted share link returns to the same map after login, or shows no access | |
| `viewer-catalog` | `layer-catalog.spec.ts` | Catalog radios and load controls, row layout, Capas rows | #92, #135, #142 |
| `viewer-catalog` | `layer-catalog.spec.ts` | A WFS leaf loads, shows a legend swatch, and its popup shows only the INFO list | [sitmun-application-stack#91](https://github.com/sitmun/sitmun-application-stack/issues/91) |
| `viewer-catalog` | `folder-catalog-info.spec.ts` | The folder information window follows the folder kind | |
| `viewer-legend` | `legend.spec.ts` | Capas and the Legend task show symbology when DescribeLayer and GetLegendGraphic fail | #164 |
| `viewer-basemap` | `basemap-none.spec.ts` | **No base map** clears the background and keeps catalog layers | #167 |
| `viewer-overview` | `overview-map-wmts.spec.ts` | A WMTS overview layer is found | [#388](https://github.com/sitmun/sitmun/issues/388) |
| `viewer-overview` | `overview-map-proxy.spec.ts` | The overview GetMap goes through the proxy with the token | [#421](https://github.com/sitmun/sitmun/issues/421) |
| `viewer-broken-background` | `broken-background.spec.ts` | A broken WMTS background is skipped with a warning and the map loads | [#380](https://github.com/sitmun/sitmun/issues/380) |
| `viewer-scale` | `scale-controls.spec.ts` | Scale, scale bar and scale selector do not overlap | [#374](https://github.com/sitmun/sitmun/issues/374) |
| `viewer-print` | `print-map.spec.ts` | Print preview page sizes, scrolling and buttons | [sitmun-viewer-app#160](https://github.com/sitmun/sitmun-viewer-app/issues/160), [#181](https://github.com/sitmun/sitmun-viewer-app/issues/181), [#182](https://github.com/sitmun/sitmun-viewer-app/issues/182) |
| `viewer-gfi-fields` | `gfi-field-list.spec.ts` | GetFeatureInfo include list with a more-info link | |
| `viewer-gfi` | `gfi-html-embed.spec.ts` | HTML GetFeatureInfo iframes respect `X-Frame-Options` | [sitmun-viewer-app#169](https://github.com/sitmun/sitmun-viewer-app/issues/169) |
| `viewer-sql-query` | `sql-query-binding.spec.ts` | SQL task parameter binding, validation and the 1000-row cap | |
| `viewer-parameters` | `parameter-scope.spec.ts` | WMS, GETMAP and INFO parameters reach only their operations | |
| `viewer-mia` | `mia-render.spec.ts` | More Info Advanced overlay: render, errors, re-render, late responses | [sitmun-viewer-app#162](https://github.com/sitmun/sitmun-viewer-app/pull/162) |

- The WMS stub uses Basic auth, serves an open `/legend` PNG, and answers GetFeatureInfo for `34_TOPO_TX` as JSON. The WMTS stub (`e2e:wmts-stub`) listens on 18094. Production Liquibase is not modified.
- Capas trash-then-clear is covered in viewer Jest (`layer-catalog-control.handler`), not here.
- MIA helpers: `e2e/viewer/helpers/mia.ts`.

### MIA cross (`pnpm run e2e:mia-cross`)

Starts admin, viewer, proxy, and the WMS stub on one H2. Specs under `e2e/mia-cross/`.

| Spec | Covers |
|---|---|
| `mia-template-viewer.spec.ts` | Plantilla HTML and Catalan literals reach the overlay; type-17 PDF export; `language.default` change |
| `mia-mapping.spec.ts` | A feature attribute mapped to a Plantilla `$param` |
| `mia-nested-viewer.spec.ts` | Nested Plantilla A→B in the overlay |
| `mia-public-viewer.spec.ts` | Public-user render and PDF export |
| `mia-gfi-click.spec.ts` | A map click's GetFeatureInfo opens the live overlay (strict, no simulated fallback) |
| `mia-solrustic-gfi.spec.ts` | IDE Menorca `tu007rts_ccavalls`: Capas GFI opens a Plantilla with SQL sections |

- H2 loads the test changelog, then `e2e/fixtures/20_menorca_solrustic_mia_e2e.yaml`.
- Outside this harness: the full TipTap toolbar, binary children, filterable columns, Docker profile Liquibase salvage.

### First run (`pnpm run e2e:first-run`)

Own H2 database (`SITMUN_E2E_FIRST_RUN=1` clears the admin password). Admin on 4300 and backend on 18080. Do not run it beside another suite.

| Spec | Covers |
|---|---|
| `admin/first-run.spec.ts` | The welcome step follows the browser language; saving a language and password returns to login with the new password |

### Application contact (`pnpm run e2e:application-contact`)

Starts admin (4300), viewer (4400), and one backend (18080).

| Spec | Covers |
|---|---|
| `application-contact/responsible-institution.spec.ts` | An institution set in the admin appears in the viewer's application details |

### Mobile web (`pnpm run e2e:mobile:web`)

API-only through the gateway; does not start the Ionic web shells. Starts backend (18080), proxy (18082), MBTiles (18084), WMTS stub (18094), and gateway (18081). Setup makes application `1` an edition app and creates an edition user.

| Spec | Covers | Issues |
|---|---|---|
| `mobile/edition-auth.spec.ts` | Edition login returns a Bearer token, not a cookie; it exchanges for a proxy token, lists only `ED` apps, and cannot call account or admin APIs; expired-only grants get 403 | [sitmun-backend-core#184](https://github.com/sitmun/sitmun-backend-core/issues/184) |
| `mobile/proxy-auth.spec.ts` | The middleware rejects a missing bearer, an access token as proxy credential, and a wrong territory | |
| `mobile/mbtiles-auth.spec.ts` | MBTiles estimate and create through the middleware with an opaque job handle; direct `/mbtiles` is not routed | |
| `mobile/touristic-public.spec.ts` | Anonymous clients list touristic apps; private profiles are denied | |

### Mobile Android (`pnpm run e2e:mobile:android`)

Builds debug APKs from temporary copies of `sitmun-mobile/*` and runs Maestro flows on an API 34 emulator or device. Needs `adb`, `ANDROID_HOME` or `ANDROID_SDK_ROOT`, and the Maestro CLI.

| Flow | Covers |
|---|---|
| `mobile/android/edition-login-denied.yaml` | Edition login with wrong credentials |
| `mobile/android/edition-login.yaml` | Edition login |
| `mobile/android/touristic-public.yaml` | Touristic public profile |

- Before the APK builds, the gateway contracts run: missing bearer, wrong territory, access token as proxy, MBTiles job flow.
- Uses `adb reverse tcp:18081`. Records source and APK hashes, and Maestro debug output, under `test-results/mobile-android/`.
- Does not run `adb shell am kill-all`: it ANRs `system`/`systemui` and hides the WebView.

## Prerequisites

Node is the root `.nvmrc`. pnpm is `packageManager` in the root `package.json`. Run `pnpm ci` from the repo root.

- Java 17
- Admin dependencies, from the repo root: `pnpm ci --filter ./sitmun-admin...`
- Viewer dependencies, from the repo root: `pnpm ci --filter ./sitmun-viewer...`
- Chromium: `pnpm run e2e:install` (re-run after `@playwright/test` upgrades)

### Playwright browser missing

If launch fails with `browserType.launch: Executable doesn't exist` (a Cursor sandbox cache path contains `cursor-sandbox-cache/.../playwright/`):

```bash
pnpm run e2e:install
```

Rerun the suite outside the sandbox. A missing browser executable is environment setup.

## Owned ports

| Process | Port |
| ------- | ---- |
| Admin (`ng serve` E2E) | 4300 |
| Viewer (`ng serve` E2E) | 4400 |
| Backend (`bootRun` H2) | 18080 |
| Mobile gateway (`/backend`, `/middleware`) | 18081 |
| Proxy middleware | 18082 |
| Secured WMS stub | 18093 |
| WMTS stub (mobile) | 18094 |
| MBTiles (internal; not on gateway) | 18084 |

The suite starts its own processes and fails if a listed port is already occupied. Viewer, mia-cross, and both mobile suites also bind proxy port 18082. Admin, viewer, and mia-cross also bind the WMS stub port 18093.

## Commands

```bash
# from the repo root
pnpm ci
pnpm run e2e:install

# admin
pnpm run e2e
pnpm run e2e:ui
pnpm run e2e --project=admin-forms

# viewer (+ proxy + secured stub)
pnpm run e2e:viewer
pnpm run e2e:viewer:ui
pnpm run e2e:viewer --project=viewer-public
pnpm run e2e:viewer --project=viewer-password
pnpm run e2e:viewer --project=viewer-catalog
pnpm run e2e:viewer --project=viewer-legend
pnpm run e2e:viewer --project=viewer-basemap
pnpm run e2e:viewer --project=viewer-overview
pnpm run e2e:viewer --project=viewer-broken-background
pnpm run e2e:viewer --project=viewer-scale
pnpm run e2e:viewer --project=viewer-mia

# MIA / Plantilla / literal cross-stack (admin + viewer + proxy + stub)
pnpm run e2e:mia-cross
pnpm run e2e:mia-cross:ui

# admin → viewer responsible institution (shared backend)
pnpm run e2e:application-contact

# mobile edition auth + MBTiles via middleware
pnpm run e2e:mobile:web
# Android emulator + Maestro
# pnpm run e2e:mobile:android
```

## Credential boundaries (mobile edition)

| Credential | Used for |
| ---------- | -------- |
| `access_token` (JSON Bearer) | Backend `/api/authenticate/mobile` session; ED client reads; `POST /api/authenticate/proxy` |
| `proxy_token` (JSON Bearer) | Middleware `/middleware/**` only (map proxy + MBTiles) |
| `X-SITMUN-Proxy-Key` | Proxy → backend `/api/config/proxy` and `/api/config/proxy/mbtiles` |
| Opaque `jobHandle` | MBTiles status/file; bound to principal/app/territory |

Browser `/api/authenticate` and `/api/authenticate/admin` remain cookie-only empty-body logins. Pre-change edition APKs that called `/api/authenticate` for JWT JSON are unsupported.

## TDD workflow

For covered behavior spanning a browser and multiple components:

1. Add or extend the smallest spec that reproduces the expected behavior.
2. Run its file or Playwright project and confirm the expected failure.
3. Implement the minimum change and rerun the targeted test.
4. Run focused tests in each changed module.
5. Run the full affected root suite before handoff.

Use module unit or slice tests for isolated logic and both layers when a
cross-stack regression also has meaningful local contracts. Extend this
harness or document the gap when the behavior is outside current coverage.

## State model

- Fresh in-memory H2 database per suite run (Playwright `reuseExistingServer` is always `false`), unless `SITMUN_E2E_DATASOURCE_URL` names an existing database. That path does not drop it. Both paths load the test changelog: the shipped master, then fixture rows in the 10000 band. On an upgraded database the shipped changesets are already recorded, so only the fixture changeset runs.
- Liquibase seeds `admin` / `admin`
- Admin form tests create unique entities and delete them via authenticated API cleanup
- Viewer setup provisions a dedicated regular user (password suite) plus disposable PoC users for applications 10002/10003; rewrites seeded WMS service 10003 to the local stub through the admin API; adds task-availability for `sitna.layerCatalog` / `workLayerManager` and patches tree-node `loadData`/`active` fixtures for catalog E2E; H2 is discarded when backend exits
- Application-contact suite uses one shared backend for admin write and viewer read of the same application row
- Auth/fixture files live under `e2e/.auth/` (gitignored)
- Seed IDs for viewer / mia-cross / mobile setup are declared in [e2e/viewer/fixtures.ts](viewer/fixtures.ts) and [e2e/mobile/fixtures.ts](mobile/fixtures.ts) (examples: app `1`, WMS service `3`, MIA parent task `42`, Menorca app `12` / territory `4` / GEO `1304` / tree node `12094`). Liquibase drift of those IDs fails E2E opaquely.

## Credential boundaries (viewer)

| Credential | Used for |
| ---------- | -------- |
| `viewer_access_token` cookie | Backend APIs after password login |
| `proxy_token` (IndexedDB) | Bearer on `/middleware/**` only |
| `X-SITMUN-Proxy-Key` | Proxy → backend `/api/config/proxy` |
| Upstream Basic auth | Proxy → local WMS stub |

## Failure artifacts

- HTML report: `playwright-report/`
- Traces / screenshots / videos: `test-results/`
- Android Maestro debug (CI upload on failure): `test-results/mobile-android/maestro/`
- Treat reports as restricted CI artifacts; do not paste Authorization values from traces into tickets

```bash
pnpm exec playwright show-report
```

## Limitations

- Default database is in-memory H2. `SITMUN_E2E_DATASOURCE_URL` points this admin backend at an existing database, runs the test changelog with `drop-first` false, and is the upgraded PostgreSQL 16 run. The PostgreSQL 16 upgrade job sets that URL and runs `pnpm run e2e`. Viewer, mia-cross, application-contact, and mobile stay on H2; do not set the variable for those suites.
- No OIDC login
- Admin suite does not cover Application / Layer `app-relation-grid` **CRUD** except MIA Parameters add+reload in `mia-form.spec.ts` and Plantilla Roles/Territories add+reload in `template-task-relations.spec.ts`. Layers form now asserts lazy association GETs for Territories / Permissions / Trees (not grid CRUD). Role/User/Territory/MIA Details create/edit and application-contact (Application Details field) are separate and do not exercise relation-grid CRUD
- Viewer suite covers configuration + proxy GetCapabilities, plus layer-catalog radio/`loadData` DOM contracts; not full SITNA tile painting
- Mobile web suite is API-level (gateway + backend + proxy + MBTiles); it does not drive the Ionic UI in Chromium
- Edition mobile WFS origin (`/proxy/...` vs Capacitor `https://localhost`) is covered by edition Jest, not `e2e:mobile:web`
- Touristic GPS permission sheet and tablet APK layout are not in Maestro or Playwright
- Mobile Android suite does not harden release manifests (app Android source is unchanged)
- MBTiles protected-source credentials, job-handle key rotation multi-key support, rate/size/time limits, and iOS are absent from this harness
- SITNA identify, simulate, and catalog layout measurements use `page.evaluate` on TC or DOM boxes as harness hooks.
