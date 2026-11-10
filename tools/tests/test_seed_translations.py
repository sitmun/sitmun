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


FEATURE_TYPE_LABELS = (
    ("Task.name", "Exportar PDF A4 Vertical", ""),
    ("Task.name", "Exportar PDF A3 Vertical", ""),
    ("Task.name", "Exportar PDF A4 Horitzontal", ""),
    ("Task.name", "Exportar PDF A3 Horitzontal", ""),
    ("Task.name", "Capçalera per defecte", ""),
    ("Task.name", "Peu de pàgina per defecte", ""),
    ("CodeListValue.description", "queryTask.scope", "external-link"),
    ("CodeListValue.description", "queryTask.mimeType", "image/png"),
    ("CodeListValue.description", "queryTask.mimeType", "image/jpeg"),
    ("CodeListValue.description", "queryTask.mimeType", "image/gif"),
    ("CodeListValue.description", "queryTask.mimeType", "image/svg+xml"),
    ("CodeListValue.description", "queryTask.mimeType", "application/pdf"),
    ("CodeListValue.description", "queryTask.mimeType", "application/json"),
    ("CodeListValue.description", "queryTask.mimeType", "application/xml"),
    ("CodeListValue.description", "queryTask.mimeType", "application/msword"),
    ("CodeListValue.description", "queryTask.mimeType", "application/vnd.ms-excel"),
    ("CodeListValue.description", "queryTask.mimeType", "application/vnd.oasis.opendocument.text"),
    ("CodeListValue.description", "queryTask.mimeType", "application/vnd.oasis.opendocument.spreadsheet"),
    ("CodeListValue.description", "service.authenticationMode", "API key"),
    ("CodeListValue.description", "apiKey.header", "X-API-Key"),
    ("CodeListValue.description", "apiKey.cookie", "X-API-Key"),
    ("CodeListValue.description", "apiKey.queryParam", "API-Key"),
    ("CodeListValue.description", "queryTask.scope", "web-api-query-no-proxy"),
    ("CodeListValue.description", "queryTask.scope", "resource-query"),
    ("CodeListValue.description", "documentExport.output", "pdf"),
    ("CodeListValue.description", "documentExport.engine", "openhtmltopdf"),
    ("CodeListValue.description", "moreInfo.type", "API"),
    ("CodeListValue.description", "moreInfo.type", "RESOURCE"),
    ("CodeListValue.description", "moreInfo.type", "SQL"),
    ("CodeListValue.description", "moreInfo.type", "URL"),
    ("CodeListValue.description", "taskEntity.jsonParamType", "null"),
    ("CodeListValue.description", "cartographyParameter.format", "AUTO"),
)

FEATURE_TYPE_LANGUAGES = ("ca", "es", "fr", "oc-aranes", "pt-PT")


class SeedTranslationTest(unittest.TestCase):
    def test_feature_type_labels_exist_for_every_non_english_language(self) -> None:
        with (SEED / "translations.csv").open(newline="") as handle:
            present = {
                (row["tra_column"], row["element"], row["element_value"], row["lan_shortname"])
                for row in csv.DictReader(handle)
            }
        missing = [
            f"{language} {column} {element} {value}".strip()
            for column, element, value in FEATURE_TYPE_LABELS
            for language in FEATURE_TYPE_LANGUAGES
            if (column, element, value, language) not in present
        ]
        self.assertEqual(missing, [])
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
        literal_gaps = [
            line for line in completed.stdout.splitlines() if " literal " in line
        ]
        self.assertTrue(
            all(line.startswith("pt-PT literal ") for line in literal_gaps),
            literal_gaps,
        )

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
