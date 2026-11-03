#!/usr/bin/env bash
# Upgrade a tagged source database to the shipped 1.3.0 master.
# Usage: bash tools/tests/test_liquibase_upgrade_from_1.2.9.sh postgres-16 [1.2.9]
set -uo pipefail

ENGINE="${1:?usage: postgres-16|postgres-12|oracle-23|oracle-21|oracle-11 [source-tag]}"
SOURCE="${2:-1.2.9}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TAG_129="legacy/sitmun-application-stack/sitmun-application-stack/${SOURCE}"
TAG_128="legacy/sitmun-application-stack/sitmun-application-stack/1.2.8"
MASTER="$REPO_ROOT/profiles/postgres/liquibase/master.xml"
PROFILE=postgres
DB_USER=sitmun3
DB_PASS=sitmun3
BACKEND_PORT="${SITMUN_BACKEND_PORT:-9011}"
PASS=0
FAIL=0

ok() { echo "  ✓ $*"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $*"; FAIL=$((FAIL + 1)); }

case "$ENGINE" in
  postgres-16) IMAGE=postgres:16-alpine; PORT=54360; KIND=postgres; LIQUIBASE_PROFILE=postgres; SPRING_PROFILE=postgres; MASTER="$REPO_ROOT/profiles/postgres/liquibase/master.xml" ;;
  postgres-12) IMAGE=postgres:12-alpine; PORT=54361; KIND=postgres; LIQUIBASE_PROFILE=postgres; SPRING_PROFILE=postgres; MASTER="$REPO_ROOT/profiles/postgres/liquibase/master.xml" ;;
  oracle-23) IMAGE=gvenzl/oracle-free:23-slim; PORT=15230; KIND=oracle; LIQUIBASE_PROFILE=oracle; SPRING_PROFILE=oracle; MASTER="$REPO_ROOT/profiles/oracle/liquibase/master.xml" ;;
  oracle-21) IMAGE=gvenzl/oracle-xe:21-slim; PORT=15231; KIND=oracle; LIQUIBASE_PROFILE=oracle; SPRING_PROFILE=oracle; MASTER="$REPO_ROOT/profiles/oracle/liquibase/master.xml" ;;
  oracle-11) IMAGE=gvenzl/oracle-xe:11; PORT=15232; KIND=oracle11; LIQUIBASE_PROFILE=oracle; SPRING_PROFILE=oracle-11; MASTER="$REPO_ROOT/profiles/oracle/liquibase/master.xml" ;;
  *) echo "unknown engine $ENGINE" >&2; exit 2 ;;
esac

if [[ "$KIND" == "oracle11" || "$ENGINE" == "oracle-21" ]] && [[ "$(uname -s)" == "Darwin" ]]; then
  DOCKER=(colima ssh --profile oracle-xe -- sudo docker)
else
  DOCKER=(docker)
fi

CONTAINER="sitmun-upgrade-129-${ENGINE}"
NETWORK="sitmun_up_129_${ENGINE//-/}"
KEEP_DB="${SITMUN_UPGRADE_KEEP_DB:-}"
TMP="$REPO_ROOT/build/upgrade-1.2.9-$ENGINE"
BACKEND_LOG="$REPO_ROOT/build/upgrade-1.2.9-$ENGINE-backend.log"
BACKEND_PID=""

