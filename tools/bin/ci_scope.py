#!/usr/bin/env python3
"""Choose the database tier for a change, and whether one install runs.

Prints GitHub Actions outputs: tier=none|backend|persistence and db=true|false.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

PERSISTENCE_PREFIXES = (
    "sitmun-backend/src/main/java/org/sitmun/domain/",
    "sitmun-backend/src/main/java/org/sitmun/infrastructure/persistence/",
    "sitmun-backend/src/main/java/org/sitmun/administration/service/dashboard/",
    "sitmun-backend/src/main/java/org/sitmun/administration/service/database/",
    "sitmun-backend/src/main/resources/",
    "sitmun-backend/config/",
    "sitmun-backend/src/test/resources/",
    "profiles/",
    "gradle/",
    ".github/actions/backend-database/",
)

PERSISTENCE_FILES = {
    "sitmun-backend/build.gradle",
    "build.gradle",
    "settings.gradle",
    "gradle.properties",
    "gradlew",
    ".java-version",
    "tools/tests/test_backend_db_boot.sh",
    "tools/bin/ci_scope.py",
    "tools/bin/ci_db_scope.py",
    "tools/tests/test_ci_db_scope.py",
}

SQL_MARKERS = (
    "@Query",
    "nativeQuery",
    "JdbcTemplate",
    "NamedParameterJdbcTemplate",
    "EntityManager",
    "createQuery",
    "createNativeQuery",
    "CriteriaBuilder",
    "Specification<",
    "@Entity",
    "@Table",
    "@Column",
    "Pageable",
    "PageRequest",
)

TEST_MARKERS = ("@SpringBootTest", "@DataJpaTest")

INSTALLS = ("postgres-12", "postgres-16", "oracle-11", "oracle-19")

GRADLE_PATHS = (
    "gradle/**",
    "build.gradle",
    "settings.gradle",
    "gradle.properties",
    "gradlew",
    ".java-version",
)

E2E_SHARED = (
    "e2e/fixtures/**",
    "package.json",
    "pnpm-lock.yaml",
    ".nvmrc",
    ".java-version",
    ".github/workflows/e2e.yml",
    ".github/workflows/ci-gate.yml",
    *GRADLE_PATHS,
)

FILTERS = {
    "admin": ("sitmun-admin/**", ".nvmrc"),
    "viewer": ("sitmun-viewer/**", ".nvmrc"),
    "backend": ("sitmun-backend/**", *GRADLE_PATHS),
    "proxy": ("sitmun-proxy/**", *GRADLE_PATHS),
    "mbtiles": ("sitmun-addons/sitmun-mbtiles/**", *GRADLE_PATHS),
    "shared": ("sitmun-common/**", *GRADLE_PATHS),
    "docker": (
        "docker/**",
        "compose.yaml",
        ".dockerignore",
        "sitmun-admin/**",
        "sitmun-viewer/**",
        "sitmun-backend/**",
        "sitmun-proxy/**",
        "sitmun-common/**",
        "sitmun-addons/**",
        ".github/workflows/ci-docker.yml",
        ".github/workflows/ci-gate.yml",
    ),
    "e2e_admin": (
        "sitmun-admin/**",
        "sitmun-backend/**",
        "sitmun-common/**",
        "e2e/admin/**",
        "scripts/e2e-admin.mjs",
        "scripts/e2e-backend.mjs",
        "scripts/e2e-process.mjs",
        "playwright.config.ts",
        *E2E_SHARED,
    ),
    "e2e_viewer": (
        "sitmun-viewer/**",
        "sitmun-backend/**",
        "sitmun-proxy/**",
        "sitmun-common/**",
        "e2e/viewer/**",
        "scripts/e2e-viewer.mjs",
        "scripts/e2e-backend.mjs",
        "scripts/e2e-proxy.mjs",
        "scripts/e2e-wms-stub.mjs",
        "scripts/e2e-process.mjs",
        "playwright.viewer.config.ts",
        *E2E_SHARED,
    ),
    "e2e_contact": (
        "sitmun-admin/**",
        "sitmun-viewer/**",
        "sitmun-backend/**",
        "sitmun-common/**",
        "e2e/application-contact/**",
        "scripts/e2e-admin.mjs",
        "scripts/e2e-viewer.mjs",
        "scripts/e2e-backend.mjs",
        "scripts/e2e-process.mjs",
        "playwright.application-contact.config.ts",
        *E2E_SHARED,
    ),
    "e2e_mia": (
        "sitmun-admin/**",
        "sitmun-viewer/**",
        "sitmun-backend/**",
        "sitmun-proxy/**",
        "sitmun-common/**",
        "e2e/mia-cross/**",
        "scripts/e2e-admin.mjs",
        "scripts/e2e-viewer.mjs",
        "scripts/e2e-backend.mjs",
        "scripts/e2e-proxy.mjs",
        "scripts/e2e-wms-stub.mjs",
        "scripts/e2e-process.mjs",
        "playwright.mia-cross.config.ts",
        *E2E_SHARED,
    ),
    "e2e_mobile_web": (
        "sitmun-mobile/**",
        "sitmun-backend/**",
        "sitmun-proxy/**",
        "sitmun-addons/**",
        "sitmun-common/**",
        "e2e/mobile/**",
        "scripts/e2e-backend-mobile.mjs",
        "scripts/e2e-proxy-mobile.mjs",
        "scripts/e2e-mbtiles.mjs",
        "scripts/e2e-process.mjs",
        "playwright.mobile.config.ts",
        *E2E_SHARED,
    ),
    "e2e_mobile_android": (
        "sitmun-mobile/**",
        "sitmun-backend/**",
        "sitmun-proxy/**",
        "sitmun-addons/**",
        "sitmun-common/**",
        "e2e/mobile/**",
        "scripts/e2e-mobile-android.mjs",
        "scripts/e2e-backend-mobile.mjs",
        "scripts/e2e-proxy-mobile.mjs",
        "scripts/e2e-mbtiles.mjs",
        "scripts/e2e-process.mjs",
        "playwright.mobile.config.ts",
        *E2E_SHARED,
    ),
}


def persistence_path(path: str) -> bool:
    if path in PERSISTENCE_FILES:
        return True
    if path.startswith(".github/workflows/test-") and path.endswith(".yml"):
        return True
    return any(path.startswith(prefix) for prefix in PERSISTENCE_PREFIXES)


def content_is_persistence(path: str, text: str | None) -> bool:
    if not text or not path.endswith(".java") or not path.startswith("sitmun-backend/src/"):
        return False
    markers = SQL_MARKERS + TEST_MARKERS if "/src/test/" in path else SQL_MARKERS
    return any(marker in text for marker in markers)


def tier(changes: list[tuple[str, str | None]]) -> str:
    result = "none"
    for path, text in changes:
        if persistence_path(path) or content_is_persistence(path, text):
            return "persistence"
        if path.startswith("sitmun-backend/"):
            result = "backend"
    return result


def runs(tier_name: str, install: str, base_ref: str, event: str) -> bool:
    if event == "workflow_dispatch" or base_ref == "main":
        return True
    if install == "postgres-16":
        return tier_name != "none"
    return tier_name == "persistence"


def _show(repo: Path, rev: str, path: str) -> str | None:
    try:
        return subprocess.check_output(
            ["git", "show", f"{rev}:{path}"],
            cwd=repo,
            text=True,
            stderr=subprocess.DEVNULL,
        )
    except subprocess.CalledProcessError:
        return None


def changes_between(repo: Path, base: str, head: str) -> list[tuple[str, str | None]]:
    out = subprocess.check_output(
        ["git", "diff", "--name-status", "-M", f"{base}...{head}"],
        cwd=repo,
        text=True,
    )
    changes: list[tuple[str, str | None]] = []
    for line in out.splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        status = parts[0]
        if status.startswith(("R", "C")):
            path = parts[2]
            rev = head
        elif status.startswith("D"):
            path = parts[1]
            rev = base
        else:
            path = parts[1]
            rev = head
        text = None
        if path.endswith(".java") and path.startswith("sitmun-backend/src/"):
            text = _show(repo, rev, path)
        changes.append((path, text))
    return changes


def changes_tier(repo: Path, base: str, head: str) -> str:
    return tier(changes_between(repo, base, head))


def matches(path: str, pattern: str) -> bool:
    if pattern.endswith("/**"):
        root = pattern[:-3]
        return path == root or path.startswith(root + "/")
    return path == pattern


def flags_for(paths: list[str]) -> dict[str, bool]:
    return {
        name: any(matches(path, pattern) for path in paths for pattern in patterns)
        for name, patterns in FILTERS.items()
    }


def blank_sha(value: str | None) -> bool:
    return bool(value) and set(value) <= {"0"}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base")
    parser.add_argument("--head")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--event", default="pull_request")
    parser.add_argument("--base-ref", default="")
    parser.add_argument("--install", choices=INSTALLS)
    parser.add_argument("--flags", action="store_true")
    parser.add_argument("--repo", type=Path, default=Path("."))
    args = parser.parse_args(argv)
    paths: list[str] | None
    if args.all or blank_sha(args.base):
        tier_name = "persistence"
        paths = None
    else:
        if not args.base or not args.head:
            parser.error("--base and --head are required unless --all is set")
        changes = changes_between(args.repo, args.base, args.head)
        tier_name = tier(changes)
        paths = [path for path, _text in changes]
    print(f"tier={tier_name}")
    if args.install:
        db = "true" if runs(tier_name, args.install, args.base_ref, args.event) else "false"
        print(f"db={db}")
    if args.flags:
        chosen = {name: True for name in FILTERS} if paths is None else flags_for(paths)
        for name, value in chosen.items():
            print(f"{name}={'true' if value else 'false'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
