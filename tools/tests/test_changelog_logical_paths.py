#!/usr/bin/env python3
"""Every changeset pins its logicalFilePath (#404). See docs/database-changelogs.md.

Without one, Liquibase 4.31.0 and later record the logicalFilePath of the
master that loaded the changeset. The profile master and the shipped master
give different names, and a changeset recorded under one runs again under
the other.

A changeset in a `releases/<version>/` folder pins `master.xml`, so its id
alone tells it apart: `<version>-<topic>[-<dbms>]`, unique across the shipped,
showcase, and development trees.
"""

from __future__ import annotations

import re
import unittest
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHANGELOG = ROOT / "sitmun-backend/src/main/resources/db/changelog"
TREES = (CHANGELOG, ROOT / "profiles/showcase/liquibase", ROOT / "profiles/development/backend/liquibase")
RELEASE_PATH = "master.xml"
SQL_CHANGESET = re.compile(r"^--changeset\s+([^:\s]+):(\S+)(.*)$", re.M)
YAML_CHANGESET = re.compile(r"^(\s*)- changeSet:\s*$", re.M)
VERSION = re.compile(r"^\d+\.\d+\.\d+$")


@dataclass(frozen=True)
class Changeset:
    id: str
    author: str
    path: str | None


def sql_changesets(text: str) -> list[Changeset]:
    found = []
    for match in SQL_CHANGESET.finditer(text):
        path = re.search(r"logicalFilePath:(\S+)", match.group(3))
        found.append(Changeset(match.group(2), match.group(1), path.group(1) if path else None))
    return found


def yaml_changesets(text: str) -> list[Changeset]:
    found = []
    for match in YAML_CHANGESET.finditer(text):
        indent = match.group(1)
        end = re.compile(rf"^{re.escape(indent)}- ", re.M).search(text, match.end())
        block = text[match.end() : end.start() if end else len(text)]

        def field(name: str, block: str = block) -> str | None:
            value = re.search(rf"^\s+{name}:\s*(\S+)", block, re.M)
            return value.group(1).strip("\"'") if value else None

        found.append(Changeset(field("id") or "?", field("author") or "?", field("logicalFilePath")))
    return found


def changesets(path: Path) -> list[Changeset]:
    text = path.read_text(encoding="utf-8")
    if path.suffix == ".sql":
        return sql_changesets(text)
    if path.suffix in (".yaml", ".yml"):
        return yaml_changesets(text)
    return []


def files(root: Path) -> list[Path]:
    return sorted(p for p in root.rglob("*") if p.is_file())


def release_folder(tree: Path, path: Path) -> str | None:
    parts = path.relative_to(tree).parts
    return parts[1] if len(parts) > 2 and parts[0] == "releases" and VERSION.match(parts[1]) else None


def release_problems(version: str, changeset: Changeset) -> list[str]:
    problems = []
    if changeset.path != RELEASE_PATH:
        problems.append(f"logicalFilePath is {changeset.path}, not {RELEASE_PATH}")
    if not changeset.id.startswith(f"{version}-"):
        problems.append(f"id does not start with {version}-")
    if changeset.author != "sitmun":
        problems.append(f"author is {changeset.author}, not sitmun")
    return problems


class LogicalPathTest(unittest.TestCase):
    def test_helpers_read_id_author_and_path(self) -> None:
        self.assertEqual(
            [Changeset("a", "sitmun", None), Changeset("b", "sitmun", "x")],
            sql_changesets("--changeset sitmun:a dbms:oracle\n--changeset sitmun:b logicalFilePath:x\n"),
        )
        yaml = "databaseChangeLog:\n  - changeSet:\n      id: a\n  - changeSet:\n      id: '1.3.1-b'\n      author: sitmun\n      logicalFilePath: master.xml\n"
        self.assertEqual([Changeset("a", "?", None), Changeset("1.3.1-b", "sitmun", "master.xml")], yaml_changesets(yaml))

    def test_helper_spots_a_release_changeset_off_the_policy(self) -> None:
        self.assertEqual([], release_problems("1.3.1", Changeset("1.3.1-legend-type", "sitmun", "master.xml")))
        self.assertEqual(3, len(release_problems("1.3.1", Changeset("legend-type", "other", "releases/1.3.1/01-legend-type.sql"))))

    def test_every_shipped_changeset_names_its_logical_path(self) -> None:
        missing = [f"{p.relative_to(CHANGELOG)}: {c.id}" for p in files(CHANGELOG) for c in changesets(p) if c.path is None]
        self.assertEqual([], missing, "\n".join(missing))

    def test_every_release_changeset_pins_master_xml_and_a_versioned_id(self) -> None:
        problems = [
            f"{p.relative_to(ROOT)}: {c.id}: {problem}"
            for tree in TREES
            for p in files(tree)
            if (version := release_folder(tree, p))
            for c in changesets(p)
            for problem in release_problems(version, c)
        ]
        self.assertEqual([], problems, "\n".join(problems))

    def test_release_changeset_ids_are_unique_across_the_trees(self) -> None:
        seen: dict[str, list[str]] = {}
        releases = set()
        for tree in TREES:
            for p in files(tree):
                for c in changesets(p):
                    seen.setdefault(c.id, []).append(p.relative_to(ROOT).as_posix())
                    if release_folder(tree, p):
                        releases.add(c.id)
        clashes = [f"{i}: {', '.join(seen[i])}" for i in sorted(releases) if len(seen[i]) > 1]
        self.assertEqual([], clashes, "\n".join(clashes))


if __name__ == "__main__":
    unittest.main()
