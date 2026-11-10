#!/usr/bin/env python3
"""Compare the authored data dictionary to baseline SQL or a catalog dump.

Prints one line per drift: class|key|consumer|expected|observed.
Exit 1 when a drift or an open row exists. Pass --fail-on none to report without failing.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from data_dictionary_lib import (
    catalog_file,
    check_catalog,
    check_configuration,
    check_sql,
    counts,
    load_columns,
    open_count,
    parse_liquibase_add_columns,
    read_dictionary,
    validate_document,
)

COUNT_NAMES = (
    "length",
    "required",
    "default",
    "type",
    "unique",
    "codelist",
    "references",
    "configuration",
    "shape",
    "openapi",
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dictionary", type=Path, default=Path("tools/dictionary/dictionary.json"))
    parser.add_argument("--catalog", type=Path, action="append", default=[])
    parser.add_argument("--sql", type=Path, action="append", default=[])
    parser.add_argument("--prefix", default=None)
    parser.add_argument("--fail-on", choices=("none", "problem"), default="problem")
    args = parser.parse_args(argv)
    document = read_dictionary(args.dictionary)
    drifts = validate_document(document)
    for catalog in args.catalog:
        columns_path = catalog_file(catalog, "columns")
        if not columns_path.is_file() or not load_columns(columns_path):
            print(f"ERROR: {columns_path} has no columns", file=sys.stderr)
            return 1
        drifts.extend(check_catalog(document, catalog, prefix=args.prefix))
    added = {}
    changelog = Path("sitmun-backend/src/main/resources/db/changelog/db.changelog-master.yaml")
    if args.sql and changelog.is_file():
        added = parse_liquibase_add_columns(changelog.read_text(encoding="utf-8"))
    for sql_path in args.sql:
        text = sql_path.read_text(encoding="utf-8")
        if re.search(r"CREATE\s+TABLE\b", text, re.I):
            drifts.extend(check_sql(document, text, consumer=sql_path.name, extra_columns=added))
        else:
            drifts.extend(check_configuration(document, text, consumer=sql_path.name))
    totals = counts(drifts)
    for name in COUNT_NAMES:
        print(f"{name}={totals[name]}")
    print(f"open={open_count(document)}")
    for drift in drifts:
        print(drift.line())
    if args.fail_on == "problem" and (drifts or open_count(document)):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
