#!/usr/bin/env python3
"""Write baseline seed SQL from tools/seed-data/baseline.

The CSV files are the source. --import-database builds them once from the
current baseline SQL plus the production end state in sitmun_test_postgres12.
"""

import csv
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "tools" / "seed-data" / "baseline"
BASELINE = ROOT / "sitmun-backend" / "src" / "main" / "resources" / "db" / "changelog" / "baseline"

LAN_IDS = {}


def sql_string(value):
    return "'" + value.replace("'", "''") + "'"


def read_sql_string(text, index):
    if text[index] != "'":
        raise ValueError(text[index : index + 20])
    index += 1
    chars = []
    while index < len(text):
        if text[index] == "'":
            if index + 1 < len(text) and text[index + 1] == "'":
                chars.append("'")
                index += 2
                continue
            return "".join(chars), index + 1
        chars.append(text[index])
        index += 1
    raise ValueError("unterminated string")


def skip_ws(text, index):
    while index < len(text) and text[index] in " \t\r\n":
        index += 1
    return index


def psql_copy(query):
    sql = f"COPY ({query}) TO STDOUT WITH (FORMAT CSV, HEADER true)"
    completed = subprocess.run(
        [
            "docker",
            "exec",
            "-i",
            "sitmun_test_postgres12",
            "psql",
            "-U",
            "sitmun3",
            "-d",
            "sitmun3",
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
            sql,
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return list(csv.DictReader(completed.stdout.splitlines()))


def write_csv(name, fieldnames, rows):
    SEED.mkdir(parents=True, exist_ok=True)
    path = SEED / name
    with path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    print(f"wrote {path.relative_to(ROOT)} ({len(rows)} rows)")


def parse_languages():
    text = (BASELINE / "03-languages.postgresql.sql").read_text()
    rows = []
    marker = "VALUES ("
    index = 0
    while True:
        found = text.find(marker, index)
        if found < 0:
            break
        if "stm_sequence" in text[max(0, found - 80) : found]:
            index = found + len(marker)
            continue
        index = found + len(marker)
        lan_id = text[index : text.find(",", index)].strip()
        index = text.find(",", index) + 1
        index = skip_ws(text, index)
        shortname, index = read_sql_string(text, index)
        index = skip_ws(text, text.find(",", index) + 1)
        name, index = read_sql_string(text, index)
        index = text.find(",", index) + 1
        order = text[index : text.find(",", index)].strip()
        index = text.find(",", index) + 1
        enabled = text[index : text.find(")", index)].strip()
        rows.append(
            {
                "lan_id": lan_id,
                "lan_shortname": shortname,
                "lan_name": name,
                "lan_order": order,
                "lan_enabled": enabled,
            }
        )
        LAN_IDS[lan_id] = shortname
    return rows


def parse_codelists():
    text = (BASELINE / "02-codelists.postgresql.sql").read_text()
    rows = []
    marker = "VALUES ("
    index = 0
    while True:
        found = text.find(marker, index)
        if found < 0:
            break
        if "stm_sequence" in text[max(0, found - 80) : found]:
            index = found + len(marker)
            continue
        index = found + len(marker)
        cod_id = text[index : text.find(",", index)].strip()
        index = text.find(",", index) + 1
        index = skip_ws(text, index)
        cod_list, index = read_sql_string(text, index)
        index = skip_ws(text, text.find(",", index) + 1)
        cod_value, index = read_sql_string(text, index)
        index = text.find(",", index) + 1
        system = text[index : text.find(",", index)].strip()
        index = text.find(",", index) + 1
        default = text[index : text.find(",", index)].strip()
        index = skip_ws(text, text.find(",", index) + 1)
        description, index = read_sql_string(text, index)
        rows.append(
            {
                "cod_id": cod_id,
                "cod_list": cod_list,
                "cod_value": cod_value,
                "cod_system": system,
                "cod_default": default,
                "cod_description": description,
            }
        )
    return rows


def parse_translations():
    text = (BASELINE / "04-translations.sql").read_text()
    rows = []
    marker = "SELECT "
    index = 0
    while True:
        found = text.find(marker, index)
        if found < 0:
            break
        if "COALESCE" in text[found : found + 40]:
            break
        index = found + len(marker)
        tra_id = text[index : text.find(",", index)].strip()
        index = text.find("'", index)
        column, index = read_sql_string(text, index)
        index = text.find(",", index) + 1
        lan_id = text[index : text.find(",", index)].strip()
        index = skip_ws(text, text.find(",", index) + 1)
        name, index = read_sql_string(text, index)
        if column == "Language.name":
            element_at = text.find("lan_shortname = ", index)
            element, index = read_sql_string(text, text.find("'", element_at))
            element_value = ""
        elif column == "CodeListValue.description":
            list_at = text.find("cod_list = ", index)
            element, index = read_sql_string(text, text.find("'", list_at))
            value_at = text.find("cod_value = ", index)
            element_value, index = read_sql_string(text, text.find("'", value_at))
        else:
            raise ValueError(column)
        rows.append(
            {
                "tra_id": tra_id,
                "tra_column": column,
                "element": element,
                "element_value": element_value,
                "lan_shortname": LAN_IDS[lan_id],
                "tra_name": name,
            }
        )
    return rows


def translation_key(row):
    return (row["tra_column"], row["element"], row["element_value"], row["lan_shortname"])


def import_database():
    languages = parse_languages()
    write_csv(
        "languages.csv",
        ["lan_id", "lan_shortname", "lan_name", "lan_order", "lan_enabled"],
        languages,
    )
    codelists = parse_codelists()
    known = {(row["cod_list"], row["cod_value"]) for row in codelists}
    next_cod_id = max(int(row["cod_id"]) for row in codelists) + 1
    production_codes = psql_copy(
        """
        SELECT cod_list, cod_value,
               CASE WHEN cod_system THEN 'true' ELSE 'false' END AS cod_system,
               CASE WHEN cod_default THEN 'true' ELSE 'false' END AS cod_default,
               cod_description
        FROM stm_codelist
        ORDER BY cod_list, cod_value
        """
    )
    for row in production_codes:
        if (row["cod_list"], row["cod_value"]) in known:
            continue
        codelists.append(
            {
                "cod_id": str(next_cod_id),
                "cod_list": row["cod_list"],
                "cod_value": row["cod_value"],
                "cod_system": row["cod_system"],
                "cod_default": row["cod_default"],
                "cod_description": row["cod_description"],
            }
        )
        next_cod_id += 1
    codelists.sort(key=lambda row: int(row["cod_id"]))
    write_csv(
        "codelists.csv",
        ["cod_id", "cod_list", "cod_value", "cod_system", "cod_default", "cod_description"],
        codelists,
    )

    translations = parse_translations()
    known_translations = {translation_key(row) for row in translations}
    next_tra_id = max(int(row["tra_id"]) for row in translations) + 1
    production_translations = psql_copy(
        """
        SELECT tr.tra_column,
               CASE tr.tra_column
                 WHEN 'Language.name' THEN ele.lan_shortname
                 WHEN 'CodeListValue.description' THEN c.cod_list
                 WHEN 'Task.name' THEN task.tas_name
                 WHEN 'TerritoryType.name' THEN territory.tet_name
                 WHEN 'TaskGroup.name' THEN grp.gts_name
               END AS element,
               CASE WHEN tr.tra_column = 'CodeListValue.description' THEN c.cod_value ELSE '' END AS element_value,
               lang.lan_shortname,
               tr.tra_name
        FROM stm_translation tr
        JOIN stm_language lang ON lang.lan_id = tr.tra_lanid
        LEFT JOIN stm_language ele ON tr.tra_column = 'Language.name' AND ele.lan_id = tr.tra_eleid
        LEFT JOIN stm_codelist c ON tr.tra_column = 'CodeListValue.description' AND c.cod_id = tr.tra_eleid
        LEFT JOIN stm_task task ON tr.tra_column = 'Task.name' AND task.tas_id = tr.tra_eleid
        LEFT JOIN stm_ter_typ territory ON tr.tra_column = 'TerritoryType.name' AND territory.tet_id = tr.tra_eleid
        LEFT JOIN stm_grp_tsk grp ON tr.tra_column = 'TaskGroup.name' AND grp.gts_id = tr.tra_eleid
        ORDER BY tr.tra_column, 2, 3, lang.lan_shortname
        """
    )
    for row in production_translations:
        if not row["element"]:
            raise SystemExit(f"translation without an element: {row}")
        item = {
            "tra_id": "",
            "tra_column": row["tra_column"],
            "element": row["element"],
            "element_value": row["element_value"],
            "lan_shortname": row["lan_shortname"],
            "tra_name": row["tra_name"],
        }
        if translation_key(item) in known_translations:
            continue
        item["tra_id"] = str(next_tra_id)
        next_tra_id += 1
        translations.append(item)
        known_translations.add(translation_key(item))
    translations.sort(key=lambda row: int(row["tra_id"]))
    write_csv(
        "translations.csv",
        ["tra_id", "tra_column", "element", "element_value", "lan_shortname", "tra_name"],
        translations,
    )

    copy_table(
        "task_types.csv",
        ["tty_id", "tty_name", "tty_title", "tty_enabled", "tty_parentid", "tty_order", "tty_spec"],
        """
        SELECT tty_id, tty_name, tty_title,
               CASE WHEN tty_enabled THEN 'true' ELSE 'false' END AS tty_enabled,
               tty_parentid, tty_order, tty_spec
        FROM stm_tsk_typ ORDER BY tty_id
        """,
    )
    copy_table(
        "territory_types.csv",
        ["tet_id", "tet_name", "tet_official", "tet_top", "tet_bottom"],
        """
        SELECT tet_id, tet_name,
               CASE WHEN tet_official THEN 'true' ELSE 'false' END AS tet_official,
               CASE WHEN tet_top THEN 'true' ELSE 'false' END AS tet_top,
               CASE WHEN tet_bottom THEN 'true' ELSE 'false' END AS tet_bottom
        FROM stm_ter_typ ORDER BY tet_id
        """,
    )
    copy_table(
        "task_groups.csv",
        ["gts_id", "gts_name"],
        "SELECT gts_id, gts_name FROM stm_grp_tsk ORDER BY gts_id",
    )
    copy_table(
        "task_ui.csv",
        ["tui_id", "tui_name", "tui_tooltip", "tui_order", "tui_type"],
        "SELECT tui_id, tui_name, tui_tooltip, tui_order, tui_type FROM stm_tsk_ui ORDER BY tui_id",
    )
    copy_table(
        "users.csv",
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
        """
        SELECT use_id, use_user, use_pwd, use_name, use_surname, use_ident, use_identtype, use_email,
               CASE WHEN use_adm THEN 'true' ELSE 'false' END AS use_adm,
               CASE WHEN use_blocked THEN 'true' ELSE 'false' END AS use_blocked,
               to_char(use_created, 'YYYY-MM-DD HH24:MI:SS') AS use_created,
               to_char(use_updated, 'YYYY-MM-DD HH24:MI:SS') AS use_updated,
               to_char(use_last_password_change, 'YYYY-MM-DD HH24:MI:SS') AS use_last_password_change
        FROM stm_user ORDER BY use_id
        """,
    )
    copy_table(
        "tasks.csv",
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
        """
        SELECT tas_id, tas_name, to_char(tas_created, 'YYYY-MM-DD HH24:MI:SS') AS tas_created, tas_order,
               tas_giid, tas_serid, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params
        FROM stm_task ORDER BY tas_id
        """,
    )
    copy_table(
        "configuration.csv",
        ["cnf_id", "cnf_name", "cnf_value"],
        "SELECT cnf_id, cnf_name, cnf_value FROM stm_conf ORDER BY cnf_id",
    )
    copy_table(
        "literal_translations.csv",
        ["ltr_id", "ltr_literal", "lan_shortname"],
        """
        SELECT ltr.ltr_id, ltr.ltr_literal, lang.lan_shortname
        FROM stm_literal_translation ltr
        JOIN stm_language lang ON lang.lan_id = ltr.ltr_lanid
        ORDER BY ltr.ltr_id
        """,
    )
    copy_table(
        "literal_translation_values.csv",
        ["ltv_id", "ltr_id", "lan_shortname", "ltv_value"],
        """
        SELECT ltv.ltv_id, ltv.ltv_ltrid, lang.lan_shortname, ltv.ltv_value
        FROM stm_literal_translation_value ltv
        JOIN stm_language lang ON lang.lan_id = ltv.ltv_lanid
        ORDER BY ltv.ltv_id
        """,
    )


def copy_table(name, fieldnames, query):
    rows = psql_copy(query)
    # COPY without aliases uses column names from the query. Normalize.
    normalized = []
    for row in rows:
        values = list(row.values())
        if len(values) != len(fieldnames):
            raise SystemExit(f"{name}: expected {len(fieldnames)} columns, got {len(values)}")
        normalized.append(dict(zip(fieldnames, values)))
    write_csv(name, fieldnames, normalized)


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


def generate():
    languages = read_seed("languages.csv")
    codelists = read_seed("codelists.csv")
    translations = read_seed("translations.csv")
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
        codelist_sql = [
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
        (BASELINE / f"02-codelists.{suffix}.sql").write_text("\n".join(codelist_sql) + "\n")

    translation_sql = [translation_statement(row) for row in translations]
    (BASELINE / "04-translations.sql").write_text("\n".join(translation_sql) + "\n")

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
    if "--import-database" in sys.argv:
        import_database()
    generate()


if __name__ == "__main__":
    main()
