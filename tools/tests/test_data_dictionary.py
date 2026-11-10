#!/usr/bin/env python3
"""Fixture checks for the data dictionary catalog comparer."""

from __future__ import annotations

import csv
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BIN = ROOT / "tools" / "bin"
sys.path.insert(0, str(BIN))

import generate_legacy_upgrade as legacy  # noqa: E402
from data_dictionary_lib import (  # noqa: E402
    build_document,
    check_catalog,
    check_sql,
    decide_open_rows,
    load_system_codelists,
    logical_type,
    norm_default,
    parse_create_columns,
    parse_foreign_keys,
    parse_uniques,
    read_dictionary,
    validate_document,
    write_dictionary,
)

FIXTURES = BIN / "testdata" / "data_dictionary"
PG = ROOT / "sitmun-backend/src/main/resources/db/changelog/baseline/01-schema.postgresql.sql"
ORA = ROOT / "sitmun-backend/src/main/resources/db/changelog/baseline/01-schema.oracle.sql"
H2 = ROOT / "sitmun-backend/src/test/resources/db/changelog-test/01-schema.h2.sql"
PG_SEED = ROOT / "sitmun-backend/src/main/resources/db/changelog/baseline/06-seed.postgresql.sql"
ORA_SEED = ROOT / "sitmun-backend/src/main/resources/db/changelog/baseline/06-seed.oracle.sql"
CSV = ROOT / "tools/seed-data/baseline/codelists.csv"


def drifts(name: str):
    folder = FIXTURES / name
    return check_catalog(read_dictionary(folder / "dictionary.json"), folder)


