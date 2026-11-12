#!/usr/bin/env python3
"""Boot jar changelog listing."""

from __future__ import annotations

import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

BIN = Path(__file__).resolve().parent.parent / "bin"
sys.path.insert(0, str(BIN))

import check_boot_jar_changelog as jarcheck  # noqa: E402


def _jar(names: list[str]) -> Path:
    directory = Path(tempfile.mkdtemp())
    path = directory / "backend.jar"
    with zipfile.ZipFile(path, "w") as jar:
        for name in names:
            jar.writestr(name, b"")
    return path


class BootJarChangelogTest(unittest.TestCase):
    def test_shipped_tree_passes(self) -> None:
        path = _jar(["BOOT-INF/classes/db/changelog/db.changelog-master.yaml", "BOOT-INF/classes/org/sitmun/App.class"])
        self.assertEqual(jarcheck.main(["check", str(path)]), 0)

    def test_profile_path_fails(self) -> None:
        path = _jar(
            [
                "BOOT-INF/classes/db/changelog/db.changelog-master.yaml",
                "BOOT-INF/classes/profiles/postgres/liquibase/changelog/01.sql",
            ]
        )
        self.assertEqual(jarcheck.main(["check", str(path)]), 1)

    def test_test_resources_fail(self) -> None:
        path = _jar(
            [
                "BOOT-INF/classes/db/changelog/db.changelog-master.yaml",
                "BOOT-INF/classes/src/test/resources/db/changelog/04_data.yaml",
            ]
        )
        self.assertEqual(jarcheck.main(["check", str(path)]), 1)


if __name__ == "__main__":
    unittest.main()
