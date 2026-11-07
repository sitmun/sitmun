#!/usr/bin/env python3
"""Write the 1.2.9 upgrade SQL from the changelog fixtures and the baseline CSVs.

The schema files are handwritten. This script writes the version check, the
system code-list repair, the missing translations, and the counter advance.
The version check refuses a database that is neither empty nor 1.2.9, and a
1.2.9 database whose cartography rows share a style.
"""

from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import fill_vacant

ROOT = Path(__file__).resolve().parents[2]
LEGACY = ROOT / "sitmun-backend/src/main/resources/db/changelog/upgrade/1.2.9-to-1.3.0"
FIXTURES = ROOT / "sitmun-backend/src/test/resources/db/databasechangelog/1.2.9"
SEED = ROOT / "tools/seed-data/baseline"
FLOOR = (
    ROOT
    / "sitmun-backend/src/main/resources/db/changelog/baseline/05-sequence-floor.postgresql.sql"
)

FLOOR_ROW = re.compile(
    r"VALUES \('([A-Z0-9_]+)', \(SELECT COALESCE\(MAX\(([a-z0-9_]+)\), 0\) \+ 1 FROM ([a-z0-9_]+)\)"
)


def sql_text(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def load_fixture(name: str) -> list[tuple[str, str, str]]:
    with (FIXTURES / name).open(newline="") as handle:
        return [
            (row["id"], row["author"], row["filename"])
            for row in csv.DictReader(handle)
        ]


def version_check_postgres(rows: list[tuple[str, str, str]]) -> str:
    base, extra = split_history(rows)
    return f"""DO $$
DECLARE
  base_present integer;
  hole integer;
  shared_styles text;
  confirmed text;
  stored text;
BEGIN
  SELECT COUNT(*) INTO base_present
  FROM databasechangelog d
  WHERE
{base_match(base)};
  IF base_present = 0 THEN
    IF to_regclass('stm_app') IS NOT NULL THEN
      RAISE EXCEPTION 'upgrade to 1.2.8 first';
    END IF;
    RETURN;
  END IF;
  IF base_present < {len(base)} THEN
    RAISE EXCEPTION 'upgrade to 1.2.8 first';
  END IF;
  WITH slots(pos, filled) AS (
{slot_query(extra, "")}
  )
  SELECT COUNT(*) INTO hole
  FROM slots later
  JOIN slots earlier ON earlier.pos = later.pos - 1
  WHERE later.filled = 1 AND earlier.filled = 0;
  IF hole > 0 THEN
    RAISE EXCEPTION 'upgrade to 1.2.8 first';
  END IF;
  confirmed := '${{upgrade.defaultLanguage}}';
  SELECT cnf_value INTO stored FROM stm_conf WHERE cnf_name = 'language.default';
  IF confirmed IS NULL OR btrim(confirmed) = '' THEN
    RAISE EXCEPTION 'set SITMUN_UPGRADE_DEFAULT_LANGUAGE to the language the database text is written in, and set STM_CONF language.default to the same value';
  END IF;
  IF stored IS NULL THEN
    RAISE EXCEPTION 'STM_CONF language.default is missing and SITMUN_UPGRADE_DEFAULT_LANGUAGE is %; set STM_CONF language.default to that value', confirmed;
  END IF;
  IF stored <> confirmed THEN
    RAISE EXCEPTION 'SITMUN_UPGRADE_DEFAULT_LANGUAGE is % but STM_CONF language.default is %; fix STM_CONF or the variable', confirmed, stored;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM stm_language WHERE lan_shortname = confirmed) THEN
    RAISE EXCEPTION 'SITMUN_UPGRADE_DEFAULT_LANGUAGE % is not in STM_LANGUAGE; fix STM_CONF or the variable', confirmed;
  END IF;
  SELECT string_agg(geo_id::text, ', ' ORDER BY geo_id) INTO shared_styles
  FROM stm_geoinfo
  WHERE geo_styid IN (
    SELECT geo_styid FROM stm_geoinfo
    WHERE geo_styid IS NOT NULL
    GROUP BY geo_styid
    HAVING COUNT(*) > 1
  );
  IF shared_styles IS NOT NULL THEN
    RAISE EXCEPTION 'shared geo_styid on cartography ids %', shared_styles;
  END IF;
END $$;
"""


ONLY_129_FILES = {
    "changelog/25_fix_auth_mode_swap.yaml",
    "changelog/19_add_tree_node_default.yaml",
    "changelog/20_application_tree_order.yaml",
    "changelog/21_align_schema_with_development.yaml",
    "changelog/22_add_map_image_task_type.yaml",
    "changelog/23_add_document_export_tasks.yaml",
    "changelog/24_add_default_template_regions.yaml",
}


def split_history(
    rows: list[tuple[str, str, str]],
) -> tuple[list[tuple[str, str, str]], list[tuple[str, str, str]]]:
    base: list[tuple[str, str, str]] = []
    extra: list[tuple[str, str, str]] = []
    for row in rows:
        (extra if row[2] in ONLY_129_FILES else base).append(row)
    return base, extra


def history_accepted(present: set[tuple[str, str, str]], rows: list[tuple[str, str, str]]) -> bool:
    """Every 1.2.8 row is present, and the 1.2.9-only rows form a prefix."""
    base, extra = split_history(rows)
    if any(row not in present for row in base):
        return False
    gap = False
    for row in extra:
        if row not in present:
            gap = True
        elif gap:
            return False
    return True


def row_match(alias: str, row: tuple[str, str, str]) -> str:
    changeset_id, author, filename = row
    return (
        f"{alias}.id = {sql_text(changeset_id)} AND {alias}.author = {sql_text(author)} "
        f"AND {alias}.filename = {sql_text(filename)}"
    )


def filled_sql(row: tuple[str, str, str]) -> str:
    return f"({row_match('d', row)})"


def slot_query(extra: list[tuple[str, str, str]], from_dual: str) -> str:
    return "\n  UNION ALL\n".join(
        "  SELECT "
        f"{pos}, CASE WHEN EXISTS (SELECT 1 FROM databasechangelog d WHERE {filled_sql(row)}) "
        f"THEN 1 ELSE 0 END{from_dual}"
        for pos, row in enumerate(extra, start=1)
    )


def base_match(base: list[tuple[str, str, str]]) -> str:
    return "\n    OR ".join(f"({row_match('d', row)})" for row in base)


def version_check_oracle(rows: list[tuple[str, str, str]]) -> str:
    base, extra = split_history(rows)
    return f"""DECLARE
  base_present NUMBER;
  hole NUMBER;
  app_exists NUMBER;
  shared_styles VARCHAR2(4000);
  confirmed VARCHAR2(20);
  stored VARCHAR2(20);
  lang_known NUMBER;
BEGIN
  SELECT COUNT(*) INTO base_present
  FROM databasechangelog d
  WHERE
{base_match(base)};
  IF base_present = 0 THEN
    SELECT COUNT(*) INTO app_exists FROM user_tables WHERE table_name = 'STM_APP';
    IF app_exists > 0 THEN
      RAISE_APPLICATION_ERROR(-20001, 'upgrade to 1.2.8 first');
    END IF;
    RETURN;
  END IF;
  IF base_present < {len(base)} THEN
    RAISE_APPLICATION_ERROR(-20001, 'upgrade to 1.2.8 first');
  END IF;
  WITH slots(pos, filled) AS (
{slot_query(extra, " FROM dual")}
  )
  SELECT COUNT(*) INTO hole
  FROM slots later
  JOIN slots earlier ON earlier.pos = later.pos - 1
  WHERE later.filled = 1 AND earlier.filled = 0;
  IF hole > 0 THEN
    RAISE_APPLICATION_ERROR(-20001, 'upgrade to 1.2.8 first');
  END IF;
  confirmed := '${{upgrade.defaultLanguage}}';
  -- Dynamic SQL: a fresh database has no stm_conf or stm_language yet.
  -- Oracle compiles static queries in this block before those tables exist.
  BEGIN
    EXECUTE IMMEDIATE
      'SELECT cnf_value FROM stm_conf WHERE cnf_name = ''language.default'''
      INTO stored;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      stored := NULL;
  END;
  IF confirmed IS NULL OR LENGTH(TRIM(confirmed)) IS NULL OR LENGTH(TRIM(confirmed)) = 0 THEN
    RAISE_APPLICATION_ERROR(-20003, 'set SITMUN_UPGRADE_DEFAULT_LANGUAGE to the language the database text is written in, and set STM_CONF language.default to the same value');
  END IF;
  IF stored IS NULL THEN
    RAISE_APPLICATION_ERROR(-20003, 'STM_CONF language.default is missing and SITMUN_UPGRADE_DEFAULT_LANGUAGE is ' || confirmed || '; set STM_CONF language.default to that value');
  END IF;
  IF stored <> confirmed THEN
    RAISE_APPLICATION_ERROR(-20003, 'SITMUN_UPGRADE_DEFAULT_LANGUAGE is ' || confirmed || ' but STM_CONF language.default is ' || stored || '; fix STM_CONF or the variable');
  END IF;
  EXECUTE IMMEDIATE
    'SELECT COUNT(*) FROM stm_language WHERE lan_shortname = :confirmed'
    INTO lang_known
    USING confirmed;
  IF lang_known = 0 THEN
    RAISE_APPLICATION_ERROR(-20003, 'SITMUN_UPGRADE_DEFAULT_LANGUAGE ' || confirmed || ' is not in STM_LANGUAGE; fix STM_CONF or the variable');
  END IF;
  -- Dynamic SQL: a fresh database has no stm_geoinfo, and Oracle compiles
  -- static queries in this block before that table exists.
  EXECUTE IMMEDIATE
    'SELECT LISTAGG(geo_id, '', '') WITHIN GROUP (ORDER BY geo_id) FROM stm_geoinfo WHERE geo_styid IN (SELECT geo_styid FROM stm_geoinfo WHERE geo_styid IS NOT NULL GROUP BY geo_styid HAVING COUNT(*) > 1)'
    INTO shared_styles;
  IF shared_styles IS NOT NULL THEN
    RAISE_APPLICATION_ERROR(-20002, 'shared geo_styid on cartography ids ' || shared_styles);
  END IF;
END;
"""


PROMOTED = ROOT / "tools/seed-data/upgrade/1.2.9-to-1.3.0/codelists-promoted.csv"
REPAIR = ROOT / "tools/seed-data/upgrade/1.2.9-to-1.3.0/translations-en-repair.csv"
DEFAULT_LANGUAGE = (
    "COALESCE((SELECT cnf_value FROM stm_conf WHERE cnf_name = 'language.default'), 'en')"
)
# Current baseline value -> value still stored on a 1.2.9 database.
# 07-legend-type.sql renames it after this SQL.
LEGACY_CODE = {
    ("cartography.legendType", "LEGENDURL"): "CAPABILITIES",
}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="") as handle:
        return list(csv.DictReader(handle))


