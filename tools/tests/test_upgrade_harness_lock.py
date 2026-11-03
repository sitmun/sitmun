"""A second upgrade harness on the host must stop before it touches Docker or the build.

Two runs share container names, host ports, and backend port 9011; an overlap
replaces the other run's database and surfaces as ORA-00955 on DATABASECHANGELOG.
"""

import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent / "test_liquibase_upgrade_from_1.2.9.sh"
STUB = "#!/usr/bin/env bash\necho \"$0 $*\" >>\"{calls}\"\nexit 1\n"


class UpgradeHarnessLockTest(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.root)
        (self.root / "tools" / "tests").mkdir(parents=True)
        shutil.copy(SCRIPT, self.root / "tools" / "tests" / SCRIPT.name)
        self.calls = self.root / "calls.log"
        bin_dir = self.root / "bin"
        bin_dir.mkdir()
        for stub in (self.root / "gradlew", bin_dir / "docker", bin_dir / "colima"):
            stub.write_text(STUB.format(calls=self.calls))
            stub.chmod(0o755)
        self.lock = self.root / "harness.lock"
        self.env = {
            **os.environ,
            "PATH": f"{bin_dir}:{os.environ['PATH']}",
            "SITMUN_UPGRADE_LOCK": str(self.lock),
        }

    def run_harness(self):
        return subprocess.run(
            ["bash", str(self.root / "tools" / "tests" / SCRIPT.name), "postgres-16"],
            env=self.env, capture_output=True, text=True, timeout=30,
        )

    def test_live_holder_blocks_without_touching_docker_or_build(self):
        self.lock.mkdir()
        (self.lock / "pid").write_text(f"{os.getpid()}\n")

        result = self.run_harness()

        self.assertEqual(2, result.returncode, result.stdout + result.stderr)
        self.assertIn(str(os.getpid()), result.stderr)
        self.assertFalse(self.calls.exists(), self.calls.read_text() if self.calls.exists() else "")
        self.assertTrue(self.lock.is_dir())

    def test_stale_holder_is_replaced_and_released(self):
        self.lock.mkdir()
        (self.lock / "pid").write_text("999999\n")

        result = self.run_harness()

        self.assertNotEqual(2, result.returncode, result.stdout + result.stderr)
        self.assertTrue(self.calls.exists())
        self.assertFalse(self.lock.exists())


if __name__ == "__main__":
    unittest.main()
