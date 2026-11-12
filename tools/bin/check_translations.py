#!/usr/bin/env python3
"""Report seed rows that have no translation in a non-default language."""

from __future__ import annotations

import csv
import sys
from pathlib import Path

SEED = Path(__file__).resolve().parent.parent / "seed-data" / "baseline"

SOURCES = (
    ("CodeListValue.description", "codelists.csv", ("cod_list", "cod_value")),
    ("Task.name", "tasks.csv", ("tas_name",)),
    ("TerritoryType.name", "territory_types.csv", ("tet_name",)),
    ("TaskGroup.name", "task_groups.csv", ("gts_name",)),
)


def read_csv(seed: Path, name: str) -> list[dict[str, str]]:
    with (seed / name).open(newline="") as handle:
        return list(csv.DictReader(handle))


def default_language(seed: Path) -> str:
    for row in read_csv(seed, "configuration.csv"):
        if row["cnf_name"] == "language.default":
            return row["cnf_value"]
    return ""


def main() -> None:
    seed = Path(sys.argv[1]) if len(sys.argv) > 1 else SEED
    default = default_language(seed)
    languages = [
        row["lan_shortname"]
        for row in read_csv(seed, "languages.csv")
        if row["lan_shortname"] != default
    ]
    present = {
        (row["tra_column"], row["element"], row["element_value"], row["lan_shortname"])
        for row in read_csv(seed, "translations.csv")
    }
    missing = 0
    for column, filename, fields in SOURCES:
        for row in read_csv(seed, filename):
            element = row[fields[0]]
            value = row[fields[1]] if len(fields) > 1 else ""
            for language in languages:
                if (column, element, value, language) in present:
                    continue
                label = f"{element} {value}".strip()
                print(f"{language} {column} {label}")
                missing += 1
    present_values = {
        (row["ltr_id"], row["lan_shortname"])
        for row in read_csv(seed, "literal_translation_values.csv")
    }
    for sentence in read_csv(seed, "literal_translations.csv"):
        for language in (row["lan_shortname"] for row in read_csv(seed, "languages.csv")):
            if (sentence["ltr_id"], language) in present_values:
                continue
            print(f"{language} literal {sentence['ltr_literal']}")
            missing += 1
    print(f"{missing} missing")
    if missing:
        sys.exit(1)


if __name__ == "__main__":
    main()