def load_promoted() -> set[tuple[str, str]]:
    return {(row["cod_list"], row["cod_value"]) for row in read_csv(PROMOTED)}


def baseline_key(code_list: str, value: str) -> tuple[str, str]:
    """Current system row for a value the upgrade SQL still names."""
    for (current_list, current_value), legacy in LEGACY_CODE.items():
        if current_list == code_list and legacy == value:
            return current_list, current_value
    return code_list, value


def written_value(code_list: str, value: str) -> str:
    """Value an old database has. A later hand changeset may rename it."""
    return LEGACY_CODE.get((code_list, value), value)


def description_sql(row: dict[str, str], translated: dict[str, str]) -> str:
    fallback = sql_text(row["cod_description"])
    arms = [
        f"WHEN {sql_text(lang)} THEN {sql_text(text)}"
        for lang, text in sorted(translated.items())
        if lang != "en"
    ]
    if not arms:
        return fallback
    return f"CASE {DEFAULT_LANGUAGE} " + " ".join(arms) + f" ELSE {fallback} END"


def codelists(oracle: bool) -> str:
    true = "1" if oracle else "true"
    false = "0" if oracle else "false"
    promoted = load_promoted()
    rows = read_csv(SEED / "codelists.csv")
    by_key = {(row["cod_list"], row["cod_value"]): row for row in rows}
    for key in sorted(promoted):
        row = by_key.get(baseline_key(*key))
        if row is None or row["cod_system"] != "true":
            raise SystemExit(f"promoted code value is not a system row: {key[0]}.{key[1]}")
    translated: dict[tuple[str, str], dict[str, str]] = {}
    for row in read_csv(SEED / "translations.csv"):
        if row["tra_column"] != "CodeListValue.description" or row["lan_shortname"] == "en":
            continue
        translated.setdefault((row["element"], row["element_value"]), {})[row["lan_shortname"]] = row["tra_name"]
    lines: list[str] = []
    for row in rows:
        if row["cod_system"] != "true":
            continue
        key = (row["cod_list"], row["cod_value"])
        flag = true if row["cod_default"] == "true" else false
        code_list = sql_text(row["cod_list"])
        emitted = written_value(*key)
        value = sql_text(emitted)
        assignment = f"cod_system = {true}"
        if (row["cod_list"], emitted) not in promoted:
            assignment += f", cod_default = {flag}"
        lines.append(
            "UPDATE stm_codelist "
            f"SET {assignment} "
            f"WHERE cod_list = {code_list} AND cod_value = {value}"
        )
        description = description_sql(row, translated.get(key, {}))
        lines.append(insert_codelist(oracle, code_list, value, true, flag, description))
    return ";\n".join(lines) + ";\n"


