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
    decide_open_rows,
    load_system_codelists,
    norm_default,
    parse_create_columns,
    parse_uniques,
    read_dictionary,
    write_dictionary,
)

FIXTURES = BIN / "testdata" / "data_dictionary"
PG = ROOT / "sitmun-backend/src/main/resources/db/changelog/baseline/01-schema.postgresql.sql"
ORA = ROOT / "sitmun-backend/src/main/resources/db/changelog/baseline/01-schema.oracle.sql"
H2 = ROOT / "sitmun-backend/src/test/resources/db/changelog-test/01-schema.h2.sql"
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


if __name__ == "__main__":
    unittest.main()
