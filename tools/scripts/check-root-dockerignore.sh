#!/usr/bin/env bash
# Image builds use the repository root as their context, so only the root
# .dockerignore applies. It must exclude installed dependency trees.
#
#   bash tools/scripts/check-root-dockerignore.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

missing=0
for pattern in 'node_modules/' '**/node_modules/' '**/build/' '**/.gradle/'; do
  if ! grep -q -x -F -- "$pattern" .dockerignore; then
    echo "root .dockerignore is missing ${pattern}" >&2
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "root .dockerignore excludes installed dependency trees"
