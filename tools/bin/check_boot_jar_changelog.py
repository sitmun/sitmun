#!/usr/bin/env python3
"""Fail when the backend boot jar ships a changelog outside the shipped tree."""

from __future__ import annotations

import sys
import zipfile
from pathlib import Path

PREFIX = "BOOT-INF/classes/db/changelog/"


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def jar_path(argv: list[str]) -> Path:
    if len(argv) > 1:
        return Path(argv[1])
    libs = repo_root() / "sitmun-backend/build/libs"
    jars = sorted(p for p in libs.glob("*.jar") if not p.name.endswith("-plain.jar"))
    if not jars:
        raise SystemExit(f"no boot jar under {libs}")
    return jars[-1]


def changelog_entries(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as jar:
        return [name for name in jar.namelist() if "changelog" in name or name.startswith(PREFIX)]


def violations(names: list[str]) -> list[str]:
    bad: list[str] = []
    for name in names:
        if "profiles/" in name or "src/test/resources/" in name:
            bad.append(name)
            continue
        if "changelog" in name and not name.startswith(PREFIX):
            bad.append(name)
    return bad


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv if argv is None else argv)
    path = jar_path(args)
    names = changelog_entries(path)
    if not any(name.startswith(PREFIX) for name in names):
        print(f"{path} has no {PREFIX} entries", file=sys.stderr)
        return 1
    bad = violations(names)
    if bad:
        print(f"{path} changelog entries are outside {PREFIX}")
        for name in bad:
            print(f"  {name}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
