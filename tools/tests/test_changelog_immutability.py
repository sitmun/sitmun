#!/usr/bin/env python3
"""PR-diff Liquibase immutability gate (stdlib unittest)."""

from __future__ import annotations

import io
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

BIN = Path(__file__).resolve().parent.parent / "bin"
sys.path.insert(0, str(BIN))

import check_changelog_immutability as cci  # noqa: E402


def _write_xml_tree(root: Path) -> Path:
    liquibase = root / "profiles" / "postgres" / "liquibase"
    changelog = liquibase / "changelog"
    changelog.mkdir(parents=True)
    (changelog / "01_schema.postgresql.sql").write_text("--changeset sitmun:1\n", encoding="utf-8")
    (changelog / "02_codelists.yaml").write_text("id: 2\n", encoding="utf-8")
    (changelog / "21_align.yaml").write_text("id: 21\n", encoding="utf-8")
    seed = changelog / "04_seed_data"
    seed.mkdir()
    (seed / "STM_USER.csv").write_text("1,a\n", encoding="utf-8")
    (changelog / "04_seed_data.yaml").write_text("id: 4\n", encoding="utf-8")
    (liquibase / "master.xml").write_text(
        """<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog>
  <include file="changelog/01_schema.postgresql.sql" relativeToChangelogFile="true"/>
  <include file="changelog/02_codelists.yaml" relativeToChangelogFile="true"/>
  <include file="changelog/04_seed_data.yaml" relativeToChangelogFile="true"/>
  <include file="changelog/21_align.yaml" relativeToChangelogFile="true"/>
</databaseChangeLog>
""",
        encoding="utf-8",
    )
    return liquibase


def _write_yaml_tree(root: Path) -> Path:
    liquibase = root / "sitmun-backend" / "config" / "db" / "changelog"
    liquibase.mkdir(parents=True)
    (liquibase / "01_schema.h2.sql").write_text("--changeset sitmun:1\n", encoding="utf-8")
    (liquibase / "22_align_nullability.yaml").write_text("id: 22\n", encoding="utf-8")
    (liquibase / "db.changelog-master.yaml").write_text(
        """databaseChangeLog:
  - include:
      file: 01_schema.h2.sql
      relativeToChangelogFile: true
  - include:
      file: 22_align_nullability.yaml
      relativeToChangelogFile: true
""",
        encoding="utf-8",
    )
    return liquibase


SHIPPED_POSTGRES_INCLUDES = frozenset(
    {
        "changelog/01_schema.postgresql.sql",
        "changelog/02_codelists.yaml",
        "changelog/04_seed_data.yaml",
        "changelog/21_align.yaml",
    }
)


def _append_includes(liquibase: Path, names: tuple[str, ...]) -> None:
    changelog = liquibase / "changelog"
    master = liquibase / "master.xml"
    extra = "".join(
        f'  <include file="changelog/{name}" relativeToChangelogFile="true"/>\n'
        for name in names
    )
    for name in names:
        (changelog / name).write_text(f"id: {name}\n", encoding="utf-8")
    master.write_text(
        master.read_text(encoding="utf-8").replace(
            '  <include file="changelog/21_align.yaml" relativeToChangelogFile="true"/>',
            '  <include file="changelog/21_align.yaml" relativeToChangelogFile="true"/>\n' + extra.rstrip("\n"),
        ),
        encoding="utf-8",
    )


