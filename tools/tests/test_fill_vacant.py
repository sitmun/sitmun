#!/usr/bin/env python3
"""More Info Advanced titles ship from both generators."""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASELINE = ROOT / "tools/bin/generate_baseline_seed.py"
UPGRADE = ROOT / "tools/bin/generate_legacy_upgrade.py"

TITLES = (
    "Informacion avançada",
    "Información avanzada",
    "Informations avancées",
    "Informació avançada",
)

PDF_TASKS = (
    "Exportar PDF A4 Vertical",
    "Exportar PDF A3 Vertical",
    "Exportar PDF A4 Horitzontal",
    "Exportar PDF A3 Horitzontal",
    "Capçalera per defecte",
    "Peu de pàgina per defecte",
)


def load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def more_info_lines(sql: str) -> list[str]:
    return [
        line
        for line in sql.splitlines()
        if "tas_name = 'More Info Advanced'" in line and "Task.name" in line
    ]


def title(line: str) -> str:
    return line.split("lang.lan_id, ", 1)[1].split(" FROM ", 1)[0].strip("'")


class FillVacantTest(unittest.TestCase):
    def test_more_info_advanced_titles_are_the_same_vacant_catalog_cells(self) -> None:
        hop = load(UPGRADE, "generate_legacy_upgrade").translations(False)
        fresh = "\n".join(load(BASELINE, "generate_baseline_seed").translation_statements())
        for sql in (hop, fresh):
            lines = more_info_lines(sql)
            self.assertEqual(len(lines), 4)
            self.assertEqual(sorted(title(line) for line in lines), sorted(TITLES))
            self.assertFalse(any("lan_shortname = 'en'" in line for line in lines))
            for name in PDF_TASKS:
                self.assertIn(f"tas_name = '{name}'", sql)
                english = [
                    line
                    for line in sql.splitlines()
                    if f"tas_name = '{name}'" in line and "lan_shortname = 'en'" in line
                ]
                self.assertEqual(english, [])


if __name__ == "__main__":
    unittest.main()
