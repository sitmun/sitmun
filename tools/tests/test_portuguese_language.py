#!/usr/bin/env python3
"""1.3.0 ships Portuguese: baseline, upgrade hop, and Language.name rows."""

from __future__ import annotations

import csv
import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "tools/seed-data/baseline"
BASELINE = ROOT / "sitmun-backend/src/main/resources/db/changelog/baseline"
HOP = ROOT / "sitmun-backend/src/main/resources/db/changelog/upgrade/1.2.9-to-1.3.0"
CHANGELOG = ROOT / "sitmun-backend/src/main/resources/db/changelog/upgrade/db.changelog-upgrade.yaml"
GENERATOR = ROOT / "tools/bin/generate_legacy_upgrade.py"

PT_NAMES = {
    ("pt-PT", "ca"): "Portuguès",
    ("pt-PT", "en"): "Portuguese",
    ("pt-PT", "es"): "Portugués",
    ("pt-PT", "fr"): "Portugais",
    ("pt-PT", "oc-aranes"): "Portugués",
    ("en", "pt-PT"): "Inglês",
    ("es", "pt-PT"): "Espanhol",
    ("ca", "pt-PT"): "Catalão",
    ("oc-aranes", "pt-PT"): "Aranês",
    ("fr", "pt-PT"): "Francês",
    ("pt-PT", "pt-PT"): "Português",
}


def load_generator():
    spec = importlib.util.spec_from_file_location("generate_legacy_upgrade", GENERATOR)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PortugueseLanguageTest(unittest.TestCase):
    def test_baseline_languages_csv_ships_portuguese(self) -> None:
        with (SEED / "languages.csv").open(newline="") as handle:
            rows = list(csv.DictReader(handle))
        shortnames = [row["lan_shortname"] for row in rows]
        self.assertIn("pt-PT", shortnames)
        pt = next(row for row in rows if row["lan_shortname"] == "pt-PT")
        self.assertEqual(pt["lan_name"], "Português")
        self.assertEqual(pt["lan_order"], "6")
        self.assertEqual(pt["lan_enabled"], "true")

    def test_baseline_translations_csv_has_eleven_language_name_rows(self) -> None:
        with (SEED / "translations.csv").open(newline="") as handle:
            rows = [
                row
                for row in csv.DictReader(handle)
                if row["tra_column"] == "Language.name"
                and (row["element"] == "pt-PT" or row["lan_shortname"] == "pt-PT")
            ]
        self.assertEqual(len(rows), 11)
        found = {(row["element"], row["lan_shortname"]): row["tra_name"] for row in rows}
        self.assertEqual(found, PT_NAMES)

    def test_baseline_sql_inserts_portuguese(self) -> None:
        for name in ("postgresql", "oracle"):
            text = (BASELINE / f"03-languages.{name}.sql").read_text()
            self.assertIn("'pt-PT'", text, name)
            self.assertIn("'Português'", text, name)
        translations = (BASELINE / "04-translations.sql").read_text()
        self.assertIn("ele.lan_shortname = 'pt-PT'", translations)
        self.assertIn("lang.lan_shortname = 'pt-PT'", translations)
        self.assertIn("'Portuguese'", translations)
        self.assertIn("'Inglês'", translations)

    def test_upgrade_inserts_portuguese_by_shortname_before_translations(self) -> None:
        changelog = CHANGELOG.read_text()
        self.assertIn("upgrade-1.2.9-to-1.3.0-portuguese-language-postgresql", changelog)
        self.assertIn("upgrade-1.2.9-to-1.3.0-portuguese-language-oracle", changelog)
        pg_pos = changelog.index("upgrade-1.2.9-to-1.3.0-portuguese-language-postgresql")
        tr_pos = changelog.index("upgrade-1.2.9-to-1.3.0-translations-postgresql")
        self.assertLess(pg_pos, tr_pos)
        for name in ("postgresql", "oracle"):
            text = (HOP / f"03b-portuguese-language.{name}.sql").read_text()
            self.assertIn("lan_shortname = 'pt-PT'", text, name)
            self.assertIn("NOT EXISTS", text, name)
            self.assertIn("MAX(lan_id)", text, name)
            self.assertIn("'Português'", text, name)
            self.assertNotIn("VALUES (6,", text, name)

    def test_translation_upgrade_includes_portuguese_language_names(self) -> None:
        generator = load_generator()
        generated = generator.translations(False)
        shipped = (HOP / "04-translations.postgresql.sql").read_text()
        self.assertEqual(generated, shipped)
        self.assertIn("ele.lan_shortname = 'pt-PT'", generated)
        self.assertIn("lang.lan_shortname = 'pt-PT'", generated)
        self.assertIn("'Portuguese'", generated)
        self.assertIn("'Inglês'", generated)


if __name__ == "__main__":
    unittest.main()
