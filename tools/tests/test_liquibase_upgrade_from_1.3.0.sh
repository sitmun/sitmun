#!/usr/bin/env bash
# Install 1.3.0 with the published backend image, then upgrade it with this tree's jar.
# Usage: bash tools/tests/test_liquibase_upgrade_from_1.3.0.sh postgres-12|postgres-16|oracle-23 [write-fixture]
# write-fixture stores the 1.3.0 DATABASECHANGELOG under
# sitmun-backend/src/test/resources/db/databasechangelog/1.3.0/ and stops.
set -uo pipefail

ENGINE="${1:?usage: postgres-12|postgres-16|oracle-23 [write-fixture]}"
MODE="${2:-}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE_TAG=v1.3.0
SOURCE_IMAGE=ghcr.io/sitmun/backend:1.3.0
FIXTURE="$REPO_ROOT/sitmun-backend/src/test/resources/db/databasechangelog/1.3.0/${ENGINE}.csv"
DB_USER=sitmun3
DB_PASS=sitmun3
BACKEND_PORT="${SITMUN_BACKEND_PORT:-9011}"
PASS=0
FAIL=0

ok() { echo "  ✓ $*"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $*"; FAIL=$((FAIL + 1)); }

case "$ENGINE" in
  postgres-12) IMAGE=postgres:12-alpine; PORT=54362; KIND=postgres; PROFILE=postgres ;;
  postgres-16) IMAGE=postgres:16-alpine; PORT=54363; KIND=postgres; PROFILE=postgres ;;
  oracle-23) IMAGE=gvenzl/oracle-free:23-slim; PORT=15233; KIND=oracle; PROFILE=oracle ;;
  *) echo "unknown engine $ENGINE" >&2; exit 2 ;;
esac

CONTAINER="sitmun-upgrade-130-${ENGINE}"
SOURCE_CONTAINER="sitmun-upgrade-130-${ENGINE}-backend"
NETWORK="sitmun_up_130_${ENGINE//-/}"
TMP="$REPO_ROOT/build/upgrade-1.3.0-$ENGINE"
BACKEND_LOG="$REPO_ROOT/build/upgrade-1.3.0-$ENGINE-backend.log"
BACKEND_PID=""
# Shared with test_liquibase_upgrade_from_1.2.9.sh: both bind backend port 9011.
LOCK="${SITMUN_UPGRADE_LOCK:-/tmp/sitmun-upgrade-harness.lock}"

if [[ "$KIND" == "postgres" ]]; then
  NETWORK_URL="jdbc:postgresql://${CONTAINER}:5432/sitmun3"
  HOST_URL="jdbc:postgresql://127.0.0.1:${PORT}/sitmun3"
else
  NETWORK_URL="jdbc:oracle:thin:@//${CONTAINER}:1521/sitmun3"
  HOST_URL="jdbc:oracle:thin:@//127.0.0.1:${PORT}/sitmun3"
fi

