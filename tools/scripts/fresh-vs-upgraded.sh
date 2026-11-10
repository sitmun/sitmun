# Sourced by compare-schema-drift.sh. Builds a fresh 1.3.0 database and a
# 1.2.9 database upgraded with the shipped master, then diffs them.

run_fresh_vs_upgraded() {
  local engine="$1"
  local source_tag="${2:-1.2.9}"
  local image port kind profile service
  local use_colima=0
  case "$engine" in
    postgres-16) image=postgres:16-alpine; port=54370; kind=postgres; profile=postgres ;;
    postgres-12) image=postgres:12-alpine; port=54371; kind=postgres; profile=postgres ;;
    oracle-23) image=gvenzl/oracle-free:23-slim; port=15240; kind=oracle; profile=oracle; service=sitmun3 ;;
    oracle-21) image=gvenzl/oracle-xe:21-slim; port=15241; kind=oracle; profile=oracle; service=sitmun3; use_colima=1 ;;
    oracle-11) image=gvenzl/oracle-xe:11; port=15242; kind=oracle11; profile=oracle; service=XE; use_colima=1 ;;
    *) echo "unknown engine $engine" >&2; return 2 ;;
  esac

  local container="sitmun-fvu-${engine}"
  local network="sitmun_fvu_${engine//-/}"
  local out="${OUT_ROOT}/fresh-vs-upgraded/${engine}"
  local src="$REPO_ROOT/build/fvu-${engine}"
  local tag="legacy/sitmun-application-stack/sitmun-application-stack/${source_tag}"
  local shipped="$REPO_ROOT/sitmun-backend/src/main/resources/db/changelog"
  rm -rf "$out" "$src"
  mkdir -p "$out" "$src"
  git -C "$REPO_ROOT" archive "$tag" "profiles/${profile}/liquibase" | tar -x -C "$src"
  local changelog="$src/profiles/${profile}/liquibase"

  if [[ "$use_colima" == "1" && "$(uname -s)" == "Darwin" ]]; then
    docker() { colima ssh --profile oracle-xe -- sudo docker "$@"; }
  fi

  docker rm -f "$container" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  docker network create "$network" >/dev/null
  if [[ "$kind" == "postgres" ]]; then
    docker run -d --name "$container" --network "$network" -p "${port}:5432" \
      -e POSTGRES_USER=sitmun3 -e POSTGRES_PASSWORD=sitmun3 -e POSTGRES_DB=sitmun3 \
      "$image" >/dev/null
    local _
    for _ in $(seq 1 60); do
      docker exec "$container" pg_isready -U sitmun3 -d sitmun3 -q && break
      sleep 1
    done
  else
    local -a env=(-e ORACLE_PASSWORD=password -e APP_USER=sitmun3 -e APP_USER_PASSWORD=sitmun3)
    if [[ "$kind" != "oracle11" ]]; then
      env+=(-e ORACLE_DATABASE=sitmun3)
    fi
    docker run -d --name "$container" --network "$network" -p "${port}:1521" \
      "${env[@]}" "$image" >/dev/null
    echo "waiting for $engine"
    local ready=0
    for _ in $(seq 1 180); do
      if docker logs "$container" 2>&1 | grep -q "DATABASE IS READY TO USE"; then
        ready=1
        break
      fi
      sleep 10
    done
    [[ "$ready" == "1" ]]
  fi

  liquibase_on() {
    local dir="$1" file="$2"
    local -a cmd=(docker run --rm --network "$network")
    if [[ "$kind" == "oracle11" ]]; then
      cmd+=(-e "JAVA_TOOL_OPTIONS=-Doracle.jdbc.timezoneAsRegion=false")
    fi
    local url
    if [[ "$kind" == "postgres" ]]; then
      url="jdbc:postgresql://${container}:5432/sitmun3"
    elif [[ "$kind" == "oracle11" ]]; then
      url="jdbc:oracle:thin:@//${container}:1521/XE"
    else
      url="jdbc:oracle:thin:@//${container}:1521/sitmun3"
    fi
    "${cmd[@]}" -v "$dir:/liquibase/changelog:ro" liquibase/liquibase:4.29 \
      --search-path=/liquibase/changelog \
      --url="$url" --username=sitmun3 --password=sitmun3 \
      --changeLogFile="$file" update \
      -D=upgrade.defaultLanguage=en
  }

  reset_user_tables() {
    if [[ "$kind" == "postgres" ]]; then
      docker exec "$container" psql -U sitmun3 -d sitmun3 -v ON_ERROR_STOP=1 -c \
        "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO sitmun3;" >/dev/null
      return
    fi
    local connect="sitmun3/sitmun3@//localhost:1521/${service}"
    cat > "$out/reset.sql" <<'SQL'
BEGIN
  FOR t IN (SELECT table_name FROM user_tables) LOOP
    EXECUTE IMMEDIATE 'DROP TABLE "' || t.table_name || '" CASCADE CONSTRAINTS PURGE';
  END LOOP;
  FOR s IN (SELECT sequence_name FROM user_sequences) LOOP
    EXECUTE IMMEDIATE 'DROP SEQUENCE "' || s.sequence_name || '"';
  END LOOP;
END;
/
PURGE RECYCLEBIN;
EXIT
SQL
    docker exec -i "$container" sqlplus -s "$connect" < "$out/reset.sql" >/dev/null
  }

  dump_side() {
    local side="$1"
    local prefix="$out/$side"
    if [[ "$kind" == "postgres" ]]; then
      dump_pg_schema "$container" sitmun3 sitmun3 "$prefix"
      docker exec "$container" psql -U sitmun3 -d sitmun3 -v ON_ERROR_STOP=1 -At -F '|' -c \
        "SELECT cod_list, cod_value, CASE WHEN cod_default THEN 'true' ELSE 'false' END FROM stm_codelist WHERE cod_system ORDER BY 1, 2" \
        > "${prefix}.codelists"
      docker exec "$container" psql -U sitmun3 -d sitmun3 -v ON_ERROR_STOP=1 -At -c \
        "SELECT COUNT(*) FROM stm_translation t WHERE t.tra_column = 'CodeListValue.description' AND NOT EXISTS (SELECT 1 FROM stm_codelist c WHERE c.cod_id = t.tra_eleid)" \
        > "${prefix}.integrity"
      docker exec "$container" psql -U sitmun3 -d sitmun3 -v ON_ERROR_STOP=1 -At -F '|' -c \
        "SELECT cnf_name, cnf_value FROM stm_conf ORDER BY 1" \
        > "${prefix}.configuration"
    else
      dump_oracle_schema "$container" sitmun3 sitmun3 "$service" "$prefix"
      local connect="sitmun3/sitmun3@//localhost:1521/${service}"
      docker exec "$container" bash -c "echo \"
SET PAGESIZE 0 FEEDBACK OFF HEADING OFF LINESIZE 400 TRIMSPOOL ON
SELECT cod_list||'|'||cod_value||'|'||CASE cod_default WHEN 1 THEN 'true' ELSE 'false' END
FROM stm_codelist WHERE cod_system = 1 ORDER BY cod_list, cod_value;
EXIT
\" | sqlplus -s ${connect}" | sed '/^$/d' > "${prefix}.codelists"
      docker exec "$container" bash -c "echo \"
SET PAGESIZE 0 FEEDBACK OFF HEADING OFF LINESIZE 40 TRIMSPOOL ON
SELECT COUNT(*) FROM stm_translation t WHERE t.tra_column = 'CodeListValue.description' AND NOT EXISTS (SELECT 1 FROM stm_codelist c WHERE c.cod_id = t.tra_eleid);
EXIT
\" | sqlplus -s ${connect}" | tr -d '[:space:]' > "${prefix}.integrity"
      echo >> "${prefix}.integrity"
      docker exec "$container" bash -c "echo \"
SET PAGESIZE 0 FEEDBACK OFF HEADING OFF LINESIZE 400 TRIMSPOOL ON
SELECT cnf_name||'|'||cnf_value FROM stm_conf ORDER BY cnf_name;
EXIT
\" | sqlplus -s ${connect}" | sed '/^$/d' > "${prefix}.configuration"
    fi
  }

  echo "── $engine fresh 1.3.0 ──"
  liquibase_on "$shipped" db.changelog-master.yaml
  dump_side fresh

  echo "── $engine 1.2.9 upgraded ──"
  reset_user_tables
  liquibase_on "$changelog" master.xml
  liquibase_on "$shipped" db.changelog-master.yaml
  dump_side upgraded

  local rc=0
  python3 "$REPO_ROOT/tools/bin/compare_fresh_vs_upgraded.py" "$out" || rc=$?
  if [[ "$rc" != "0" ]]; then
    unset -f docker 2>/dev/null || true
    return "$rc"
  fi

  if [[ "${FVU_PROVE_RED:-}" == "1" ]]; then
    echo "── $engine deliberate gap ──"
    if [[ "$kind" == "postgres" ]]; then
      docker exec "$container" psql -U sitmun3 -d sitmun3 -v ON_ERROR_STOP=1 -c \
        "DELETE FROM stm_codelist WHERE cod_list = 'application.type' AND cod_value = 'I'" >/dev/null
    else
      local connect="sitmun3/sitmun3@//localhost:1521/${service}"
      docker exec "$container" bash -c "echo \"
DELETE FROM stm_codelist WHERE cod_list = 'application.type' AND cod_value = 'I';
COMMIT;
EXIT
\" | sqlplus -s ${connect}" >/dev/null
    fi
    dump_side upgraded
    if python3 "$REPO_ROOT/tools/bin/compare_fresh_vs_upgraded.py" "$out"; then
      echo "gate stayed green after deleting application.type/I" >&2
      unset -f docker 2>/dev/null || true
      return 1
    fi
    echo "gate went red after deleting application.type/I"
  fi

  docker rm -f "$container" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  unset -f docker 2>/dev/null || true
  return 0
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  engine="${1:?usage: $0 postgres-16|postgres-12|oracle-23|oracle-21|oracle-11 [source-tag]}"
  source_tag="${2:-1.2.9}"
  exec bash "$(cd "$(dirname "$0")" && pwd)/compare-schema-drift.sh" fresh-vs-upgraded "$engine" "$source_tag"
fi
