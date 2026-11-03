#!/usr/bin/env python3
"""Write baseline seed SQL from tools/seed-data/baseline.

The CSV files are the source.
"""

import argparse
import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "tools" / "seed-data" / "baseline"
BASELINE = ROOT / "sitmun-backend" / "src" / "main" / "resources" / "db" / "changelog" / "baseline"


def sql_string(value):
    return "'" + value.replace("'", "''") + "'"


def read_seed(name):
    with (SEED / name).open(newline="") as handle:
        return list(csv.DictReader(handle))


def literal(value, kind, oracle):
    if value is None or value == "":
        return "NULL"
    if kind == "bool":
        return "1" if oracle and value == "true" else "0" if oracle else value
    if kind == "text":
        return sql_string(value)
    if kind == "time":
        return f"TIMESTAMP {sql_string(value)}"
    return value


def values_insert(table, columns, row, kinds, oracle):
    rendered = ", ".join(literal(row[name], kinds[name], oracle) for name in columns)
    names = ", ".join(columns)
    return f"INSERT INTO {table} ({names}) VALUES ({rendered});"


def lookup_insert(table, columns, select_list, joins, where):
    names = ", ".join(columns)
    selected = ", ".join(select_list)
    join_sql = " ".join(joins)
    return (
        f"INSERT INTO {table} ({names}) SELECT {selected} FROM {join_sql} WHERE {where};"
    )