def insert_codelist(oracle: bool, code_list: str, value: str, system: str, flag: str, description: str) -> str:
    from_dual = " FROM dual" if oracle else ""
    return (
        "INSERT INTO stm_codelist "
        "(cod_id, cod_list, cod_value, cod_system, cod_default, cod_description) "
        "SELECT COALESCE((SELECT MAX(cod_id) FROM stm_codelist), 0) + 1, "
        f"{code_list}, {value}, {system}, {flag}, {description}{from_dual} "
        "WHERE NOT EXISTS (SELECT 1 FROM stm_codelist "
        f"WHERE cod_list = {code_list} AND cod_value = {value})"
    )


def english_repairs() -> list[str]:
    descriptions = {
        (row["cod_list"], row["cod_value"]): row["cod_description"]
        for row in read_csv(SEED / "codelists.csv")
    }
    lines = []
    for row in read_csv(REPAIR):
        key = (row["cod_list"], row["cod_value"])
        right = descriptions.get(baseline_key(*key))
        if right is None:
            raise SystemExit(f"repair row has no code value: {key[0]}.{key[1]}")
        lines.append(
            "UPDATE stm_translation SET tra_name = "
            f"{sql_text(right)} WHERE tra_column = 'CodeListValue.description' "
            f"AND tra_name = {sql_text(row['wrong'])} "
            "AND tra_lanid = (SELECT lan_id FROM stm_language WHERE lan_shortname = 'en') "
            "AND tra_eleid = (SELECT cod_id FROM stm_codelist "
            f"WHERE cod_list = {sql_text(key[0])} AND cod_value = {sql_text(key[1])})"
        )
    return lines


