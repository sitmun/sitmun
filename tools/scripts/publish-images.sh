#!/usr/bin/env bash
# Build and push front, backend, proxy, and mbtiles for linux/amd64 and linux/arm64.
# The caller logs in to ghcr.io. A dirty tree is refused.
set -euo pipefail

root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$root"

if [[ $# -ne 1 || -z ${1:-} ]]; then
  echo "usage: tools/scripts/publish-images.sh <tag>" >&2
  exit 1
fi
tag=$1

if [[ -n $(git status --porcelain) ]]; then
  echo "refusing to publish from a dirty tree" >&2
  exit 1
fi

builder=${SITMUN_BUILDER:-sitmun-publish}
if ! docker buildx inspect "$builder" >/dev/null 2>&1; then
  docker buildx create --name "$builder" --driver docker-container >/dev/null
fi

envfile=$(mktemp)
chmod 600 "$envfile"
trap 'rm -f "$envfile"' EXIT
cat > "$envfile" << EOF
SITMUN_VERSION=${tag}
ENVIRONMENT=production
PUBLIC_BASE_PATH=/
SITMUN_USER_SECRET=$(openssl rand -hex 32)
MIDDLEWARE_SECRET=$(openssl rand -hex 32)
SITMUN_MBTILES_JOB_HANDLE_SECRET=$(openssl rand -hex 32)
EOF

export COMPOSE_PARALLEL_LIMIT=1
docker compose --env-file "$envfile" \
  -f compose.yaml -f .github/docker/compose.publish.yaml \
  --profile mbtiles build --builder "$builder" --push \
  front backend proxy mbtiles

for name in front backend proxy mbtiles; do
  inspect=$(docker buildx imagetools inspect "ghcr.io/sitmun/${name}:${tag}")
  printf '%s\n' "$inspect"
  printf '%s\n' "$inspect" | grep -q 'linux/amd64' || {
    echo "missing linux/amd64: $name" >&2
    exit 1
  }
  printf '%s\n' "$inspect" | grep -q 'linux/arm64' || {
    echo "missing linux/arm64: $name" >&2
    exit 1
  }
done
