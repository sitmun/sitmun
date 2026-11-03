#!/usr/bin/env python3
"""English code-value labels are derived from the base description."""

from __future__ import annotations

import csv
import importlib.util
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "tools/seed-data/baseline"
BASELINE = ROOT / "sitmun-backend/src/main/resources/db/changelog/baseline"
GENERATOR = ROOT / "tools/bin/generate_baseline_seed.py"


def load_generator():
    spec = importlib.util.spec_from_file_location("generate_baseline_seed", GENERATOR)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SeedTranslationTest(unittest.TestCase):
    def test_csv_stores_no_english_code_value(self) -> None:
        with (SEED / "translations.csv").open(newline="") as handle:
            stored = [
                row
                for row in csv.DictReader(handle)
                if row["tra_column"] == "CodeListValue.description" and row["lan_shortname"] == "en"
            ]
        self.assertEqual(stored, [])

    def test_baseline_sql_derives_english_from_the_description(self) -> None:
        generator = load_generator()
        shipped = (BASELINE / "04-translations.sql").read_text()
        self.assertEqual("\n".join(generator.translation_statements()) + "\n", shipped)
        with (SEED / "codelists.csv").open(newline="") as handle:
            codelists = {
                (row["cod_list"], row["cod_value"]): row["cod_description"]
                for row in csv.DictReader(handle)
            }
        with (SEED / "translations.csv").open(newline="") as handle:
            translated = {
                (row["element"], row["element_value"])
                for row in csv.DictReader(handle)
                if row["tra_column"] == "CodeListValue.description"
            }
        english = {}
        for line in shipped.splitlines():
            if "lan_shortname = 'en'" not in line or "CodeListValue.description" not in line:
                continue
            code_list = line.split("c.cod_list = ", 1)[1].split(" AND ", 1)[0].strip("'")
            value = line.split("c.cod_value = ", 1)[1].split(";", 1)[0].strip("'")
            text = line.split("lang.lan_id, ", 1)[1].split(" FROM ", 1)[0].strip("'")
            english[(code_list, value)] = text
        self.assertEqual(set(english), translated)
        for key, text in english.items():
            self.assertEqual(text, codelists[key], key)

    def test_baseline_code_lists_match_the_generator(self) -> None:
        generator = load_generator()
        for oracle, name in ((False, "postgresql"), (True, "oracle")):
            shipped = (BASELINE / f"02-codelists.{name}.sql").read_text()
            self.assertEqual("\n".join(generator.codelist_statements(oracle)) + "\n", shipped)

    def test_tools_do_not_read_the_retired_json_baselines(self) -> None:
        forbidden = (
            "master-" + "i18n",
            "i18n-active-" + "baseline.json",
            "generate_all_" + "seed_outputs.py",
        )
        hits = []
        for path in (ROOT / "tools").rglob("*"):
            if not path.is_file() or "out" in path.relative_to(ROOT / "tools").parts:
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                continue
            for token in forbidden:
                if token in text:
                    hits.append(f"{path.relative_to(ROOT)}: {token}")
        self.assertEqual(hits, [])

    def test_translation_report_exits_zero(self) -> None:
        completed = subprocess.run(
            [sys.executable, str(ROOT / "tools/bin/check_translations.py")],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(completed.returncode, 0, completed.stdout + completed.stderr)
        self.assertNotIn("literal ", completed.stdout)

    def test_literal_gap_is_listed_until_the_value_exists(self) -> None:
        script = ROOT / "tools/bin/check_translations.py"
        with tempfile.TemporaryDirectory() as tmp:
            seed = Path(tmp) / "baseline"
            shutil.copytree(SEED, seed)
            values = seed / "literal_translation_values.csv"
            kept = [
                line
                for line in values.read_text().splitlines()
                if not line.startswith("4,1,fr,")
            ]
            values.write_text("\n".join(kept) + "\n")
            missing = subprocess.run(
                [sys.executable, str(script), str(seed)],
                cwd=ROOT,
                capture_output=True,
                text=True,
            )
        self.assertEqual(missing.returncode, 0, missing.stdout + missing.stderr)
        self.assertIn("fr literal No data", missing.stdout)
        present = subprocess.run(
            [sys.executable, str(script)],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        self.assertEqual(present.returncode, 0, present.stdout + present.stderr)
        self.assertNotIn("fr literal No data", present.stdout)


if __name__ == "__main__":
    unittest.main()
