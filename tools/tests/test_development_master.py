#!/usr/bin/env python3
"""Development Liquibase master follows the shipped changelog."""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MASTER = ROOT / "profiles/development/backend/liquibase/master.xml"


class DevelopmentMasterTest(unittest.TestCase):
    def test_shipped_master_is_first_and_old_codelists_are_absent(self):
        text = MASTER.read_text(encoding="utf-8")
        first = text.find("<include")
        first_tag = text[first : text.find("/>", first) + 2]
        self.assertIn("db/changelog/db.changelog-master.yaml", first_tag)
        self.assertNotIn("changelog/02_codelists.yaml", text)
        self.assertNotIn("changelog/01_schema.", text)


if __name__ == "__main__":
    unittest.main()
