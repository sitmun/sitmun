#!/usr/bin/env python3
"""Audit frontend i18n JSON: keys missing per language and keys no source references.

Usage: python3 tools/i18n-utils/audit_keys.py [app ...]   (run from the repo root)
       python3 tools/i18n-utils/audit_keys.py --roundtrip
       python3 tools/i18n-utils/audit_keys.py --prune

A key is `used` when source holds it literally, as `<literal key>` + a quoted suffix,
under a literal prefix that is concatenated or interpolated, or as
`<entityLabelPrefix>.<form control>` (see sitmun-admin form-field-label.resolver.ts),
or as a seeded task-type spec label (tools/seed-data/baseline/task_types.csv).
It is `review` when only its parent prefix appears in source, and `stale` otherwise.
Source is every app, because admin writes keys that mobile translates.

`--prune` drops `stale` keys and any key absent from en.json. `--roundtrip` rewrites
nothing and exits 1 when the serializer would change a file that loses no keys.
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import subprocess
import sys
from pathlib import Path

APPS = ("sitmun-admin", "sitmun-viewer", "sitmun-mobile/sitmun-edition", "sitmun-mobile/sitmun-touristic")


def flat(d: dict, prefix: str = "") -> dict[str, object]:
    out: dict[str, object] = {}
    for k, v in d.items():
        key = f"{prefix}.{k}" if prefix else k
        out.update(flat(v, key) if isinstance(v, dict) else {key: v})
    return out


def source() -> str:
    roots = glob.glob("sitmun-*/src") + glob.glob("sitmun-*/*/src")
    return subprocess.run(
        ["rg", "--no-filename", "--glob", "*.{ts,html,json,java}", "--glob", "!**/assets/i18n/**",
         "--glob", "!**/*.spec.ts", "--glob", "!**/src/test/**", "--glob", "!**/node_modules/**",
         "--glob", "!**/{build,dist,www}/**", "", *roots],
        capture_output=True, text=True, check=True).stdout


def classifier(src: str):
    specs = open("tools/seed-data/baseline/task_types.csv").read()
    lit = set(re.findall(r"""['"`]([A-Za-z][A-Za-z0-9_.\-]*)['"`]""", src))
    lit |= set(re.findall(r'""label"": ""([A-Za-z0-9_.]+)""', specs))
    dyn = set(re.findall(r"""['"`]([A-Za-z][A-Za-z0-9_.\-]*\.)(?:\$\{|['"`]\s*\+)""", src))
    dyn |= {l for l in lit if l.endswith(".")}
    suffixes = set(re.findall(r"""['"`](\.[A-Za-z0-9_]+)['"`]""", src))
    suffixes |= set(re.findall(r"""\}(\.[A-Za-z0-9_]+)`""", src))
    label_prefixes = {a or b for a, b in re.findall(
        r"""entityLabelPrefix\s*[:=]\s*['"]([A-Za-z0-9_.]+)['"]|entityLabelPrefix\]?="'?([A-Za-z0-9_.]+)""", src)}
    label_prefixes.add("common.form")
    controls = {c for t in re.findall(
        r"""formControlName="(\w+)"|['"]?(\w+)['"]?\s*:\s*new\s+(?:Untyped)?FormControl|(?:(?:add|set|get)Control|\.get)\(\s*['"](\w+)""",
        src) for c in t if c} | set(re.findall(r'""(\w+)"": \{', specs))

    def status(key: str) -> str:
        if key in lit or any(key.endswith(s) and key[: -len(s)] in lit for s in suffixes):
            return "used"
        head, _, leaf = key.rpartition(".")
        if head in label_prefixes and leaf in controls:
            return "used"
        if any(key.startswith(p) for p in dyn):
            return "used"
        live = "." in head and head in src and re.search(re.escape(head) + r"(?![\w-])", src)
        return "review" if live else "stale"

    return status


def load_tree(path: Path) -> tuple[dict, str]:
    text = path.read_text(encoding="utf-8")
    return json.loads(text), text


def indent_width(text: str) -> int:
    for line in text.splitlines():
        if line[:1] in " \t":
            return len(line) - len(line.lstrip(" "))
    return 2


def dump(tree: dict, text: str) -> str:
    body = json.dumps(tree, ensure_ascii=False, indent=indent_width(text))
    return body + ("\n" if text.endswith("\n") else "")


def without(tree: dict, drop: set[str], prefix: str = "") -> dict:
    kept: dict = {}
    for name, value in tree.items():
        key = f"{prefix}.{name}" if prefix else name
        if isinstance(value, dict):
            child = without(value, drop, key)
            if child:
                kept[name] = child
        elif key not in drop:
            kept[name] = value
    return kept


def locale_files(app: str) -> list[Path]:
    return sorted(Path(p) for p in glob.glob(f"{app}/src/assets/i18n/*.json"))


def report(apps: tuple[str, ...]) -> None:
    status = classifier(source())
    for app in apps:
        files = locale_files(app)
        data = {path.stem: flat(json.loads(path.read_text(encoding="utf-8"))) for path in files}
        langs = list(data)
        for key in sorted(set().union(*data.values())):
            present = [lang for lang in langs if key in data[lang]]
            missing = [lang for lang in langs if lang not in present]
            empty = [lang for lang in present if isinstance(data[lang][key], str) and not str(data[lang][key]).strip()]
            state = status(key)
            if missing or empty or state != "used":
                print("\t".join((app, state, key, ",".join(missing) or "-", ",".join(empty) or "-")))


def prune(apps: tuple[str, ...], *, write: bool) -> int:
    status = classifier(source())
    unstable = 0
    removed = 0
    for app in apps:
        files = locale_files(app)
        trees = {path: load_tree(path) for path in files}
        flat_by_lang = {path.stem: flat(tree) for path, (tree, _) in trees.items()}
        english = set(flat_by_lang["en"])
        union = set().union(*flat_by_lang.values())
        drop = {key for key in union if key not in english or status(key) == "stale"}
        for path, (tree, text) in trees.items():
            rendered = dump(tree, text)
            if rendered != text:
                unstable += 1
                print(f"unstable {path}", file=sys.stderr)
            if not write:
                continue
            pruned = without(tree, drop)
            if pruned == tree:
                continue
            path.write_text(dump(pruned, text), encoding="utf-8")
            gone = sorted(set(flat(tree)) - set(flat(pruned)))
            removed += len(gone)
            print(f"{path} -{len(gone)}")
    if not write and unstable:
        return 1
    if write:
        print(f"{removed} keys removed")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apps", nargs="*", default=list(APPS))
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--roundtrip", action="store_true", help="fail if rewriting a file would change bytes")
    mode.add_argument("--prune", action="store_true", help="drop stale keys and keys absent from en.json")
    args = parser.parse_args()
    apps = tuple(args.apps)
    if args.roundtrip or args.prune:
        sys.exit(prune(apps, write=args.prune))
    report(apps)


if __name__ == "__main__":
    main()