def derive_english_code_values(codelists, translations):
    """English code-value labels are the base description, never a stored row."""
    description = {
        (row["cod_list"], row["cod_value"]): row
        for row in codelists
    }
    translated = {
        (row["element"], row["element_value"])
        for row in translations
        if row["tra_column"] == "CodeListValue.description" and row["lan_shortname"] != "en"
    }
    stored_english = [
        row
        for row in translations
        if row["tra_column"] == "CodeListValue.description" and row["lan_shortname"] == "en"
    ]
    if stored_english:
        raise SystemExit("translations.csv stores English code-value rows; derive them instead")
    next_id = max(int(row["tra_id"]) for row in translations) + 1
    derived = []
    for key in sorted(translated, key=lambda item: int(description[item]["cod_id"])):
        derived.append(
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
    return translations + derived


def codelist_statements(oracle):
    codelists = read_seed("codelists.csv")
    return [
        values_insert(
            "stm_codelist",
            ["cod_id", "cod_list", "cod_value", "cod_system", "cod_default", "cod_description"],
            row,
            {
                "cod_id": "num",
                "cod_list": "text",
                "cod_value": "text",
                "cod_system": "bool",
                "cod_default": "bool",
                "cod_description": "text",
            },
            oracle,
        )
        for row in codelists
    ]


def translation_statements():
    rows = derive_english_code_values(read_seed("codelists.csv"), read_seed("translations.csv"))
    return [translation_statement(row) for row in rows]


def generate():
    languages = read_seed("languages.csv")
    for oracle, suffix in ((False, "postgresql"), (True, "oracle")):
        language_sql = [
            values_insert(
                "stm_language",
                ["lan_id", "lan_shortname", "lan_name", "lan_order", "lan_enabled"],
                row,
                {
                    "lan_id": "num",
                    "lan_shortname": "text",
                    "lan_name": "text",
                    "lan_order": "num",
                    "lan_enabled": "bool",
                },
                oracle,
            )
            for row in languages
        ]
        (BASELINE / f"03-languages.{suffix}.sql").write_text("\n".join(language_sql) + "\n")
        (BASELINE / f"02-codelists.{suffix}.sql").write_text("\n".join(codelist_statements(oracle)) + "\n")

    (BASELINE / "04-translations.sql").write_text("\n".join(translation_statements()) + "\n")

    seed_pg = seed_statements(False)
    seed_ora = seed_statements(True)
    (BASELINE / "06-seed.postgresql.sql").write_text("\n".join(seed_pg) + "\n")
    (BASELINE / "06-seed.oracle.sql").write_text("\n".join(seed_ora) + "\n")
    print("generated baseline SQL")


def translation_statement(row):
    name = sql_string(row["tra_name"])
    column = sql_string(row["tra_column"])
    language = sql_string(row["lan_shortname"])
    tra_id = row["tra_id"]
    if row["tra_column"] == "Language.name":
        element = sql_string(row["element"])
        return (
            "INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) "
            f"SELECT {tra_id}, ele.lan_id, {column}, lang.lan_id, {name} "
            "FROM stm_language ele JOIN stm_language lang ON lang.lan_shortname = "
            f"{language} WHERE ele.lan_shortname = {element};"
        )
    if row["tra_column"] == "CodeListValue.description":
        cod_list = sql_string(row["element"])
        cod_value = sql_string(row["element_value"])
        return (
            "INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) "
            f"SELECT {tra_id}, c.cod_id, {column}, lang.lan_id, {name} "
            "FROM stm_codelist c JOIN stm_language lang ON lang.lan_shortname = "
            f"{language} WHERE c.cod_list = {cod_list} AND c.cod_value = {cod_value};"
        )
    table, id_column, name_column = {
        "Task.name": ("stm_task", "tas_id", "tas_name"),
        "TerritoryType.name": ("stm_ter_typ", "tet_id", "tet_name"),
        "TaskGroup.name": ("stm_grp_tsk", "gts_id", "gts_name"),
    }[row["tra_column"]]
    element = sql_string(row["element"])
    return (
        "INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) "
        f"SELECT {tra_id}, entity.{id_column}, {column}, lang.lan_id, {name} "
        f"FROM {table} entity JOIN stm_language lang ON lang.lan_shortname = {language} "
        f"WHERE entity.{name_column} = {element};"
    )


def seed_statements(oracle):
    statements = []
    bool_kind = "bool"
    for row in read_seed("task_types.csv"):
        statements.append(
            values_insert(
                "stm_tsk_typ",
                ["tty_id", "tty_name", "tty_title", "tty_enabled", "tty_parentid", "tty_order", "tty_spec"],
                row,
                {
                    "tty_id": "num",
                    "tty_name": "text",
                    "tty_title": "text",
                    "tty_enabled": bool_kind,
                    "tty_parentid": "num",
                    "tty_order": "num",
                    "tty_spec": "text",
                },
                oracle,
            )
        )
    for row in read_seed("territory_types.csv"):
        statements.append(
            values_insert(
                "stm_ter_typ",
                ["tet_id", "tet_name", "tet_official", "tet_top", "tet_bottom"],
                row,
                {
                    "tet_id": "num",
                    "tet_name": "text",
                    "tet_official": bool_kind,
                    "tet_top": bool_kind,
                    "tet_bottom": bool_kind,
                },
                oracle,
            )
        )
    for row in read_seed("task_groups.csv"):
        statements.append(
            values_insert(
                "stm_grp_tsk",
                ["gts_id", "gts_name"],
                row,
                {"gts_id": "num", "gts_name": "text"},
                oracle,
            )
        )
    for row in read_seed("task_ui.csv"):
        statements.append(
            values_insert(
                "stm_tsk_ui",
                ["tui_id", "tui_name", "tui_tooltip", "tui_order", "tui_type"],
                row,
                {
                    "tui_id": "num",
                    "tui_name": "text",
                    "tui_tooltip": "text",
                    "tui_order": "num",
                    "tui_type": "text",
                },
                oracle,
            )
        )
    for row in read_seed("users.csv"):
        statements.append(
            values_insert(
                "stm_user",
                [
                    "use_id",
                    "use_user",
                    "use_pwd",
                    "use_name",
                    "use_surname",
                    "use_ident",
                    "use_identtype",
                    "use_email",
                    "use_adm",
                    "use_blocked",
                    "use_created",
                    "use_updated",
                    "use_last_password_change",
                ],
                row,
                {
                    "use_id": "num",
                    "use_user": "text",
                    "use_pwd": "text",
                    "use_name": "text",
                    "use_surname": "text",
                    "use_ident": "text",
                    "use_identtype": "text",
                    "use_email": "text",
                    "use_adm": bool_kind,
                    "use_blocked": bool_kind,
                    "use_created": "time",
                    "use_updated": "time",
                    "use_last_password_change": "time",
                },
                oracle,
            )
        )
    for row in read_seed("tasks.csv"):
        statements.append(
            values_insert(
                "stm_task",
                [
                    "tas_id",
                    "tas_name",
                    "tas_created",
                    "tas_order",
                    "tas_giid",
                    "tas_serid",
                    "tas_gtaskid",
                    "tas_ttaskid",
                    "tas_tuiid",
                    "tas_connid",
                    "tas_params",
                ],
                row,
                {
                    "tas_id": "num",
                    "tas_name": "text",
                    "tas_created": "time",
                    "tas_order": "num",
                    "tas_giid": "num",
                    "tas_serid": "num",
                    "tas_gtaskid": "num",
                    "tas_ttaskid": "num",
                    "tas_tuiid": "num",
                    "tas_connid": "num",
                    "tas_params": "text",
                },
                oracle,
            )
        )
    for row in read_seed("configuration.csv"):
        statements.append(
            values_insert(
                "stm_conf",
                ["cnf_id", "cnf_name", "cnf_value"],
                row,
                {"cnf_id": "num", "cnf_name": "text", "cnf_value": "text"},
                oracle,
            )
        )
    for row in read_seed("literal_translations.csv"):
        literal_text = sql_string(row["ltr_literal"])
        shortname = sql_string(row["lan_shortname"])
        statements.append(
            "INSERT INTO stm_literal_translation (ltr_id, ltr_literal, ltr_lanid) "
            f"SELECT {row['ltr_id']}, {literal_text}, lang.lan_id "
            f"FROM stm_language lang WHERE lang.lan_shortname = {shortname};"
        )
    for row in read_seed("literal_translation_values.csv"):
        value = sql_string(row["ltv_value"])
        shortname = sql_string(row["lan_shortname"])
        statements.append(
            "INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) "
            f"SELECT {row['ltv_id']}, {row['ltr_id']}, lang.lan_id, {value} "
            f"FROM stm_language lang WHERE lang.lan_shortname = {shortname};"
        )
    # Oracle JDBC rejects a trailing semicolon (ORA-00911). Liquibase strips --end, not the semicolon.
    return [statement.rstrip(";") + "\n--end" for statement in statements]


def main():
    argparse.ArgumentParser(description=__doc__).parse_args()
    generate()


if __name__ == "__main__":
    main()
