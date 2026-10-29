#!/usr/bin/env bash
# test_backend_db_boot.sh
# Boots the backend jar on an empty schema with the production Liquibase changelog
# and checks that it serves requests, not only that health is UP.
# The JVM runs in Etc/UTC, the zone of a GitHub runner.
#
# Usage:
#   SITMUN_DB=oracle-11|oracle-19|postgres-12|postgres-16 \
#     bash tools/tests/test_backend_db_boot.sh
#
# SITMUN_DB_URL skips container start (Apple M1: run gvenzl/oracle-xe in an
# x86_64 Colima profile; those images are amd64 only):
#   SITMUN_DB=oracle-11 \
#     SITMUN_DB_URL=jdbc:oracle:thin:@//127.0.0.1:15211/XE \
#     bash tools/tests/test_backend_db_boot.sh
# SITMUN_DB_KEEP=1 leaves the started container running for the matching Gradle suite.

set -uo pipefail

SITMUN_DB="${SITMUN_DB:?usage: SITMUN_DB=oracle-11|oracle-19|postgres-12|postgres-16 $0}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND_PORT="${SITMUN_BACKEND_PORT:-9011}"
BACKEND_WAIT_TRIES="${SITMUN_BACKEND_WAIT_TRIES:-90}"
DB_USER=sitmun3
DB_PASS=sitmun3
BACKEND_LOG="$(mktemp "${TMPDIR:-/tmp}/sitmun-backend-${SITMUN_DB}.XXXXXX")"
BASE="http://localhost:${BACKEND_PORT}"

case "$SITMUN_DB" in
  oracle-11)
    IMAGE="${SITMUN_DB_IMAGE:-gvenzl/oracle-xe:11}"
    HOST_PORT=15211
    CONTAINER=sitmun_test_oracle11
    ENGINE=oracle
    PROFILE=oracle-11
    CONFIG_DIR="$REPO_ROOT/profiles/oracle"
    DIALECT=OracleLegacyDialect
    VERSION_MARK=11
    DB_WAIT_TRIES="${SITMUN_DB_WAIT_TRIES:-300}"
    DEFAULT_URL="jdbc:oracle:thin:@//127.0.0.1:${HOST_PORT}/XE"
    ;;
  oracle-19)
    IMAGE="${SITMUN_DB_IMAGE:-gvenzl/oracle-xe:21-slim}"
    HOST_PORT=15219
    CONTAINER=sitmun_test_oracle19
    ENGINE=oracle
    PROFILE=oracle
    CONFIG_DIR="$REPO_ROOT/profiles/oracle"
    DIALECT=OracleDialect
    # XE 21 stands in for the 19c install. Hibernate reports the image version.
    VERSION_MARK=21
    DB_WAIT_TRIES="${SITMUN_DB_WAIT_TRIES:-300}"
    DEFAULT_URL="jdbc:oracle:thin:@//127.0.0.1:${HOST_PORT}/sitmun3"
    ;;
  postgres-12)
    IMAGE="${SITMUN_DB_IMAGE:-postgres:12-alpine}"
    HOST_PORT=54312
    CONTAINER=sitmun_test_postgres12
    ENGINE=postgres
    PROFILE=postgres
    CONFIG_DIR="$REPO_ROOT/profiles/postgres"
    DIALECT=PostgreSQLDialect
    VERSION_MARK=12
    DB_WAIT_TRIES="${SITMUN_DB_WAIT_TRIES:-60}"
    DEFAULT_URL="jdbc:postgresql://127.0.0.1:${HOST_PORT}/sitmun3"
    ;;
  postgres-16)
    IMAGE="${SITMUN_DB_IMAGE:-postgres:16-alpine}"
    HOST_PORT=54316
    CONTAINER=sitmun_test_postgres16
    ENGINE=postgres
    PROFILE=postgres
    CONFIG_DIR="$REPO_ROOT/profiles/postgres"
    DIALECT=PostgreSQLDialect
    VERSION_MARK=16
    DB_WAIT_TRIES="${SITMUN_DB_WAIT_TRIES:-60}"
    DEFAULT_URL="jdbc:postgresql://127.0.0.1:${HOST_PORT}/sitmun3"
    ;;
  *)
    echo "Unknown SITMUN_DB=$SITMUN_DB (oracle-11, oracle-19, postgres-12, postgres-16)" >&2
    exit 2
    ;;
esac

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
  if $STARTED_CONTAINER && [[ "${SITMUN_DB_KEEP:-}" != "1" ]]; then
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

dump_backend_log() {
  echo "── backend log: database errors ──"
  grep -n -E "ORA-|PSQLException|ERROR:" "$BACKEND_LOG" | cut -c1-400 | head -20 || true
  echo "── backend log: last 60 lines ──"
  tail -60 "$BACKEND_LOG" | cut -c1-400 || true
}

