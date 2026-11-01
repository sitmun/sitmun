#!/usr/bin/env python3
"""Write test fixtures from the old JUnit CSVs.

Shipped baseline rows keep their ids. Every other explicit id below 10000 moves
up by 10000 so it sits in the fixture band. The sequence floor is not changed.
"""

from __future__ import annotations

import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TEST_DATA = ROOT / "sitmun-backend/src/test/resources/db/changelog/04_data"
BASELINE = ROOT / "tools/seed-data/baseline"
SCHEMA = (
    ROOT
    / "sitmun-backend/src/main/resources/db/changelog/baseline/01-schema.postgresql.sql"
)
OUT = ROOT / "sitmun-backend/src/test/resources/db/changelog-test"
FLOOR = 10_000

# Column name -> entity whose id space it uses. Absent columns are not ids.
ID_COLUMNS = {
    "ABC_ID": "app_background",
    "ABC_APPID": "app",
    "ABC_BACKID": "background",
    "AGI_ID": "cartography_availability",
    "AGI_TERID": "territory",
    "AGI_GIID": "cartography",
    "APP_ID": "app",
    "APP_GGIID": "cartography_group",
    "ARO_ROLEID": "role",
    "ARO_APPID": "app",
    "ATE_ID": "app_territory",
    "ATE_APPID": "app",
    "ATE_TERID": "territory",
    "ATR_ID": "app_tree",
    "ATR_APPID": "app",
    "ATR_TREEID": "tree",
    "ATS_ID": "task_availability",
    "ATS_TERID": "territory",
    "ATS_TASKID": "task",
    "BAC_ID": "background",
    "BAC_GGIID": "cartography_group",
    "CON_ID": "connection",
    "GEO_ID": "cartography",
    "GEO_SERID": "service",
    "GEO_SERSELID": "service",
    "GEO_CONNID": "connection",
    "GGG_GGIID": "cartography_group",
    "GGG_GIID": "cartography",
    "GGI_ID": "cartography_group",
    "GTE_TERID": "territory",
    "GTE_TERMID": "territory",
    "GTS_ID": "task_group",
    "GTT_ID": "territory_group_type",
    "PAP_ID": "app_parameter",
    "PAP_APPID": "app",
    "POS_ID": "position",
    "POS_USERID": "user",
    "POS_TERID": "territory",
    "PSE_ID": "service_parameter",
    "PSE_SERID": "service",
    "RGG_ROLEID": "role",
    "RGG_GGIID": "cartography_group",
    "ROL_ID": "role",
    "RTS_ROLEID": "role",
    "RTS_TASKID": "task",
    "SER_ID": "service",
    "SGI_ID": "cartography_style",
    "SGI_GIID": "cartography",
    "TAR_ID": "task_relation",
    "TAR_TASKID": "task",
    "TAR_TASKRELID": "task",
    "TAS_ID": "task",
    "TAS_SERID": "service",
    "TAS_GTASKID": "task_group",
    "TAS_TTASKID": "task_type",
    "TAS_TUIID": "task_ui",
    "TAS_CONNID": "connection",
    "TAS_GIID": "cartography",
    "TER_ID": "territory",
    "TER_TYPID": "territory_type",
    "TER_GTYPID": "territory_group_type",
    "TNO_ID": "tree_node",
    "TNO_PARENTID": "tree_node",
    "TNO_TREEID": "tree",
    "TNO_GIID": "cartography",
    "TRE_ID": "tree",
    "TRO_TREEID": "tree",
    "TRO_ROLEID": "role",
    "TUI_ID": "task_ui",
    "UCO_ID": "user_configuration",
    "UCO_USERID": "user",
    "UCO_TERID": "territory",
    "UCO_ROLEID": "role",
    "USE_ID": "user",
}

BOOLEANS = {
    "APP_REFRESH",
    "BAC_ACTIVE",
    "GEO_QUERYABL",
    "GEO_QUERYACT",
    "GEO_SELECTABL",
    "GEO_THEMATIC",
    "GEO_BLOCKED",
    "GEO_FILTER_GFI",
    "GEO_FILTER_SS",
    "SER_BLOCKED",
    "TER_BLOCKED",
    "TNO_DEFAULT",
    "TNO_RADIO",
    "TNO_ACTIVE",
    "TNO_LOAD_DATA",
    "USE_ADM",
    "USE_BLOCKED",
    "UCO_ROLEM",
}

TIMESTAMPS = {
    "APP_CREATED",
    "AGI_CREATED",
    "BAC_CREATED",
    "GEO_CREATED",
    "SER_CREATED",
    "TER_CREATED",
    "TAS_CREATED",
    "POS_CREATED",
    "POS_EXPIRATION",
    "UCO_CREATED",
    "USE_CREATED",
}

