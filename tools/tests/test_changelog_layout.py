#!/usr/bin/env python3
"""Liquibase changes after 1.3.0 go in one folder per version.

See docs/database-changelogs.md. Each master is
its frozen pre-policy entries plus `releases/<version>/db.changelog-<version>.yaml`
includes in version order. The backend also takes
`db.changelog-<version>-pre-upgrade.yaml` includes before the upgrade path.
"""

from __future__ import annotations

import re
import subprocess
import unittest
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

ENTRY = re.compile(r"^releases/(\d+\.\d+\.\d+)/db\.changelog-(\d+\.\d+\.\d+)(-pre-upgrade)?\.yaml$")
FOLDER_FILE = re.compile(r"^(db\.changelog-\d+\.\d+\.\d+(-pre-upgrade)?\.yaml|\d{2}-[a-z0-9][a-z0-9.-]*\.(sql|yaml|csv))$")
YAML_ENTRY = re.compile(r"^  - (include|changeSet):\s*\n(?:      (?!file:|id:).*\n)*      (?:file|id):\s*(\S+)", re.M)
XML_INCLUDE = re.compile(r"<include\s+file=\"([^\"]+)\"")


@dataclass(frozen=True)
class Tree:
    root: str
    master: str
    legacy: tuple[str, ...]
    pre_upgrade: bool = False


BACKEND = Tree(
    "sitmun-backend/src/main/resources/db/changelog",
    "db.changelog-master.yaml",
    (
        "include:upgrade/db.changelog-upgrade.yaml",
        "changeSet:baseline-schema-postgresql",
        "changeSet:baseline-schema-oracle",
        "changeSet:baseline-languages-postgresql",
        "changeSet:baseline-languages-oracle",
        "changeSet:baseline-codelists-postgresql",
        "changeSet:baseline-codelists-oracle",
        "changeSet:baseline-seed-postgresql",
        "changeSet:baseline-seed-oracle",
        "changeSet:baseline-translations",
        "changeSet:baseline-sequence-counters-postgresql",
        "changeSet:baseline-sequence-counters-oracle",
        "include:service-check-observed-timestamptz.oracle.sql",
        "include:service-check-observed-timestamptz.postgresql.sql",
        "changeSet:sitmun-admin-password-null-postgresql",
        "changeSet:sitmun-admin-password-null-oracle",
        "include:literal-translation-value-pkey.postgresql.sql",
    ),
    pre_upgrade=True,
)

SHOWCASE = Tree(
    "profiles/showcase/liquibase",
    "master.xml",
    (
        "include:classpath:/db/changelog/db.changelog-master.yaml",
        "include:changelog/01_showcase_data.yaml",
        "include:changelog/02_showcase_extent.yaml",
        "include:changelog/03_showcase_cami_basemap.yaml",
        "include:changelog/04_showcase_cami_extent.yaml",
    ),
)

DEVELOPMENT = Tree(
    "profiles/development/backend/liquibase",
    "master.xml",
    tuple(
        f"include:{name}"
        for name in (
            "classpath:/db/changelog/db.changelog-master.yaml",
            "changelog/04_initial_data_dev.yaml",
            "changelog/13_tourism_data.yaml",
            "changelog/18_fix_tourism_data.yaml",
            "changelog/22_add_additional.data.sql",
            "changelog/47_fix_builtin_user_positions.sql",
            "changelog/48_dev_external_applications.sql",
            "changelog/49_dev_dashboard_fixtures.sql",
            "changelog/66_dev_plantilla_showcase.sql",
            "changelog/66_dev_plantilla_showcase_oracle.sql",
            "changelog/69_dev_plantilla_tiptap_chip_fixes.sql",
            "changelog/69_dev_plantilla_tiptap_chip_fixes_oracle.sql",
            "changelog/75_dev_feature_info_fields.yaml",
            "changelog/76_dev_sol_rustic_feature_info_fields.yaml",
            "changelog/77_dev_estades_feature_info_fields.yaml",
            "changelog/78_dev_folder_metadata_adreces.yaml",
            "changelog/79_dev_folder_download_urls.yaml",
            "changelog/85_dev_wfs_menorca_fars.yaml",
            "changelog/86_dev_setup_language_configured.sql",
            "changelog/14_update_sequences.sql",
        )
    ),
)

TREES = (BACKEND, SHOWCASE, DEVELOPMENT)


def master_entries(text: str, *, xml: bool) -> list[str]:
    if xml:
        return [f"include:{name}" for name in XML_INCLUDE.findall(text)]
    return [f"{kind}:{value}" for kind, value in YAML_ENTRY.findall(text)]


def version_key(version: str) -> tuple[int, ...]:
    return tuple(int(part) for part in version.split("."))


def layout_problems(tree: Tree, entries: list[str]) -> list[str]:
    """Problems with a master's entry order, empty when it follows the policy."""
    legacy = list(tree.legacy)
    try:
        start = next(i for i in range(len(entries)) if entries[i : i + len(legacy)] == legacy)
    except StopIteration:
        return [f"{tree.master}: the pre-policy entries changed; add new work under releases/<version>/"]
    groups = {"before": entries[:start], "after": entries[start + len(legacy) :]}
    problems = []
    for where, group in groups.items():
        versions = []
        for entry in group:
            match = ENTRY.match(entry.removeprefix("include:"))
            if not entry.startswith("include:") or not match or match.group(1) != match.group(2):
                problems.append(f"{entry}: not releases/<version>/db.changelog-<version>[-pre-upgrade].yaml")
                continue
            pre = bool(match.group(3))
            if pre and not tree.pre_upgrade:
                problems.append(f"{entry}: only the backend has a pre-upgrade slot")
            elif pre != (where == "before"):
                slot = "before the upgrade path" if pre else "after the pre-policy entries"
                problems.append(f"{entry}: belongs {slot}")
            versions.append(version_key(match.group(1)))
        if versions != sorted(set(versions)):
            problems.append(f"{tree.master}: {where} includes are not in ascending version order")
    return problems


