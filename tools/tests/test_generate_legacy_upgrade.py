#!/usr/bin/env python3
"""The version-check generator matches the shipped SQL, including its refusals."""

from __future__ import annotations

import csv
import importlib.util
import sqlite3
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GENERATOR = ROOT / "tools" / "bin" / "generate_legacy_upgrade.py"
UPGRADE = ROOT / "sitmun-backend/src/main/resources/db/changelog/upgrade"
HOP = UPGRADE / "1.2.9-to-1.3.0"


def changelog_db() -> sqlite3.Connection:
    db = sqlite3.connect(":memory:")
    db.execute(
        "CREATE TABLE databasechangelog (id TEXT, author TEXT, filename TEXT, dateexecuted TEXT,"
        " orderexecuted INTEGER, exectype TEXT, md5sum TEXT, description TEXT, comments TEXT,"
        " liquibase TEXT, deployment_id TEXT)"
    )
    return db


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
            self.assertIn("cod_value = 'CAPABILITIES'", generated)
            self.assertNotIn("cod_value = 'LEGENDURL'", generated)
            self.assertIn(
                "DELETE FROM stm_codelist WHERE cod_list = 'service.type' "
                "AND cod_value IN ('AIMS', 'FME', 'TC')",
                generated,
            )
            self.assertNotIn("DELETE FROM stm_service", generated)
            self.assertNotIn("stm_task", generated)

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
        self.assertIn("ele.cod_value = 'CAPABILITIES'", postgres)
        self.assertNotIn("ele.cod_value = 'LEGENDURL'", postgres)

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

    def test_restore_gives_master_xml_rows_their_file_back(self) -> None:
        generator = load_generator()
        for fixture, name in (("postgres-16.csv", "postgresql"), ("oracle-23.csv", "oracle")):
            rows = generator.load_fixture(fixture)
            check = (UPGRADE / f"00-version-check.{name}.sql").read_text()
            replacements = generator.ORACLE_REPLACEMENTS if name == "oracle" else ()
            generated = generator.restore_filenames(rows, check, replacements)
            shipped = (UPGRADE.parent / "releases/1.3.1" / f"00-restore-changelog-filenames.{name}.sql").read_text()
            self.assertEqual(generated, shipped, name)
            head, _, rest = generated.partition("\nBEGIN\n")
            updates, _, body = rest.partition("  SELECT COUNT(*) INTO base_present")
            self.assertEqual(check, head + "\nBEGIN\n  SELECT COUNT(*) INTO base_present" + body, name)
            db = changelog_db()
            db.executemany(
                "INSERT INTO databasechangelog (id, author, filename) VALUES (?, ?, 'master.xml')",
                [(changeset_id, author) for changeset_id, author, _ in rows]
                + [("upgrade-1.2.8-to-1.2.9-19-" + name, "sitmun"), ("1", "partner")],
            )
            db.executescript(updates)
            present = set(db.execute("SELECT id, author, filename FROM databasechangelog"))
            self.assertTrue(generator.history_accepted(present, rows), name)
            self.assertEqual(
                {
                    ("upgrade-1.2.8-to-1.2.9-19-" + name, "sitmun", "master.xml"),
                    ("1", "partner", "master.xml"),
                },
                {row for row in present if row[2] == "master.xml"},
                name,
            )

    def test_restore_matches_legacy_rows_by_id_whatever_the_filename(self) -> None:
        generator = load_generator()
        for fixture, name in (("postgres-16.csv", "postgresql"), ("oracle-23.csv", "oracle")):
            rows = generator.load_fixture(fixture)
            check = (UPGRADE / f"00-version-check.{name}.sql").read_text()
            generated = generator.restore_filenames(rows, check)
            writes = generated.partition("\nBEGIN\n")[2].partition("  SELECT COUNT(*) INTO base_present")[0]
            forms = ("master.xml", "file:/usr/src/config/liquibase/{}", "{}")
            db = changelog_db()
            db.executemany(
                "INSERT INTO databasechangelog (id, author, filename) VALUES (?, ?, ?)",
                [
                    (changeset_id, author, forms[n % len(forms)].format(filename))
                    for n, (changeset_id, author, filename) in enumerate(rows)
                ]
                + [
                    ("1", "partner", "master.xml"),
                    ("upgrade-1.2.8-to-1.2.9-19-" + name, "sitmun", "master.xml"),
                ],
            )
            db.executescript(writes)
            present = set(db.execute("SELECT id, author, filename FROM databasechangelog"))
            self.assertTrue(set(rows) <= present, name)
            self.assertTrue(generator.history_accepted(present, rows), name)
            self.assertEqual(
                {("1", "partner", "master.xml"), ("upgrade-1.2.8-to-1.2.9-19-" + name, "sitmun", "master.xml")},
                present - set(rows),
                name,
            )
            db.executescript(writes)
            self.assertEqual(present, set(db.execute("SELECT id, author, filename FROM databasechangelog")), name)

    def test_restore_records_22_rows_that_ran_as_26_on_oracle(self) -> None:
        generator = load_generator()
        rows = generator.load_fixture("oracle-23.csv")
        check = (UPGRADE / "00-version-check.oracle.sql").read_text()
        generated = generator.restore_filenames(rows, check, generator.ORACLE_REPLACEMENTS)
        writes = generated.partition("\nBEGIN\n")[2].partition("  SELECT COUNT(*) INTO base_present")[0]
        replaced = dict(generator.ORACLE_REPLACEMENTS)
        stopped = [row for row in rows if row[0] != "22c_document_export_codelists"]
        db = changelog_db()
        db.executemany(
            "INSERT INTO databasechangelog (id, author, filename, orderexecuted, exectype)"
            " VALUES (?, 'sitmun', 'master.xml', ?, 'EXECUTED')",
            [(changeset_id, n) for n, (changeset_id, _, _) in enumerate(stopped)]
            + [(replacement, 900 + n) for n, replacement in enumerate(replaced.values())],
        )
        self.assertFalse(
            generator.history_accepted(set(db.execute("SELECT id, author, filename FROM databasechangelog")), rows)
        )
        db.executescript(writes)
        present = set(db.execute("SELECT id, author, filename FROM databasechangelog"))
        self.assertTrue(generator.history_accepted(present, rows))
        recorded = list(
            db.execute(
                "SELECT exectype, comments, orderexecuted FROM databasechangelog"
                " WHERE id = '22c_document_export_codelists'"
            )
        )
        self.assertEqual([("MARK_RAN", "applied as 26c_document_export_codelists", 903)], recorded)
        for original in ("22_document_export_task_type", "22_map_image_task_type", "22b_map_image_task_type_seq"):
            self.assertEqual(
                1, db.execute("SELECT COUNT(*) FROM databasechangelog WHERE id = ?", (original,)).fetchone()[0]
            )
        db.executescript(writes)
        self.assertEqual(present, set(db.execute("SELECT id, author, filename FROM databasechangelog")))

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