if [[ -z "${SITMUN_DB_URL:-}" ]]; then
  echo "── $SITMUN_DB: $IMAGE on port $HOST_PORT ──"
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker pull "$IMAGE"
  if [[ "$ENGINE" == "oracle" ]]; then
    # 11g has no pluggable database. ORACLE_DATABASE is ignored and the service is XE.
    oracle_env=(-e ORACLE_PASSWORD=password -e APP_USER="$DB_USER" -e APP_USER_PASSWORD="$DB_PASS")
    if [[ "$SITMUN_DB" != "oracle-11" ]]; then
      oracle_env+=(-e ORACLE_DATABASE=sitmun3)
    fi
    docker run -d --name "$CONTAINER" -p "${HOST_PORT}:1521" \
      "${oracle_env[@]}" \
      "$IMAGE" >/dev/null
  else
    docker run -d --name "$CONTAINER" -p "${HOST_PORT}:5432" \
      -e POSTGRES_DB=sitmun3 \
      -e POSTGRES_USER="$DB_USER" \
      -e POSTGRES_PASSWORD="$DB_PASS" \
      "$IMAGE" >/dev/null
  fi
  STARTED_CONTAINER=true

  for i in $(seq 1 "$DB_WAIT_TRIES"); do
    ready=false
    if [[ "$ENGINE" == "oracle" ]]; then
      if docker logs "$CONTAINER" 2>&1 | grep -q 'DATABASE IS READY TO USE!'; then
        ready=true
      fi
    elif docker exec "$CONTAINER" pg_isready -U "$DB_USER" -d sitmun3 -q 2>/dev/null; then
      ready=true
    fi
    if $ready; then
      echo "  Database ready after attempt $i/$DB_WAIT_TRIES"
      break
    fi
    if [[ $i -eq "$DB_WAIT_TRIES" ]]; then
      fail "$SITMUN_DB did not report ready"
      docker logs --tail 80 "$CONTAINER" 2>&1 || true
      exit 1
    fi
    echo "  Waiting for $IMAGE attempt $i/$DB_WAIT_TRIES"
    sleep 3
  done
  SITMUN_DB_URL="$DEFAULT_URL"
fi

echo ""
echo "── Backend jar ──"
(cd "$REPO_ROOT" && ./gradlew --no-daemon -q :sitmun-backend:bootJar) || { fail "bootJar failed"; exit 1; }
JAR=$(ls "$REPO_ROOT"/sitmun-backend/build/libs/*.jar | grep -v -- '-plain\.jar$' | head -1)
echo "  $JAR"

echo ""
echo "── Backend: profile $PROFILE against $SITMUN_DB_URL ──"
SITMUN_USER_SECRET='ci-db-boot-user-secret-at-least-32-chars' \
SITMUN_PROXY_MIDDLEWARE_SECRET='ci-db-boot-middleware-secret-32-chars' \
SPRING_PROFILES_ACTIVE="$PROFILE" \
SPRING_CONFIG_ADDITIONAL_LOCATION="file:${CONFIG_DIR}/" \
SPRING_DATASOURCE_URL="$SITMUN_DB_URL" \
SPRING_DATASOURCE_USERNAME="$DB_USER" \
SPRING_DATASOURCE_PASSWORD="$DB_PASS" \
SPRING_LIQUIBASE_CHANGE_LOG="file:${CONFIG_DIR}/liquibase/master.xml" \
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
  && ok "Liquibase applied $CONFIG_DIR/liquibase" || fail "Liquibase success line missing"
grep -q "Database dialect: $DIALECT" "$BACKEND_LOG" \
  && ok "Hibernate uses $DIALECT" || fail "$DIALECT not reported"
grep -q "Database version: $VERSION_MARK" "$BACKEND_LOG" \
  && ok "Hibernate reports database version $VERSION_MARK" || fail "Database version $VERSION_MARK not reported"

check_get() {
  local path="$1" code
  code=$(curl -sS -m 30 -o /dev/null -w '%{http_code}' "$BASE$path")
  if [[ "$code" == "200" ]]; then ok "GET $path -> 200"; else fail "GET $path -> $code"; fi
}

check_get /api/dashboard/health
check_get /api/dashboard/startup
# The public application list is a paged query. On 11g Hibernate pages with
# ROWNUM and dense_rank, which Oracle rejects when the select list includes a CLOB.
check_get "/api/config/client/application?page=0&size=1"
check_get "/api/config/client/application?page=1&size=1"

echo ""
echo "Results: $PASS passed, $FAIL failed"
if [[ $FAIL -gt 0 ]]; then
  dump_backend_log
  exit 1
fi
