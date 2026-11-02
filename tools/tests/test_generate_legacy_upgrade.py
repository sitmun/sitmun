#!/usr/bin/env python3
"""The version-check generator matches the shipped SQL, including its refusals."""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GENERATOR = ROOT / "tools" / "bin" / "generate_legacy_upgrade.py"
LEGACY = ROOT / "sitmun-backend/src/main/resources/db/changelog/legacy"


def load_generator():
    spec = importlib.util.spec_from_file_location("generate_legacy_upgrade", GENERATOR)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class VersionCheckGeneratorTest(unittest.TestCase):
    def test_postgres_version_check_matches_shipped_sql(self) -> None:
        generator = load_generator()
        generated = generator.version_check_postgres(generator.load_fixture("postgres-16.csv"))
        shipped = (LEGACY / "01-version-check.postgresql.sql").read_text()
        self.assertEqual(generated, shipped)

    def test_oracle_version_check_matches_shipped_sql(self) -> None:
        generator = load_generator()
        generated = generator.version_check_oracle(generator.load_fixture("oracle-23.csv"))
        shipped = (LEGACY / "01-version-check.oracle.sql").read_text()
        self.assertEqual(generated, shipped)


if __name__ == "__main__":
    unittest.main()
