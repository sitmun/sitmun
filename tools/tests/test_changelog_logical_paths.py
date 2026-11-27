#!/usr/bin/env python3
"""Changeset identity rules. See docs/database-changelogs.md.

Every shipped changeset pins its logicalFilePath (#404). In every Liquibase
tree, changes after 1.3.0 live in `releases/<version>.yaml`: inline changesets
that pin `master.xml`, have author `sitmun`, and an id
`<version>-<issue>-<topic>[-<dbms>]` unique across the trees. SQL and CSV files
those changesets call sit in `releases/<version>/` and hold no changesets.

A version file is read by a strict reader: anything it does not recognise
fails the test instead of being skipped.
"""

from __future__ import annotations

import re
import unittest
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHANGELOG = ROOT / "sitmun-backend/src/main/resources/db/changelog"
TREES = (
    CHANGELOG,
    ROOT / "sitmun-backend/src/test/resources/db/changelog-test",
    ROOT / "profiles/showcase/liquibase",
    ROOT / "profiles/development/backend/liquibase",
    ROOT / "profiles/postgres/liquibase",
    ROOT / "profiles/oracle/liquibase",
)
RELEASE_PATH = "master.xml"
VERSION = r"\d+\.\d+\.\d+"
VERSION_FILE = re.compile(rf"^({VERSION})(-upgrade)?\.yaml$")
TOPIC = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
# Liquibase's formatted SQL header, `\s*--[\s]*changeset\s+`, case-insensitive.
SQL_CHANGESET = re.compile(r"^\s*--\s*changeset\s+([^:\s]+):(\S+)(.*)$", re.M | re.I)
YAML_CHANGESET = re.compile(r"^(\s*)- changeSet:\s*$", re.M)
TOP_ITEM = re.compile(r"^  - (\w+):\s*(?:#.*)?$")
FIELD = re.compile(r"^      (\w+):\s*(.*?)\s*$")
REFERENCE = re.compile(r"^\s+(?:- )?(?:path|file):\s*(\S+)\s*$")


@dataclass(frozen=True)
class Changeset:
    id: str
    author: str
    path: str | None


def _scalar(value: str) -> str:
    value = re.sub(r"\s+#.*$", "", value)
    return value.strip("\"'")


def sql_changesets(text: str) -> list[Changeset]:
    found = []
    for match in SQL_CHANGESET.finditer(text):
        path = re.search(r"logicalFilePath:(\S+)", match.group(3), re.I)
        found.append(Changeset(match.group(2), match.group(1), path.group(1) if path else None))
    return found


def yaml_changesets(text: str) -> list[Changeset]:
    """Changesets of a pre-policy YAML changelog, read loosely to collect ids."""
    found = []
    for match in YAML_CHANGESET.finditer(text):
        indent = match.group(1)
        end = re.compile(rf"^{re.escape(indent)}- ", re.M).search(text, match.end())
        block = text[match.end() : end.start() if end else len(text)]
        inner = len(indent) + 4

        def field(name: str, block: str = block, inner: int = inner) -> str | None:
            value = re.search(rf"^ {{{inner}}}{name}:\s*(\S+)", block, re.M)
            return _scalar(value.group(1)) if value else None

        found.append(Changeset(field("id") or "?", field("author") or "?", field("logicalFilePath")))
    return found


def changesets(path: Path) -> list[Changeset]:
    text = path.read_text(encoding="utf-8")
    if path.suffix == ".sql":
        return sql_changesets(text)
    if path.suffix in (".yaml", ".yml"):
        return yaml_changesets(text)
    return []


