#!/usr/bin/env python3
"""PostgreSQL service-check times are stored with a time zone."""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CHANGELOG = ROOT / "sitmun-backend/src/main/resources/db/changelog"
POSTGRES = CHANGELOG / "service-check-observed-timestamptz.postgresql.sql"
MASTER = CHANGELOG / "db.changelog-master.yaml"


class ServiceCheckTimestamptzTest(unittest.TestCase):
    def test_postgresql_copies_existing_times_as_utc(self) -> None:
        sql = POSTGRES.read_text()
        master = MASTER.read_text()
        self.assertIn("service-check-observed-timestamptz.postgresql.sql", master)
        self.assertIn("dbms:postgresql", sql)
        for table, column in (
            ("stm_service_check", "sec_observed"),
            ("stm_service_check_sample", "scs_observed"),
        ):
            self.assertIn(f"{column} AT TIME ZONE ''UTC''", sql)
            self.assertIn(table, sql)
        self.assertIn("timestamp with time zone", sql)
        self.assertIn(
            "CREATE INDEX stm_scs_ix_ser_obs ON stm_service_check_sample (scs_serid, scs_observed)",
            sql,
        )
        self.assertNotIn("DELETE FROM stm_service", sql)
        self.assertNotIn("FROM_TZ", sql)


if __name__ == "__main__":
    unittest.main()
