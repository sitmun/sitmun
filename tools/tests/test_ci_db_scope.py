#!/usr/bin/env python3
"""Database-tier selector for the fresh-install workflows."""

from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

BIN = Path(__file__).resolve().parent.parent / "bin"
sys.path.insert(0, str(BIN))

import ci_db_scope as scope  # noqa: E402


class TierTest(unittest.TestCase):
    def test_docs_is_none(self):
        self.assertEqual(scope.tier([("docs/x.md", None)]), "none")

    def test_viewer_is_none(self):
        self.assertEqual(scope.tier([("sitmun-viewer/src/app.ts", None)]), "none")

    def test_security_java_without_sql_is_backend(self):
        path = "sitmun-backend/src/main/java/org/sitmun/infrastructure/security/jwt/JwtFilter.java"
        self.assertEqual(scope.tier([(path, "class JwtFilter {}")]), "backend")

    def test_repository_path_is_persistence(self):
        path = "sitmun-backend/src/main/java/org/sitmun/domain/task/TaskRepository.java"
        self.assertEqual(scope.tier([(path, "interface TaskRepository {}")]), "persistence")

    def test_query_annotation_outside_persistence_paths_is_persistence(self):
        path = "sitmun-backend/src/main/java/org/sitmun/administration/service/FooService.java"
        self.assertEqual(scope.tier([(path, "class Foo { @Query void q(); }")]), "persistence")

    def test_oracle_profile_is_persistence(self):
        self.assertEqual(scope.tier([("profiles/oracle/liquibase/x.xml", None)]), "persistence")

    def test_version_catalog_is_persistence(self):
        self.assertEqual(scope.tier([("gradle/libs.versions.toml", None)]), "persistence")

    def test_spring_boot_test_is_persistence(self):
        path = "sitmun-backend/src/test/java/org/sitmun/domain/task/TaskTest.java"
        self.assertEqual(scope.tier([(path, "@SpringBootTest class TaskTest {}")]), "persistence")

    def test_mockito_test_is_backend(self):
        path = "sitmun-backend/src/test/java/org/sitmun/domain/task/TaskUnitTest.java"
        text = "@ExtendWith(MockitoExtension.class)\nclass TaskUnitTest {}"
        self.assertEqual(scope.tier([(path, text)]), "backend")

    def test_deleted_query_file_content_is_persistence(self):
        path = "sitmun-backend/src/main/java/org/sitmun/administration/service/FooService.java"
        self.assertEqual(scope.tier([(path, "class Foo { @Query String q; }")]), "persistence")


class RunsTest(unittest.TestCase):
    def test_postgres_16_runs_for_backend_tier(self):
        self.assertTrue(scope.runs("backend", "postgres-16", "dev", "pull_request"))

    def test_oracle_skips_backend_tier(self):
        self.assertFalse(scope.runs("backend", "oracle-11", "dev", "pull_request"))

    def test_persistence_runs_every_install(self):
        for install in ("postgres-12", "postgres-16", "oracle-11", "oracle-19"):
            self.assertTrue(scope.runs("persistence", install, "dev", "pull_request"))

    def test_none_skips_every_install(self):
        for install in ("postgres-12", "postgres-16", "oracle-11", "oracle-19"):
            self.assertFalse(scope.runs("none", install, "dev", "pull_request"))

    def test_release_pull_request_runs_every_install(self):
        self.assertTrue(scope.runs("none", "oracle-19", "main", "pull_request"))

    def test_dispatch_runs_every_install(self):
        self.assertTrue(scope.runs("none", "postgres-12", "", "workflow_dispatch"))


class DeletedFileTest(unittest.TestCase):
    def test_cli_reads_a_deleted_java_file_from_the_base_commit(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            subprocess.check_call(["git", "init"], cwd=repo, stdout=subprocess.DEVNULL)
            subprocess.check_call(["git", "config", "user.email", "ci@example.com"], cwd=repo)
            subprocess.check_call(["git", "config", "user.name", "ci"], cwd=repo)
            path = repo / "sitmun-backend/src/main/java/org/sitmun/administration/service/FooService.java"
            path.parent.mkdir(parents=True)
            path.write_text("class Foo { @Query void q(); }\n", encoding="utf-8")
            subprocess.check_call(["git", "add", "."], cwd=repo)
            subprocess.check_call(["git", "commit", "-m", "add"], cwd=repo, stdout=subprocess.DEVNULL)
            base = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
            path.unlink()
            subprocess.check_call(["git", "add", "-A"], cwd=repo)
            subprocess.check_call(["git", "commit", "-m", "delete"], cwd=repo, stdout=subprocess.DEVNULL)
            head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()
            self.assertEqual(scope.changes_tier(repo, base, head), "persistence")


if __name__ == "__main__":
    unittest.main()