def read_version_file(text: str) -> tuple[list[Changeset], list[str], list[str]]:
    """Changesets, referenced paths, and problems of a releases/<version>.yaml file."""
    lines = text.splitlines()
    problems: list[str] = []
    if not lines or lines[0].rstrip() != "databaseChangeLog:":
        return [], [], ["first line is not `databaseChangeLog:`"]
    items: list[tuple[str, list[str], int]] = []
    for number, line in enumerate(lines[1:], start=2):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        item = TOP_ITEM.match(line)
        if item:
            items.append((item.group(1), [], number))
        elif line.startswith("      ") and items:
            items[-1][1].append(line)
        else:
            problems.append(f"line {number}: write entries as block-style `  - changeSet:`")
    found: list[Changeset] = []
    references: list[str] = []
    for kind, body, number in items:
        if kind == "property":
            continue
        if kind != "changeSet":
            problems.append(f"line {number}: `{kind}` is not allowed; a version file holds changesets only")
            continue
        fields: dict[str, str] = {}
        for line in body:
            field = FIELD.match(line)
            if field and field.group(1) in fields:
                problems.append(f"line {number}: `{field.group(1)}` repeated")
            if field:
                fields[field.group(1)] = _scalar(field.group(2))
            reference = REFERENCE.match(line)
            if reference:
                references.append(_scalar(reference.group(1)))
        found.append(Changeset(fields.get("id", "?"), fields.get("author", "?"), fields.get("logicalFilePath")))
    return found, references, problems


def release_problems(version: str, changeset: Changeset) -> list[str]:
    problems = []
    if changeset.path != RELEASE_PATH:
        problems.append(f"logicalFilePath is {changeset.path}, not {RELEASE_PATH}")
    topic = changeset.id.removeprefix(f"{version}-")
    if topic == changeset.id or not TOPIC.match(topic):
        problems.append(f"id is not {version}-<issue>-<topic>[-<dbms>]")
    if changeset.author != "sitmun":
        problems.append(f"author is {changeset.author}, not sitmun")
    return problems


def version_files(tree: Path) -> list[Path]:
    releases = tree / "releases"
    return sorted(p for p in releases.glob("*.yaml")) if releases.is_dir() else []


def release_tree_problems(tree: Path) -> list[str]:
    """Problems with the releases/ folder of one tree."""
    releases = tree / "releases"
    if not releases.is_dir():
        return []
    rel = tree.relative_to(ROOT).as_posix()
    master = next((tree / name for name in ("db.changelog-master.yaml", "master.xml") if (tree / name).is_file()), None)
    master_text = master.read_text(encoding="utf-8") if master else ""
    problems: list[str] = []
    versions = {m.group(1) for p in releases.glob("*.yaml") if (m := VERSION_FILE.match(p.name))}
    for path in sorted(releases.iterdir()):
        name = path.name
        if name == ".gitkeep":
            continue
        match = VERSION_FILE.match(name)
        if path.is_dir():
            if name not in versions:
                problems.append(f"{rel}/releases/{name}/: no releases/{name}.yaml calls it")
            continue
        if not match:
            problems.append(f"{rel}/releases/{name}: not <version>.yaml or <version>/")
            continue
        if match.group(2) and tree != CHANGELOG:
            problems.append(f"{rel}/releases/{name}: only the shipped tree has an -upgrade file")
        if f"releases/{name}" not in master_text:
            problems.append(f"{rel}/releases/{name}: not included by the master")
    for path in version_files(tree):
        match = VERSION_FILE.match(path.name)
        if not match:
            continue
        version = match.group(1)
        found, references, read = read_version_file(path.read_text(encoding="utf-8"))
        problems += [f"{rel}/releases/{path.name}: {p}" for p in read]
        problems += [
            f"{rel}/releases/{path.name}: {c.id}: {p}" for c in found for p in release_problems(version, c)
        ]
        for reference in references:
            target = releases / reference
            if not reference.startswith(f"{version}/") or "/" in reference.removeprefix(f"{version}/"):
                problems.append(f"{rel}/releases/{path.name}: {reference} is not in releases/{version}/")
            elif not target.is_file():
                problems.append(f"{rel}/releases/{path.name}: {reference} does not exist")
    for folder in sorted(p for p in releases.iterdir() if p.is_dir()):
        called = {
            r
            for f in releases.glob(f"{folder.name}*.yaml")
            for r in read_version_file(f.read_text(encoding="utf-8"))[1]
        }
        for path in sorted(folder.rglob("*")):
            inner = path.relative_to(releases).as_posix()
            if path.is_dir():
                problems.append(f"{rel}/releases/{inner}/: no subfolders in a version folder")
            elif inner not in called:
                problems.append(f"{rel}/releases/{inner}: no changeset calls it")
            elif SQL_CHANGESET.search(path.read_text(encoding="utf-8", errors="replace")):
                problems.append(f"{rel}/releases/{inner}: holds a changeset; put it in releases/{folder.name}.yaml")
    return problems


