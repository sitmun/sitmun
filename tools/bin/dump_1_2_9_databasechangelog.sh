#!/usr/bin/env bash
# Apply the 1.2.9 production profile changelog and dump DATABASECHANGELOG.
# Usage: dump_1_2_9_databasechangelog.sh postgres-12|postgres-16|oracle-23|oracle-21|oracle-11
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENGINE="${1:?engine}"
TAG="legacy/sitmun-application-stack/sitmun-application-stack/1.2.9"
OUT="$REPO_ROOT/sitmun-backend/src/test/resources/db/databasechangelog/1.2.9/${ENGINE}.csv"
mkdir -p "$(dirname "$OUT")"

case "$ENGINE" in
  postgres-12) IMAGE=postgres:12-alpine; PROFILE=postgres; KIND=postgres ;;
  postgres-16) IMAGE=postgres:16-alpine; PROFILE=postgres; KIND=postgres ;;
  oracle-23) IMAGE=gvenzl/oracle-free:23-slim; PROFILE=oracle; KIND=oracle ;;
  oracle-21) IMAGE=gvenzl/oracle-xe:21-slim; PROFILE=oracle; KIND=oracle ;;
  oracle-11) IMAGE=gvenzl/oracle-xe:11; PROFILE=oracle; KIND=oracle11 ;;
  *) echo "unknown engine $ENGINE" >&2; exit 2 ;;
esac

# Oracle 11 and 21 images are amd64. On Apple Silicon they run in the oracle-xe
# Colima profile. That VM mounts the home directory, not mktemp's directory.
if [[ "$ENGINE" == "oracle-11" || "$ENGINE" == "oracle-21" ]] && [[ "$(uname -m)" == "arm64" ]]; then
  DOCKER=(colima ssh --profile oracle-xe -- sudo docker)
  TMP="$REPO_ROOT/build/databasechangelog-1.2.9-$ENGINE"
  rm -rf "$TMP"
  mkdir -p "$TMP"
else
  DOCKER=(docker)
  TMP="$(mktemp -d)"
fi
container_rm() { "${DOCKER[@]}" rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
network_rm() { "${DOCKER[@]}" network rm "$NETWORK" >/dev/null 2>&1 || true; }
trap 'container_rm; network_rm; rm -rf "$TMP"' EXIT
CONTAINER="sitmun-cl-129-${ENGINE}"
NETWORK="sitmun_cl_129_${ENGINE//-/}"
container_rm
network_rm
"${DOCKER[@]}" network create "$NETWORK" >/dev/null

git -C "$REPO_ROOT" archive "$TAG" "profiles/$PROFILE/liquibase" | tar -x -C "$TMP"
CHANGELOG="$TMP/profiles/$PROFILE/liquibase"

if [[ "$KIND" == "postgres" ]]; then
  "${DOCKER[@]}" run -d --name "$CONTAINER" --network "$NETWORK" \
    -e POSTGRES_DB=sitmun3 -e POSTGRES_USER=sitmun3 -e POSTGRES_PASSWORD=sitmun3 \
    "$IMAGE" >/dev/null
  for _ in $(seq 1 60); do
    "${DOCKER[@]}" exec "$CONTAINER" pg_isready -U sitmun3 -d sitmun3 -q && break
    sleep 1
  done
  URL="jdbc:postgresql://${CONTAINER}:5432/sitmun3"
  USER=sitmun3
  PASS=sitmun3
else
  "${DOCKER[@]}" pull "$IMAGE"
  if [[ "$KIND" == "oracle11" ]]; then
    "${DOCKER[@]}" run -d --name "$CONTAINER" --network "$NETWORK" \
      -e ORACLE_PASSWORD=password -e APP_USER=sitmun3 -e APP_USER_PASSWORD=sitmun3 \
      "$IMAGE" >/dev/null
    URL="jdbc:oracle:thin:@//${CONTAINER}:1521/XE"
  else
    "${DOCKER[@]}" run -d --name "$CONTAINER" --network "$NETWORK" \
      -e ORACLE_PASSWORD=password -e APP_USER=sitmun3 -e APP_USER_PASSWORD=sitmun3 \
      -e ORACLE_DATABASE=sitmun3 "$IMAGE" >/dev/null
    URL="jdbc:oracle:thin:@//${CONTAINER}:1521/sitmun3"
  fi
  USER=sitmun3
  PASS=sitmun3
  ready=0
  tries=180
  if [[ "$KIND" == "oracle11" || "$ENGINE" == "oracle-21" ]]; then
    tries=360
  fi
  for _ in $(seq 1 "$tries"); do
    if "${DOCKER[@]}" logs "$CONTAINER" 2>&1 | grep -q "DATABASE IS READY TO USE"; then
      ready=1
      break
    fi
    sleep 10
  done
  [[ "$ready" == "1" ]] || { echo "$ENGINE did not become ready" >&2; "${DOCKER[@]}" logs "$CONTAINER" | tail -40 >&2; exit 1; }
fi

# Same path the 1.2.9 profile uses: file:/usr/src/config/liquibase/master.xml
# Mounting at /liquibase/changelog and passing changelog/master.xml stored
# FILENAME as changelog/changelog/...
liquibase_env=()
if [[ "$KIND" == "oracle11" ]]; then
  liquibase_env=(-e "JAVA_TOOL_OPTIONS=-Doracle.jdbc.timezoneAsRegion=false")
fi
"${DOCKER[@]}" run --rm --network "$NETWORK" \
  "${liquibase_env[@]}" \
  -v "$CHANGELOG:/usr/src/config/liquibase:ro" \
  liquibase/liquibase:4.29 \
  --search-path=/usr/src/config/liquibase \
  --url="$URL" --username="$USER" --password="$PASS" \
  --changeLogFile=master.xml \
  update

if [[ "$KIND" == "postgres" ]]; then
  "${DOCKER[@]}" exec "$CONTAINER" psql -U sitmun3 -d sitmun3 -c \
    "COPY (SELECT id, author, filename, md5sum, orderexecuted FROM databasechangelog ORDER BY orderexecuted) TO STDOUT WITH CSV HEADER" \
    > "$OUT"
else
  "${DOCKER[@]}" exec "$CONTAINER" bash -c "printf '%s\n' 'SET HEADING OFF FEEDBACK OFF PAGESIZE 0 LINESIZE 400 TRIMSPOOL ON' \"SELECT ID||','||AUTHOR||','||FILENAME||','||MD5SUM||','||ORDEREXECUTED FROM DATABASECHANGELOG ORDER BY ORDEREXECUTED;\" 'EXIT' | sqlplus -s ${USER}/${PASS}@${URL#jdbc:oracle:thin:@}" > "$OUT"
  # sqlplus has no CSV header. Prepend it.
  tmp_csv="$(mktemp)"
  printf 'id,author,filename,md5sum,orderexecuted\n' | cat - "$OUT" > "$tmp_csv"
  mv "$tmp_csv" "$OUT"
fi

if grep -q 'changelog/changelog/' "$OUT"; then
  echo "FILENAME is doubled (changelog/changelog/); dump does not match a 1.2.9 install" >&2
  exit 1
fi
echo "wrote $OUT ($(wc -l < "$OUT") lines)"
