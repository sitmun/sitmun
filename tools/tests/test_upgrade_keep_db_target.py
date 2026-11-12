"""The database left running is the English upgrade."""

import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "tests" / "test_liquibase_upgrade_from_1.2.9.sh"


class UpgradeKeepDatabaseTest(unittest.TestCase):
    def test_catalan_check_runs_before_the_english_upgrade(self):
        text = SCRIPT.read_text()
        catalan = text.index("Catalan default keeps partner text")
        english = text.index("1.2.9 upgrades")
        self.assertLess(catalan, english)


if __name__ == "__main__":
    unittest.main()
