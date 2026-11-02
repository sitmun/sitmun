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
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LEGACY = ROOT / "sitmun-backend/src/main/resources/db/changelog/legacy"
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
    unions = "\n    UNION ALL\n".join(
        f"    SELECT {sql_text(i)} AS id, {sql_text(a)} AS author, {sql_text(f)} AS filename"
        for i, a, f in rows
    )
    return f"""DO $$
DECLARE
  present integer;
  shared_styles text;
  confirmed text;
  stored text;
BEGIN
  SELECT COUNT(*) INTO present
  FROM databasechangelog d
  WHERE EXISTS (
    SELECT 1 FROM (
{unions}
    ) required
    WHERE required.id = d.id
      AND required.author = d.author
      AND required.filename = d.filename
  );
  IF present = 0 THEN
    IF to_regclass('stm_app') IS NOT NULL THEN
      RAISE EXCEPTION 'upgrade to 1.2.9 first';
    END IF;
    RETURN;
  END IF;
  IF present < {len(rows)} THEN
    RAISE EXCEPTION 'upgrade to 1.2.9 first';
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


PRE23_INSTEAD_OF_22 = {
    "22_document_export_task_type",
    "22_map_image_task_type",
    "22b_map_image_task_type_seq",
    "22c_document_export_codelists",
}
PRE23_CHANGESETS = (
    ("26_document_export_task_type", "sitmun", "changelog/26_map_image_task_type_pre23.yaml"),
    ("26_map_image_task_type", "sitmun", "changelog/26_map_image_task_type_pre23.yaml"),
    ("26b_map_image_task_type_seq", "sitmun", "changelog/26_map_image_task_type_pre23.yaml"),
    ("26c_document_export_codelists", "sitmun", "changelog/26_map_image_task_type_pre23.yaml"),
)


def oracle_union(rows: list[tuple[str, str, str]]) -> str:
    return "\n    UNION ALL\n".join(
        f"    SELECT {sql_text(i)} AS id, {sql_text(a)} AS author, {sql_text(f)} AS filename FROM dual"
        for i, a, f in rows
    )


def version_check_oracle(rows: list[tuple[str, str, str]]) -> str:
    pre23 = [row for row in rows if row[0] not in PRE23_INSTEAD_OF_22]
    pre23.extend(PRE23_CHANGESETS)
    return f"""DECLARE
  present_23 NUMBER;
  present_pre23 NUMBER;
  known NUMBER;
  app_exists NUMBER;
  shared_styles VARCHAR2(4000);
  confirmed VARCHAR2(20);
  stored VARCHAR2(20);
  lang_known NUMBER;
BEGIN
  SELECT COUNT(*) INTO present_23
  FROM databasechangelog d
  WHERE EXISTS (
    SELECT 1 FROM (
{oracle_union(rows)}
    ) required
    WHERE required.id = d.id
      AND required.author = d.author
      AND required.filename = d.filename
  );
  SELECT COUNT(*) INTO present_pre23
  FROM databasechangelog d
  WHERE EXISTS (
    SELECT 1 FROM (
{oracle_union(pre23)}
    ) required
    WHERE required.id = d.id
      AND required.author = d.author
      AND required.filename = d.filename
  );
  IF present_23 = {len(rows)} OR present_pre23 = {len(pre23)} THEN
    confirmed := '${{upgrade.defaultLanguage}}';
    BEGIN
      SELECT cnf_value INTO stored FROM stm_conf WHERE cnf_name = 'language.default';
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
    SELECT COUNT(*) INTO lang_known FROM stm_language WHERE lan_shortname = confirmed;
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
    RETURN;
  END IF;
  SELECT COUNT(*) INTO known
  FROM databasechangelog d
  WHERE EXISTS (
    SELECT 1 FROM (
{oracle_union(rows)}
    UNION ALL
{oracle_union(PRE23_CHANGESETS)}
    ) required
    WHERE required.id = d.id
      AND required.author = d.author
      AND required.filename = d.filename
  );
  IF known = 0 THEN
    SELECT COUNT(*) INTO app_exists FROM user_tables WHERE table_name = 'STM_APP';
    IF app_exists > 0 THEN
      RAISE_APPLICATION_ERROR(-20001, 'upgrade to 1.2.9 first');
    END IF;
    RETURN;
  END IF;
  RAISE_APPLICATION_ERROR(-20001, 'upgrade to 1.2.9 first');
