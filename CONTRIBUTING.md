# Contributing

Work happens in [sitmun/sitmun](https://github.com/sitmun/sitmun).

- Branch from `dev`.
- Open pull requests against `dev`.
- `main` only takes release pull requests from `dev`.
- A `tech-com` code-owner review is required.
- `ci-gate` must be green.
- `Test Oracle 11g`, `Test Oracle 21c (stand-in for 19c)`, `Test PostgreSQL 12`, and `Test PostgreSQL 16` must be green or skipped. They skip when the change does not touch the backend. PostgreSQL 16 runs for any backend change. The other three run for persistence changes and for a pull request into `main`.
- Pull requests into `dev` merge through the merge queue once that queue is turned on.
- Direct pushes to `dev` and `main` are rejected.

Run tests from the module you change. Root Playwright suites are `pnpm run e2e`, `pnpm run e2e:viewer`, `pnpm run e2e:mia-cross`, `pnpm run e2e:application-contact`, and `pnpm run e2e:mobile:web`. Those suites share port `18080`, so run one at a time.

Node is the root `.nvmrc`. pnpm is `packageManager` in each app's `package.json`. mise reads both files and is optional. CI uses `node-version-file: .nvmrc` and `pnpm/action-setup`, then `pnpm ci`.