# Single-column primary key. Rows whose original id is already shipped are skipped.
PRIMARY_KEYS = {
    "STM_APP.csv": ("APP_ID", "app"),
    "STM_APP_BCKG.csv": ("ABC_ID", "app_background"),
    "STM_APP_TER.csv": ("ATE_ID", "app_territory"),
    "STM_APP_TREE.csv": ("ATR_ID", "app_tree"),
    "STM_AVAIL_GI.csv": ("AGI_ID", "cartography_availability"),
    "STM_AVAIL_TSK.csv": ("ATS_ID", "task_availability"),
    "STM_BACKGRD.csv": ("BAC_ID", "background"),
    "STM_CONNECT.csv": ("CON_ID", "connection"),
    "STM_GEOINFO.csv": ("GEO_ID", "cartography"),
    "STM_GRP_GI.csv": ("GGI_ID", "cartography_group"),
    "STM_GRP_TSK.csv": ("GTS_ID", "task_group"),
    "STM_GTER_TYP.csv": ("GTT_ID", "territory_group_type"),
    "STM_PAR_APP.csv": ("PAP_ID", "app_parameter"),
    "STM_PAR_SER.csv": ("PSE_ID", "service_parameter"),
    "STM_POST.csv": ("POS_ID", "position"),
    "STM_ROLE.csv": ("ROL_ID", "role"),
    "STM_SERVICE.csv": ("SER_ID", "service"),
    "STM_STY_GI.csv": ("SGI_ID", "cartography_style"),
    "STM_TASK.csv": ("TAS_ID", "task"),
    "STM_TASKREL.csv": ("TAR_ID", "task_relation"),
    "STM_TERRITORY.csv": ("TER_ID", "territory"),
    "STM_TREE.csv": ("TRE_ID", "tree"),
    "STM_TREE_NOD.csv": ("TNO_ID", "tree_node"),
    "STM_TSK_UI.csv": ("TUI_ID", "task_ui"),
    "STM_USER.csv": ("USE_ID", "user"),
    "STM_USR_CONF.csv": ("UCO_ID", "user_configuration"),
}

TABLES = {
    "STM_GTER_TYP.csv": "stm_gter_typ",
    "STM_CONNECT.csv": "stm_connect",
    "STM_ROLE.csv": "stm_role",
    "STM_GRP_GI.csv": "stm_grp_gi",
    "STM_GRP_TSK.csv": "stm_grp_tsk",
    "STM_SERVICE.csv": "stm_service",
    "STM_USER.csv": "stm_user",
    "STM_TERRITORY.csv": "stm_territory",
    "STM_GRP_TER.csv": "stm_grp_ter",
    "STM_TREE.csv": "stm_tree",
    "STM_USR_CONF.csv": "stm_usr_conf",
    "STM_GEOINFO.csv": "stm_geoinfo",
    "STM_STY_GI.csv": "stm_sty_gi",
    "STM_GGI_GI.csv": "stm_ggi_gi",
    "STM_ROL_GGI.csv": "stm_rol_ggi",
    "STM_BACKGRD.csv": "stm_backgrd",
    "STM_APP.csv": "stm_app",
    "STM_APP_TREE.csv": "stm_app_tree",
    "STM_APP_ROL.csv": "stm_app_rol",
    "STM_PAR_APP.csv": "stm_par_app",
    "STM_APP_BCKG.csv": "stm_app_bckg",
    "STM_APP_TER.csv": "stm_app_ter",
    "STM_AVAIL_GI.csv": "stm_avail_gi",
    "STM_TREE_NOD.csv": "stm_tree_nod",
    "STM_TREE_ROL.csv": "stm_tree_rol",
    "STM_TSK_UI.csv": "stm_tsk_ui",
    "STM_TASK.csv": "stm_task",
    "STM_TASKREL.csv": "stm_taskrel",
    "STM_ROL_TSK.csv": "stm_rol_tsk",
    "STM_AVAIL_TSK.csv": "stm_avail_tsk",
    "STM_PAR_SER.csv": "stm_par_ser",
    "STM_POST.csv": "stm_post",
}

ORDER = list(TABLES)


def shipped_ids() -> dict[str, set[int]]:
    def column(path: Path, name: str) -> set[int]:
        with path.open(newline="") as handle:
            return {int(row[name]) for row in csv.DictReader(handle) if row[name]}

    return {
        "task": column(BASELINE / "tasks.csv", "tas_id"),
        "task_group": column(BASELINE / "task_groups.csv", "gts_id"),
        "task_ui": column(BASELINE / "task_ui.csv", "tui_id"),
        "task_type": column(BASELINE / "task_types.csv", "tty_id"),
        "territory_type": column(BASELINE / "territory_types.csv", "tet_id"),
        "user": column(BASELINE / "users.csv", "use_id"),
    }


