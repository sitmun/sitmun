#!/usr/bin/env python3
"""Report seed rows that have no translation in a non-default language."""

from __future__ import annotations

import csv
from pathlib import Path

SEED = Path(__file__).resolve().parent.parent / "seed-data" / "baseline"

SOURCES = (
    ("CodeListValue.description", "codelists.csv", ("cod_list", "cod_value")),
    ("Task.name", "tasks.csv", ("tas_name",)),
    ("TerritoryType.name", "territory_types.csv", ("tet_name",)),
    ("TaskGroup.name", "task_groups.csv", ("gts_name",)),
)


def read_csv(name: str) -> list[dict[str, str]]:
    with (SEED / name).open(newline="") as handle:
        return list(csv.DictReader(handle))


def default_language() -> str:
    for row in read_csv("configuration.csv"):
        if row["cnf_name"] == "language.default":
            return row["cnf_value"]
    return ""


def main() -> None:
    default = default_language()
    languages = [
        row["lan_shortname"]
        for row in read_csv("languages.csv")
        if row["lan_shortname"] != default
    ]
    present = {
        (row["tra_column"], row["element"], row["element_value"], row["lan_shortname"])
        for row in read_csv("translations.csv")
    }
    missing = 0
    for column, filename, fields in SOURCES:
        for row in read_csv(filename):
            element = row[fields[0]]
            value = row[fields[1]] if len(fields) > 1 else ""
            for language in languages:
                if (column, element, value, language) in present:
                    continue
                label = f"{element} {value}".strip()
                print(f"{language} {column} {label}")
                missing += 1
    print(f"{missing} missing")


if __name__ == "__main__":
    main()
