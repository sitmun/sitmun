#!/usr/bin/env python3
"""Fail a PR that edits an already-shipped Liquibase include.

Checksums live in DATABASECHANGELOG. Editing an applied changeset breaks
upgrade. This gate looks at the PR diff, not git ancestry.

Allow edits to the highest numbered include in that tree, includes that were
not on the diff base, master files, and the seed paths in TREE_ALLOWLIST.
Everything else with a lower number fails.

Once a vMAJOR.MINOR.PATCH tag exists, a file in a checked tree that exists at
the newest such tag must keep that tag's content, whatever its name. A master
from that tag keeps every line and only gains `releases/<version>.yaml`
includes for versions after the tag (docs/database-changelogs.md).
"""

from __future__ import annotations

import argparse
import difflib
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

INCLUDE_XML = re.compile(r"<include\s+file=\"([^\"]+)\"")
INCLUDE_YAML = re.compile(r"^\s+file:\s+(\S+)", re.M)
PREFIX_RE = re.compile(r"(?:^|/)(\d+)_")
VALID_CHECKSUM_LINE = re.compile(r"^--validCheckSum(?:\s|:)\s*\S+")
RELEASE_TAG = re.compile(r"^v\d+\.\d+\.\d+$")

DEFAULT_TREES = (
    "sitmun-backend/src/main/resources/db/changelog",
    "sitmun-backend/src/test/resources/db/changelog-test",
    "profiles/showcase/liquibase",
    "profiles/development/backend/liquibase",
    "profiles/postgres/liquibase",
    "profiles/oracle/liquibase",
)

TREE_ALLOWLIST: dict[str, tuple[str, ...]] = {
    "profiles/postgres/liquibase": (
        "changelog/02_codelists.yaml",
        "changelog/02_codelists/",
        "changelog/03_task_types.yaml",
        "changelog/03_task_types/",
        "changelog/04_seed_data.yaml",
        "changelog/04_seed_data/",
        "changelog/05_translations.yaml",
        "changelog/05_translations/",
        "changelog/06_params.yaml",
        "changelog/06_params/",
        "changelog/07_sequences.yaml",
    ),
    "profiles/oracle/liquibase": (
        "changelog/02_codelists.yaml",
        "changelog/02_codelists/",
        "changelog/03_task_types.yaml",
        "changelog/03_task_types/",
        "changelog/04_seed_data.yaml",
        "changelog/04_seed_data/",
        "changelog/05_translations.yaml",
        "changelog/05_translations/",
        "changelog/06_params.yaml",
        "changelog/06_params/",
    ),
    "profiles/development/backend/liquibase": (
        "changelog/04_initial_data_dev.yaml",
        "changelog/04_initial_data_dev/",
    ),
}

MASTER_NAMES = frozenset({"master.xml", "db.changelog-master.yaml"})

VERSION_FILE = re.compile(r"^releases/(\d+\.\d+\.\d+)(-upgrade)?\.yaml$")
YAML_ADDED = (
    ("include", re.compile(r"^  - include:\s*$")),
    ("file", re.compile(r"^      file:\s*([\"']?)(\S+?)\1\s*$")),
    ("relative", re.compile(r"^      relativeToChangelogFile:\s*true\s*$")),
    ("note", re.compile(r"^\s*(#.*)?$")),
)
XML_INCLUDE_LINE = re.compile(r"^\s*<include\s+([^>]*?)\s*/>\s*$")
XML_ATTR = re.compile(r'(\w+)="([^"]*)"')
XML_NOTE = re.compile(r"^\s*(<!--.*-->)?\s*$")
YAML_UPGRADE_FILE = re.compile(r"^      file:\s*([\"']?)upgrade/db\.changelog-upgrade\.yaml\1\s*$")


@dataclass(frozen=True)
class Violation:
    rel_path: str
    prefix: int
    max_prefix: int
    tree: str


def repo_root_from_here() -> Path:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=Path(__file__).resolve().parent,
            capture_output=True,
            text=True,
            check=True,
        )
        return Path(out.stdout.strip())
    except subprocess.CalledProcessError:
        return Path(__file__).resolve().parents[2]


def include_prefix(path: str) -> int | None:
    match = PREFIX_RE.search(path.replace("\\", "/"))
    return int(match.group(1)) if match else None


