"""Authored data dictionary and catalog comparison.

A column row records the decided length, required flag, default, and enforcement.
Catalog dumps and the baseline SQL files are consumers of that row. They do not
supply the canonical value once a row is decided.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

STRING_TYPES = {"string"}
BOOL_TYPES = {"boolean"}

CREATE_TABLE_RE = re.compile(
    r"CREATE TABLE\s+(\w+)\s*\((.*?)\)\s*;",
    re.I | re.S,
)
UNIQUE_RE = re.compile(
    r"ALTER TABLE(?: ONLY)?\s+(\w+)\s+ADD CONSTRAINT\s+(\w+)\s+UNIQUE\s*\(([^)]+)\)",
    re.I,
)
UNIQUE_INDEX_RE = re.compile(
    r"CREATE UNIQUE INDEX\s+(\w+)\s+ON\s+(\w+)\s*\(([^)]+)\)",
    re.I,
)
CODELIST_ROW_RE = re.compile(
    r"^[^,]*,(?P<list>[^,]*),(?P<value>[^,]*),(?P<system>true|false),(?P<default>true|false),(?P<description>.*)$"
)


@dataclass(frozen=True)
class Drift:
    klass: str
    key: str
    consumer: str
    expected: str
    observed: str

    def line(self) -> str:
        return f"{self.klass}|{self.key}|{self.consumer}|{self.expected}|{self.observed}"


@dataclass
class ColumnObs:
    table: str
    column: str
    logical: str
    length: int | None
    required: bool
    default: str | None


def norm_default(value: str | None) -> str | None:
    if value is None:
        return None
    text = value.strip().rstrip(",")
    while len(text) >= 2 and text[0] == "(" and text[-1] == ")":
        text = text[1:-1].strip()
    if not text:
        return None
    low = text.lower()
    if low in {"false", "0", "'0'", "'false'"} or low.startswith("false"):
        return "false"
    if low in {"true", "1", "'1'", "'true'"} or low.startswith("true"):
        return "true"
    if "current_timestamp" in low or low.startswith("systimestamp") or low.startswith("sysdate"):
        return "current_timestamp"
    if len(text) >= 2 and text[0] == "'" and text[-1] == "'":
        return text[1:-1]
    return low


def logical_type(raw: str) -> str:
    text = raw.lower().strip()
    if text.startswith("bool"):
        return "boolean"
    if text.startswith(("character", "varchar", "char", "text", "clob", "nvarchar")):
        return "string"
    if text.startswith(("integer", "bigint", "smallint", "int4", "int8")):
        return "integer"
    if text.startswith("number"):
        if re.search(r"number\s*\(\s*1\s*,", text):
            return "boolean"
        if re.search(r"number\s*\(\s*10\s*,", text):
            return "integer"
        return "number"
    if text.startswith("timestamp") or text == "date":
        return "timestamp"
    return "other"


def _length_of(raw: str) -> int | None:
    match = re.search(r"\((\d+)", raw)
    if logical_type(raw) != "string":
        return None
    if match:
        return int(match.group(1))
    return None


def parse_create_columns(sql: str) -> dict[tuple[str, str], ColumnObs]:
    found: dict[tuple[str, str], ColumnObs] = {}
    for table_match in CREATE_TABLE_RE.finditer(sql):
        table = table_match.group(1).upper()
        body = table_match.group(2)
        for raw_line in body.splitlines():
            line = raw_line.strip().rstrip(",")
            if not line or line.startswith("--") or line.upper().startswith("CONSTRAINT"):
                continue
            required = bool(re.search(r"\bNOT NULL\b", line, re.I))
            without_null = re.sub(r"\bNOT NULL\b", "", line, flags=re.I).strip()
            default = None
            default_match = re.search(r"\bDEFAULT\b\s+(.+)$", without_null, re.I)
            if default_match:
                default = norm_default(default_match.group(1))
                without_null = without_null[: default_match.start()].strip()
            parts = without_null.split(None, 1)
            if len(parts) < 2:
                continue
            name, raw_type = parts
            if not re.match(r"[A-Za-z_][\w]*$", name):
                continue
            column = name.upper()
            found[(table, column)] = ColumnObs(
                table=table,
                column=column,
                logical=logical_type(raw_type),
                length=_length_of(raw_type),
                required=required,
                default=default,
            )
    return found


def parse_uniques(sql: str) -> dict[str, set[frozenset[str]]]:
    uniques: dict[str, set[frozenset[str]]] = {}
    for match in UNIQUE_RE.finditer(sql):
        table = match.group(1).upper()
        cols = frozenset(part.strip().upper() for part in match.group(3).split(","))
        uniques.setdefault(table, set()).add(cols)
    return uniques


def parse_unique_indexes(sql: str) -> dict[str, set[str]]:
    indexes: dict[str, set[str]] = {}
    for match in UNIQUE_INDEX_RE.finditer(sql):
        indexes.setdefault(match.group(2).upper(), set()).add(match.group(1).lower())
    return indexes


def load_columns(path: Path) -> dict[tuple[str, str], ColumnObs]:
    found: dict[tuple[str, str], ColumnObs] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        if not raw or raw.startswith("#"):
            continue
        parts = raw.split("|")
        while len(parts) < 6:
            parts.append("")
        table, column, data_type, length, nullable, default = parts[:6]
        if not re.fullmatch(r"[A-Za-z0-9_$]+", table) or not re.fullmatch(r"[A-Za-z0-9_$]+", column):
            continue
        logical = logical_type(data_type)
        number = int(length) if length.isdigit() and logical == "string" else None
        found[(table.upper(), column.upper())] = ColumnObs(
            table=table.upper(),
            column=column.upper(),
            logical=logical,
            length=number,
            required=nullable.upper() == "NO",
            default=norm_default(default),
        )
    return found


def load_uniques(path: Path) -> dict[str, set[frozenset[str]]]:
    uniques: dict[str, set[frozenset[str]]] = {}
    if not path.is_file():
        return uniques
    for raw in path.read_text(encoding="utf-8").splitlines():
        if not raw or raw.startswith("#"):
            continue
        parts = raw.split("|")
        if len(parts) < 3 or parts[1] not in {"UK", "UNIQUE"}:
            continue
        cols = frozenset(part.strip().upper() for part in parts[2].split(",") if part.strip())
        uniques.setdefault(parts[0].upper(), set()).add(cols)
    return uniques


def load_index_names(path: Path) -> dict[str, set[str]]:
    names: dict[str, set[str]] = {}
    if not path.is_file():
        return names
    for raw in path.read_text(encoding="utf-8").splitlines():
        if not raw or raw.startswith("#"):
            continue
        parts = raw.split("|")
        if len(parts) < 3 or parts[2] != "YES":
            continue
        names.setdefault(parts[0].upper(), set()).add(parts[1].lower())
    return names


def load_codelist_values(path: Path) -> set[tuple[str, str]]:
    values: set[tuple[str, str]] = set()
    if not path.is_file():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        if not raw or raw.startswith("#"):
            continue
        parts = raw.split("|")
        if len(parts) >= 2:
            values.add((parts[0], parts[1]))
    return values


def load_system_codelists(csv_path: Path) -> dict[str, dict[str, dict[str, str]]]:
    lists: dict[str, dict[str, dict[str, str]]] = {}
    for raw in csv_path.read_text(encoding="utf-8").splitlines()[1:]:
        match = CODELIST_ROW_RE.match(raw)
        if not match or match.group("system") != "true":
            continue
        lists.setdefault(match.group("list"), {})[match.group("value")] = {
            "system": "true",
            "default": match.group("default"),
            "description": match.group("description"),
        }
    return lists


def read_dictionary(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_dictionary(path: Path, document: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(document, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def empty_document() -> dict:
    return {
        "columns": {},
        "codelists": {},
        "fields": {},
        "projections": {
            "unique_function_index": {
                "STM_LITERAL_TRANSLATION.LTR_LITERAL": "stm_ltr_literal_uk"
            },
        },
        "uniques": {},
    }


def _column_row(obs: ColumnObs, *, status: str, candidates: dict | None = None) -> dict:
    row = {
        "codelist": None,
        "consumers": {},
        "default": obs.default,
        "enforcement": "truncate" if obs.logical == "string" else None,
        "length": obs.length,
        "required": obs.required,
        "status": status,
        "type": obs.logical,
    }
    if status == "open":
        row["candidates"] = candidates or {}
    return row


def _disagree(pg: ColumnObs, ora: ColumnObs) -> dict[str, dict]:
    candidates: dict[str, dict] = {}
    if pg.logical == "string" and pg.length != ora.length:
        candidates["length"] = {"oracle": ora.length, "postgresql": pg.length}
    if pg.required != ora.required:
        candidates["required"] = {"oracle": ora.required, "postgresql": pg.required}
    if norm_default(pg.default) != norm_default(ora.default):
        candidates["default"] = {"oracle": ora.default, "postgresql": pg.default}
    if pg.logical != ora.logical and not {pg.logical, ora.logical} <= {"boolean", "integer", "number"}:
        candidates["type"] = {"oracle": ora.logical, "postgresql": pg.logical}
    if {pg.logical, ora.logical} == {"boolean", "number"} or {pg.logical, ora.logical} == {"boolean", "integer"}:
        return {key: value for key, value in candidates.items() if key != "type"}
    return candidates


def build_document(
    pg_columns: dict[tuple[str, str], ColumnObs],
    ora_columns: dict[tuple[str, str], ColumnObs],
    pg_uniques: dict[str, set[frozenset[str]]],
    codelists: dict[str, dict[str, dict[str, str]]],
    existing: dict | None = None,
) -> dict:
    document = empty_document()
    if existing:
        document["fields"] = existing.get("fields", {})
        document["projections"] = existing.get("projections", document["projections"])
    previous = (existing or {}).get("columns", {})
    for key in sorted(pg_columns):
        obs = pg_columns[key]
        ident = f"{obs.table}.{obs.column}"
        other = ora_columns.get(key)
        candidates = _disagree(obs, other) if other else {}
        if ident in previous and previous[ident].get("status") == "decided":
            document["columns"][ident] = previous[ident]
            continue
        if candidates:
            document["columns"][ident] = _column_row(obs, status="open", candidates=candidates)
        else:
            document["columns"][ident] = _column_row(obs, status="decided")
    document["uniques"] = {
        table: sorted(",".join(sorted(cols)) for cols in sets)
        for table, sets in sorted(pg_uniques.items())
    }
    document["codelists"] = codelists
    return document


ENTITY_RE = re.compile(r"@Entity\b")
TABLE_NAME_RE = re.compile(r'@Table\s*\(\s*name\s*=\s*"([^"]+)"')
PACKAGE_RE = re.compile(r"^package\s+([\w.]+);", re.M)
CLASS_RE = re.compile(r"\bclass\s+(\w+)")
FIELD_RE = re.compile(
    r"((?:@\w+(?:\([^)]*\))?\s*)*)(?:private|protected|public)\s+[\w.<>,\s]+?\s+(\w+)\s*(?:=\s*[^;]+)?;",
    re.S,
)
SIZE_MAX_RE = re.compile(r"@Size\s*\([^)]*max\s*=\s*(\d+)")
COLUMN_NAME_ONLY_RE = re.compile(r'@Column\s*\(\s*name\s*=\s*"([^"]+)"')


def _java_types(java_root: Path):
    for path in sorted(java_root.rglob("*.java")):
        text = path.read_text(encoding="utf-8")
        package = PACKAGE_RE.search(text)
        class_match = CLASS_RE.search(text)
        if package and class_match:
            yield text, f"{package.group(1)}.{class_match.group(1)}"


def apply_java_consumers(document: dict, java_root: Path) -> None:
    columns = document["columns"]
    parsed = list(_java_types(java_root))
    for text, qualified in parsed:
        if not ENTITY_RE.search(text):
            continue
        table_match = TABLE_NAME_RE.search(text)
        if not table_match:
            continue
        for field in FIELD_RE.finditer(text):
            annotations, name = field.group(1), field.group(2)
            column_match = COLUMN_NAME_ONLY_RE.search(annotations)
            if not column_match:
                continue
            ident = f"{table_match.group(1).upper()}.{column_match.group(1).upper()}"
            row = columns.get(ident)
            if row is None or row.get("status") != "decided":
                continue
            row.setdefault("consumers", {})["jpa"] = f"{qualified}#{name}"
            if row.get("type") == "string":
                row["enforcement"] = "reject" if re.search(r"@Size\b", annotations) else "truncate"
    for text, qualified in parsed:
        if ENTITY_RE.search(text):
            continue
        for field in FIELD_RE.finditer(text):
            annotations, name = field.group(1), field.group(2)
            if not SIZE_MAX_RE.search(annotations) and not re.search(r"@Size\b", annotations):
                continue
            matches = [
                ident
                for ident, row in columns.items()
                if row.get("consumers", {}).get("jpa", "").endswith("#" + name) and row.get("type") == "string"
            ]
            if len(matches) == 1:
                document.setdefault("fields", {})[f"{qualified}#{name}"] = {"same_as": matches[0]}


def decide_open_rows(document: dict) -> int:
    changed = 0
    for row in document["columns"].values():
        if row.get("status") != "open":
            continue
        candidates = row.get("candidates") or {}
        for attr, sides in candidates.items():
            if "postgresql" in sides:
                row[attr] = sides["postgresql"]
        row["status"] = "decided"
        row.pop("candidates", None)
        changed += 1
    return changed


def _expect_text(value) -> str:
    if value is None:
        return ""
    return str(value).lower() if isinstance(value, bool) else str(value)


def check_columns(
    document: dict,
    columns: dict[tuple[str, str], ColumnObs],
    *,
    consumer: str,
) -> list[Drift]:
    drifts: list[Drift] = []
    for ident, row in sorted(document.get("columns", {}).items()):
        if row.get("status") != "decided":
            continue
        table, column = ident.split(".", 1)
        obs = columns.get((table, column))
        if obs is None:
            drifts.append(Drift("length", ident, consumer, _expect_text(row.get("length")), "absent"))
            continue
        if row.get("type") == "boolean" and obs.logical in {"boolean", "number", "integer"}:
            pass
        elif row.get("type") == "string" and row.get("length") != obs.length:
            drifts.append(
                Drift("length", ident, consumer, _expect_text(row.get("length")), _expect_text(obs.length))
            )
        if bool(row.get("required")) != obs.required:
            drifts.append(
                Drift(
                    "required",
                    ident,
                    consumer,
                    _expect_text(bool(row.get("required"))),
                    _expect_text(obs.required),
                )
            )
        if norm_default(row.get("default")) != obs.default:
            drifts.append(
                Drift(
                    "default",
                    ident,
                    consumer,
                    _expect_text(row.get("default")),
                    _expect_text(obs.default),
                )
            )
    return drifts


def check_uniques(
    document: dict,
    uniques: dict[str, set[frozenset[str]]],
    index_names: dict[str, set[str]] | None,
    *,
    consumer: str,
) -> list[Drift]:
    drifts: list[Drift] = []
    projected = document.get("projections", {}).get("unique_function_index", {})
    for table, encoded in sorted(document.get("uniques", {}).items()):
        expected = {frozenset(part.split(",")) for part in encoded}
        observed = uniques.get(table, set())
        for cols in sorted(expected, key=lambda item: ",".join(sorted(item))):
            if cols not in observed:
                key = f"{table}.{','.join(sorted(cols))}"
                drifts.append(Drift("unique", key, consumer, ",".join(sorted(cols)), "absent"))
        for cols in sorted(observed, key=lambda item: ",".join(sorted(item))):
            if cols not in expected:
                key = f"{table}.{','.join(sorted(cols))}"
                drifts.append(Drift("unique", key, consumer, "", ",".join(sorted(cols))))
    if index_names is None:
        return drifts
    for key, index_name in sorted(projected.items()):
        table, column = key.split(".", 1)
        index_hit = index_name.lower() in index_names.get(table, set())
        unique_hit = frozenset({column}) in uniques.get(table, set())
        if not index_hit and not unique_hit:
            drifts.append(Drift("unique", key, consumer, index_name, "absent"))
    return drifts


def check_codelists(document: dict, values: set[tuple[str, str]], *, consumer: str) -> list[Drift]:
    drifts: list[Drift] = []
    for list_name, rows in sorted(document.get("codelists", {}).items()):
        for value, meta in sorted(rows.items()):
            if str(meta.get("system")).lower() != "true":
                continue
            if (list_name, value) not in values:
                drifts.append(Drift("codelist", f"{list_name}.{value}", consumer, value, "absent"))
    return drifts


def check_sql(document: dict, sql: str, *, consumer: str) -> list[Drift]:
    return check_columns(document, parse_create_columns(sql), consumer=consumer) + check_uniques(
        document,
        parse_uniques(sql),
        parse_unique_indexes(sql),
        consumer=consumer,
    )


def catalog_file(directory: Path, name: str) -> Path:
    plain = directory / name
    if plain.is_file():
        return plain
    fresh = directory / f"fresh.{name}"
    return fresh if fresh.is_file() else plain


def check_catalog(document: dict, directory: Path, *, consumer: str | None = None) -> list[Drift]:
    name = consumer or directory.name
    drifts = check_columns(document, load_columns(catalog_file(directory, "columns")), consumer=name)
    index_path = catalog_file(directory, "indexes")
    drifts += check_uniques(
        document,
        load_uniques(catalog_file(directory, "constraints")),
        load_index_names(index_path) if index_path.is_file() else None,
        consumer=name,
    )
    codelists = catalog_file(directory, "codelists")
    if codelists.is_file():
        drifts += check_codelists(document, load_codelist_values(codelists), consumer=name)
    return drifts


def counts(drifts: list[Drift]) -> dict[str, int]:
    totals = {name: 0 for name in ("length", "required", "default", "unique", "codelist", "openapi")}
    for drift in drifts:
        totals[drift.klass] = totals.get(drift.klass, 0) + 1
    return totals


def open_count(document: dict) -> int:
    return sum(1 for row in document.get("columns", {}).values() if row.get("status") == "open")