stop_backend() {
  if [[ -n "$BACKEND_PID" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    BACKEND_PID=""
  fi
}
cleanup() {
  stop_backend
  docker rm -f "$SOURCE_CONTAINER" "$CONTAINER" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
  rm -rf "$LOCK"
}

if ! mkdir "$LOCK" 2>/dev/null; then
  holder=$(cat "$LOCK/pid" 2>/dev/null || true)
  if [[ -n "$holder" ]] && kill -0 "$holder" 2>/dev/null; then
    echo "another upgrade harness (pid $holder) holds $LOCK; run suites one at a time" >&2
    exit 2
  fi
  rm -rf "$LOCK"
  mkdir "$LOCK" || { echo "cannot take $LOCK" >&2; exit 2; }
fi
echo "$$" >"$LOCK/pid"
trap cleanup EXIT

sql() {
  if [[ "$KIND" == "postgres" ]]; then
    docker exec "$CONTAINER" psql -U "$DB_USER" -d sitmun3 -tAc "$1"
  else
    printf 'SET HEADING OFF FEEDBACK OFF PAGESIZE 0 LINESIZE 400 TRIMSPOOL ON\n%s;\nEXIT\n' "$1" \
      | docker exec -i "$CONTAINER" sqlplus -s "${DB_USER}/${DB_PASS}@//localhost:1521/sitmun3"
  fi
}

changelog_csv() {
  echo "id,author,filename,md5sum,orderexecuted"
  if [[ "$KIND" == "postgres" ]]; then
    sql "SELECT id||','||author||','||filename||','||md5sum||','||orderexecuted FROM databasechangelog ORDER BY orderexecuted"
  else
    sql "SELECT ID||','||AUTHOR||','||FILENAME||','||MD5SUM||','||ORDEREXECUTED FROM DATABASECHANGELOG ORDER BY ORDEREXECUTED" | sed '/^$/d'
  fi
}

start_db() {
  docker network create "$NETWORK" >/dev/null
  if [[ "$KIND" == "postgres" ]]; then
    docker run -d --name "$CONTAINER" --network "$NETWORK" -p "${PORT}:5432" \
      -e POSTGRES_DB=sitmun3 -e POSTGRES_USER="$DB_USER" -e POSTGRES_PASSWORD="$DB_PASS" \
      "$IMAGE" >/dev/null
    # The image accepts connections once while it initializes, then restarts.
    for _ in $(seq 1 60); do
      ready=$(docker logs "$CONTAINER" 2>&1 | grep -c "database system is ready to accept connections" || true)
      if [[ "$ready" -ge 2 ]] && docker exec "$CONTAINER" psql -U "$DB_USER" -d sitmun3 -c 'SELECT 1' >/dev/null 2>&1; then
        return 0
      fi
      sleep 1
    done
  else
    docker run -d --name "$CONTAINER" --network "$NETWORK" -p "${PORT}:1521" \
      -e ORACLE_PASSWORD=password -e APP_USER="$DB_USER" -e APP_USER_PASSWORD="$DB_PASS" \
      -e ORACLE_DATABASE=sitmun3 "$IMAGE" >/dev/null
    for _ in $(seq 1 180); do
      docker logs "$CONTAINER" 2>&1 | grep -q "DATABASE IS READY TO USE" && return 0
      sleep 10
    done
  fi
  echo "$ENGINE did not become ready" >&2
  return 1
}

install_source() {
  rm -rf "$TMP"
  mkdir -p "$TMP"
  git -C "$REPO_ROOT" archive "$SOURCE_TAG" "profiles/$PROFILE" | tar -x -C "$TMP"
  docker run -d --name "$SOURCE_CONTAINER" --network "$NETWORK" \
    -v "$TMP/profiles/$PROFILE:/usr/src/config:ro" \
    -e SPRING_PROFILES_ACTIVE="prod,$PROFILE" \
    -e SPRING_DATASOURCE_URL="$NETWORK_URL" \
    -e SPRING_DATASOURCE_USERNAME="$DB_USER" \
    -e SPRING_DATASOURCE_PASSWORD="$DB_PASS" \
    -e SPRING_LIQUIBASE_CHANGE_LOG=file:/usr/src/config/liquibase/master.xml \
    -e SPRING_LIQUIBASE_CONTEXTS= \
    -e SPRING_JPA_HIBERNATE_DDL_AUTO=validate \
    -e SITMUN_USER_SECRET=ci-db-boot-user-secret-at-least-32-chars \
    -e SITMUN_PROXY_MIDDLEWARE_SECRET=ci-db-boot-middleware-secret-32-chars \
    "$SOURCE_IMAGE" >/dev/null
  for _ in $(seq 1 90); do
    if docker exec "$SOURCE_CONTAINER" curl -fsS -m 5 http://localhost:8080/api/dashboard/health >/dev/null 2>&1; then
      docker rm -f "$SOURCE_CONTAINER" >/dev/null
      return 0
    fi
    [[ "$(docker inspect -f '{{.State.Running}}' "$SOURCE_CONTAINER")" == "true" ]] || break
    sleep 5
  done
  docker logs --tail 60 "$SOURCE_CONTAINER" >&2
  return 1
}

boot_backend() {
  stop_backend
  : >"$BACKEND_LOG"
  SITMUN_USER_SECRET='ci-db-boot-user-secret-at-least-32-chars' \
  SITMUN_PROXY_MIDDLEWARE_SECRET='ci-db-boot-middleware-secret-32-chars' \
  SPRING_PROFILES_ACTIVE="$PROFILE" \
  SPRING_CONFIG_ADDITIONAL_LOCATION="file:${REPO_ROOT}/profiles/${PROFILE}/" \
  SPRING_DATASOURCE_URL="$HOST_URL" \
  SPRING_DATASOURCE_USERNAME="$DB_USER" \
  SPRING_DATASOURCE_PASSWORD="$DB_PASS" \
  SPRING_LIQUIBASE_CHANGE_LOG="file:${REPO_ROOT}/profiles/${PROFILE}/liquibase/master.xml" \
  SPRING_LIQUIBASE_CONTEXTS='' \
  SERVER_PORT="$BACKEND_PORT" \
    java -Duser.timezone=Etc/UTC -jar "$JAR" >"$BACKEND_LOG" 2>&1 &
  BACKEND_PID=$!
}

wait_health() {
  for _ in $(seq 1 90); do
    curl -fsS -m 5 "http://localhost:${BACKEND_PORT}/api/dashboard/health" >/dev/null 2>&1 && return 0
    kill -0 "$BACKEND_PID" 2>/dev/null || return 1
    sleep 5
  done
  return 1
}

echo "── $ENGINE: install $SOURCE_IMAGE ──"
start_db || exit 1
if install_source; then
  ok "1.3.0 installed on an empty database"
else
  fail "1.3.0 did not install"
  exit 1
fi
installed=$(changelog_csv)

if [[ "$MODE" == "write-fixture" ]]; then
  mkdir -p "$(dirname "$FIXTURE")"
  printf '%s\n' "$installed" >"$FIXTURE"
  echo "wrote $FIXTURE ($(($(wc -l <"$FIXTURE") - 1)) rows)"
  exit 0
fi

if [[ ! -f "$FIXTURE" ]]; then
  fail "missing fixture $FIXTURE"
elif [[ "$installed" == "$(cat "$FIXTURE")" ]]; then
  ok "1.3.0 changelog matches $(basename "$FIXTURE")"
else
  fail "1.3.0 changelog differs from $(basename "$FIXTURE")"
  diff <(printf '%s\n' "$installed") "$FIXTURE" | head -20
fi

echo "── Build backend jar ──"
(cd "$REPO_ROOT" && ./gradlew --no-daemon -q :sitmun-backend:bootJar) || { echo "bootJar failed" >&2; exit 1; }
JAR=$(ls -t "$REPO_ROOT"/sitmun-backend/build/libs/*.jar | grep -v -- '-plain\.jar$' | head -1)

echo "── $ENGINE: upgrade to this tree ──"
boot_backend
if wait_health; then
  ok "upgraded database health is UP"
else
  fail "upgraded database health did not come up"
  tail -60 "$BACKEND_LOG" || true
fi
stop_backend
upgraded=$(changelog_csv)
missing=$(comm -23 <(printf '%s\n' "$installed" | sed 1d | sort) <(printf '%s\n' "$upgraded" | sed 1d | sort))
if [[ -z "$missing" ]]; then
  ok "every 1.3.0 changeset row kept its checksum"
else
  fail "1.3.0 changeset rows changed or removed:"
  printf '%s\n' "$missing" | head -20
fi

echo "── $ENGINE: second start changes nothing ──"
boot_backend
if wait_health; then
  ok "second start health is UP"
else
  fail "second start health did not come up"
  tail -60 "$BACKEND_LOG" || true
fi
stop_backend
if [[ "$(changelog_csv)" == "$upgraded" ]]; then
  ok "second start added no changelog rows"
else
  fail "second start changed DATABASECHANGELOG"
fi

echo "── $ENGINE: liquibase validate ──"
if docker run --rm --network "$NETWORK" \
  -v "$REPO_ROOT/sitmun-backend/src/main/resources/db/changelog:/liquibase/changelog:ro" \
  liquibase/liquibase:4.29 \
  --search-path=/liquibase/changelog \
  --url="$NETWORK_URL" --username="$DB_USER" --password="$DB_PASS" \
  --changeLogFile=db.changelog-master.yaml \
  validate \
  -D="upgrade.defaultLanguage=en"; then
  ok "liquibase validate"
else
  fail "liquibase validate"
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[[ "$FAIL" == "0" ]]