def read_csv(name: str) -> list[dict[str, str]]:
    lines = [
        line
        for line in (TEST_DATA / name).read_text().splitlines()
        if line.strip() and not line.startswith("#")
    ]
    return list(csv.DictReader(lines))


def is_null(value: str | None) -> bool:
    return value is None or value.strip() in {"", "null", "NULL"}


def relocated_ids(kept: dict[str, set[int]]) -> dict[str, set[int]]:
    found: dict[str, set[int]] = {}
    for name in TABLES:
        for row in read_csv(name):
            for column, value in row.items():
                if column not in ID_COLUMNS or is_null(value):
                    continue
                kind = ID_COLUMNS[column]
                number = int(value)
                if number >= FLOOR:
                    continue
                shipped = number in kept.get(kind, set())
                collides = kind == "task" and number >= 34 and number != 32306
                if shipped and not collides:
                    continue
                found.setdefault(kind, set()).add(number)
    found.setdefault("task", set()).update({42, 43})
    found.setdefault("task_availability", set()).update({100, 101})
    return found


def shift(kind: str, value: str, moved: dict[str, set[int]]) -> int | None:
    if is_null(value):
        return None
    number = int(value)
    if number in moved.get(kind, set()):
        return number + FLOOR
    return number


def sql_value(column: str, value: str, oracle: bool, moved: dict[str, set[int]]) -> str:
    if column in ID_COLUMNS:
        shifted = shift(ID_COLUMNS[column], value, moved)
        return "NULL" if shifted is None else str(shifted)
    if column in BOOLEANS:
        if is_null(value):
            return "NULL"
        truth = value.strip().lower() in {"1", "true", "t"}
        if oracle:
            return "1" if truth else "0"
        return "true" if truth else "false"
    if column in TIMESTAMPS:
        if is_null(value):
            return "NULL"
        text = value.strip().replace("T", " ")
        if "." in text:
            text = text.split(".", 1)[0]
        return f"TIMESTAMP '{text}'"
    if is_null(value):
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def insert(table: str, row: dict[str, str], oracle: bool, moved: dict[str, set[int]]) -> str:
    columns = list(row)
    values = [sql_value(column, row[column], oracle, moved) for column in columns]
    names = ", ".join(column.lower() for column in columns)
    return f"INSERT INTO {table} ({names}) VALUES ({', '.join(values)})"


def rows_for(name: str, moved: dict[str, set[int]]) -> list[dict[str, str]]:
    rows = read_csv(name)
    primary = PRIMARY_KEYS.get(name)
    if primary is None:
        return rows
    column, kind = primary
    return [row for row in rows if int(row[column]) in moved.get(kind, set())]


def mia(oracle: bool, moved: dict[str, set[int]]) -> list[str]:
    child = shift("task", "38", moved)
    cartography = shift("cartography", "6", moved)
    role = shift("role", "1", moved)
    territory = shift("territory", "1", moved)
    parent = shift("task", "42", moved)
    control = shift("task", "43", moved)
    params = (
        '{"parentLayout":"tabs","moreInfoAdvanced":true,"childTaskOrderIds":['
        + str(child)
        + '],"parameters":[]}'
    )
    params_sql = "'" + params.replace("'", "''") + "'"
    return [
        "INSERT INTO stm_task (tas_id, tas_name, tas_gtaskid, tas_ttaskid, tas_tuiid) "
        f"VALUES ({control}, 'More Info Advanced', 1, 1, 34)",
        "INSERT INTO stm_task (tas_id, tas_name, tas_gtaskid, tas_ttaskid, tas_giid, tas_params) "
        f"VALUES ({parent}, 'E2E MIA parent Toponimia', 1, 16, {cartography}, {params_sql})",
        f"INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES ({role}, {control})",
        f"INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES ({role}, {parent})",
        "INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) "
        f"VALUES ({shift('task_availability', '101', moved)}, {territory}, {control})",
        "INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) "
        f"VALUES ({shift('task_availability', '100', moved)}, {territory}, {parent})",
    ]


def statements(oracle: bool, moved: dict[str, set[int]]) -> list[str]:
    built = []
    for name in ORDER:
        table = TABLES[name]
        for row in rows_for(name, moved):
            built.append(insert(table, row, oracle, moved))
    built.extend(mia(oracle, moved))
    built.extend(demo_sql_tasks())
    built.extend(fixture_codelists(oracle))
    return [statement + "\n--end" for statement in built]