END;
"""


PROMOTED = SEED / "codelists-promoted-1.3.0.csv"
REPAIR = SEED / "translations-en-repair-1.3.0.csv"
DEFAULT_LANGUAGE = (
    "COALESCE((SELECT cnf_value FROM stm_conf WHERE cnf_name = 'language.default'), 'en')"
)


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="") as handle:
        return list(csv.DictReader(handle))


def load_promoted() -> set[tuple[str, str]]:
    return {(row["cod_list"], row["cod_value"]) for row in read_csv(PROMOTED)}


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
        row = by_key.get(key)
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
        value = sql_text(row["cod_value"])
        assignment = f"cod_system = {true}"
        if key not in promoted:
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


def translation_insert(row: dict[str, str], oracle: bool) -> str:
    column = row["tra_column"]
    element = sql_text(row["element"])
    language = sql_text(row["lan_shortname"])
    name = sql_text(row["tra_name"])
    tra_id = int(row["tra_id"])
    if column == "CodeListValue.description":
        source = "stm_codelist ele"
        where = f"ele.cod_list = {element} AND ele.cod_value = {sql_text(row['element_value'])}"
        eleid = "ele.cod_id"
    elif column == "Language.name":
        source = "stm_language ele"
        where = f"ele.lan_shortname = {element}"
        eleid = "ele.lan_id"
    elif column == "Task.name":
        source = "stm_task ele"
        where = f"ele.tas_name = {element}"
        eleid = "ele.tas_id"
    elif column == "TaskGroup.name":
        source = "stm_grp_tsk ele"
        where = f"ele.gts_name = {element}"
        eleid = "ele.gts_id"
    elif column == "TerritoryType.name":
        source = "stm_ter_typ ele"
        where = f"ele.tet_name = {element}"
        eleid = "ele.tet_id"
    else:
        raise SystemExit(f"unknown translation column {column}")
    return (
        "INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) "
        "SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM stm_translation WHERE tra_id = "
        f"{tra_id}) THEN {tra_id} ELSE COALESCE((SELECT MAX(tra_id) FROM stm_translation), 0) + 1 END, "
        f"{eleid}, {sql_text(column)}, lang.lan_id, {name} "
        f"FROM {source} "
        f"JOIN stm_language lang ON lang.lan_shortname = {language} "
        f"WHERE {where} "
        "AND NOT EXISTS (SELECT 1 FROM stm_translation t "
        f"WHERE t.tra_eleid = {eleid} AND t.tra_column = {sql_text(column)} "
        "AND t.tra_lanid = lang.lan_id) "
        f"AND {DEFAULT_LANGUAGE} <> {language}"
    )


def english_repairs() -> list[str]:
    descriptions = {
        (row["cod_list"], row["cod_value"]): row["cod_description"]
        for row in read_csv(SEED / "codelists.csv")
    }
    lines = []
    for row in read_csv(REPAIR):
        key = (row["cod_list"], row["cod_value"])
        right = descriptions.get(key)
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


def derived_english_rows() -> list[dict[str, str]]:
    codelists = read_csv(SEED / "codelists.csv")
    translations = read_csv(SEED / "translations.csv")
    description = {(row["cod_list"], row["cod_value"]): row for row in codelists}
    translated = {
        (row["element"], row["element_value"])
        for row in translations
        if row["tra_column"] == "CodeListValue.description" and row["lan_shortname"] != "en"
    }
    next_id = max(int(row["tra_id"]) for row in translations) + 1
    rows = []
    for key in sorted(translated, key=lambda item: int(description[item]["cod_id"])):
        rows.append(
            {
                "tra_id": str(next_id),
                "tra_column": "CodeListValue.description",
                "element": key[0],
                "element_value": key[1],
                "lan_shortname": "en",
                "tra_name": description[key]["cod_description"],
            }
        )
        next_id += 1
    return rows


def translations(oracle: bool) -> str:
    lines = [
        "DELETE FROM stm_translation WHERE tra_column = 'CodeListValue.description' "
        "AND NOT EXISTS (SELECT 1 FROM stm_codelist c WHERE c.cod_id = stm_translation.tra_eleid)"
    ]
    lines.extend(english_repairs())
    for row in read_csv(SEED / "translations.csv"):
        lines.append(translation_insert(row, oracle))
    for row in derived_english_rows():
        lines.append(translation_insert(row, oracle))
    return ";\n".join(lines) + ";\n"


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
    return ";\n".join(lines) + ";\n"


def main() -> None:
    LEGACY.mkdir(parents=True, exist_ok=True)
    postgres_rows = load_fixture("postgres-16.csv")
    oracle_rows = load_fixture("oracle-23.csv")
    (LEGACY / "01-version-check.postgresql.sql").write_text(version_check_postgres(postgres_rows))
    (LEGACY / "01-version-check.oracle.sql").write_text(version_check_oracle(oracle_rows))
    (LEGACY / "03-codelists.postgresql.sql").write_text(codelists(False))
    (LEGACY / "03-codelists.oracle.sql").write_text(codelists(True))
    (LEGACY / "04-translations.postgresql.sql").write_text(translations(False))
    (LEGACY / "04-translations.oracle.sql").write_text(translations(True))
    (LEGACY / "05-sequences.postgresql.sql").write_text(sequences(False))
    (LEGACY / "05-sequences.oracle.sql").write_text(sequences(True))
    print(f"wrote upgrade SQL under {LEGACY}")


if __name__ == "__main__":
    main()
