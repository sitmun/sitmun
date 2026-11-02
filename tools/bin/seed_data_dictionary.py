#!/usr/bin/env python3
"""Seed tools/dictionary/dictionary.json from the PostgreSQL and Oracle baselines.

A second run keeps every row that is already decided. Use --decide to close
remaining open rows with the PostgreSQL value.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from data_dictionary_lib import (
    apply_java_consumers,
    build_document,
    decide_open_rows,
    load_system_codelists,
    parse_create_columns,
    parse_uniques,
    read_dictionary,
    write_dictionary,
)

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    root = Path(__file__).resolve().parents[2]
    parser.add_argument(
        "--postgres",
        type=Path,
        default=root / "sitmun-backend/src/main/resources/db/changelog/baseline/01-schema.postgresql.sql",
    )
    parser.add_argument(
        "--oracle",
        type=Path,
        default=root / "sitmun-backend/src/main/resources/db/changelog/baseline/01-schema.oracle.sql",
    )
    parser.add_argument(
        "--codelists",
        type=Path,
        default=root / "tools/seed-data/baseline/codelists.csv",
    )
    parser.add_argument("--out", type=Path, default=root / "tools/dictionary/dictionary.json")
    parser.add_argument("--decide", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args(argv)
    existing = read_dictionary(args.out) if args.out.is_file() else None
    document = build_document(
        parse_create_columns(args.postgres.read_text(encoding="utf-8")),
        parse_create_columns(args.oracle.read_text(encoding="utf-8")),
        parse_uniques(args.postgres.read_text(encoding="utf-8")),
        load_system_codelists(args.codelists),
        existing,
    )
    apply_java_consumers(document, root / "sitmun-backend/src/main/java")
    if args.decide:
        decide_open_rows(document)
    if args.check and existing is not None:
        for ident, row in existing.get("columns", {}).items():
            if row.get("status") == "decided" and document["columns"].get(ident) != row:
                print(f"would overwrite decided row {ident}")
                return 1
        print("open=0" if all(row.get("status") == "decided" for row in document["columns"].values()) else "open>0")
        return 0
    write_dictionary(args.out, document)
    open_rows = sum(1 for row in document["columns"].values() if row.get("status") == "open")
    print(f"columns={len(document['columns'])} open={open_rows}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
