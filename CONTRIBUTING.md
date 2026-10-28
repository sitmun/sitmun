# Contributing

Work happens in [sitmun/sitmun](https://github.com/sitmun/sitmun).

- Branch from `dev`.
- Open pull requests against `dev`.
- `main` only takes release pull requests from `dev`.
- A `tech-com` code-owner review and a green `ci-gate` check are required.
- Direct pushes to `dev` and `main` are rejected.

Run tests from the module you change. Root Playwright suites are `pnpm run e2e`, `pnpm run e2e:viewer`, `pnpm run e2e:mia-cross`, `pnpm run e2e:application-contact`, and `pnpm run e2e:mobile:web`. Those suites share port `18080`, so run one at a time.

Node is the root `.nvmrc`. pnpm is `packageManager` in each app's `package.json`. mise reads both files and is optional. CI uses `node-version-file: .nvmrc` and `pnpm/action-setup`, then `pnpm ci`.
