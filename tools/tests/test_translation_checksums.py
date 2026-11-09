#!/usr/bin/env python3
"""Checksums stored before the Portuguese translation edit stay valid."""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MASTER = ROOT / "sitmun-backend/src/main/resources/db/changelog/db.changelog-master.yaml"
UPGRADE = ROOT / "sitmun-backend/src/main/resources/db/changelog/upgrade/db.changelog-upgrade.yaml"

STORED = {
    MASTER: {
        "baseline-languages-postgresql": "9:3b411495ba2ca79578e04d00daac6bab",
        "baseline-translations": "9:e0c99cd586703c2d58b101c2ade4d44f",
    },
    UPGRADE: {
        "upgrade-1.2.9-to-1.3.0-translations-postgresql": "9:69e9e920eb6342066d76e949828cf8b7",
    },
}


def _changeset(text: str, changeset_id: str) -> str:
    marker = f"id: {changeset_id}\n"
    start = text.find(marker)
    if start < 0:
        return ""
    nxt = text.find("\n  - changeSet:", start)
    return text[start:] if nxt < 0 else text[start:nxt]


class TranslationChecksumTest(unittest.TestCase):
    def test_previous_translation_checksums_stay_valid(self) -> None:
        for path, expected in STORED.items():
            text = path.read_text(encoding="utf-8")
            for changeset_id, checksum in expected.items():
                block = _changeset(text, changeset_id)
                self.assertIn(changeset_id, block, changeset_id)
                self.assertIn(f"validCheckSum: {checksum}", block, changeset_id)


if __name__ == "__main__":
    unittest.main()
