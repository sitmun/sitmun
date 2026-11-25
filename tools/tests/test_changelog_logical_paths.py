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
SQL_CHANGESET = re.compile(r"^--changeset\s+(\S+)(.*)$", re.M)
YAML_CHANGESET = re.compile(r"^(\s*)- changeSet:\s*$", re.M)


def unpinned_sql(text: str) -> list[str]:
    return [m.group(1) for m in SQL_CHANGESET.finditer(text) if "logicalFilePath:" not in m.group(2)]


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

    def test_every_shipped_changeset_names_its_logical_path(self) -> None:
        missing = []
        for path in sorted(CHANGELOG.rglob("*")):
            if path.suffix == ".sql":
                ids = unpinned_sql(path.read_text())
            elif path.suffix in (".yaml", ".yml"):
                ids = unpinned_yaml(path.read_text())
            else:
                continue
            missing += [f"{path.relative_to(CHANGELOG)}: {i}" for i in ids]
        self.assertEqual([], missing, "\n".join(missing))


if __name__ == "__main__":
    unittest.main()
