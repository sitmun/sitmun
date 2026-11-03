# Release

This repository has one version in the root `gradle.properties` file. `tools/scripts/bump-version.sh` bumps it, and `mise.toml` wires that script as the `bump-version` task. The old per-repository release runbook no longer applies.

This repository is [sitmun/sitmun](https://github.com/sitmun/sitmun). Components are directories in this repository. `dev` is the integration branch. `main` receives release pull requests from `dev`.

Tags imported from the previous repositories use `legacy/<repository>/<tag>`, for example `legacy/sitmun-application-stack/sitmun-application-stack/1.2.6`.
