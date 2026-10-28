# Contributing

Work happens in [sitmun/sitmun](https://github.com/sitmun/sitmun).

- Branch from `dev`.
- Open pull requests against `dev`.
- `main` only takes release pull requests from `dev`.
- A `tech-com` code-owner review and a green `ci-gate` check are required.
- Direct pushes to `dev` and `main` are rejected.

Run tests from the module you change. Root Playwright suites are `npm run e2e`, `npm run e2e:viewer`, `npm run e2e:mia-cross`, `npm run e2e:application-contact`, and `npm run e2e:mobile:web`. Those suites share port `18080`, so run one at a time.