class DataDictionaryTest(unittest.TestCase):
    def test_length_mismatch(self):
        rows = [row for row in drifts("length") if row.klass == "length"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].expected, "50")
        self.assertEqual(rows[0].observed, "80")

    def test_required_mismatch(self):
        rows = [row for row in drifts("required") if row.klass == "required"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].observed, "false")

    def test_default_mismatch(self):
        rows = [row for row in drifts("default") if row.klass == "default"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].expected, "false")
        self.assertEqual(rows[0].observed, "true")

    def test_missing_unique(self):
        rows = [row for row in drifts("unique") if row.klass == "unique"]
        self.assertTrue(any(row.observed == "absent" for row in rows))

    def test_codelist_missing_system_row(self):
        rows = drifts("codelist")
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].klass, "codelist")
        self.assertEqual(rows[0].observed, "absent")

    def test_oracle_boolean_is_a_projection(self):
        self.assertEqual(drifts("boolean"), [])

    def test_sysc_name_is_not_a_drift(self):
        self.assertEqual(drifts("sysc"), [])

    def test_md5_unique_index_satisfies_the_projection(self):
        self.assertEqual(drifts("md5"), [])

    def test_seed_is_idempotent_and_check_keeps_decided_rows(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "dictionary.json"
            command = [
                sys.executable,
                str(BIN / "seed_data_dictionary.py"),
                "--postgres",
                str(PG),
                "--oracle",
                str(ORA),
                "--codelists",
                str(CSV),
                "--out",
                str(out),
            ]
            subprocess.run(command, check=True, cwd=ROOT)
            first = out.read_bytes()
            subprocess.run(command, check=True, cwd=ROOT)
            self.assertEqual(first, out.read_bytes())
            checked = subprocess.run([*command, "--check"], cwd=ROOT, capture_output=True, text=True)
            self.assertEqual(checked.returncode, 0, checked.stdout + checked.stderr)

    def test_fail_on_problem_exits_1(self):
        folder = FIXTURES / "length"
        completed = subprocess.run(
            [
                sys.executable,
                str(BIN / "check_data_dictionary.py"),
                "--dictionary",
                str(folder / "dictionary.json"),
                "--catalog",
                str(folder),
                "--fail-on",
                "problem",
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(completed.returncode, 1)
        self.assertIn("length|STM_APP.APP_NAME|", completed.stdout)

    def test_default_fail_on_is_problem(self):
        folder = FIXTURES / "length"
        completed = subprocess.run(
            [
                sys.executable,
                str(BIN / "check_data_dictionary.py"),
                "--dictionary",
                str(folder / "dictionary.json"),
                "--catalog",
                str(folder),
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(completed.returncode, 1)

    def test_shipped_dictionary_matches_baseline_sql(self):
        document = read_dictionary(ROOT / "tools/dictionary/dictionary.json")
        self.assertTrue(document["columns"])
        self.assertTrue(all(row["status"] == "decided" for row in document["columns"].values()))
        completed = subprocess.run(
            [
                sys.executable,
                str(BIN / "check_data_dictionary.py"),
                "--sql",
                str(PG),
                "--sql",
                str(ORA),
                "--sql",
                str(H2),
                "--sql",
                str(PG_SEED),
                "--sql",
                str(ORA_SEED),
            ],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        self.assertIn("open=0", completed.stdout)
        leftover = {"api", "candidates", "decision", "unique"}
        for ident, row in document["columns"].items():
            present = leftover & row.keys()
            self.assertFalse(present, f"{ident} still has {sorted(present)}")
        self.assertEqual(set(document["projections"]), {"unique_function_index"})
        fields = document["fields"]
        self.assertEqual(
            fields["org.sitmun.domain.user.UserDTO#email"]["same_as"],
            "STM_USER.USE_EMAIL",
        )
        self.assertEqual(
            fields["org.sitmun.infrastructure.security.password.dto.RequestNewPassword#email"]["same_as"],
            "STM_USER.USE_EMAIL",
        )

    def test_shipped_code_values_are_system_except_download_task_scope(self):
        with (ROOT / "tools/seed-data/baseline/codelists.csv").open(newline="") as handle:
            rows = list(csv.DictReader(handle))
        deletable = {
            (row["cod_list"], row["cod_value"])
            for row in rows
            if row["cod_system"] != "true"
        }
        self.assertEqual(
            deletable,
            {("downloadTask.scope", "A"), ("downloadTask.scope", "U"), ("downloadTask.scope", "C")},
        )
        with (ROOT / "tools/seed-data/upgrade/1.2.9-to-1.3.0/codelists-promoted.csv").open(newline="") as handle:
            promoted = list(csv.DictReader(handle))
        self.assertEqual(len(promoted), 71)
        promoted_keys = {
            legacy.baseline_key(row["cod_list"], row["cod_value"]) for row in promoted
        }
        system = {(row["cod_list"], row["cod_value"]) for row in rows if row["cod_system"] == "true"}
        self.assertTrue(promoted_keys <= system)
        inventory = (ROOT / "sitmun-backend/src/test/resources/required-codelists.yaml").read_text()
        reads = re.findall(r"(?m)^  - list: (.+)\n    value: (.+)$", inventory)
        self.assertTrue(reads)
        for code_list, value in reads:
            value = value.strip("'\"")
            self.assertIn((code_list, value), system, f"{code_list}.{value} is read and not system")
        document = read_dictionary(ROOT / "tools/dictionary/dictionary.json")
        self.assertEqual(document["codelists"], load_system_codelists(CSV))

    def test_parenthesized_oracle_default_matches_the_dictionary(self):
        self.assertEqual(norm_default("(SYSTIMESTAMP)"), "current_timestamp")
        self.assertEqual(norm_default("(0)"), "false")
        self.assertEqual(norm_default("(1)"), "true")

    def test_oracle_error_dump_is_not_a_catalog(self):
        folder = FIXTURES / "length"
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp)
            (dest / "fresh.columns").write_text(
                "ORA-00932: expression is of data type LONG, which is incompatible\n"
            )
            completed = subprocess.run(
                [
                    sys.executable,
                    str(BIN / "check_data_dictionary.py"),
                    "--dictionary",
                    str(folder / "dictionary.json"),
                    "--catalog",
                    str(dest),
                ],
                cwd=ROOT,
                capture_output=True,
                text=True,
            )
        self.assertEqual(completed.returncode, 1)
        self.assertIn("has no columns", completed.stderr)
        self.assertNotIn("absent", completed.stdout)

    def test_named_prefix_does_not_read_the_fresh_dump(self):
        folder = FIXTURES / "length"
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp)
            (dest / "fresh.columns").write_text((folder / "columns").read_text())
            with self.assertRaises(FileNotFoundError):
                check_catalog(read_dictionary(folder / "dictionary.json"), dest, prefix="upgraded")

    def test_fresh_dump_prefix_is_a_catalog(self):
        folder = FIXTURES / "length"
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp)
            (dest / "fresh.columns").write_text((folder / "columns").read_text())
            rows = check_catalog(read_dictionary(folder / "dictionary.json"), dest)
        self.assertTrue(any(row.klass == "length" for row in rows))

    def test_decide_closes_open_rows_without_changing_decided_ones(self):
        pg = parse_create_columns("CREATE TABLE stm_app (app_name character varying(80) NOT NULL);")
        ora = parse_create_columns("CREATE TABLE stm_app (app_name VARCHAR2(50 CHAR) NOT NULL);")
        document = build_document(pg, ora, {}, {})
        self.assertEqual(document["columns"]["STM_APP.APP_NAME"]["status"], "open")
        decide_open_rows(document)
        closed = document["columns"]["STM_APP.APP_NAME"]
        self.assertEqual(closed["status"], "decided")
        self.assertEqual(closed["length"], 80)
        self.assertNotIn("decision", closed)
        self.assertNotIn("candidates", closed)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "dictionary.json"
            write_dictionary(path, document)
            again = build_document(pg, ora, parse_uniques(""), {}, document)
            self.assertEqual(again["columns"]["STM_APP.APP_NAME"]["length"], 80)
            stored = json.loads(path.read_text())["columns"]["STM_APP.APP_NAME"]
            self.assertNotIn("decision", stored)
            self.assertNotIn("candidates", stored)

    def test_logical_type_keeps_zone_day_and_decimal_apart(self):
        self.assertEqual(logical_type("timestamp without time zone"), "timestamp")
        self.assertEqual(logical_type("timestamp(6) without time zone"), "timestamp")
        self.assertEqual(logical_type("timestamp with time zone"), "instant")
        self.assertEqual(logical_type("TIMESTAMP(6) WITH TIME ZONE"), "instant")
        self.assertEqual(logical_type("date"), "date")
        self.assertEqual(logical_type("double precision"), "decimal")
        self.assertEqual(logical_type("NUMBER"), "number")

    def test_reference_target_and_delete_action(self):
        sql = (
            "CREATE TABLE stm_app (app_id integer NOT NULL);\n"
            "CREATE TABLE stm_par_app (pap_appid integer);\n"
            "ALTER TABLE stm_par_app ADD CONSTRAINT stm_pap_fk_app "
            "FOREIGN KEY (pap_appid) REFERENCES stm_app(app_id) ON DELETE CASCADE;"
        )
        document = {
            "columns": {
                "STM_PAR_APP.PAP_APPID": {
                    "required": False,
                    "status": "decided",
                    "type": "integer",
                    "default": None,
                    "references": {"column": "STM_APP.APP_ID", "on_delete": "set null"},
                }
            }
        }
        rows = [row for row in check_sql(document, sql, consumer="fixture") if row.klass == "references"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].expected, "set null")
        self.assertEqual(rows[0].observed, "cascade")

    def test_missing_configuration_key(self):
        document = {"configuration": {"setup.languageConfigured": {"fresh": "false", "upgraded": "true"}}}
        rows = check_sql(
            document,
            "INSERT INTO stm_conf (cnf_id, cnf_name, cnf_value) VALUES (1, 'language.default', 'en');",
            consumer="seed.sql",
        )
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].klass, "configuration")
        self.assertEqual(rows[0].observed, "absent")

    def test_unknown_key_or_type_is_rejected(self):
        rows = validate_document(
            {
                "columns": {"STM_APP.APP_NAME": {"status": "decided", "type": "other", "notes": True}},
                "extra": {},
            }
        )
        kinds = {row.observed for row in rows}
        self.assertIn("unknown section", kinds)
        self.assertTrue(any(row.observed.startswith("unknown key") for row in rows))
        self.assertTrue(any(row.observed.startswith("unknown type") for row in rows))

    def test_h2_oracle_and_postgresql_share_one_schema(self):
        schemas = {name: path.read_text() for name, path in {"pg": PG, "ora": ORA, "h2": H2}.items()}
        columns = {name: parse_create_columns(sql) for name, sql in schemas.items()}
        self.assertEqual(set(columns["pg"]), set(columns["ora"]))
        self.assertEqual(set(columns["pg"]), set(columns["h2"]))

        def shared_type(raw: str) -> str:
            text = raw.lower()
            if re.search(r"number\s*\(\s*(10|19)\s*,\s*0", text) or text.startswith("bigint"):
                return "integer"
            if text.startswith(("clob", "text")):
                return "string"
            return logical_type(text)

        for key in columns["pg"]:
            observed = {}
            for name, sql in schemas.items():
                raw = _raw_column_type(sql, key)
                col = columns[name][key]
                observed[name] = (shared_type(raw), col.length, col.required, col.default)
            self.assertEqual(len(set(observed.values())), 1, (key, observed))

        def links(sql: str) -> set[tuple]:
            return {
                (fk.table, fk.column, fk.ref_table, fk.ref_column, fk.on_delete or "")
                for fk in parse_foreign_keys(sql)
            }

        self.assertEqual(links(schemas["pg"]), links(schemas["ora"]))
        self.assertEqual(links(schemas["pg"]), links(schemas["h2"]))

        names = {name: _constraint_names(sql) for name, sql in schemas.items()}
        h2_only = names["h2"] - names["pg"]
        self.assertEqual(h2_only, {("STM_LITERAL_TRANSLATION", "UNIQUE", "(LTR_LITERAL)", "STM_LTR_LITERAL_UK")})
        self.assertEqual(names["pg"], names["ora"])
        self.assertEqual(names["pg"] - names["h2"], set())
        for sql in schemas.values():
            self.assertIn("stm_ltv_pkey", sql)
            self.assertIn("stm_ltr_literal_uk", sql)

        pg_codes = _codelist_rows(ROOT / "sitmun-backend/src/main/resources/db/changelog/baseline/02-codelists.postgresql.sql")
        ora_codes = _codelist_rows(ROOT / "sitmun-backend/src/main/resources/db/changelog/baseline/02-codelists.oracle.sql")
        self.assertEqual(pg_codes, ora_codes)


