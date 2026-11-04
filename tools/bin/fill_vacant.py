#!/usr/bin/env python3
"""Insert a shipped translation cell when its parent exists and the cell is empty.

A present cell is left alone. A missing template sentence is not created.
A catalog upgrade skips the database default language. A literal upgrade includes it.
"""

from __future__ import annotations

import csv
from pathlib import Path
from typing import NamedTuple

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "tools" / "seed-data" / "baseline"
_DEFAULT_LANGUAGE = (
    "COALESCE((SELECT cnf_value FROM stm_conf WHERE cnf_name = 'language.default'), 'en')"
)

__all__ = [
    "baseline_literal_sql",
    "baseline_translation_sql",
    "upgrade_catalog_sql",
    "upgrade_literal_sql",
]


class CatalogCell(NamedTuple):
    """One stm_translation insert. Upgrade SQL skips the database default language."""

    tra_id: int
    column: str
    parent: str
    element_value: str
    language: str
    text: str


class LiteralCell(NamedTuple):
    """One stm_literal_translation_value insert. Includes the database default language."""

    ltv_id: int
    literal: str
    language: str
    text: str


class _Seed(NamedTuple):
    catalog_rows: tuple[dict[str, str], ...]
    codelists: tuple[dict[str, str], ...]
    sentences: tuple[dict[str, str], ...]
    literal_values: tuple[dict[str, str], ...]


