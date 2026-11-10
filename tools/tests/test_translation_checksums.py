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
        "baseline-languages-postgresql": ["9:3b411495ba2ca79578e04d00daac6bab"],
        "baseline-translations": [
            "9:e0c99cd586703c2d58b101c2ade4d44f",
            "9:024079f94e3617d595b0093845c18443",
        ],
        "baseline-seed-postgresql": [
            "9:7d1bee163dec1d68f43561c899ecb74c",
            "9:9ce86585e248e8398cc8b8c9d17e2c3c",
        ],
        "baseline-seed-oracle": [
            "9:6a2237c6f8c57e878734dfb8f633e31f",
            "9:30e9348f5345cd62fa61ba6b921dc2ba",
        ],
    },
    UPGRADE: {
        "upgrade-1.2.9-to-1.3.0-codelists-postgresql": [
            "9:d30b7017662e2a31159ef4e1186b15c4",
            "9:d0a5e11f3ac9d3e5c1d296bbad80d0a9",
        ],
        "upgrade-1.2.9-to-1.3.0-codelists-oracle": [
            "9:08bd80e5ffe2b5ed684a0d71341a1cf6",
            "9:52a2fea43b6be43f835bdd8227fa31c0",
        ],
        "upgrade-1.2.9-to-1.3.0-translations-postgresql": [
            "9:69e9e920eb6342066d76e949828cf8b7",
            "9:86322ef65f3ba9714074512e85e29e34",
        ],
        "upgrade-1.2.9-to-1.3.0-translations-oracle": [
            "9:632b1aed9d8144f2d37b920d0e055afc",
            "9:86322ef65f3ba9714074512e85e29e34",
        ],
        "upgrade-1.2.9-to-1.3.0-literal-values-postgresql": [
            "9:ec6e53f053fb5f8836ccbd8c8946a165",
        ],
        "upgrade-1.2.9-to-1.3.0-literal-values-oracle": [
            "9:ec6e53f053fb5f8836ccbd8c8946a165",
        ],
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
            for changeset_id, checksums in expected.items():
                block = _changeset(text, changeset_id)
                self.assertIn(changeset_id, block, changeset_id)
                for checksum in checksums:
                    self.assertIn(checksum, block, changeset_id)

    def test_missing_portuguese_is_inserted_without_the_1_2_9_marker(self) -> None:
        text = UPGRADE.read_text(encoding="utf-8")
        for changeset_id in (
            "portuguese-language-when-absent-postgresql",
            "portuguese-language-when-absent-oracle",
        ):
            block = _changeset(text, changeset_id)
            self.assertIn("lan_shortname = 'pt-PT'", block, changeset_id)
            self.assertIn("onError: MARK_RAN", block, changeset_id)
            self.assertNotIn("changelog/01_schema.postgresql.sql", block, changeset_id)
        sql = (
            ROOT
            / "sitmun-backend/src/main/resources/db/changelog/upgrade/1.2.9-to-1.3.0/08-portuguese-when-absent.postgresql.sql"
        ).read_text(encoding="utf-8")
        self.assertIn("WHERE NOT EXISTS", sql)
        self.assertIn("'pt-PT'", sql)


if __name__ == "__main__":
    unittest.main()