def _raw_column_type(sql: str, key: tuple[str, str]) -> str:
    table, column = key
    match = re.search(
        rf"CREATE TABLE\s+{table}\s*\((.*?)\);",
        sql,
        re.I | re.S,
    )
    body = match.group(1) if match else ""
    for line in body.splitlines():
        text = line.strip().rstrip(",")
        if text.upper().startswith(column + " "):
            rest = text[len(column) :].strip()
            rest = re.sub(r"\bNOT NULL\b", "", rest, flags=re.I)
            rest = re.sub(r"\bDEFAULT\b.*$", "", rest, flags=re.I)
            return rest.strip()
    raise AssertionError(key)


def _constraint_names(sql: str) -> set[tuple[str, str, str, str]]:
    found = set()
    pattern = re.compile(
        r"ALTER TABLE(?: ONLY)?\s+(\w+)\s+ADD CONSTRAINT\s+(\w+)\s+(PRIMARY KEY|UNIQUE|FOREIGN KEY)\s*(\([^)]*\))?",
        re.I,
    )
    for match in pattern.finditer(sql):
        cols = re.sub(r"\s+", "", (match.group(4) or "").upper())
        found.add((match.group(1).upper(), match.group(3).upper(), cols, match.group(2).upper()))
    return found


def _codelist_rows(path: Path) -> set[tuple[str, ...]]:
    text = path.read_text()
    rows = set()
    flags = {"true": "1", "false": "0", "1": "1", "0": "0"}
    for match in re.finditer(r"INSERT INTO stm_codelist\s*\([^)]*\)\s*VALUES\s*\((.*?)\)\s*;", text, re.I | re.S):
        parts: list[str] = []
        buf = ""
        quoted = False
        for char in match.group(1):
            if char == "'":
                quoted = not quoted
                buf += char
            elif char == "," and not quoted:
                parts.append(buf.strip())
                buf = ""
            else:
                buf += char
        if buf.strip():
            parts.append(buf.strip())
        parts[3] = flags[parts[3].lower()]
        parts[4] = flags[parts[4].lower()]
        rows.add(tuple(parts))
    return rows


if __name__ == "__main__":
    unittest.main()