class FixtureGateTest(unittest.TestCase):
    def test_default_trees_exist_in_repository(self) -> None:
        root = cci.repo_root_from_here()
        missing = [tree for tree in cci.DEFAULT_TREES if not (root / tree).is_dir()]
        self.assertEqual(missing, [])
    def test_editing_old_include_fails(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            liquibase = _write_xml_tree(root)
            violations = cci.check_tree(
                liquibase,
                ["profiles/postgres/liquibase/changelog/01_schema.postgresql.sql"],
                repo_root=root,
            )
            self.assertTrue(violations)
            self.assertEqual(violations[0].rel_path, "changelog/01_schema.postgresql.sql")
            self.assertEqual(violations[0].prefix, 1)
            self.assertEqual(violations[0].max_prefix, 21)

    def test_adding_newer_include_passes(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            liquibase = _write_xml_tree(root)
            (liquibase / "changelog" / "22_new.yaml").write_text("id: 22\n", encoding="utf-8")
            master = liquibase / "master.xml"
            master.write_text(
                master.read_text(encoding="utf-8").replace(
                    '  <include file="changelog/21_align.yaml" relativeToChangelogFile="true"/>',
                    '  <include file="changelog/21_align.yaml" relativeToChangelogFile="true"/>\n'
                    '  <include file="changelog/22_new.yaml" relativeToChangelogFile="true"/>',
                ),
                encoding="utf-8",
            )
            violations = cci.check_tree(
                liquibase,
                [
                    "profiles/postgres/liquibase/changelog/22_new.yaml",
                    "profiles/postgres/liquibase/master.xml",
                ],
                repo_root=root,
            )
            self.assertEqual(violations, [])

    def test_adding_several_newer_includes_passes(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            liquibase = _write_xml_tree(root)
            _append_includes(liquibase, ("22_types.yaml", "23_tasks.yaml", "24_regions.yaml"))
            sidecar = liquibase / "changelog" / "22_types" / "18_MapImageTaskDefinition.json"
            sidecar.parent.mkdir()
            sidecar.write_text("{}\n", encoding="utf-8")
            violations = cci.check_tree(
                liquibase,
                [
                    "profiles/postgres/liquibase/changelog/22_types.yaml",
                    "profiles/postgres/liquibase/changelog/22_types/18_MapImageTaskDefinition.json",
                    "profiles/postgres/liquibase/changelog/23_tasks.yaml",
                    "profiles/postgres/liquibase/changelog/24_regions.yaml",
                    "profiles/postgres/liquibase/master.xml",
                ],
                repo_root=root,
                shipped_includes=SHIPPED_POSTGRES_INCLUDES,
            )
            self.assertEqual(violations, [])

    def test_new_sidecar_on_shipped_include_fails(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            liquibase = _write_xml_tree(root)
            _append_includes(liquibase, ("22_types.yaml",))
            sidecar = liquibase / "changelog" / "21_align" / "extra.json"
            sidecar.parent.mkdir()
            sidecar.write_text("{}\n", encoding="utf-8")
            violations = cci.check_tree(
                liquibase,
                ["profiles/postgres/liquibase/changelog/21_align/extra.json"],
                repo_root=root,
                shipped_includes=SHIPPED_POSTGRES_INCLUDES,
            )
            self.assertTrue(violations)
            self.assertEqual(violations[0].rel_path, "changelog/21_align/extra.json")
            self.assertEqual(violations[0].prefix, 21)

    def test_editing_shipped_include_fails_when_adding_newer(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            liquibase = _write_xml_tree(root)
            _append_includes(liquibase, ("22_types.yaml",))
            violations = cci.check_tree(
                liquibase,
                [
                    "profiles/postgres/liquibase/changelog/01_schema.postgresql.sql",
                    "profiles/postgres/liquibase/changelog/22_types.yaml",
                ],
                repo_root=root,
                shipped_includes=SHIPPED_POSTGRES_INCLUDES,
            )
            self.assertEqual(len(violations), 1)
            self.assertEqual(violations[0].rel_path, "changelog/01_schema.postgresql.sql")

    def test_editing_tip_include_passes(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            liquibase = _write_xml_tree(root)
            violations = cci.check_tree(
                liquibase,
                ["profiles/postgres/liquibase/changelog/21_align.yaml"],
                repo_root=root,
            )
            self.assertEqual(violations, [])

    def test_allowlisted_seed_csv_passes(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            liquibase = _write_xml_tree(root)
            violations = cci.check_tree(
                liquibase,
                ["profiles/postgres/liquibase/changelog/04_seed_data/STM_USER.csv"],
                repo_root=root,
            )
            self.assertEqual(violations, [])

    def test_yaml_master_old_schema_fails(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            liquibase = _write_yaml_tree(root)
            violations = cci.check_tree(
                liquibase,
                [
                    "sitmun-backend/config/db/changelog/01_schema.h2.sql"
                ],
                repo_root=root,
            )
            self.assertTrue(violations)
            self.assertEqual(violations[0].prefix, 1)
            self.assertEqual(violations[0].max_prefix, 22)

    def test_empty_diff_passes(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            liquibase = _write_xml_tree(root)
            violations = cci.check_tree(liquibase, [], repo_root=root)
            self.assertEqual(violations, [])

    def test_main_exits_1_on_old_include(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            liquibase = _write_xml_tree(root)
            buf = io.StringIO()
            with patch("sys.stdout", buf):
                rc = cci.main(
                    [
                        "--repo-root",
                        str(root),
                        "--tree",
                        str(liquibase),
                        "--changed-file",
                        "profiles/postgres/liquibase/changelog/01_schema.postgresql.sql",
                    ]
                )
            self.assertEqual(rc, 1)
            self.assertIn("01_schema.postgresql.sql", buf.getvalue())

    def test_main_exits_0_on_empty_diff(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            liquibase = _write_xml_tree(root)
            rc = cci.main(
                [
                    "--repo-root",
                    str(root),
                    "--tree",
                    str(liquibase),
                    "--no-git",
                ]
            )
            self.assertEqual(rc, 0)


BACKEND_TREE = "sitmun-backend/src/main/resources/db/changelog"
BASELINE = f"{BACKEND_TREE}/baseline/x.sql"
HOP = f"{BACKEND_TREE}/upgrade/y.yaml"


def _git(root: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=root, check=True, capture_output=True)


def _released_repo(root: Path, *tags: str) -> None:
    _git(root, "init", "-q")
    _git(root, "config", "user.email", "t@example.org")
    _git(root, "config", "user.name", "t")
    for rel in (BASELINE, HOP):
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("--changeset sitmun:1\n", encoding="utf-8")
    (root / BACKEND_TREE / "db.changelog-master.yaml").write_text("databaseChangeLog: []\n", encoding="utf-8")
    _git(root, "add", ".")
    _git(root, "commit", "-q", "-m", "release")
    for tag in tags:
        _git(root, "tag", "-a", tag, "-m", tag)


class ReleasedFileGateTest(unittest.TestCase):
    def test_editing_a_file_from_the_release_tag_fails(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _released_repo(root, "v1.3.0")
            for rel in (BASELINE, HOP):
                (root / rel).write_text("--changeset sitmun:1\nedited\n", encoding="utf-8")
            tag = cci.latest_release_tag(root)
            self.assertEqual(tag, "v1.3.0")
            self.assertEqual(
                cci.released_file_violations(root, [BACKEND_TREE], [BASELINE, HOP], tag),
                [BASELINE, HOP],
            )

    def test_deleting_a_file_from_the_release_tag_fails(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _released_repo(root, "v1.3.0")
            (root / HOP).unlink()
            self.assertEqual(
                cci.released_file_violations(root, [BACKEND_TREE], [HOP], "v1.3.0"),
                [HOP],
            )

    def test_new_release_file_passes(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _released_repo(root, "v1.3.0")
            new = f"{BACKEND_TREE}/releases/1.3.1/01-change.sql"
            (root / new).parent.mkdir(parents=True)
            (root / new).write_text("--changeset sitmun:2\n", encoding="utf-8")
            self.assertEqual(cci.released_file_violations(root, [BACKEND_TREE], [new], "v1.3.0"), [])

    def test_master_from_the_release_tag_can_include_a_new_file(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _released_repo(root, "v1.3.0")
            master = f"{BACKEND_TREE}/db.changelog-master.yaml"
            (root / master).write_text("databaseChangeLog:\n  - include: {file: releases/x.sql}\n", encoding="utf-8")
            self.assertEqual(cci.released_file_violations(root, [BACKEND_TREE], [master], "v1.3.0"), [])

    def test_unchanged_content_passes(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _released_repo(root, "v1.3.0")
            self.assertEqual(cci.released_file_violations(root, [BACKEND_TREE], [BASELINE], "v1.3.0"), [])

    def test_without_a_release_tag_nothing_is_frozen(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _released_repo(root, "legacy/sitmun-backend-core/sitmun-backend-core/1.2.9", "v1.3", "v1.3.0-rc.1")
            self.assertIsNone(cci.latest_release_tag(root))

    def test_newest_release_tag_decides(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _released_repo(root, "v1.3.0")
            (root / HOP).write_text("--changeset sitmun:1\n--changeset sitmun:2\n", encoding="utf-8")
            _git(root, "commit", "-q", "-am", "1.3.1")
            _git(root, "tag", "-a", "v1.3.1", "-m", "v1.3.1")
            tag = cci.latest_release_tag(root)
            self.assertEqual(tag, "v1.3.1")
            self.assertEqual(cci.released_file_violations(root, [BACKEND_TREE], [HOP], tag), [])
            _git(root, "tag", "-a", "v1.10.0", "-m", "v1.10.0", "HEAD~1")
            self.assertEqual(cci.latest_release_tag(root), "v1.10.0")

    def test_main_exits_1_and_names_the_tag(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            _released_repo(root, "v1.3.0")
            (root / BASELINE).write_text("edited\n", encoding="utf-8")
            buf = io.StringIO()
            with patch("sys.stdout", buf):
                rc = cci.main(["--repo-root", str(root), "--tree", BACKEND_TREE, "--changed-file", BASELINE])
            self.assertEqual(rc, 1)
            self.assertIn("v1.3.0", buf.getvalue())
            self.assertIn(BASELINE, buf.getvalue())


class PrefixAndAllowlistTest(unittest.TestCase):
    def test_prefix_from_filename(self) -> None:
        self.assertEqual(cci.include_prefix("changelog/01_schema.postgresql.sql"), 1)
        self.assertEqual(cci.include_prefix("22_align_nullability.yaml"), 22)
        self.assertIsNone(cci.include_prefix("db.changelog-master.yaml"))

    def test_development_codelist_is_not_allowlisted(self) -> None:
        self.assertFalse(
            cci.is_allowlisted(
                "profiles/development/backend/liquibase",
                "changelog/02_codelists.yaml",
            )
        )

    def test_postgres_sequences_are_allowlisted(self) -> None:
        self.assertTrue(
            cci.is_allowlisted(
                "profiles/postgres/liquibase",
                "changelog/07_sequences.yaml",
            )
        )

    def test_showcase_tree_is_checked_and_not_allowlisted(self) -> None:
        self.assertIn("profiles/showcase/liquibase", cci.DEFAULT_TREES)
        self.assertFalse(
            cci.is_allowlisted(
                "profiles/showcase/liquibase",
                "changelog/01_showcase_data.yaml",
            )
        )

    def test_development_changeset_4_is_allowlisted(self) -> None:
        self.assertTrue(
            cci.is_allowlisted(
                "profiles/development/backend/liquibase",
                "changelog/04_initial_data_dev/stm_service.csv",
            )
        )

    def test_valid_checksum_only_diff_passes(self) -> None:
        diff = """diff --git a/profiles/postgres/liquibase/changelog/01_schema.postgresql.sql b/profiles/postgres/liquibase/changelog/01_schema.postgresql.sql
--- a/profiles/postgres/liquibase/changelog/01_schema.postgresql.sql
+++ b/profiles/postgres/liquibase/changelog/01_schema.postgresql.sql
@@ -2,0 +3 @@ --changeset sitmun:1 dbms:postgresql
+--validCheckSum: 9:5e70534cb73f2b7b81d9b8164e162036
"""
        self.assertTrue(cci.is_valid_checksum_only_diff(diff))

    def test_schema_sql_edit_is_not_valid_checksum_only(self) -> None:
        diff = """@@ -10,1 +10,1 @@
-  APP_NAME VARCHAR(50),
+  APP_NAME VARCHAR(80),
"""
        self.assertFalse(cci.is_valid_checksum_only_diff(diff))

    def test_empty_diff_is_not_valid_checksum_only(self) -> None:
        self.assertFalse(cci.is_valid_checksum_only_diff(""))


if __name__ == "__main__":
    unittest.main()