def _sql(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def _read(name: str) -> tuple[dict[str, str], ...]:
    with (SEED / name).open(newline="") as handle:
        return tuple(csv.DictReader(handle))


def _load_seed() -> _Seed:
    return _Seed(
        catalog_rows=_read("translations.csv"),
        codelists=_read("codelists.csv"),
        sentences=_read("literal_translations.csv"),
        literal_values=_read("literal_translation_values.csv"),
    )


def _catalog_cells(seed: _Seed) -> tuple[CatalogCell, ...]:
    translations = seed.catalog_rows
    stored_english = [
        row
        for row in translations
        if row["tra_column"] == "CodeListValue.description" and row["lan_shortname"] == "en"
    ]
    if stored_english:
        raise SystemExit("translations.csv stores English code-value rows; derive them instead")
    cells = [
        CatalogCell(
            tra_id=int(row["tra_id"]),
            column=row["tra_column"],
            parent=row["element"],
            element_value=row["element_value"],
            language=row["lan_shortname"],
            text=row["tra_name"],
        )
        for row in translations
    ]
    description = {(row["cod_list"], row["cod_value"]): row for row in seed.codelists}
    translated = {
        (row["element"], row["element_value"])
        for row in translations
        if row["tra_column"] == "CodeListValue.description" and row["lan_shortname"] != "en"
    }
    next_id = max(cell.tra_id for cell in cells) + 1
    derived: list[CatalogCell] = []
    for key in sorted(translated, key=lambda item: int(description[item]["cod_id"])):
        derived.append(
            CatalogCell(
                tra_id=next_id,
                column="CodeListValue.description",
                parent=key[0],
                element_value=key[1],
                language="en",
                text=description[key]["cod_description"],
            )
        )
        next_id += 1
    return tuple(cells + derived)


def _literal_cells(seed: _Seed) -> tuple[LiteralCell, ...]:
    sentences = {row["ltr_id"]: row["ltr_literal"] for row in seed.sentences}
    return tuple(
        LiteralCell(
            ltv_id=int(row["ltv_id"]),
            literal=sentences[row["ltr_id"]],
            language=row["lan_shortname"],
            text=row["ltv_value"],
        )
        for row in seed.literal_values
    )


def _catalog_target(cell: CatalogCell) -> tuple[str, str, str]:
    element = _sql(cell.parent)
    if cell.column == "CodeListValue.description":
        return (
            "stm_codelist ele",
            f"ele.cod_list = {element} AND ele.cod_value = {_sql(cell.element_value)}",
            "ele.cod_id",
        )
    if cell.column == "Language.name":
        return ("stm_language ele", f"ele.lan_shortname = {element}", "ele.lan_id")
    if cell.column == "Task.name":
        return ("stm_task ele", f"ele.tas_name = {element}", "ele.tas_id")
    if cell.column == "TaskGroup.name":
        return ("stm_grp_tsk ele", f"ele.gts_name = {element}", "ele.gts_id")
    if cell.column == "TerritoryType.name":
        return ("stm_ter_typ ele", f"ele.tet_name = {element}", "ele.tet_id")
    raise SystemExit(f"unknown translation column {cell.column}")


def fill_vacant(cell: CatalogCell | LiteralCell) -> str:
    """Upgrade AND clause. A second run inserts nothing and does not change text."""
    if isinstance(cell, CatalogCell):
        _source, _where, eleid = _catalog_target(cell)
        return (
            "AND NOT EXISTS (SELECT 1 FROM stm_translation t "
            f"WHERE t.tra_eleid = {eleid} AND t.tra_column = {_sql(cell.column)} "
            "AND t.tra_lanid = lang.lan_id) "
            f"AND {_DEFAULT_LANGUAGE} <> {_sql(cell.language)}"
        )
    return (
        "AND NOT EXISTS ("
        "SELECT 1 FROM stm_literal_translation_value existing "
        "WHERE existing.ltv_ltrid = ltr.ltr_id AND existing.ltv_lanid = lang.lan_id)"
    )


def _baseline_catalog_insert(cell: CatalogCell) -> str:
    name = _sql(cell.text)
    column = _sql(cell.column)
    language = _sql(cell.language)
    tra_id = cell.tra_id
    if cell.column == "Language.name":
        element = _sql(cell.parent)
        return (
            "INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) "
            f"SELECT {tra_id}, ele.lan_id, {column}, lang.lan_id, {name} "
            "FROM stm_language ele JOIN stm_language lang ON lang.lan_shortname = "
            f"{language} WHERE ele.lan_shortname = {element};"
        )
    if cell.column == "CodeListValue.description":
        return (
            "INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) "
            f"SELECT {tra_id}, c.cod_id, {column}, lang.lan_id, {name} "
            "FROM stm_codelist c JOIN stm_language lang ON lang.lan_shortname = "
            f"{language} WHERE c.cod_list = {_sql(cell.parent)} AND c.cod_value = {_sql(cell.element_value)};"
        )
    table, id_column, name_column = {
        "Task.name": ("stm_task", "tas_id", "tas_name"),
        "TerritoryType.name": ("stm_ter_typ", "tet_id", "tet_name"),
        "TaskGroup.name": ("stm_grp_tsk", "gts_id", "gts_name"),
    }[cell.column]
    return (
        "INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) "
        f"SELECT {tra_id}, entity.{id_column}, {column}, lang.lan_id, {name} "
        f"FROM {table} entity JOIN stm_language lang ON lang.lan_shortname = {language} "
        f"WHERE entity.{name_column} = {_sql(cell.parent)};"
    )


def _upgrade_catalog_insert(cell: CatalogCell) -> str:
    source, where, eleid = _catalog_target(cell)
    return (
        "INSERT INTO stm_translation (tra_id, tra_eleid, tra_column, tra_lanid, tra_name) "
        "SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM stm_translation WHERE tra_id = "
        f"{cell.tra_id}) THEN {cell.tra_id} ELSE COALESCE((SELECT MAX(tra_id) FROM stm_translation), 0) + 1 END, "
        f"{eleid}, {_sql(cell.column)}, lang.lan_id, {_sql(cell.text)} "
        f"FROM {source} "
        f"JOIN stm_language lang ON lang.lan_shortname = {_sql(cell.language)} "
        f"WHERE {where} "
        + fill_vacant(cell)
    )


def _literal_parent_insert(row: dict[str, str]) -> str:
    return (
        "INSERT INTO stm_literal_translation (ltr_id, ltr_literal, ltr_lanid) "
        f"SELECT {row['ltr_id']}, {_sql(row['ltr_literal'])}, lang.lan_id "
        f"FROM stm_language lang WHERE lang.lan_shortname = {_sql(row['lan_shortname'])};"
    )


def _baseline_literal_insert(cell: LiteralCell, ltr_id: str) -> str:
    return (
        "INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) "
        f"SELECT {cell.ltv_id}, {ltr_id}, lang.lan_id, {_sql(cell.text)} "
        f"FROM stm_language lang WHERE lang.lan_shortname = {_sql(cell.language)};"
    )


def _upgrade_literal_insert(cell: LiteralCell) -> str:
    return (
        "INSERT INTO stm_literal_translation_value (ltv_id, ltv_ltrid, ltv_lanid, ltv_value) "
        "SELECT COALESCE((SELECT MAX(ltv_id) FROM stm_literal_translation_value), 0) + 1, "
        f"ltr.ltr_id, lang.lan_id, {_sql(cell.text)} "
        "FROM stm_literal_translation ltr "
        f"JOIN stm_language lang ON lang.lan_shortname = {_sql(cell.language)} "
        f"WHERE ltr.ltr_literal = {_sql(cell.literal)} "
        + fill_vacant(cell)
    )


def baseline_translation_sql() -> str:
    cells = _catalog_cells(_load_seed())
    return "\n".join(_baseline_catalog_insert(cell) for cell in cells) + "\n"


def baseline_literal_sql(oracle: bool) -> list[str]:
    """Sentence parents, then unconditional value inserts. Both dialects share this text."""
    del oracle
    seed = _load_seed()
    parents = [_literal_parent_insert(row) for row in seed.sentences]
    ids = {row["ltr_literal"]: row["ltr_id"] for row in seed.sentences}
    values = [_baseline_literal_insert(cell, ids[cell.literal]) for cell in _literal_cells(seed)]
    return parents + values


def upgrade_catalog_sql() -> str:
    lines = [_upgrade_catalog_insert(cell) for cell in _catalog_cells(_load_seed())]
    return ";\n".join(lines) + ";\n"


def upgrade_literal_sql() -> str:
    lines = [_upgrade_literal_insert(cell) for cell in _literal_cells(_load_seed())]
    return ";\n".join(lines) + ";\n"