def translations(oracle: bool) -> str:
    del oracle  # catalog inserts are the same string in both dialect files
    lines = [
        "DELETE FROM stm_translation WHERE tra_column = 'CodeListValue.description' "
        "AND NOT EXISTS (SELECT 1 FROM stm_codelist c WHERE c.cod_id = stm_translation.tra_eleid)"
    ]
    lines.extend(english_repairs())
    return ";\n".join(lines) + ";\n" + fill_vacant.upgrade_catalog_sql(LEGACY_CODE)


def literal_values() -> str:
    return fill_vacant.upgrade_literal_sql()


def sequence_preamble() -> str:
    shipped = (LEGACY / "05-sequences.postgresql.sql").read_text()
    marker = "INSERT INTO stm_sequence"
    if marker not in shipped:
        raise SystemExit("05-sequences.postgresql.sql lost the task renumber")
    return shipped.split(marker, 1)[0]


def sequences(oracle: bool) -> str:
    pairs = FLOOR_ROW.findall(FLOOR.read_text())
    if len(pairs) < 40:
        raise SystemExit(f"expected the sequence floor rows, found {len(pairs)}")
    lines: list[str] = []
    for seq, column, table in pairs:
        if oracle:
            lines.append(
                "MERGE INTO stm_sequence t "
                f"USING (SELECT '{seq}' n, COALESCE(MAX({column}), 0) + 1 v FROM {table}) s "
                "ON (t.seq_name = s.n) "
                "WHEN MATCHED THEN UPDATE SET t.seq_count = GREATEST(t.seq_count, s.v) "
                "WHEN NOT MATCHED THEN INSERT (seq_name, seq_count) VALUES (s.n, s.v)"
            )
        else:
            lines.append(
                "INSERT INTO stm_sequence (seq_name, seq_count) "
                f"SELECT '{seq}', COALESCE((SELECT MAX({column}) FROM {table}), 0) + 1 "
                f"WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = '{seq}')"
            )
            lines.append(
                "UPDATE stm_sequence SET seq_count = GREATEST(seq_count, "
                f"COALESCE((SELECT MAX({column}) FROM {table}), 0) + 1) "
                f"WHERE seq_name = '{seq}'"
            )
    return sequence_preamble() + ";\n".join(lines) + ";\n"


CATCH_UP = LEGACY.parent / "1.2.8-to-1.2.9"
PG_WIDEN = (
    ("stm_fil_gi", "fgi_valuetype", 50),
    ("stm_geoinfo", "geo_type", 50),
    ("stm_grp_gi", "ggi_type", 50),
    ("stm_par_ser", "pse_name", 50),
    ("stm_service", "ser_protocol", 50),
    ("stm_sty_gi", "sgi_lurl_format", 255),
    ("stm_app", "app_name", 80),
    ("stm_app", "app_project", 250),
    ("stm_app", "app_type", 250),
    ("stm_geoinfo", "geo_source", 80),
    ("stm_ter_typ", "tet_name", 250),
)
ORA_WIDEN = (
    ("stm_backgrd", "bac_name", 50),
    ("stm_par_app", "pap_name", 50),
    *PG_WIDEN,
    ("stm_par_gi", "pgi_type", 250),
)
LOG_FOREIGN_KEYS = (
    ("stm_log_fk_appid", "log_appid", "stm_app", "app_id"),
    ("stm_log_fk_giid", "log_giid", "stm_geoinfo", "geo_id"),
    ("stm_log_fk_taskid", "log_taskid", "stm_task", "tas_id"),
    ("stm_log_fk_terid", "log_terid", "stm_territory", "ter_id"),
    ("stm_log_fk_userid", "log_userid", "stm_user", "use_id"),
)


