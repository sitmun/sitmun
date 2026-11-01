#!/usr/bin/env python3
"""Write the 1.2.9 upgrade SQL from the changelog fixtures and the baseline CSVs.

The schema files are handwritten. This script writes the version check, the
system code-list repair, the missing translations, and the counter advance.
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
    RETURN;
  END IF;
  IF present < {len(rows)} THEN
    RAISE EXCEPTION 'upgrade to 1.2.9 first';
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
    RETURN;
  END IF;
  RAISE_APPLICATION_ERROR(-20001, 'upgrade to 1.2.9 first');
END;
"""


def codelists(oracle: bool) -> str:
    true = "1" if oracle else "true"
    false = "0" if oracle else "false"
    lines: list[str] = []
    with (SEED / "codelists.csv").open(newline="") as handle:
        for row in csv.DictReader(handle):
            if row["cod_system"] != "true":
                continue
            flag = true if row["cod_default"] == "true" else false
            description = sql_text(row["cod_description"])
            code_list = sql_text(row["cod_list"])
            value = sql_text(row["cod_value"])
            lines.append(
                "UPDATE stm_codelist "
                f"SET cod_system = {true}, cod_default = {flag}, cod_description = {description} "
                f"WHERE cod_list = {code_list} AND cod_value = {value}"
            )
            from_dual = " FROM dual" if oracle else ""
            lines.append(
                "INSERT INTO stm_codelist "
                "(cod_id, cod_list, cod_value, cod_system, cod_default, cod_description) "
                "SELECT COALESCE((SELECT MAX(cod_id) FROM stm_codelist), 0) + 1, "
                f"{code_list}, {value}, {true}, {flag}, {description}{from_dual} "
                "WHERE NOT EXISTS (SELECT 1 FROM stm_codelist "
                f"WHERE cod_list = {code_list} AND cod_value = {value})"
            )
    return ";\n".join(lines) + ";\n"


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
        "AND t.tra_lanid = lang.lan_id)"
    )


def translations(oracle: bool) -> str:
    lines = [
        "DELETE FROM stm_translation WHERE tra_column = 'CodeListValue.description' "
        "AND NOT EXISTS (SELECT 1 FROM stm_codelist c WHERE c.cod_id = stm_translation.tra_eleid)"
    ]
    with (SEED / "translations.csv").open(newline="") as handle:
        for row in csv.DictReader(handle):
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
