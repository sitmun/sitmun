#!/usr/bin/env python3
"""Showcase profile contract (stdlib unittest).

The profile is the sales seed: PostgreSQL, Liquibase context showcase,
ids above the baseline seed, and no private hosts or secrets.
"""

from __future__ import annotations

import csv
import math
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROFILE = ROOT / "profiles" / "showcase"
ENV = ROOT / "profiles" / "showcase.env"
MASTER = PROFILE / "liquibase" / "master.xml"
CHANGELOG = PROFILE / "liquibase" / "changelog" / "01_showcase_data.yaml"
EXTENT_CHANGELOG = PROFILE / "liquibase" / "changelog" / "02_showcase_extent.yaml"
CAMI_BASEMAP = PROFILE / "liquibase" / "changelog" / "03_showcase_cami_basemap.yaml"
CAMI_EXTENT = PROFILE / "liquibase" / "changelog" / "04_showcase_cami_extent.yaml"
# CIME EPSG:25831 matrix, measured from the live WMTS view resolutions.
CIME_ZOOM_6_RESOLUTION = 68.58832100644014
CIME_ZOOM_7_RESOLUTION = 34.29416050322007
MENORCA_CENTER = (593750, 4425293)
MENORCA_COMPUTED_EXTENT = (559456, 4405298, 628044, 4445288)
# Wider than the SDI Viewer window so the CIME nearest zoom is the level that contains it.
CAMI_MENORCA_EXTENT = (536250, 4389361, 651250, 4461225)
DATA = PROFILE / "liquibase" / "changelog" / "01_showcase_data"
# Same geographic window as the seed: mainland Spain, the Balearics, and Menorca.
SPAIN_3857_EXTENT = (-1046403, 4286870, 489806, 5442259)
SPAIN_3857_CENTER = (-278298, 4864564)
BASELINE = ROOT / "tools" / "seed-data" / "baseline"

SECRET_KEYS = (
    "SITMUN_USER_SECRET",
    "MIDDLEWARE_SECRET",
    "SITMUN_MBTILES_JOB_HANDLE_SECRET",
)
PRIVATE_HOST = re.compile(
    r"(?:^|[^0-9])(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}"
    r"|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}"
    r"|192\.168\.\d{1,3}\.\d{1,3})(?:[^0-9]|$)"
)
BCRYPT = re.compile(r"^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$")


def env_assignments(text: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :]
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def max_id(path: Path, column: str) -> int:
    with path.open(encoding="utf-8", newline="") as handle:
        rows = csv.DictReader(handle)
        return max(int(row[column]) for row in rows)


