#!/usr/bin/env python3
"""Write baseline seed SQL from tools/seed-data/baseline.

The CSV files are the source.
"""

import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import fill_vacant

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
    text = fill_vacant.baseline_translation_sql()
    if text.endswith("\n"):
        text = text[:-1]
    return text.split("\n") if text else []


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
    statements.extend(fill_vacant.baseline_literal_sql(oracle))
    # Oracle JDBC rejects a trailing semicolon (ORA-00911). Liquibase strips --end, not the semicolon.
    return [statement.rstrip(";") + "\n--end" for statement in statements]


def main():
    argparse.ArgumentParser(description=__doc__).parse_args()
    generate()


if __name__ == "__main__":
    main()