def demo_sql_tasks() -> list[str]:
    """Demo SQL the old test changelog stored on shipped task ids 23, 27 and 28."""
    tasks = [
        (
            10023,
            "scaleSelector",
            '{"parameters":[{"variable":"columnA"},{"variable":"columnB"}],"command": "SELECT * FROM EXAMPLE"}',
        ),
        (
            10027,
            "threed",
            '{"parameters":[{"variable":"columnA"}],"command": "SELECT * FROM EXAMPLE WHERE TERR_COD=#{TERR_COD}"}',
        ),
        (
            10028,
            "TOC",
            '{"command": "SELECT * FROM EXAMPLE WHERE USER_ID=#{USER_ID} AND TERR_ID=#{TERR_ID} AND APP_ID=#{APP_ID} AND TERR_COD=#{TERR_COD}"}',
        ),
    ]
    statements = []
    for task_id, name, params in tasks:
        statements.append(
            "INSERT INTO stm_task (tas_id, tas_name, tas_gtaskid, tas_ttaskid, tas_tuiid, tas_connid, tas_params) "
            f"VALUES ({task_id}, '{name}', 1, 1, {task_id - 10000}, 10001, '{params}')"
        )
        statements.append(
            f"INSERT INTO stm_rol_tsk (rts_roleid, rts_taskid) VALUES (10001, {task_id})"
        )
        statements.append(
            "INSERT INTO stm_avail_tsk (ats_id, ats_terid, ats_taskid) "
            f"VALUES ({task_id}, 10001, {task_id})"
        )
    statements.append(
        "INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) "
        "VALUES (19301, 10001, 'Background.name', 2, 'Mapa de fondo')"
    )
    return statements


def fixture_codelists(oracle: bool) -> list[str]:
    system = "1" if oracle else "true"
    off = "0" if oracle else "false"
    drivers = [
        (19002, "org.h2.Driver", "H2 JDBC Driver"),
        (19003, "org.postgresql.Driver", "PostgreSQL JDBC Driver"),
        (19004, "oracle.jdbc.OracleDriver", "Oracle JDBC driver"),
        (19005, "com.microsoft.sqlserver.jdbc.SQLServerDriver", "Microsoft SQL Server JDBC Driver"),
    ]
    labels = {
        19002: ("Controlador JDBC H2", "Pilote JDBC H2"),
        19003: ("Controlador JDBC PostgreSQL", "Pilote JDBC PostgreSQL"),
        19004: ("Controlador JDBC Oracle", "Pilote JDBC Oracle"),
        19005: ("Controlador JDBC Microsoft SQL Server", "Pilote JDBC Microsoft SQL Server"),
    }
    statements = [
        "INSERT INTO stm_codelist (cod_id, cod_list, cod_value, cod_system, cod_default, cod_description) "
        f"VALUES (19001, 'service.nativeProtocol', 'NONE', {off}, {off}, 'NONE')"
    ]
    translation_id = 19201
    for code_id, value, description in drivers:
        statements.append(
            "INSERT INTO stm_codelist (cod_id, cod_list, cod_value, cod_system, cod_default, cod_description) "
            f"VALUES ({code_id}, 'databaseConnection.driver', '{value}', {system}, {off}, '{description}')"
        )
        spanish, french = labels[code_id]
        for language_id, label in ((2, spanish), (3, spanish), (4, spanish), (5, french)):
            statements.append(
                "INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) "
                f"VALUES ({translation_id}, {code_id}, 'CodeListValue.description', {language_id}, '{label}')"
            )
            translation_id += 1
    return statements


def write_h2_schema() -> None:
    text = SCHEMA.read_text()
    text = text.replace("ALTER TABLE ONLY ", "ALTER TABLE ")
    text = text.replace(" USING btree", "")
    text = text.replace("timestamp(6) without time zone", "timestamp")
    text = text.replace(
        "CREATE UNIQUE INDEX stm_ltr_literal_uk ON stm_literal_translation (md5(ltr_literal));",
        "ALTER TABLE stm_literal_translation ADD CONSTRAINT stm_ltr_literal_uk UNIQUE (ltr_literal);",
    )
    (OUT / "01-schema.h2.sql").write_text(text)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    kept = shipped_ids()
    moved = relocated_ids(kept)
    write_h2_schema()
    for oracle, name in ((False, "02-fixtures.postgresql.sql"), (True, "02-fixtures.oracle.sql")):
        body = statements(oracle, moved)
        (OUT / name).write_text("\n".join(body) + "\n")
        print(f"wrote {name} ({len(body)} statements)")


if __name__ == "__main__":
    main()
