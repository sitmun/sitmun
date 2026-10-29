#!/usr/bin/env bash
# test_backend_oracle11_boot.sh
# Boots the backend jar with profile oracle-11 on an empty Oracle XE 11 schema and
# checks that it serves requests, not only that health is UP.
# The JVM runs in Etc/UTC, the zone of a GitHub runner, which Oracle 11 XE does not know as a region.
#
# Usage:
#   bash tools/tests/test_backend_oracle11_boot.sh
#
# gvenzl/oracle-xe:11 is amd64 only. On an Apple M1, start it in an x86_64 Colima
# profile yourself and set SITMUN_ORACLE_URL so this script does not start a container:
#   SITMUN_ORACLE_URL=jdbc:oracle:thin:@//127.0.0.1:15211/XE bash tools/tests/test_backend_oracle11_boot.sh
# SITMUN_ORACLE_KEEP=1 leaves the started container running for :sitmun-backend:testOracle11.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ORACLE_IMAGE="${SITMUN_ORACLE_IMAGE:-gvenzl/oracle-xe:11}"
ORACLE_PORT="${SITMUN_ORACLE_PORT:-15211}"
ORACLE_WAIT_TRIES="${SITMUN_ORACLE_WAIT_TRIES:-300}"
BACKEND_PORT="${SITMUN_BACKEND_PORT:-9011}"
BACKEND_WAIT_TRIES="${SITMUN_BACKEND_WAIT_TRIES:-90}"
CONTAINER=sitmun_backend_ora11
DB_USER=sitmun3
DB_PASS=sitmun3
BACKEND_LOG="$(mktemp "${TMPDIR:-/tmp}/sitmun-backend-ora11.XXXXXX")"
BASE="http://localhost:${BACKEND_PORT}"

PASS=0
FAIL=0
ok()   { echo "  ✓ $*"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $*"; FAIL=$((FAIL+1)); }

STARTED_CONTAINER=false
BACKEND_PID=""

cleanup() {
  if [[ -n "$BACKEND_PID" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  if $STARTED_CONTAINER && [[ "${SITMUN_ORACLE_KEEP:-}" != "1" ]]; then
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

dump_backend_log() {
  echo "── backend log: ORA- errors ──"
  grep -n "ORA-" "$BACKEND_LOG" | cut -c1-400 | head -20 || true
  echo "── backend log: last 60 lines ──"
  tail -60 "$BACKEND_LOG" | cut -c1-400 || true
}

if [[ -z "${SITMUN_ORACLE_URL:-}" ]]; then
  echo "── Oracle: $ORACLE_IMAGE on port $ORACLE_PORT, service XE ──"
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker pull "$ORACLE_IMAGE"
  # 11g has no pluggable database. ORACLE_DATABASE is ignored and the service is XE.
  docker run -d --name "$CONTAINER" -p "${ORACLE_PORT}:1521" \
    -e ORACLE_PASSWORD=password \
    -e APP_USER="$DB_USER" \
    -e APP_USER_PASSWORD="$DB_PASS" \
    "$ORACLE_IMAGE" >/dev/null
  STARTED_CONTAINER=true

  for i in $(seq 1 "$ORACLE_WAIT_TRIES"); do
    if docker logs "$CONTAINER" 2>&1 | grep -q 'DATABASE IS READY TO USE!'; then
      echo "  Oracle ready after attempt $i/$ORACLE_WAIT_TRIES"
      break
    fi
    if [[ $i -eq "$ORACLE_WAIT_TRIES" ]]; then
      fail "Oracle did not report ready"
      docker logs --tail 80 "$CONTAINER" 2>&1 || true
      exit 1
    fi
    echo "  Waiting for Oracle image=$ORACLE_IMAGE attempt $i/$ORACLE_WAIT_TRIES"
    sleep 3
  done
  SITMUN_ORACLE_URL="jdbc:oracle:thin:@//127.0.0.1:${ORACLE_PORT}/XE"
fi

echo ""
echo "── Backend jar ──"
(cd "$REPO_ROOT" && ./gradlew --no-daemon -q :sitmun-backend:bootJar) || { fail "bootJar failed"; exit 1; }
JAR=$(ls "$REPO_ROOT"/sitmun-backend/build/libs/*.jar | grep -v -- '-plain\.jar$' | head -1)
echo "  $JAR"

echo ""
echo "── Backend: profile oracle-11 against $SITMUN_ORACLE_URL ──"
SITMUN_USER_SECRET='ci-oracle11-user-secret-at-least-32-chars' \
SITMUN_PROXY_MIDDLEWARE_SECRET='ci-oracle11-middleware-secret-32-chars' \
SPRING_PROFILES_ACTIVE=oracle-11 \
SPRING_CONFIG_ADDITIONAL_LOCATION="file:${REPO_ROOT}/profiles/oracle/" \
SPRING_DATASOURCE_URL="$SITMUN_ORACLE_URL" \
SPRING_DATASOURCE_USERNAME="$DB_USER" \
SPRING_DATASOURCE_PASSWORD="$DB_PASS" \
SPRING_LIQUIBASE_CHANGE_LOG="file:${REPO_ROOT}/profiles/oracle/liquibase/master.xml" \
SERVER_PORT="$BACKEND_PORT" \
  java -Duser.timezone=Etc/UTC -jar "$JAR" >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

for i in $(seq 1 "$BACKEND_WAIT_TRIES"); do
  if curl -fsS -m 5 "$BASE/api/dashboard/health" >/dev/null 2>&1; then
    echo "  Backend healthy after attempt $i/$BACKEND_WAIT_TRIES"
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    fail "Backend exited before health was UP"
    dump_backend_log
    exit 1
  fi
  if [[ $i -eq "$BACKEND_WAIT_TRIES" ]]; then
    fail "Backend health did not become UP"
    dump_backend_log
    exit 1
  fi
  echo "  Waiting for backend attempt $i/$BACKEND_WAIT_TRIES"
  sleep 5
done

echo ""
echo "── Checks ──"
grep -q "Update has been successful" "$BACKEND_LOG" \
  && ok "Liquibase applied profiles/oracle/liquibase" || fail "Liquibase success line missing"
grep -q "Database dialect: OracleLegacyDialect" "$BACKEND_LOG" \
  && ok "Hibernate uses OracleLegacyDialect" || fail "OracleLegacyDialect not reported"
grep -q "Database version: 11" "$BACKEND_LOG" \
  && ok "Hibernate reports database version 11" || fail "Database version 11 not reported"

check_get() {
  local path="$1" code
  code=$(curl -sS -m 30 -o /dev/null -w '%{http_code}' "$BASE$path")
  if [[ "$code" == "200" ]]; then ok "GET $path -> 200"; else fail "GET $path -> $code"; fi
}

check_get /api/dashboard/health
check_get /api/dashboard/startup
# The public application list is a distinct paged query. On 11g Hibernate pages with
# ROWNUM and dense_rank, which Oracle rejects when the select list includes a CLOB.
check_get "/api/config/client/application?page=0&size=1"
check_get "/api/config/client/application?page=1&size=1"

echo ""
echo "Results: $PASS passed, $FAIL failed"
if [[ $FAIL -gt 0 ]]; then
  dump_backend_log
  exit 1
fi