class LogicalPathTest(unittest.TestCase):
    def test_sql_reader_matches_liquibase_headers(self) -> None:
        text = "--changeset sitmun:a\n-- changeset bob:b\n  --ChangeSet c:d logicalFilePath:x\n-- a changeset note\n"
        self.assertEqual(
            [Changeset("a", "sitmun", None), Changeset("b", "bob", None), Changeset("d", "c", "x")],
            sql_changesets(text),
        )

    def test_version_reader_takes_block_changesets_and_their_own_fields(self) -> None:
        text = (
            "databaseChangeLog:\n"
            "  - changeSet:  # why\n"
            "      id: '1.3.1-375-legend-type'\n"
            "      author: sitmun\n"
            "      logicalFilePath: master.xml\n"
            "      changes:\n"
            "        - loadData:\n"
            "            columns:\n"
            "              - column:\n"
            "                  id: nested\n"
            "            file: 1.3.1/rows.csv\n"
            "        - sqlFile:\n"
            "            path: 1.3.1/01-fix.sql\n"
        )
        found, references, problems = read_version_file(text)
        self.assertEqual([Changeset("1.3.1-375-legend-type", "sitmun", "master.xml")], found)
        self.assertEqual(["1.3.1/rows.csv", "1.3.1/01-fix.sql"], references)
        self.assertEqual([], problems)

    def test_version_reader_rejects_what_it_cannot_read(self) -> None:
        for text in (
            "databaseChangeLog:\n  - changeSet: {id: x, author: me}\n",
            "databaseChangeLog:\n  - include:\n      file: ../changelog/05_x.yaml\n",
            "databaseChangeLog:\n  - includeAll:\n      path: x/\n",
            "databaseChangeLog:\n  -   changeSet:\n        id: x\n",
            "databaseChangeLog: []\n",
        ):
            with self.subTest(text=text):
                self.assertNotEqual([], read_version_file(text)[2])

    def test_release_rules(self) -> None:
        self.assertEqual([], release_problems("1.3.1", Changeset("1.3.1-375-legend-type", "sitmun", "master.xml")))
        self.assertEqual([], release_problems("1.3.1", Changeset("1.3.1-403-restore-postgresql", "sitmun", "master.xml")))
        self.assertEqual(1, len(release_problems("1.3.1", Changeset("1.3.1--", "sitmun", "master.xml"))))
        self.assertEqual(3, len(release_problems("1.3.1", Changeset("legend-type", "other", "releases/1.3.1.yaml"))))

    def test_every_shipped_changeset_names_its_logical_path(self) -> None:
        missing = [
            f"{p.relative_to(CHANGELOG)}: {c.id}"
            for p in sorted(CHANGELOG.rglob("*"))
            if p.is_file()
            for c in changesets(p)
            if c.path is None
        ]
        self.assertEqual([], missing, "\n".join(missing))

    def test_every_release_folder_follows_the_policy(self) -> None:
        problems = [p for tree in TREES for p in release_tree_problems(tree)]
        self.assertEqual([], problems, "\n".join(problems))

    def test_release_changeset_ids_are_unique_across_the_trees(self) -> None:
        seen: dict[str, list[str]] = {}
        releases: set[str] = set()
        for tree in TREES:
            in_releases = set(version_files(tree))
            for path in sorted(p for p in tree.rglob("*") if p.is_file()):
                found = read_version_file(path.read_text(encoding="utf-8"))[0] if path in in_releases else changesets(path)
                for c in found:
                    seen.setdefault(c.id, []).append(path.relative_to(ROOT).as_posix())
                    if path in in_releases:
                        releases.add(c.id)
        clashes = [f"{i}: {', '.join(seen[i])}" for i in sorted(releases) if len(seen[i]) > 1]
        self.assertEqual([], clashes, "\n".join(clashes))


if __name__ == "__main__":
    unittest.main()