DELIMITER = "@sitmun-end"


def statement(sql: str) -> str:
    if DELIMITER in sql:
        raise SystemExit("catch-up SQL contains the statement delimiter")
    return sql + "\n" + DELIMITER


def changeset(step: str, dialect: str, guards: list[str], statements: list[str]) -> str:
    dbms = "oracle" if dialect == "oracle" else "postgresql"
    schema = "changelog/01_schema.oracle.sql" if dialect == "oracle" else "changelog/01_schema.postgresql.sql"
    header = (
        f"--changeset sitmun:upgrade-1.2.8-to-1.2.9-{step}-{dbms} "
        f"dbms:{dbms} splitStatements:true endDelimiter:{DELIMITER} stripComments:false"
    )
    lines = [
        header,
        "--preconditions onFail:MARK_RAN",
        "--precondition-sql-check expectedResult:1 "
        f"SELECT COUNT(*) FROM databasechangelog WHERE id = '1' AND filename = '{schema}'",
    ]
    lines.extend(f"--precondition-sql-check expectedResult:0 {guard}" for guard in guards)
    lines.extend(statement(sql) for sql in statements)
    return "\n".join(lines)


def changelog_absent(changeset_id: str, filename: str) -> str:
    return (
        "SELECT COUNT(*) FROM databasechangelog WHERE id = "
        f"{sql_text(changeset_id)} AND author = 'sitmun' AND filename = {sql_text(filename)}"
    )


def widen_and_log_keys(oracle: bool) -> str:
    widens = ORA_WIDEN if oracle else PG_WIDEN
    if oracle:
        lines = ["DECLARE", "  width NUMBER;", "  orphans NUMBER;", "  already NUMBER;", "BEGIN"]
        for table, column, size in widens:
            lines.append(
                "  SELECT char_length INTO width FROM user_tab_columns "
                f"WHERE table_name = '{table.upper()}' AND column_name = '{column.upper()}';"
            )
            lines.append(f"  IF width IS NOT NULL AND width < {size} THEN")
            lines.append(
                "    EXECUTE IMMEDIATE "
                f"'ALTER TABLE {table} MODIFY {column} VARCHAR2({size} CHAR)';"
            )
            lines.append("  END IF;")
        for name, column, parent, parent_column in LOG_FOREIGN_KEYS:
            lines.append(
                f"  SELECT COUNT(*) INTO orphans FROM stm_log child WHERE child.{column} IS NOT NULL "
                f"AND NOT EXISTS (SELECT 1 FROM {parent} parent WHERE parent.{parent_column} = child.{column});"
            )
            lines.append("  IF orphans > 0 THEN")
            lines.append("    RAISE_APPLICATION_ERROR(-20004, 'STM_LOG orphan count ' || orphans);")
            lines.append("  END IF;")
            lines.append(
                f"  SELECT COUNT(*) INTO already FROM user_constraints WHERE constraint_name = '{name.upper()}';"
            )
            lines.append("  IF already = 0 THEN")
            lines.append(
                "    EXECUTE IMMEDIATE "
                f"'ALTER TABLE stm_log ADD CONSTRAINT {name} FOREIGN KEY ({column}) "
                f"REFERENCES {parent} ({parent_column})';"
            )
            lines.append("  END IF;")
        lines.append("END;")
        return "\n".join(lines)
    lines = ["DO $$", "DECLARE", "  width integer;", "  orphans integer;", "BEGIN"]
    for table, column, size in widens:
        lines.append(
            "  SELECT character_maximum_length INTO width FROM information_schema.columns "
            f"WHERE table_schema = 'public' AND table_name = '{table}' AND column_name = '{column}';"
        )
        lines.append(f"  IF width IS NOT NULL AND width < {size} THEN")
        lines.append(f"    ALTER TABLE {table} ALTER COLUMN {column} TYPE varchar({size});")
        lines.append("  END IF;")
    for name, column, parent, parent_column in LOG_FOREIGN_KEYS:
        lines.append(
            f"  SELECT COUNT(*) INTO orphans FROM stm_log child WHERE child.{column} IS NOT NULL "
            f"AND NOT EXISTS (SELECT 1 FROM {parent} parent WHERE parent.{parent_column} = child.{column});"
        )
        lines.append("  IF orphans > 0 THEN")
        lines.append("    RAISE EXCEPTION 'STM_LOG orphan count %', orphans;")
        lines.append("  END IF;")
        lines.append(
            "  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints "
            f"WHERE table_schema = 'public' AND constraint_name = '{name}') THEN"
        )
        lines.append(
            f"    ALTER TABLE stm_log ADD CONSTRAINT {name} FOREIGN KEY ({column}) "
            f"REFERENCES {parent} ({parent_column});"
        )
        lines.append("  END IF;")
    lines.append("END $$;")
    return "\n".join(lines)


