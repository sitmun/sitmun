#!/usr/bin/env bash
# Print commits on each old repository main and dev that are not the pin in
# tools/monorepo/ported.json. Exit 0 when every tip matches its pin.
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
pins="$root/tools/monorepo/ported.json"
ahead=0

while IFS=$'\t' read -r repo branch pin; do
  tip="$(gh api "repos/sitmun/${repo}/commits/${branch}" --jq .sha)"
  if [[ "$tip" == "$pin" ]]; then
    continue
  fi
  count="$(gh api "repos/sitmun/${repo}/compare/${pin}...${branch}" --jq .ahead_by)"
  echo "${repo} ${branch} ahead=${count} pin=${pin} tip=${tip}"
  gh api "repos/sitmun/${repo}/compare/${pin}...${branch}" \
    --jq '.commits[] | "\(.sha) \(.commit.message | split("\n")[0])"'
  ahead=$((ahead + count))
done < <(python3 - "$pins" <<'PY'
import json, sys
pins = json.load(open(sys.argv[1]))
for repo, branches in pins.items():
    for branch, sha in branches.items():
        print(f"{repo}\t{branch}\t{sha}")
PY
)

if [[ "$ahead" -ne 0 ]]; then
  echo "unported commits: ${ahead}" >&2
  exit 1
fi
echo "unported commits: 0"
