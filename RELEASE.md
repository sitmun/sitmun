# Release

This repository has one version in the root `gradle.properties` file. `tools/scripts/bump-version.sh` copies it into the admin and viewer `package.json` files and the README badges. `mise.toml` wires that script as the `bump-version` task. The old per-repository release runbook no longer applies.

This repository is [sitmun/sitmun](https://github.com/sitmun/sitmun). Components are directories in this repository. `dev` is the integration branch. `main` receives release pull requests from `dev`.

Tags imported from the previous repositories use `legacy/<repository>/<tag>`, for example `legacy/sitmun-application-stack/sitmun-application-stack/1.2.6`.

## Images

[`.github/workflows/publish-images.yml`](.github/workflows/publish-images.yml) pushes `ghcr.io/sitmun/front`, `ghcr.io/sitmun/backend`, `ghcr.io/sitmun/proxy`, and `ghcr.io/sitmun/mbtiles` for `linux/amd64` and `linux/arm64`. CI and a local checkout both call [`tools/scripts/publish-images.sh`](tools/scripts/publish-images.sh), which runs `docker compose build --push`. A manual run and a push to `publish-1.3.0` push tag `1.3.0`. A `v*` git tag publishes the version without the leading `v`, so `v1.3.0` publishes `1.3.0`. The front image is built with `PUBLIC_BASE_PATH=/` and `ENVIRONMENT=production`.

GitHub creates each package private. After the first push, set `front`, `backend`, `proxy`, and `mbtiles` to public in Package settings. The Packages API cannot change visibility, and later pushes keep it. An anonymous `docker pull ghcr.io/sitmun/front:1.3.0` confirms it. Operators run the images with the steps in [README.md](README.md).

### Republish a tag from a local checkout

The account needs package scopes. `delete:packages` is plural. `delete:package` is rejected as `invalid_scope`.

```bash
gh auth refresh -h github.com -s read:packages,write:packages,delete:packages
gh auth token | docker login ghcr.io -u "$(gh api user --jq .login)" --password-stdin
git switch dev && git pull --ff-only
git status   # must be clean; the script refuses a dirty tree
T=$(date -u +%Y-%m-%dT%H:%M:%SZ)
tools/scripts/publish-images.sh 1.3.0
```

Docker needs about 4 GiB of memory for the viewer build. The script builds both platforms and fails unless each image lists `linux/amd64` and `linux/arm64`.

### Remove superseded versions

List versions created before `T`. Every listed line must show no tags (`[]`). The new per-platform manifests are untagged children of the tag, so do not delete all untagged versions.

```bash
for n in front backend proxy mbtiles; do
  gh api --paginate "/orgs/sitmun/packages/container/$n/versions" \
    --jq ".[] | select(.created_at < \"$T\") | \"\(.id) \(.created_at) \(.metadata.container.tags)\"" \
    | sed "s/^/$n /"
done
```

Delete only those ids: `gh api -X DELETE "/orgs/sitmun/packages/container/<name>/versions/<id>"`. The account must be an admin of the `sitmun` organization.

The platform version in `gradle.properties` stays `1.2.9` until `tools/scripts/bump-version.sh` runs. The image tag for this publish is `1.3.0`.