def task_type_insert(row: dict[str, str], oracle: bool) -> str:
    enabled = ("1" if oracle else "true") if row["tty_enabled"] == "true" else ("0" if oracle else "false")
    spec = "NULL" if row["tty_spec"] == "" else sql_text(row["tty_spec"])
    parent = "NULL" if row["tty_parentid"] == "" else row["tty_parentid"]
    source = " FROM dual" if oracle else ""
    return (
        "INSERT INTO stm_tsk_typ (tty_id, tty_name, tty_title, tty_enabled, tty_parentid, tty_order, tty_spec) "
        f"SELECT {row['tty_id']}, {sql_text(row['tty_name'])}, {sql_text(row['tty_title'])}, {enabled}, "
        f"{parent}, {row['tty_order']}, {spec}{source} "
        f"WHERE NOT EXISTS (SELECT 1 FROM stm_tsk_typ WHERE tty_id = {row['tty_id']})"
    )


def sql_id(value: str) -> str:
    return "NULL" if value == "" else value


def task_insert(row: dict[str, str]) -> str:
    name = sql_text(row["tas_name"])
    task_type = row["tas_ttaskid"]
    params = sql_text(row["tas_params"])
    if task_type == "15":
        columns = "tas_id, tas_name, tas_gtaskid, tas_ttaskid, tas_params"
        values = f"next_id, {name}, {row['tas_gtaskid']}, {task_type}, {params}"
    else:
        columns = "tas_id, tas_name, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_params"
        values = (
            f"next_id, {name}, {sql_id(row['tas_gtaskid'])}, {task_type}, "
            f"{sql_id(row['tas_tuiid'])}, {params}"
        )
    return (
        f"INSERT INTO stm_task ({columns}) "
        f"SELECT {values} FROM (SELECT COALESCE(MAX(tas_id), 0) + 1 AS next_id FROM stm_task) ids "
        "WHERE NOT EXISTS (SELECT 1 FROM stm_task "
        f"WHERE tas_name = {name} AND tas_ttaskid = {task_type})"
    )


