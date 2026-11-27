#!/usr/bin/env python3
"""Every shipped changeset names its own logicalFilePath (#404).

Without one, Liquibase 4.31.0 and later record the logicalFilePath of the
master that loaded the changeset. The profile master and the shipped master
give different names, and a changeset recorded under one runs again under
the other.
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHANGELOG = ROOT / "sitmun-backend/src/main/resources/db/changelog"
PROFILE_RELEASES = ("profiles/showcase/liquibase/releases", "profiles/development/backend/liquibase/releases")
LOGICAL_PATH = re.compile(r"logicalFilePath:\s*(\S+)")
SQL_CHANGESET = re.compile(r"^--changeset\s+(\S+)(.*)$", re.M)
YAML_CHANGESET = re.compile(r"^(\s*)- changeSet:\s*$", re.M)


def unpinned_sql(text: str) -> list[str]:
    return [m.group(1) for m in SQL_CHANGESET.finditer(text) if "logicalFilePath:" not in m.group(2)]


def changeset_files(root: Path) -> list[Path]:
    return sorted(p for p in root.rglob("*") if p.suffix in (".sql", ".yaml", ".yml"))


def unpinned(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    return unpinned_sql(text) if path.suffix == ".sql" else unpinned_yaml(text)


def foreign_paths(folder: Path, text: str) -> list[str]:
    """Logical paths in a version folder that do not name a file of that folder."""
    files = {p.name for p in folder.iterdir()}
    prefix = f"releases/{folder.name}/"
    return [
        value
        for value in LOGICAL_PATH.findall(text)
        if not (prefix in value and value.rsplit(prefix, 1)[1] in files)
    ]


def unpinned_yaml(text: str) -> list[str]:
    missing = []
    for match in YAML_CHANGESET.finditer(text):
        indent = match.group(1)
        end = re.compile(rf"^{re.escape(indent)}- ", re.M).search(text, match.end())
        block = text[match.end() : end.start() if end else len(text)]
        if not re.search(r"^\s+logicalFilePath:", block, re.M):
            found = re.search(r"^\s+id:\s*(\S+)", block, re.M)
            missing.append(found.group(1) if found else "?")
    return missing


class LogicalPathTest(unittest.TestCase):
    def test_helpers_spot_a_missing_path(self) -> None:
        self.assertEqual(["sitmun:a"], unpinned_sql("--changeset sitmun:a dbms:oracle\n--changeset sitmun:b logicalFilePath:x\n"))
        yaml = "databaseChangeLog:\n  - changeSet:\n      id: a\n  - changeSet:\n      id: b\n      logicalFilePath: x\n"
        self.assertEqual(["a"], unpinned_yaml(yaml))

    def test_helper_spots_a_path_outside_the_folder(self) -> None:
        folder = CHANGELOG / "releases" / "1.3.1"
        self.assertEqual([], foreign_paths(folder, "logicalFilePath: db/changelog/releases/1.3.1/db.changelog-1.3.1-pre-upgrade.yaml"))
        self.assertEqual(["master.xml"], foreign_paths(folder, "--changeset sitmun:x logicalFilePath:master.xml"))
        self.assertEqual(
            ["db/changelog/releases/1.3.0/x.sql"], foreign_paths(folder, "logicalFilePath: db/changelog/releases/1.3.0/x.sql")
        )

    def test_every_shipped_changeset_names_its_logical_path(self) -> None:
        missing = [f"{p.relative_to(CHANGELOG)}: {i}" for p in changeset_files(CHANGELOG) for i in unpinned(p)]
        self.assertEqual([], missing, "\n".join(missing))

    def test_every_profile_release_changeset_names_its_logical_path(self) -> None:
        missing = [
            f"{p.relative_to(ROOT)}: {i}"
            for rel in PROFILE_RELEASES
            if (ROOT / rel).is_dir()
            for p in changeset_files(ROOT / rel)
            for i in unpinned(p)
        ]
        self.assertEqual([], missing, "\n".join(missing))

    def test_a_version_folder_pins_its_own_files(self) -> None:
        roots = [CHANGELOG / "releases", *(ROOT / rel for rel in PROFILE_RELEASES)]
        wrong = [
            f"{p.relative_to(ROOT)}: {value}"
            for root in roots
            if root.is_dir()
            for folder in sorted(f for f in root.iterdir() if f.is_dir())
            for p in changeset_files(folder)
            for value in foreign_paths(folder, p.read_text(encoding="utf-8"))
        ]
        self.assertEqual([], wrong, "\n".join(wrong))


if __name__ == "__main__":
    unittest.main()
