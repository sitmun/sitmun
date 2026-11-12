#!/usr/bin/env python3
"""Diff a fresh 1.3.0 catalog against a 1.2.9 database upgraded to 1.3.0.

Columns must match, including nullability and default. Constraints match on
table, type, columns, and foreign-key target. A system-generated Oracle
constraint name (SYS_C...) may differ. An explicit name may not.

System code lists match on list, value, default, and description. Translation
rows for code-list descriptions must point at a code-list row on both sides.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

DICTIONARY = Path(__file__).resolve().parents[1] / "dictionary" / "dictionary.json"


def lines(path: Path) -> list[str]:
    if not path.exists():
        return []
    return [line for line in path.read_text().splitlines() if line.strip()]


def constraint_key(line: str) -> tuple[str, str]:
    parts = line.split("|")
    while len(parts) < 6:
        parts.append("")
    table, ctype, cols, reftable, refcols, name = parts[:6]
    return (table, ctype, cols, reftable, refcols), name


def constraint_mismatches(left: list[str], right: list[str]) -> list[str]:
    grouped: dict[tuple[str, ...], list[list[str]]] = {}
    for side, source in enumerate((left, right)):
        for line in source:
            key, name = constraint_key(line)
            bucket = grouped.setdefault(key, [[], []])
            bucket[side].append(name)
    mismatches: list[str] = []
    for key in sorted(grouped):
        fresh, upgraded = grouped[key]
        if sorted(fresh) == sorted(upgraded):
            continue
        def generated(names: list[str]) -> bool:
            return bool(names) and all(name.upper().startswith("SYS_C") for name in names)
        if generated(fresh) or generated(upgraded):
            continue
        shown = "|".join(key)
        mismatches.append(f"constraint {shown}: fresh={fresh or ['missing']} upgraded={upgraded or ['missing']}")
    return mismatches


def list_mismatches(label: str, left: list[str], right: list[str]) -> list[str]:
    only_fresh = sorted(set(left) - set(right))
    only_upgraded = sorted(set(right) - set(left))
    out: list[str] = []
    for line in only_fresh:
        out.append(f"{label} only on fresh: {line}")
    for line in only_upgraded:
        out.append(f"{label} only on upgraded: {line}")
    return out


def pairs(path: Path) -> dict[str, str]:
    found: dict[str, str] = {}
    for line in lines(path):
        if "|" not in line:
            continue
        key, value = line.split("|", 1)
        found[key] = value
    return found


def configuration_mismatches(root: Path) -> list[str]:
    document = json.loads(DICTIONARY.read_text(encoding="utf-8"))
    expected = document.get("configuration", {})
    fresh = pairs(root / "fresh.configuration")
    upgraded = pairs(root / "upgraded.configuration")
    mismatches: list[str] = []
    for key in sorted(set(expected) | set(fresh) | set(upgraded)):
        spec = expected.get(key)
        if spec:
            if fresh.get(key) != spec.get("fresh"):
                mismatches.append(
                    f"configuration {key}: fresh={fresh.get(key, 'missing')} expected={spec.get('fresh')}"
                )
            if upgraded.get(key) != spec.get("upgraded"):
                mismatches.append(
                    f"configuration {key}: upgraded={upgraded.get(key, 'missing')} expected={spec.get('upgraded')}"
                )
            continue
        if fresh.get(key) != upgraded.get(key):
            mismatches.append(
                f"configuration {key}: fresh={fresh.get(key, 'missing')} upgraded={upgraded.get(key, 'missing')}"
            )
    return mismatches


def integrity_mismatch(left: list[str], right: list[str]) -> list[str]:
    fresh = left[0].strip() if left else "missing"
    upgraded = right[0].strip() if right else "missing"
    out: list[str] = []
    if fresh != "0":
        out.append(f"fresh code-list translations with a missing code list: {fresh}")
    if upgraded != "0":
        out.append(f"upgraded code-list translations with a missing code list: {upgraded}")
    return out


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: compare_fresh_vs_upgraded.py DUMP_DIR", file=sys.stderr)
        return 2
    root = Path(sys.argv[1])
    mismatches: list[str] = []
    mismatches.extend(list_mismatches("column", lines(root / "fresh.columns"), lines(root / "upgraded.columns")))
    mismatches.extend(constraint_mismatches(lines(root / "fresh.constraints"), lines(root / "upgraded.constraints")))
    mismatches.extend(list_mismatches("code list", lines(root / "fresh.codelists"), lines(root / "upgraded.codelists")))
    mismatches.extend(integrity_mismatch(lines(root / "fresh.integrity"), lines(root / "upgraded.integrity")))
    mismatches.extend(configuration_mismatches(root))
    if mismatches:
        print(f"{len(mismatches)} difference(s)")
        for line in mismatches:
            print(line)
        return 1
    print("fresh and upgraded catalogs match")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