def app_tree_order(oracle: bool) -> str:
    if oracle:
        return """DECLARE
  pk_name VARCHAR2(128);
  column_count NUMBER;
  pk_columns NUMBER;
  pk_on_id NUMBER;
  nullable_flag VARCHAR2(1);
BEGIN
  SELECT COUNT(*) INTO column_count FROM user_tab_columns
  WHERE table_name = 'STM_APP_TREE' AND column_name = 'ATR_ID';
  IF column_count = 0 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE stm_app_tree ADD (atr_id NUMBER, atr_order NUMBER)';
  END IF;
  UPDATE stm_app_tree SET atr_id = (
    SELECT new_id FROM (
      SELECT atr_appid, atr_treeid, ROW_NUMBER() OVER (ORDER BY atr_appid, atr_treeid) AS new_id
      FROM stm_app_tree
    ) numbered
    WHERE numbered.atr_appid = stm_app_tree.atr_appid AND numbered.atr_treeid = stm_app_tree.atr_treeid
  ) WHERE atr_id IS NULL;
  UPDATE stm_app_tree SET atr_order = 0 WHERE atr_order IS NULL;
  SELECT constraint_name INTO pk_name FROM user_constraints
  WHERE table_name = 'STM_APP_TREE' AND constraint_type = 'P';
  SELECT COUNT(*) INTO pk_columns FROM user_cons_columns WHERE constraint_name = pk_name;
  SELECT COUNT(*) INTO pk_on_id FROM user_cons_columns
  WHERE constraint_name = pk_name AND column_name = 'ATR_ID';
  IF pk_on_id <> 1 OR pk_columns <> 1 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE stm_app_tree DROP CONSTRAINT ' || pk_name;
    SELECT nullable INTO nullable_flag FROM user_tab_columns
    WHERE table_name = 'STM_APP_TREE' AND column_name = 'ATR_ID';
    IF nullable_flag = 'Y' THEN
      EXECUTE IMMEDIATE 'ALTER TABLE stm_app_tree MODIFY atr_id NOT NULL';
    END IF;
    EXECUTE IMMEDIATE 'ALTER TABLE stm_app_tree ADD CONSTRAINT stm_atr_pk PRIMARY KEY (atr_id)';
  END IF;
  SELECT COUNT(*) INTO column_count FROM user_constraints WHERE constraint_name = 'STM_ATR_UK';
  IF column_count = 0 THEN
    EXECUTE IMMEDIATE 'ALTER TABLE stm_app_tree ADD CONSTRAINT stm_atr_uk UNIQUE (atr_appid, atr_treeid)';
  END IF;
  UPDATE stm_sequence SET seq_count = GREATEST(seq_count, (SELECT COALESCE(MAX(atr_id), 0) + 1 FROM stm_app_tree))
  WHERE seq_name = 'ATR_ID';
  INSERT INTO stm_sequence (seq_name, seq_count)
  SELECT 'ATR_ID', COALESCE((SELECT MAX(atr_id) FROM stm_app_tree), 0) + 1 FROM dual
  WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'ATR_ID');
END;"""
    return """DO $$
DECLARE
  pk_name text;
BEGIN
  ALTER TABLE stm_app_tree ADD COLUMN IF NOT EXISTS atr_id integer;
  ALTER TABLE stm_app_tree ADD COLUMN IF NOT EXISTS atr_order integer;
  UPDATE stm_app_tree SET atr_id = (
    SELECT new_id FROM (
      SELECT atr_appid, atr_treeid, ROW_NUMBER() OVER (ORDER BY atr_appid, atr_treeid) AS new_id
      FROM stm_app_tree
    ) numbered
    WHERE numbered.atr_appid = stm_app_tree.atr_appid AND numbered.atr_treeid = stm_app_tree.atr_treeid
  ) WHERE atr_id IS NULL;
  UPDATE stm_app_tree SET atr_order = 0 WHERE atr_order IS NULL;
  SELECT constraint_name INTO pk_name FROM information_schema.table_constraints
  WHERE table_schema = 'public' AND table_name = 'stm_app_tree' AND constraint_type = 'PRIMARY KEY';
  IF pk_name IS DISTINCT FROM 'stm_atr_pk' THEN
    EXECUTE 'ALTER TABLE stm_app_tree DROP CONSTRAINT ' || quote_ident(pk_name);
    ALTER TABLE stm_app_tree ALTER COLUMN atr_id SET NOT NULL;
    ALTER TABLE stm_app_tree ADD CONSTRAINT stm_atr_pk PRIMARY KEY (atr_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND constraint_name = 'stm_atr_uk'
  ) THEN
    ALTER TABLE stm_app_tree ADD CONSTRAINT stm_atr_uk UNIQUE (atr_appid, atr_treeid);
  END IF;
  UPDATE stm_sequence SET seq_count = GREATEST(seq_count, (SELECT COALESCE(MAX(atr_id), 0) + 1 FROM stm_app_tree))
  WHERE seq_name = 'ATR_ID';
  INSERT INTO stm_sequence (seq_name, seq_count)
  SELECT 'ATR_ID', COALESCE((SELECT MAX(atr_id) FROM stm_app_tree), 0) + 1
  WHERE NOT EXISTS (SELECT 1 FROM stm_sequence WHERE seq_name = 'ATR_ID');
END $$;"""