def latest_release_tag() -> str | None:
    out = subprocess.run(
        ["git", "tag", "--list", "v*", "--sort=-v:refname"], cwd=ROOT, capture_output=True, text=True, check=False
    ).stdout.split()
    return next((tag for tag in out if re.fullmatch(r"v\d+\.\d+\.\d+", tag)), None)


class LayoutHelpersTest(unittest.TestCase):
    def test_reads_yaml_master_entries_in_order(self) -> None:
        text = (
            "databaseChangeLog:\n"
            "  - include:\n      file: releases/1.3.1/db.changelog-1.3.1-pre-upgrade.yaml\n"
            "  - changeSet:\n      id: a\n      author: sitmun\n"
            "  - include:\n      file: b.sql\n      relativeToChangelogFile: true\n"
        )
        self.assertEqual(
            ["include:releases/1.3.1/db.changelog-1.3.1-pre-upgrade.yaml", "changeSet:a", "include:b.sql"],
            master_entries(text, xml=False),
        )

    def test_spots_misplaced_and_unordered_includes(self) -> None:
        tree = Tree("x", "m", ("include:legacy",), pre_upgrade=True)
        ok = [
            "include:releases/1.3.1/db.changelog-1.3.1-pre-upgrade.yaml",
            "include:legacy",
            "include:releases/1.3.1/db.changelog-1.3.1.yaml",
            "include:releases/1.4.0/db.changelog-1.4.0.yaml",
        ]
        self.assertEqual([], layout_problems(tree, ok))
        self.assertEqual(1, len(layout_problems(tree, ["include:releases/1.3.1/db.changelog-1.3.1.yaml", "include:legacy"])))
        self.assertEqual(1, len(layout_problems(tree, ["include:legacy", "include:05_new.yaml"])))
        self.assertEqual(
            1,
            len(
                layout_problems(
                    tree,
                    [
                        "include:legacy",
                        "include:releases/1.4.0/db.changelog-1.4.0.yaml",
                        "include:releases/1.3.1/db.changelog-1.3.1.yaml",
                    ],
                )
            ),
        )
        self.assertEqual(1, len(layout_problems(tree, ["include:legacy", "include:releases/1.3.1/db.changelog-1.3.2.yaml"])))
        profile = Tree("x", "m", ("include:legacy",))
        self.assertEqual(
            1, len(layout_problems(profile, ["include:legacy", "include:releases/1.3.1/db.changelog-1.3.1-pre-upgrade.yaml"]))
        )


class LayoutTest(unittest.TestCase):
    def test_masters_follow_the_version_folder_layout(self) -> None:
        problems = []
        for tree in TREES:
            master = ROOT / tree.root / tree.master
            entries = master_entries(master.read_text(encoding="utf-8"), xml=master.suffix == ".xml")
            problems += [f"{tree.root}: {p}" for p in layout_problems(tree, entries)]
        self.assertEqual([], problems, "\n".join(problems))

    def test_version_folders_hold_only_entry_and_numbered_files(self) -> None:
        problems = []
        for tree in TREES:
            master_text = (ROOT / tree.root / tree.master).read_text(encoding="utf-8")
            for folder in sorted((ROOT / tree.root / "releases").glob("*")):
                if not folder.is_dir():
                    continue
                if not re.fullmatch(r"\d+\.\d+\.\d+", folder.name):
                    problems.append(f"{tree.root}/releases/{folder.name}: not a version")
                    continue
                entries = [f"db.changelog-{folder.name}{suffix}.yaml" for suffix in ("", "-pre-upgrade")]
                if not any(f"releases/{folder.name}/{name}" in master_text for name in entries):
                    problems.append(f"{tree.root}/releases/{folder.name}: no entry file in {tree.master}")
                for path in sorted(folder.rglob("*")):
                    if path.is_file() and not FOLDER_FILE.match(path.relative_to(folder).as_posix()):
                        problems.append(f"{tree.root}/releases/{folder.name}/{path.name}: name is not NN-topic")
        self.assertEqual([], problems, "\n".join(problems))

    def test_a_released_version_folder_takes_no_new_files(self) -> None:
        tag = latest_release_tag()
        if tag is None:
            self.skipTest("no release tag")
        released = version_key(tag[1:])
        problems = []
        for tree in TREES:
            for folder in sorted((ROOT / tree.root / "releases").glob("*.*.*")):
                if not folder.is_dir() or version_key(folder.name) > released:
                    continue
                for path in sorted(p for p in folder.rglob("*") if p.is_file()):
                    rel = path.relative_to(ROOT).as_posix()
                    shipped = subprocess.run(
                        ["git", "cat-file", "-e", f"{tag}:{rel}"], cwd=ROOT, capture_output=True, check=False
                    )
                    if shipped.returncode != 0:
                        problems.append(f"{rel}: {folder.name} shipped in {tag}; use the next version folder")
        self.assertEqual([], problems, "\n".join(problems))


if __name__ == "__main__":
    unittest.main()
