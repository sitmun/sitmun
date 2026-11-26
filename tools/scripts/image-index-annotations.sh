#!/usr/bin/env bash
# Print the org.opencontainers.image.* labels of a Dockerfile as index annotations, one per line.
# A multi-arch package page on ghcr.io reads its description from the index, not the image labels.
set -euo pipefail

if [[ $# -ne 1 || ! -f $1 ]]; then
  echo "usage: tools/scripts/image-index-annotations.sh <Dockerfile>" >&2
  exit 1
fi

sed -nE 's/^LABEL (org\.opencontainers\.image\.[a-z.]+)="?([^"]*)"?$/index:\1=\2/p' "$1"