class ShowcaseProfileTest(unittest.TestCase):
    def test_master_includes_the_shipped_changelog_then_the_showcase(self) -> None:
        text = MASTER.read_text(encoding="utf-8")
        includes = re.findall(r'<include\s+file="([^"]+)"', text)
        self.assertGreaterEqual(len(includes), 2)
        self.assertIn("db/changelog/db.changelog-master.yaml", includes[0])
        self.assertEqual(includes[1], "changelog/01_showcase_data.yaml")
        self.assertEqual(includes[2], "changelog/02_showcase_extent.yaml")
        self.assertEqual(includes[3], "changelog/03_showcase_cami_basemap.yaml")
        self.assertEqual(includes[4], "changelog/04_showcase_cami_extent.yaml")

    def test_every_changeset_uses_the_showcase_context(self) -> None:
        text = CHANGELOG.read_text(encoding="utf-8")
        blocks = text.split("\n  - changeSet:")
        self.assertGreaterEqual(len(blocks), 3)
        for block in blocks[1:]:
            self.assertIn("context: showcase", block)
        self.assertIn("id: showcase-data-1", text)
        self.assertIn("id: showcase-data-2-sequences", text)
        self.assertNotIn("context: demo", text)
        self.assertNotIn("demo_data/", text)
        self.assertNotIn("STM_CONNECT.csv", text)
        self.assertNotIn("tableName: STM_CONNECT", text)

    def test_env_selects_postgres_and_the_showcase_context(self) -> None:
        values = env_assignments(ENV.read_text(encoding="utf-8"))
        self.assertEqual(values["SITMUN_CONFIG_DIR"], "showcase")
        self.assertEqual(values["SPRING_LIQUIBASE_CONTEXTS"], "showcase")
        self.assertEqual(values["COMPOSE_PROFILES"], "postgres")
        self.assertEqual(values["DATABASE_TYPE"], "postgres")
        self.assertEqual(values["SPRING_PROFILES_ACTIVE"], "prod,postgres")
        for key in SECRET_KEYS:
            self.assertFalse(values.get(key, ""), key)

    def test_showcase_ids_sit_above_the_baseline_seed(self) -> None:
        pairs = (
            ("STM_TRANSLATION.csv", "TRA_ID", "translations.csv", "tra_id"),
            ("STM_TASK.csv", "TAS_ID", "tasks.csv", "tas_id"),
            ("STM_USER.csv", "USE_ID", "users.csv", "use_id"),
        )
        for showcase_name, showcase_column, baseline_name, baseline_column in pairs:
            ceiling = max_id(BASELINE / baseline_name, baseline_column)
            with (DATA / showcase_name).open(encoding="utf-8", newline="") as handle:
                floor = min(int(row[showcase_column]) for row in csv.DictReader(handle))
            self.assertGreater(floor, ceiling, showcase_name)

    def test_task_references_exist_in_the_showcase_or_the_baseline(self) -> None:
        known = set()
        for path, column in (
            (DATA / "STM_TASK.csv", "TAS_ID"),
            (BASELINE / "tasks.csv", "tas_id"),
        ):
            with path.open(encoding="utf-8", newline="") as handle:
                known.update(row[column] for row in csv.DictReader(handle))
        for name, column in (
            ("STM_ROL_TSK.csv", "RTS_TASKID"),
            ("STM_AVAIL_TSK.csv", "ATS_TASKID"),
            ("STM_TREE_NOD.csv", "TNO_TASKID"),
        ):
            with (DATA / name).open(encoding="utf-8", newline="") as handle:
                used = {
                    row[column]
                    for row in csv.DictReader(handle)
                    if row[column] not in ("", "NULL")
                }
            self.assertLessEqual(used, known, name)

    def test_spain_opens_on_a_web_mercator_extent_of_the_peninsula_and_the_islands(self) -> None:
        text = EXTENT_CHANGELOG.read_text(encoding="utf-8")
        self.assertIn("id: showcase-data-3-extent", text)
        self.assertIn("context: showcase", text)
        self.assertIn("TER_PROJECT = 'EPSG:3857'", text)
        self.assertIn("TER_ZOOM = NULL", text)
        self.assertIn("-1046403 4286870 489806 5442259", text)
        self.assertIn("-278298 4864564", text)
        self.assertIn("WHERE TER_ID = 1", text)
        for territory_id in ("2", "3", "4"):
            self.assertIn(
                f"SET TER_ZOOM = NULL WHERE TER_ID = {territory_id}",
                text.replace("\n", " "),
            )
        for lon, lat in ((-8.40, 43.37), (-3.70, 40.42), (4.26, 39.89)):
            x, y = _web_mercator(lon, lat)
            self.assertGreaterEqual(x, SPAIN_3857_EXTENT[0])
            self.assertLessEqual(x, SPAIN_3857_EXTENT[2])
            self.assertGreaterEqual(y, SPAIN_3857_EXTENT[1])
            self.assertLessEqual(y, SPAIN_3857_EXTENT[3])
        self.assertEqual(
            (
                round((SPAIN_3857_EXTENT[0] + SPAIN_3857_EXTENT[2]) / 2),
                round((SPAIN_3857_EXTENT[1] + SPAIN_3857_EXTENT[3]) / 2),
            ),
            SPAIN_3857_CENTER,
        )

    def test_cami_de_cavalls_opens_on_the_goib_base_map(self) -> None:
        text = " ".join(CAMI_BASEMAP.read_text(encoding="utf-8").split())
        self.assertIn("id: showcase-data-4-cami-basemap", text)
        self.assertIn("context: showcase", text)
        self.assertIn(
            "INSERT INTO STM_ROL_GGI (RGG_ROLEID, RGG_GGIID) SELECT 4, 4",
            text,
        )
        self.assertIn(
            "UPDATE STM_APP_BCKG SET ABC_ORDER = ABC_ORDER + 1 WHERE ABC_APPID = 2",
            text,
        )
        self.assertIn(
            "SELECT COALESCE(MAX(ABC_ID), 0) + 1, 2, 4, 0 FROM STM_APP_BCKG",
            text,
        )
        self.assertIn("SEQ_NAME = 'ABC_ID'", text)

    def test_cami_de_cavalls_keeps_its_basemap_and_frames_menorca(self) -> None:
        text = " ".join(CAMI_EXTENT.read_text(encoding="utf-8").split())
        self.assertIn("id: showcase-data-5-cami-extent", text)
        self.assertIn("context: showcase", text)
        self.assertIn(
            "DELETE FROM STM_APP_BCKG WHERE ABC_APPID = 2 AND ABC_BACKID = 4",
            text,
        )
        self.assertIn(
            "UPDATE STM_APP_BCKG SET ABC_ORDER = ABC_ORDER - 1 WHERE ABC_APPID = 2",
            text,
        )
        self.assertIn(
            "DELETE FROM STM_ROL_GGI WHERE RGG_ROLEID = 4 AND RGG_GGIID = 4",
            text,
        )
        self.assertIn(" ".join(str(value) for value in CAMI_MENORCA_EXTENT), text)
        self.assertIn("2, 3,", text)
        width = CAMI_MENORCA_EXTENT[2] - CAMI_MENORCA_EXTENT[0]
        height = CAMI_MENORCA_EXTENT[3] - CAMI_MENORCA_EXTENT[1]
        self.assertEqual(
            ((CAMI_MENORCA_EXTENT[0] + CAMI_MENORCA_EXTENT[2]) / 2,
             (CAMI_MENORCA_EXTENT[1] + CAMI_MENORCA_EXTENT[3]) / 2),
            MENORCA_CENTER,
        )
        self.assertLessEqual(CAMI_MENORCA_EXTENT[0], MENORCA_COMPUTED_EXTENT[0])
        self.assertLessEqual(CAMI_MENORCA_EXTENT[1], MENORCA_COMPUTED_EXTENT[1])
        self.assertGreaterEqual(CAMI_MENORCA_EXTENT[2], MENORCA_COMPUTED_EXTENT[2])
        self.assertGreaterEqual(CAMI_MENORCA_EXTENT[3], MENORCA_COMPUTED_EXTENT[3])
        for map_width, map_height in ((1496, 935), (1920, 1080)):
            needed = max(width / map_width, height / map_height)
            self.assertLess(
                abs(needed - CIME_ZOOM_6_RESOLUTION),
                abs(needed - CIME_ZOOM_7_RESOLUTION),
                (map_width, map_height, needed),
            )

    def test_territory_types_exist_in_the_baseline(self) -> None:
        with (BASELINE / "territory_types.csv").open(encoding="utf-8", newline="") as handle:
            known = {row["tet_id"] for row in csv.DictReader(handle)}
        with (DATA / "STM_TERRITORY.csv").open(encoding="utf-8", newline="") as handle:
            used = {row["TER_TYPID"] for row in csv.DictReader(handle)}
        self.assertTrue(used)
        self.assertLessEqual(used, known)

    def test_csvs_have_no_private_host_no_connection_and_only_bcrypt(self) -> None:
        self.assertFalse((DATA / "STM_CONNECT.csv").exists())
        csvs = sorted(DATA.glob("*.csv"))
        self.assertTrue(csvs)
        for path in csvs:
            text = path.read_text(encoding="utf-8")
            self.assertIsNone(PRIVATE_HOST.search(text), path.name)
        with (DATA / "STM_USER.csv").open(encoding="utf-8", newline="") as handle:
            passwords = [row["USE_PWD"] for row in csv.DictReader(handle)]
        self.assertTrue(passwords)
        for password in passwords:
            self.assertRegex(password, BCRYPT)


def _web_mercator(lon: float, lat: float) -> tuple[float, float]:
    radius = 6378137.0
    x = math.radians(lon) * radius
    y = math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) * radius
    return x, y


if __name__ == "__main__":
    unittest.main()
