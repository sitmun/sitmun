#!/usr/bin/env python3

from __future__ import annotations

import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

ROOT_ONLY = {
    ".gitignore",
    ".gitattributes",
    ".editorconfig",
    ".nvmrc",
    ".npmrc",
    ".markdownlint.json",
    ".java-version",
}

ALLOWED = {"sitmun-mobile/.java-version"}


def _tracked_paths() -> list[str]:
    output = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    return [item.decode() for item in output.split(b"\0") if item]


def test_root_only_files() -> None:
    tracked = set(_tracked_paths())
    failures = [
        f"missing root {name}" for name in sorted(ROOT_ONLY) if name not in tracked
    ]
    extras = sorted(
        path
        for path in tracked
        if Path(path).name in ROOT_ONLY and path not in ROOT_ONLY and path not in ALLOWED
    )
    failures.extend(f"extra copy: {path}" for path in extras)
    assert not failures, "\n".join(failures)


if __name__ == "__main__":
    try:
        import pytest as _pytest
    except ImportError:
        try:
            test_root_only_files()
        except AssertionError as error:
            print(error)
            raise SystemExit(1) from error
        print("ok")
    else:
        raise SystemExit(_pytest.main([__file__]))