def catch_up(dialect: str) -> str:
    oracle = dialect == "oracle"
    suffix = "oracle" if oracle else "postgresql"
    tree_column = (
        "SELECT COUNT(*) FROM user_tab_columns WHERE table_name = 'STM_TREE_NOD' AND column_name = 'TNO_DEFAULT'"
        if oracle
        else "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stm_tree_nod' AND column_name = 'tno_default'"
    )
    tree_column_sql = (
        "ALTER TABLE stm_tree_nod ADD tno_default NUMBER(1,0) DEFAULT 0 NOT NULL"
        if oracle
        else "ALTER TABLE stm_tree_nod ADD COLUMN tno_default boolean DEFAULT false NOT NULL"
    )
    types = {
        row["tty_id"]: row
        for row in read_csv(SEED / "task_types.csv")
        if row["tty_id"] in {"17", "18"}
    }
    tasks = [
        row
        for row in read_csv(SEED / "tasks.csv")
        if row["tas_id"] in {"31", "32", "33", "34", "35", "36"}
    ]
    blocks = [
        "--liquibase formatted sql",
        changeset(
            "19",
            dialect,
            [
                changelog_absent(f"19-add-tno-default-{suffix}", "changelog/19_add_tree_node_default.yaml"),
                tree_column,
            ],
            [tree_column_sql],
        ),
        changeset(
            "20",
            dialect,
            [
                changelog_absent(
                    f"20_application_tree_order_{suffix}",
                    "changelog/20_application_tree_order.yaml",
                )
            ],
            [app_tree_order(oracle)],
        ),
        changeset(
            "21",
            dialect,
            [
                changelog_absent(
                    "21-align-pgi-type-oracle" if oracle else "21-align-tet-name-postgresql",
                    "changelog/21_align_schema_with_development.yaml",
                )
            ],
            [widen_and_log_keys(oracle)],
        ),
        changeset(
            "22",
            dialect,
            [changelog_absent("22_document_export_task_type", "changelog/22_add_map_image_task_type.yaml")],
            [task_type_insert(types["17"], oracle), task_type_insert(types["18"], oracle)],
        ),
        changeset(
            "22b",
            dialect,
            [changelog_absent("22b_map_image_task_type_seq", "changelog/22_add_map_image_task_type.yaml")],
            [
                "UPDATE stm_sequence SET seq_count = GREATEST(seq_count, "
                "(SELECT COALESCE(MAX(tty_id), 0) + 1 FROM stm_tsk_typ)) WHERE seq_name = 'TTY_ID'"
            ],
        ),
        changeset(
            "23",
            dialect,
            [changelog_absent("23_document_export_tasks", "changelog/23_add_document_export_tasks.yaml")],
            [task_insert(row) for row in tasks if row["tas_ttaskid"] == "17"]
            + [
                "UPDATE stm_sequence SET seq_count = GREATEST(seq_count, "
                "(SELECT COALESCE(MAX(tas_id), 0) + 1 FROM stm_task)) WHERE seq_name = 'TAS_ID'"
            ],
        ),
        changeset(
            "24",
            dialect,
            [changelog_absent("24_default_template_regions", "changelog/24_add_default_template_regions.yaml")],
            [task_insert(row) for row in tasks if row["tas_ttaskid"] == "15"]
            + [
                "UPDATE stm_sequence SET seq_count = GREATEST(seq_count, "
                "(SELECT COALESCE(MAX(tas_id), 0) + 1 FROM stm_task)) WHERE seq_name = 'TAS_ID'"
            ],
        ),
        changeset(
            "25",
            dialect,
            [changelog_absent("25-fix-auth-mode-swap", "changelog/25_fix_auth_mode_swap.yaml")],
            [
                "UPDATE stm_codelist SET cod_value = '__sitmun_tmp_auth_mode__', "
                "cod_description = '__sitmun_tmp_auth_mode__' WHERE cod_id = 53 "
                "AND cod_list = 'service.authenticationMode' AND cod_value = 'None'",
                "UPDATE stm_codelist SET cod_value = 'None', cod_description = 'None' "
                "WHERE cod_id = 54 AND cod_list = 'service.authenticationMode' "
                "AND cod_value = 'HTTP Basic authentication' AND EXISTS (SELECT 1 FROM stm_codelist t "
                "WHERE t.cod_id = 53 AND t.cod_list = 'service.authenticationMode' "
                "AND t.cod_value = '__sitmun_tmp_auth_mode__')",
                "UPDATE stm_codelist SET cod_value = 'HTTP Basic authentication', "
                "cod_description = 'HTTP Basic authentication' WHERE cod_id = 53 "
                "AND cod_list = 'service.authenticationMode' AND cod_value = '__sitmun_tmp_auth_mode__'",
            ],
        ),
        changeset(
            "admin",
            dialect,
            [],
            ["UPDATE stm_user SET use_user = 'admin' WHERE use_id = 1 AND use_user IS NULL"],
        ),
    ]
    return "\n\n".join(blocks) + "\n"


def main() -> None:
    version_check = LEGACY.parent
    version_check.mkdir(parents=True, exist_ok=True)
    LEGACY.mkdir(parents=True, exist_ok=True)
    CATCH_UP.mkdir(parents=True, exist_ok=True)
    postgres_rows = load_fixture("postgres-16.csv")
    oracle_rows = load_fixture("oracle-23.csv")
    (version_check / "00-version-check.postgresql.sql").write_text(version_check_postgres(postgres_rows))
    (version_check / "00-version-check.oracle.sql").write_text(version_check_oracle(oracle_rows))
    (CATCH_UP / "01-catch-up.postgresql.sql").write_text(catch_up("postgresql"))
    (CATCH_UP / "01-catch-up.oracle.sql").write_text(catch_up("oracle"))
    (LEGACY / "03-codelists.postgresql.sql").write_text(codelists(False))
    (LEGACY / "03-codelists.oracle.sql").write_text(codelists(True))
    (LEGACY / "04-translations.postgresql.sql").write_text(translations(False))
    (LEGACY / "04-translations.oracle.sql").write_text(translations(True))
    (LEGACY / "04b-literal-values.postgresql.sql").write_text(literal_values())
    (LEGACY / "04b-literal-values.oracle.sql").write_text(literal_values())
    (LEGACY / "05-sequences.postgresql.sql").write_text(sequences(False))
    (LEGACY / "05-sequences.oracle.sql").write_text(sequences(True))
    print(f"wrote upgrade SQL under {version_check}")


if __name__ == "__main__":
    main()
