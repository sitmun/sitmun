#!/usr/bin/env python3
"""The version-check generator matches the shipped SQL, including its refusals."""

from __future__ import annotations

import csv
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

    def test_literal_upgrade_inserts_missing_values_without_updating(self) -> None:
        generator = load_generator()
        generated = generator.literal_values()
        for name in ("postgresql", "oracle"):
            shipped = (HOP / f"04b-literal-values.{name}.sql").read_text()
            self.assertEqual(generated, shipped)
        self.assertNotIn("UPDATE", generated)
        with (ROOT / "tools/seed-data/baseline/literal_translation_values.csv").open(
            newline=""
        ) as handle:
            rows = list(csv.DictReader(handle))
        self.assertEqual(generated.count("INSERT INTO stm_literal_translation_value"), len(rows))
        self.assertIn("ltr.ltr_literal = 'No data'", generated)
        self.assertIn("lang.lan_shortname = 'oc-aranes'", generated)
        self.assertIn("'Cap de donades'", generated)

    def test_prefix_rule_accepts_128_full_129_and_stopped_22c(self) -> None:
        generator = load_generator()
        for fixture in ("postgres-16.csv", "oracle-23.csv"):
            rows = generator.load_fixture(fixture)
            base, extra = generator.split_history(rows)
            self.assertTrue(generator.history_accepted(set(rows), rows), fixture)
            self.assertTrue(generator.history_accepted(set(base), rows), fixture)
            stopped = {
                row
                for row in rows
                if row[2]
                not in {
                    "changelog/23_add_document_export_tasks.yaml",
                    "changelog/24_add_default_template_regions.yaml",
                }
            }
            self.assertTrue(generator.history_accepted(stopped, rows), fixture)
            self.assertFalse(generator.history_accepted(set(rows) - {base[0]}, rows), fixture)
            without_20 = {row for row in rows if not row[0].startswith("20_")}
            self.assertFalse(generator.history_accepted(without_20, rows), fixture)
            through_22b = {
                row
                for row in rows
                if row[0] != "22c_document_export_codelists"
                and row[2]
                not in {
                    "changelog/23_add_document_export_tasks.yaml",
                    "changelog/24_add_default_template_regions.yaml",
                }
            }
            self.assertTrue(generator.history_accepted(through_22b, rows), fixture)
            rewritten = set(base)
            for row in extra:
                if row[0].startswith("22"):
                    rewritten.add(
                        (
                            "26" + row[0][2:],
                            row[1],
                            "changelog/26_map_image_task_type_pre23.yaml",
                        )
                    )
                else:
                    rewritten.add(row)
            self.assertFalse(generator.history_accepted(rewritten, rows), fixture)

    def test_catch_up_skips_22c_and_guards_each_step(self) -> None:
        generator = load_generator()
        for dialect in ("postgresql", "oracle"):
            generated = generator.catch_up(dialect)
            shipped = (UPGRADE / "1.2.8-to-1.2.9" / f"01-catch-up.{dialect}.sql").read_text()
            self.assertEqual(generated, shipped)
            self.assertNotIn("22c_document_export", generated)
            self.assertIn("STM_LOG orphan count", generated)
            self.assertIn("Exportar PDF A3 Vertical", generated)
            self.assertEqual(generated.count("INSERT INTO stm_task"), 6)
            self.assertIn("expectedResult:0", generated)
            self.assertIn("user_constraints" if dialect == "oracle" else "stm_atr_pk", generated)
            if dialect == "oracle":
                self.assertIn("nullable_flag = 'Y'", generated)
                self.assertIn("pk_on_id <> 1", generated)

    def test_oracle_tree_node_active_is_set_only_when_nullable(self) -> None:
        schema = (UPGRADE / "1.2.9-to-1.3.0" / "02-schema.oracle.sql").read_text()
        upgrade = (UPGRADE / "db.changelog-upgrade.yaml").read_text()
        self.assertNotIn("MODIFY (tno_active", schema)
        self.assertIn("upgrade-1.2.9-to-1.3.0-tno-active-oracle", upgrade)
        self.assertIn("column_name = 'TNO_ACTIVE'", upgrade)
        self.assertIn("nullable_flag = 'Y'", upgrade)


if __name__ == "__main__":
    unittest.main()
