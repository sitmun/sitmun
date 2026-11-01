#!/usr/bin/env python3
"""The required-codelist manifest covers every value the inventory reports."""

from __future__ import annotations

import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "tools/bin/inventory_codelist_consumers.py"


class InventoryManifestTest(unittest.TestCase):
    def test_manifest_covers_code_reads(self) -> None:
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "--check"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_null_token_is_quoted(self) -> None:
        sys.path.insert(0, str(ROOT / "tools/bin"))
        import inventory_codelist_consumers as inventory

        self.assertEqual(inventory.yaml_quote("null"), "'null'")
        rendered = inventory.render({("taskEntity.jsonParamType", "null"): {"DomainConstants.java:131"}})
        self.assertIn("value: 'null'", rendered)


if __name__ == "__main__":
    unittest.main()