def posix_rel(path: Path, root: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def is_valid_checksum_only_diff(diff_text: str) -> bool:
    """True when the unified diff only adds --validCheckSum lines."""
    added = False
    for line in diff_text.splitlines():
        if line.startswith(("diff ", "index ", "+++", "---", "@@", "new file", "old mode", "new mode")):
            continue
        if line.startswith("+"):
            body = line[1:].strip()
            if not body:
                continue
            if not VALID_CHECKSUM_LINE.match(body):
                return False
            added = True
        elif line.startswith("-"):
            return False
    return added


MASTER_XML_PIN = " logicalFilePath:master.xml"


def is_master_xml_pin_only_diff(diff_text: str) -> bool:
    """True when the diff only appends logicalFilePath:master.xml to --changeset lines.

    The profile master records master.xml for a changeset without its own
    logicalFilePath. Pinning that name keeps the recorded identity and the
    checksum (#404).
    """
    removed: list[str] = []
    pinned = False
    for line in diff_text.splitlines():
        if line.startswith(("diff ", "index ", "+++ ", "--- ", "@@", "new file", "old mode", "new mode")):
            continue
        if line.startswith("-"):
            removed.append(line[1:])
        elif line.startswith("+"):
            old = removed.pop(0) if removed else None
            if old is None or not old.startswith("--changeset ") or line[1:] != old.rstrip() + MASTER_XML_PIN:
                return False
            pinned = True
    return pinned and not removed


def git_diff_text(repo_root: Path, start: str | None, path: str) -> str:
    if start and start != "HEAD":
        args = ["git", "diff", f"{start}...HEAD", "--", path]
    else:
        args = ["git", "diff", "HEAD", "--", path]
    shown = subprocess.run(args, cwd=repo_root, capture_output=True, text=True, check=False)
    return shown.stdout


def is_allowlisted(tree_key: str, rel_path: str) -> bool:
    rel = rel_path.replace("\\", "/")
    for pattern in TREE_ALLOWLIST.get(tree_key, ()):
        if pattern.endswith("/"):
            if rel == pattern[:-1] or rel.startswith(pattern):
                return True
        elif rel == pattern:
            return True
    return False


def find_master(liquibase_dir: Path) -> Path:
    xml = liquibase_dir / "master.xml"
    if xml.is_file():
        return xml
    yaml = liquibase_dir / "db.changelog-master.yaml"
    if yaml.is_file():
        return yaml
    raise FileNotFoundError(f"no master.xml or db.changelog-master.yaml in {liquibase_dir}")


def parse_includes_text(text: str, *, xml: bool) -> list[str]:
    if xml:
        return INCLUDE_XML.findall(text)
    return [p.strip().strip("\"'") for p in INCLUDE_YAML.findall(text)]


def parse_includes(master: Path) -> list[str]:
    return parse_includes_text(master.read_text(encoding="utf-8"), xml=master.suffix == ".xml")


def git_diff_start(repo_root: Path, base: str | None) -> str:
    if not base:
        return "HEAD"
    mb = subprocess.run(
        ["git", "merge-base", "HEAD", base],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    return mb.stdout.strip() if mb.returncode == 0 and mb.stdout.strip() else base


def includes_at_ref(repo_root: Path, tree_rel: str, ref: str) -> frozenset[str] | None:
    verified = subprocess.run(
        ["git", "rev-parse", "--verify", ref],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if verified.returncode != 0:
        return None
    for name, xml in (("master.xml", True), ("db.changelog-master.yaml", False)):
        shown = subprocess.run(
            ["git", "show", f"{ref}:{tree_rel}/{name}"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=False,
        )
        if shown.returncode == 0:
            return frozenset(parse_includes_text(shown.stdout, xml=xml))
    return frozenset()


def matching_include(rel_path: str, includes: list[str]) -> str | None:
    rel = rel_path.replace("\\", "/")
    for include in includes:
        inc = include.replace("\\", "/")
        if rel == inc:
            return include
        stem, _, _ = inc.rpartition(".")
        if stem and (rel == stem or rel.startswith(stem + "/")):
            return include
    return None


def check_tree(
    liquibase_dir: Path,
    changed_files: list[str],
    repo_root: Path,
    shipped_includes: frozenset[str] | None = None,
) -> list[Violation]:
    liquibase_dir = liquibase_dir.resolve()
    repo_root = repo_root.resolve()
    tree_key = posix_rel(liquibase_dir, repo_root)
    master = find_master(liquibase_dir)
    includes = parse_includes(master)
    prefixes = [p for p in (include_prefix(i) for i in includes) if p is not None]
    max_prefix = max(prefixes) if prefixes else 0
    violations: list[Violation] = []
    seen: set[str] = set()
    for raw in changed_files:
        if not raw:
            continue
        changed = Path(raw)
        abs_path = changed if changed.is_absolute() else (repo_root / changed)
        try:
            rel = posix_rel(abs_path, liquibase_dir)
        except ValueError:
            continue
        if rel in seen:
            continue
        seen.add(rel)
        if Path(rel).name in MASTER_NAMES:
            continue
        if is_allowlisted(tree_key, rel):
            continue
        include = matching_include(rel, includes)
        if include is None:
            continue
        prefix = include_prefix(include)
        if prefix is None or prefix >= max_prefix:
            continue
        if shipped_includes is not None and include not in shipped_includes:
            continue
        violations.append(
            Violation(rel_path=rel, prefix=prefix, max_prefix=max_prefix, tree=tree_key)
        )
    return violations


def latest_release_tag(repo_root: Path) -> str | None:
    listed = subprocess.run(
        ["git", "tag", "--list", "v*", "--sort=-v:refname"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        check=False,
    )
    if listed.returncode != 0:
        return None
    return next((t for t in listed.stdout.split() if RELEASE_TAG.match(t)), None)


def version_key(version: str) -> tuple[int, ...]:
    return tuple(int(part) for part in version.split("."))


def _added_includes(lines: list[str], *, xml: bool) -> tuple[list[tuple[int, str]], list[str]]:
    """Version files named by added master lines, and the added lines that are not allowed."""
    files: list[tuple[int, str]] = []
    bad: list[str] = []
    entries = 0
    for index, line in lines:
        if xml:
            match = XML_INCLUDE_LINE.match(line)
            attrs = dict(XML_ATTR.findall(match.group(1))) if match else {}
            if match and set(attrs) == {"file", "relativeToChangelogFile"} and attrs["relativeToChangelogFile"] == "true":
                files.append((index, attrs["file"]))
            elif not XML_NOTE.match(line):
                bad.append(line.strip())
            continue
        kind = next((name for name, pattern in YAML_ADDED if pattern.match(line)), None)
        if kind == "include":
            entries += 1
        elif kind == "file":
            files.append((index, YAML_ADDED[1][1].match(line).group(2)))
        elif kind is None:
            bad.append(line.strip())
    if not xml and entries != len(files):
        bad.append(f"{entries} include entries for {len(files)} file lines")
    return files, bad


def master_violations(
    tagged: str, current: str, *, xml: bool, released: tuple[int, ...], exists: Callable[[str], bool]
) -> list[str]:
    """Why a master from the release tag breaks the policy; empty when it only gained version includes."""
    old, new = tagged.splitlines(), current.splitlines()
    problems: list[str] = []
    added: list[tuple[int, str]] = []
    kept: list[int] = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, old, new, autojunk=False).get_opcodes():
        if op in ("replace", "delete"):
            problems.extend(f"released line changed or removed: {line.strip()}" for line in old[i1:i2])
        if op in ("replace", "insert"):
            added.extend((j, new[j]) for j in range(j1, j2))
        if op == "equal":
            kept.extend(j for j in range(j1, j2) if new[j].strip() and not new[j].strip().startswith("</"))
    files, bad = _added_includes(added, xml=xml)
    problems.extend(f"only releases/<version>.yaml includes may be added: {line}" for line in bad)
    last_kept = max(kept, default=-1)
    upgrade_at = next((i for i, line in enumerate(new) if not xml and YAML_UPGRADE_FILE.match(line)), None)
    order: dict[bool, list[tuple[int, ...]]] = {True: [], False: []}
    for index, name in files:
        match = VERSION_FILE.match(name)
        if not match:
            problems.append(f"{name}: not releases/<version>.yaml")
            continue
        version, early = version_key(match.group(1)), bool(match.group(2))
        if early and (xml or upgrade_at is None or index > upgrade_at):
            problems.append(f"{name}: an -upgrade file goes before upgrade/db.changelog-upgrade.yaml, in the shipped master only")
        elif not early and index < last_kept:
            problems.append(f"{name}: goes after every released entry")
        if version <= released:
            problems.append(f"{name}: {match.group(1)} is already released")
        if not exists(name):
            problems.append(f"{name}: no such file")
        order[early].append(version)
    problems.extend(
        "version includes are not in ascending order" for versions in order.values() if versions != sorted(set(versions))
    )
    return problems


def released_file_violations(
    repo_root: Path, tree_rels: list[str], changed_files: list[str], tag: str
) -> list[str]:
    prefixes = [t.rstrip("/") + "/" for t in tree_rels]
    violations: list[str] = []
    for rel in sorted({f.replace("\\", "/") for f in changed_files if f}):
        if not any(rel.startswith(p) for p in prefixes):
            continue
        shipped = subprocess.run(
            ["git", "show", f"{tag}:{rel}"], cwd=repo_root, capture_output=True, check=False
        )
        if shipped.returncode != 0:
            continue
        current = repo_root / rel
        if Path(rel).name in MASTER_NAMES and current.is_file():
            problems = master_violations(
                shipped.stdout.decode("utf-8"),
                current.read_text(encoding="utf-8"),
                xml=rel.endswith(".xml"),
                released=version_key(tag[1:]),
                exists=lambda name, base=current.parent: (base / name).is_file(),
            )
            violations.extend(f"{rel}: {problem}" for problem in problems)
        elif not current.is_file() or current.read_bytes() != shipped.stdout:
            violations.append(rel)
    return violations


def git_changed_files(repo_root: Path, base: str | None) -> list[str]:
    files: set[str] = set()
    if base:
        start = git_diff_start(repo_root, base)
        diff = subprocess.run(
            ["git", "diff", "--name-only", f"{start}...HEAD"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=True,
        )
        files.update(line.strip() for line in diff.stdout.splitlines() if line.strip())
    else:
        for args in (
            ["git", "diff", "--name-only", "HEAD"],
            ["git", "diff", "--name-only", "--cached"],
        ):
            diff = subprocess.run(
                args,
                cwd=repo_root,
                capture_output=True,
                text=True,
                check=True,
            )
            files.update(line.strip() for line in diff.stdout.splitlines() if line.strip())
    return sorted(files)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Fail when a diff edits a Liquibase include below the tree tip."
    )
    parser.add_argument("--repo-root", type=Path, default=None)
    parser.add_argument("--tree", action="append", dest="trees", default=None)
    parser.add_argument("--changed-file", action="append", dest="changed_files", default=None)
    parser.add_argument("--base", default=None, help="Git ref to diff against (CI merge base).")
    parser.add_argument(
        "--no-git",
        action="store_true",
        help="Do not inspect git. Use --changed-file only.",
    )
    args = parser.parse_args(argv)

    repo_root = (args.repo_root or repo_root_from_here()).resolve()
    tree_args = args.trees or list(DEFAULT_TREES)
    trees = [(repo_root / t).resolve() if not Path(t).is_absolute() else Path(t).resolve() for t in tree_args]

    if args.changed_files is not None:
        changed = [p for p in args.changed_files if p]
        start = None
    elif args.no_git:
        changed = []
        start = None
    else:
        changed = git_changed_files(repo_root, args.base)
        start = git_diff_start(repo_root, args.base)

    all_violations: list[Violation] = []
    for tree in trees:
        if not tree.is_dir():
            print(f"skip missing tree: {tree}", file=sys.stderr)
            continue
        shipped = includes_at_ref(repo_root, posix_rel(tree, repo_root), start) if start else None
        all_violations.extend(check_tree(tree, changed, repo_root, shipped_includes=shipped))

    kept: list[Violation] = []
    for v in all_violations:
        path = f"{v.tree}/{v.rel_path}"
        if "01_schema." in v.rel_path and is_valid_checksum_only_diff(git_diff_text(repo_root, start, path)):
            continue
        kept.append(v)

    tag = None if args.no_git else latest_release_tag(repo_root)
    released: list[str] = []
    if tag:
        tree_rels = [posix_rel(t, repo_root) for t in trees if t.is_dir()]
        released = []
        for rel in released_file_violations(repo_root, tree_rels, changed, tag):
            if ": " in rel:
                released.append(rel)
                continue
            diff = subprocess.run(
                ["git", "diff", tag, "--", rel], cwd=repo_root, capture_output=True, text=True, check=False
            ).stdout
            if not (is_valid_checksum_only_diff(diff) or is_master_xml_pin_only_diff(diff)):
                released.append(rel)

    if kept:
        print("Liquibase immutability: do not edit includes below the tree tip.")
        print("Add a new numbered changeset and a master include instead.")
        print()
        for v in kept:
            print(f"  {v.tree}/{v.rel_path}  (changelog {v.prefix} < tip {v.max_prefix})")
    if released:
        if kept:
            print()
        print(f"Liquibase immutability: these files shipped in {tag}. Do not edit or delete them.")
        print("Add a changeset to releases/<version>.yaml of that tree instead (docs/database-changelogs.md).")
        print()
        for rel in released:
            print(f"  {rel}")
    return 1 if kept or released else 0


if __name__ == "__main__":
    sys.exit(main())
