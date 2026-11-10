# Release

This repository has one version in the root `gradle.properties` file. `tools/scripts/bump-version.sh` copies it into the admin and viewer `package.json` files and the README badges. `mise.toml` wires that script as the `bump-version` task. The old per-repository release runbook no longer applies.

This repository is [sitmun/sitmun](https://github.com/sitmun/sitmun). Components are directories in this repository. `dev` is the integration branch. `main` receives release pull requests from `dev`.

Tags imported from the previous repositories use `legacy/<repository>/<tag>`, for example `legacy/sitmun-application-stack/sitmun-application-stack/1.2.6`.

## Images

[`.github/workflows/publish-images.yml`](.github/workflows/publish-images.yml) pushes `ghcr.io/sitmun/front`, `ghcr.io/sitmun/backend`, `ghcr.io/sitmun/proxy`, and `ghcr.io/sitmun/mbtiles`. A manual run and a push to `publish-1.3.0` push tag `1.3.0`. A `v*` git tag publishes the version without the leading `v`, so `v1.3.0` publishes `1.3.0`. The front image is built with `PUBLIC_BASE_PATH=/` and `ENVIRONMENT=production`.

GitHub creates each package private. After the first push, set `front`, `backend`, `proxy`, and `mbtiles` to public in Package settings. Operators run the images with the steps in [README.md](README.md).

The platform version in `gradle.properties` stays `1.2.9` until `tools/scripts/bump-version.sh` runs. The image tag for this publish is `1.3.0`.