container_rm() { "${DOCKER[@]}" rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
network_rm() { "${DOCKER[@]}" network rm "$NETWORK" >/dev/null 2>&1 || true; }
stop_backend() {
  if [[ -n "$BACKEND_PID" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    BACKEND_PID=""
  fi
}
cleanup() {
  stop_backend
  if [[ -n "$KEEP_DB" && "$FAIL" == "0" ]]; then
    echo "Keeping $CONTAINER on port $PORT"
    return
  fi
  container_rm
  network_rm
}
trap cleanup EXIT

sql_count() {
  if [[ "$KIND" == "postgres" ]]; then
    "${DOCKER[@]}" exec "$CONTAINER" psql -U "$DB_USER" -d sitmun3 -tAc "$1" | tr -d '[:space:]'
  else
    local service=sitmun3
    [[ "$KIND" == "oracle11" ]] && service=XE
    printf 'SET HEADING OFF FEEDBACK OFF PAGESIZE 0\n%s;\nEXIT\n' "$1" \
      | "${DOCKER[@]}" exec -i "$CONTAINER" sqlplus -s "${DB_USER}/${DB_PASS}@//localhost:1521/${service}" \
      | tr -d '[:space:]'
  fi
}

apply_tag() {
  local tag="$1" dest="$2"
  rm -rf "$dest"
  mkdir -p "$dest"
  git -C "$REPO_ROOT" archive "$tag" "profiles/$LIQUIBASE_PROFILE/liquibase" | tar -x -C "$dest"
  local changelog="$dest/profiles/$LIQUIBASE_PROFILE/liquibase"
  # Changelog 22c does not parse before Oracle 23. Oracle 11 and 21 use the
  # pre-23 restatement, which keeps the same task and code-list rows.
  if [[ "$KIND" == "oracle11" || "$ENGINE" == "oracle-21" ]] && grep -q '22_add_map_image_task_type.yaml' "$changelog/master.xml"; then
    cp "$REPO_ROOT/tools/tests/26_map_image_task_type_pre23.yaml" "$changelog/changelog/"
    python3 - "$changelog/master.xml" <<'PY'
import pathlib, sys
path = pathlib.Path(sys.argv[1])
text = path.read_text()
text = text.replace(
    "changelog/22_add_map_image_task_type.yaml",
    "changelog/26_map_image_task_type_pre23.yaml",
)
path.write_text(text)
PY
  fi
  local url
  if [[ "$KIND" == "postgres" ]]; then
    url="jdbc:postgresql://${CONTAINER}:5432/sitmun3"
  elif [[ "$KIND" == "oracle11" ]]; then
    url="jdbc:oracle:thin:@//${CONTAINER}:1521/XE"
  else
    url="jdbc:oracle:thin:@//${CONTAINER}:1521/sitmun3"
  fi
  echo "── Liquibase $tag ──"
  local lb=( "${DOCKER[@]}" run --rm --network "$NETWORK" )
  if [[ "$KIND" == "oracle11" ]]; then
    lb+=(-e "JAVA_TOOL_OPTIONS=-Doracle.jdbc.timezoneAsRegion=false")
  fi
  "${lb[@]}" \
    -v "$changelog:/usr/src/config/liquibase:ro" \
    liquibase/liquibase:4.29 \
    --search-path=/usr/src/config/liquibase \
    --url="$url" --username="$DB_USER" --password="$DB_PASS" \
    --changeLogFile=master.xml \
    update
}

start_db() {
  container_rm
  network_rm
  "${DOCKER[@]}" network create "$NETWORK" >/dev/null
  if [[ "$KIND" == "postgres" ]]; then
    "${DOCKER[@]}" run -d --name "$CONTAINER" --network "$NETWORK" -p "${PORT}:5432" \
      -e POSTGRES_DB=sitmun3 -e POSTGRES_USER="$DB_USER" -e POSTGRES_PASSWORD="$DB_PASS" \
      "$IMAGE" >/dev/null
    # The image accepts connections once while it initializes, then restarts.
    # The second "ready" line is the server the test can write to.
    for _ in $(seq 1 60); do
      ready=$("${DOCKER[@]}" logs "$CONTAINER" 2>&1 | grep -c "database system is ready to accept connections" || true)
      if [[ "$ready" -ge 2 ]] && "${DOCKER[@]}" exec "$CONTAINER" psql -U "$DB_USER" -d sitmun3 -c 'SELECT 1' >/dev/null 2>&1; then
        return 0
      fi
      sleep 1
    done
  else
    "${DOCKER[@]}" pull "$IMAGE" >/dev/null
    local env=(-e ORACLE_PASSWORD=password -e APP_USER="$DB_USER" -e APP_USER_PASSWORD="$DB_PASS")
    if [[ "$KIND" != "oracle11" ]]; then
      env+=(-e ORACLE_DATABASE=sitmun3)
    fi
    "${DOCKER[@]}" run -d --name "$CONTAINER" --network "$NETWORK" -p "${PORT}:1521" \
      "${env[@]}" "$IMAGE" >/dev/null
    for _ in $(seq 1 180); do
      if "${DOCKER[@]}" logs "$CONTAINER" 2>&1 | grep -q "DATABASE IS READY TO USE"; then
        return 0
      fi
      sleep 10
    done
  fi
  echo "$ENGINE did not become ready" >&2
  return 1
}

boot_backend() {
  stop_backend
  local lang="${1-en}"
  local url
  if [[ "$KIND" == "postgres" ]]; then
    url="jdbc:postgresql://127.0.0.1:${PORT}/sitmun3"
  elif [[ "$KIND" == "oracle11" ]]; then
    url="jdbc:oracle:thin:@//127.0.0.1:${PORT}/XE"
  else
    url="jdbc:oracle:thin:@//127.0.0.1:${PORT}/sitmun3"
  fi
  : >"$BACKEND_LOG"
  SITMUN_USER_SECRET='ci-db-boot-user-secret-at-least-32-chars' \
  SITMUN_PROXY_MIDDLEWARE_SECRET='ci-db-boot-middleware-secret-32-chars' \
  SPRING_PROFILES_ACTIVE="$SPRING_PROFILE" \
  SPRING_CONFIG_ADDITIONAL_LOCATION="file:${REPO_ROOT}/profiles/${LIQUIBASE_PROFILE}/" \
  SPRING_DATASOURCE_URL="$url" \
  SPRING_DATASOURCE_USERNAME="$DB_USER" \
  SPRING_DATASOURCE_PASSWORD="$DB_PASS" \
  SPRING_LIQUIBASE_CHANGE_LOG="file:${MASTER}" \
  SITMUN_UPGRADE_DEFAULT_LANGUAGE="$lang" \
  SERVER_PORT="$BACKEND_PORT" \
    java -Duser.timezone=Etc/UTC -jar "$JAR" >"$BACKEND_LOG" 2>&1 &
  BACKEND_PID=$!
}

wait_health() {
  local i
  for i in $(seq 1 90); do
    if curl -fsS -m 5 "http://localhost:${BACKEND_PORT}/api/dashboard/health" >/dev/null 2>&1; then
      return 0
    fi
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
      return 1
    fi
    sleep 5
  done
  return 1
}

echo "── Build backend jar ──"
(cd "$REPO_ROOT" && ./gradlew --no-daemon -q :sitmun-backend:bootJar)
JAR=$(ls "$REPO_ROOT"/sitmun-backend/build/libs/*.jar | grep -v -- '-plain\.jar$' | head -1)

echo "── $ENGINE: a database that is not 1.2.9 must be refused ──"
start_db
if [[ "$KIND" == "postgres" ]]; then
  "${DOCKER[@]}" exec "$CONTAINER" psql -U "$DB_USER" -d sitmun3 -v ON_ERROR_STOP=1 \
    -c "CREATE TABLE stm_app (app_id integer PRIMARY KEY);"
else
  service=sitmun3
  [[ "$KIND" == "oracle11" ]] && service=XE
  printf 'CREATE TABLE stm_app (app_id NUMBER PRIMARY KEY);\nEXIT\n' \
    | "${DOCKER[@]}" exec -i "$CONTAINER" sqlplus -s "${DB_USER}/${DB_PASS}@//localhost:1521/${service}"
fi
before=0
boot_backend
refused=0
for _ in $(seq 1 40); do
  if grep -q "upgrade to 1.2.9 first" "$BACKEND_LOG"; then
    refused=1
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    break
  fi
  sleep 3
done
stop_backend
after=$(sql_count "SELECT COUNT(*) FROM databasechangelog" 2>/dev/null || echo 0)
if [[ "$refused" == "1" && "$after" == "$before" ]]; then
  ok "non-1.2.9 database refused and changelog stayed at $after rows"
else
  fail "non-1.2.9 refusal refused=$refused rows $before -> $after"
  tail -40 "$BACKEND_LOG" || true
fi

echo "── $ENGINE: 1.2.8 must be refused ──"
start_db
apply_tag "$TAG_128" "$TMP/128"
before=$(sql_count "SELECT COUNT(*) FROM databasechangelog")
boot_backend
refused=0
for _ in $(seq 1 40); do
  if grep -q "upgrade to 1.2.9 first" "$BACKEND_LOG"; then
    refused=1
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    break
  fi
  sleep 3
done
stop_backend
after=$(sql_count "SELECT COUNT(*) FROM databasechangelog")
if [[ "$refused" == "1" && "$before" == "$after" ]]; then
  ok "1.2.8 refused and changelog stayed at $after rows"
else
  fail "1.2.8 refusal refused=$refused rows $before -> $after"
  tail -40 "$BACKEND_LOG" || true
fi

schema_filename() {
  if [[ "$KIND" == "postgres" ]]; then
    echo "changelog/01_schema.postgresql.sql"
  else
    echo "changelog/01_schema.oracle.sql"
  fi
}

run_sql_file() {
  local file="$1"
  if [[ "$KIND" == "postgres" ]]; then
    "${DOCKER[@]}" exec -i "$CONTAINER" psql -U "$DB_USER" -d sitmun3 -v ON_ERROR_STOP=1 <"$file"
  else
    local service=sitmun3
    [[ "$KIND" == "oracle11" ]] && service=XE
    "${DOCKER[@]}" exec -i "$CONTAINER" bash -c "sqlplus -s ${DB_USER}/${DB_PASS}@//localhost:1521/${service}" <"$file"
  fi
}

expect_language_refusal() {
  local lang="$1" label="$2"
  local before after refused
  before=$(sql_count "SELECT COUNT(*) FROM databasechangelog")
  boot_backend "$lang"
  refused=0
  for _ in $(seq 1 40); do
    if grep -q "SITMUN_UPGRADE_DEFAULT_LANGUAGE" "$BACKEND_LOG"; then
      refused=1
      break
    fi
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
      break
    fi
    sleep 3
  done
  stop_backend
  after=$(sql_count "SELECT COUNT(*) FROM databasechangelog")
  if [[ "$refused" == "1" && "$before" == "$after" ]]; then
    ok "$label"
  else
    fail "$label refused=$refused rows $before -> $after"
    tail -40 "$BACKEND_LOG" || true
  fi
}

echo "── $ENGINE: Catalan default keeps partner text and restores in Catalan ──"
start_db
apply_tag "$TAG_129" "$TMP/129-ca"
SQLFILE="$TMP/catalan.sql"
if [[ "$KIND" == "postgres" ]]; then
  cat >"$SQLFILE" <<'EOF'
UPDATE stm_conf SET cnf_value = 'ca' WHERE cnf_name = 'language.default';
UPDATE stm_codelist SET cod_description = 'Text del soci' WHERE cod_list = 'application.type' AND cod_value = 'E';
DELETE FROM stm_codelist WHERE cod_list = 'cartography.geometryType' AND cod_value = 'LINE';
EOF
else
  cat >"$SQLFILE" <<'EOF'
UPDATE stm_conf SET cnf_value = 'ca' WHERE cnf_name = 'language.default';
UPDATE stm_codelist SET cod_description = 'Text del soci' WHERE cod_list = 'application.type' AND cod_value = 'E';
DELETE FROM stm_codelist WHERE cod_list = 'cartography.geometryType' AND cod_value = 'LINE';
COMMIT;
EXIT
EOF
fi
run_sql_file "$SQLFILE"
boot_backend ca
if wait_health; then
  ok "Catalan upgrade health is UP"
else
  fail "Catalan upgrade health did not come up"
  tail -60 "$BACKEND_LOG" || true
fi
stop_backend
system_flag="cod_system"
[[ "$KIND" != "postgres" ]] && system_flag="cod_system = 1"
partner=$(sql_count "SELECT COUNT(*) FROM stm_codelist WHERE cod_list = 'application.type' AND cod_value = 'E' AND cod_description = 'Text del soci' AND $system_flag")
restored_line=$(sql_count "SELECT COUNT(*) FROM stm_codelist WHERE cod_list = 'cartography.geometryType' AND cod_value = 'LINE' AND cod_description = 'Línia' AND $system_flag")
english_line=$(sql_count "SELECT COUNT(*) FROM stm_translation t JOIN stm_codelist c ON c.cod_id = t.tra_eleid JOIN stm_language lang ON lang.lan_id = t.tra_lanid WHERE c.cod_list = 'cartography.geometryType' AND c.cod_value = 'LINE' AND t.tra_column = 'CodeListValue.description' AND lang.lan_shortname = 'en' AND t.tra_name = 'Line'")
catalan_line=$(sql_count "SELECT COUNT(*) FROM stm_translation t JOIN stm_codelist c ON c.cod_id = t.tra_eleid JOIN stm_language lang ON lang.lan_id = t.tra_lanid WHERE c.cod_list = 'cartography.geometryType' AND c.cod_value = 'LINE' AND t.tra_column = 'CodeListValue.description' AND lang.lan_shortname = 'ca'")
if [[ "$partner" == "1" && "$restored_line" == "1" && "$english_line" == "1" && "$catalan_line" == "0" ]]; then
  ok "Catalan default kept partner text and restored LINE in Catalan"
else
  fail "Catalan default partner=$partner line=$restored_line en=$english_line ca=$catalan_line"
fi

echo "── $ENGINE: 1.2.9 upgrades ──"
start_db
apply_tag "$TAG_129" "$TMP/129"
echo "── $ENGINE: default language must be confirmed ──"
expect_language_refusal "" "missing SITMUN_UPGRADE_DEFAULT_LANGUAGE refused"
expect_language_refusal "ca" "SITMUN_UPGRADE_DEFAULT_LANGUAGE ca refused while STM_CONF is en"
SCHEMA_FILE="$(schema_filename)"
SQLFILE="$TMP/mutate.sql"
if [[ "$KIND" == "postgres" ]]; then
  cat >"$SQLFILE" <<EOF
DELETE FROM stm_codelist WHERE cod_list = 'application.type' AND cod_value = 'I';
INSERT INTO databasechangelog (id, author, filename, dateexecuted, orderexecuted, exectype, md5sum, description, liquibase, deployment_id)
SELECT 'partner-extra', 'partner', 'changelog/partner.xml', dateexecuted, 10000, 'EXECUTED', '9:partner', 'sql', liquibase, deployment_id
FROM databasechangelog WHERE orderexecuted = 1;
EOF
else
  cat >"$SQLFILE" <<EOF
DELETE FROM stm_codelist WHERE cod_list = 'application.type' AND cod_value = 'I';
INSERT INTO databasechangelog (id, author, filename, dateexecuted, orderexecuted, exectype, md5sum, description, liquibase, deployment_id)
SELECT 'partner-extra', 'partner', 'changelog/partner.xml', dateexecuted, 10000, 'EXECUTED', '9:partner', 'sql', liquibase, deployment_id
FROM databasechangelog WHERE orderexecuted = 1;
COMMIT;
EXIT
EOF
fi
run_sql_file "$SQLFILE"
old_md5=$(sql_count "SELECT md5sum FROM databasechangelog WHERE id = '1' AND filename = '${SCHEMA_FILE}'")
boot_backend
if wait_health; then
  ok "upgraded database health is UP"
else
  fail "upgraded database health did not come up"
  tail -60 "$BACKEND_LOG" || true
fi
stop_backend
if [[ "$KIND" == "postgres" ]]; then
  restored=$(sql_count "SELECT COUNT(*) FROM stm_codelist WHERE cod_list = 'application.type' AND cod_value = 'I' AND cod_system")
else
  restored=$(sql_count "SELECT COUNT(*) FROM stm_codelist WHERE cod_list = 'application.type' AND cod_value = 'I' AND cod_system = 1")
fi
if [[ "$restored" == "1" ]]; then
  ok "deleted application.type/I was restored as a system value"
else
  fail "application.type/I was not restored (count=$restored)"
fi
dangling=$(sql_count "SELECT COUNT(*) FROM stm_translation t WHERE t.tra_column = 'CodeListValue.description' AND NOT EXISTS (SELECT 1 FROM stm_codelist c WHERE c.cod_id = t.tra_eleid)")
if [[ "$dangling" == "0" ]]; then
  ok "code-list translation ids point at code-list rows"
else
  fail "dangling code-list translations: $dangling"
fi
rows_after=$(sql_count "SELECT COUNT(*) FROM databasechangelog")
new_md5=$(sql_count "SELECT md5sum FROM databasechangelog WHERE id = '1' AND filename = '${SCHEMA_FILE}'")
if [[ "$old_md5" == "$new_md5" && -n "$old_md5" ]]; then
  ok "1.2.9 schema checksum unchanged ($old_md5)"
else
  fail "1.2.9 schema checksum changed from '$old_md5' to '$new_md5'"
fi

echo "── $ENGINE: second start changes nothing ──"
boot_backend
if wait_health; then
  ok "second start health is UP"
else
  fail "second start health did not come up"
fi
stop_backend
rows_second=$(sql_count "SELECT COUNT(*) FROM databasechangelog")
md5_second=$(sql_count "SELECT md5sum FROM databasechangelog WHERE id = '1'")
if [[ "$rows_after" == "$rows_second" && "$new_md5" == "$md5_second" ]]; then
  ok "second start added no changelog rows ($rows_second)"
else
  fail "second start changed changelog $rows_after/$new_md5 -> $rows_second/$md5_second"
fi

echo "── $ENGINE: liquibase validate ──"
if [[ "$KIND" == "postgres" ]]; then
  VALIDATE_URL="jdbc:postgresql://${CONTAINER}:5432/sitmun3"
elif [[ "$KIND" == "oracle11" ]]; then
  VALIDATE_URL="jdbc:oracle:thin:@//${CONTAINER}:1521/XE"
else
  VALIDATE_URL="jdbc:oracle:thin:@//${CONTAINER}:1521/sitmun3"
fi
validate_cmd=( "${DOCKER[@]}" run --rm --network "$NETWORK" )
if [[ "$KIND" == "oracle11" ]]; then
  validate_cmd+=(-e "JAVA_TOOL_OPTIONS=-Doracle.jdbc.timezoneAsRegion=false")
fi
if "${validate_cmd[@]}" \
  -v "$REPO_ROOT/sitmun-backend/src/main/resources/db/changelog:/liquibase/changelog:ro" \
  liquibase/liquibase:4.29 \
  --search-path=/liquibase/changelog \
  --url="$VALIDATE_URL" --username="$DB_USER" --password="$DB_PASS" \
  --changeLogFile=db.changelog-master.yaml \
  validate \
  -D="upgrade.defaultLanguage=${SITMUN_UPGRADE_DEFAULT_LANGUAGE:-en}"; then
  ok "liquibase validate"
else
  fail "liquibase validate"
fi

run_required_code_lists() {
  local task url envname
  case "$ENGINE" in
    postgres-12)
      task=testRequiredCodeListsPostgres12
      envname=SITMUN_POSTGRES_URL
      url="jdbc:postgresql://127.0.0.1:${PORT}/sitmun3"
      ;;
    postgres-16)
      task=testRequiredCodeListsPostgres16
      envname=SITMUN_POSTGRES_URL
      url="jdbc:postgresql://127.0.0.1:${PORT}/sitmun3"
      ;;
    oracle-23)
      task=testRequiredCodeListsOracle23
      envname=SITMUN_ORACLE_URL
      url="jdbc:oracle:thin:@//127.0.0.1:${PORT}/sitmun3"
      ;;
    oracle-21)
      task=testRequiredCodeListsOracle19
      envname=SITMUN_ORACLE_URL
      url="jdbc:oracle:thin:@//127.0.0.1:${PORT}/sitmun3"
      ;;
    oracle-11)
      task=testRequiredCodeListsOracle11
      envname=SITMUN_ORACLE_URL
      url="jdbc:oracle:thin:@//127.0.0.1:${PORT}/XE"
      ;;
    *)
      fail "no required-code-list task for $ENGINE"
      return
      ;;
  esac
  echo "── $ENGINE: required code lists on the upgraded database ──"
  if (
    cd "$REPO_ROOT" &&
    env "$envname=$url" ./gradlew --no-daemon \
      ":sitmun-backend:${task}" \
      -Dsitmun.test.sequence-floor=false \
      -Dsitmun.test.changelog=shipped
  ); then
    ok "required code lists on the upgraded database"
  else
    fail "required code lists on the upgraded database"
  fi
}

run_required_code_lists

echo ""
echo "Results: $PASS passed, $FAIL failed"
[[ "$FAIL" == "0" ]]
