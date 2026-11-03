#!/usr/bin/env python3
"""The version-check generator matches the shipped SQL, including its refusals."""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GENERATOR = ROOT / "tools" / "bin" / "generate_legacy_upgrade.py"
UPGRADE = ROOT / "sitmun-backend/src/main/resources/db/changelog/upgrade"
HOP = UPGRADE / "1.2.9-to-1.3.0"


def load_generator():
    spec = importlib.util.spec_from_file_location("generate_legacy_upgrade", GENERATOR)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class VersionCheckGeneratorTest(unittest.TestCase):
    def test_postgres_version_check_matches_shipped_sql(self) -> None:
        generator = load_generator()
        generated = generator.version_check_postgres(generator.load_fixture("postgres-16.csv"))
        shipped = (UPGRADE / "00-version-check.postgresql.sql").read_text()
        self.assertEqual(generated, shipped)

    def test_oracle_version_check_matches_shipped_sql(self) -> None:
        generator = load_generator()
        generated = generator.version_check_oracle(generator.load_fixture("oracle-23.csv"))
        shipped = (UPGRADE / "00-version-check.oracle.sql").read_text()
        self.assertEqual(generated, shipped)

    def test_version_check_refuses_an_unconfirmed_default_language(self) -> None:
        generator = load_generator()
        for name, generated in (
            ("postgresql", generator.version_check_postgres(generator.load_fixture("postgres-16.csv"))),
            ("oracle", generator.version_check_oracle(generator.load_fixture("oracle-23.csv"))),
        ):
            self.assertIn("${upgrade.defaultLanguage}", generated, name)
            self.assertIn("SITMUN_UPGRADE_DEFAULT_LANGUAGE", generated, name)
            self.assertIn("STM_CONF", generated, name)
            self.assertIn("STM_LANGUAGE", generated, name)

    def test_codelist_upgrade_matches_shipped_sql(self) -> None:
        generator = load_generator()
        for oracle, name in ((False, "postgresql"), (True, "oracle")):
            generated = generator.codelists(oracle)
            shipped = (HOP / f"03-codelists.{name}.sql").read_text()
            self.assertEqual(generated, shipped)
            for statement in generated.split(";\n"):
                if statement.lstrip().startswith("UPDATE"):
                    self.assertNotIn("cod_description", statement)
            self.assertIn(
                "SET cod_system = true WHERE cod_list = 'user.identificationType' AND cod_value = 'DNI'"
                if not oracle
                else "SET cod_system = 1 WHERE cod_list = 'user.identificationType' AND cod_value = 'DNI'",
                generated,
            )
            self.assertIn("cod_default", generated)
            self.assertIn("language.default", generated)

    def test_translation_upgrade_matches_shipped_sql(self) -> None:
        generator = load_generator()
        for oracle, name in ((False, "postgresql"), (True, "oracle")):
            generated = generator.translations(oracle)
            shipped = (HOP / f"04-translations.{name}.sql").read_text()
            self.assertEqual(generated, shipped)
        postgres = generator.translations(False)
        self.assertIn(
            "UPDATE stm_translation SET tra_name = 'DNI' WHERE tra_column = 'CodeListValue.description' "
            "AND tra_name = 'Demo'",
            postgres,
        )
        self.assertIn("<> 'en'", postgres)
        self.assertIn("lan_shortname = 'en'", postgres)


if __name__ == "__main__":
    unittest.main()
