#!/usr/bin/env python3
"""List code-list values the product code reads.

Values come from production sources: Java constants, admin and touristic
constant maps, and service-type comparisons. Test files, specs, and
sitmun.startup.code-lists are ignored.

The checked-in manifest must contain every pair this script reports.
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MANIFEST = REPO / "sitmun-backend/src/test/resources/required-codelists.yaml"

JAVA_CONST = re.compile(
    r"public static final String\s+(\w+)\s*=\s*\"((?:\\.|[^\"\\])*)\"\s*;"
)
TS_ENTRY = re.compile(r"(\w+)\s*:\s*'((?:\\'|[^'])*)'")
CLASS_BLOCK = re.compile(
    r"public static class\s+(\w+)\s*\{(.*?)\n  \}",
    re.S,
)
SERVICE_COMPARE = re.compile(
    r"(?:type|serviceType|layerType)\s*[!=]==?\s*['\"](WMS|WMTS|WFS)['\"]"
    r"|case\s+['\"](WMS|WMTS|WFS)['\"]"
)
SKIP_PARTS = (".spec.ts", "/src/test/", ".d.ts")

# Constant name -> code list, for DomainConstants.Tasks only.
TASK_LISTS = {
    "SCOPE_CARTOGRAPHY_QUERY": "queryTask.scope",
    "SCOPE_SQL_QUERY": "queryTask.scope",
    "SCOPE_WEB_API_QUERY": "queryTask.scope",
    "SCOPE_WEB_API_QUERY_NO_PROXY": "queryTask.scope",
    "SCOPE_URL_QUERY": "queryTask.scope",
    "SCOPE_RESOURCE_QUERY": "queryTask.scope",
    "SCOPE_URL": "moreInfo.type",
    "SCOPE_API": "moreInfo.type",
    "SCOPE_SQL": "moreInfo.type",
    "SCOPE_RESOURCE": "moreInfo.type",
    "FIELD_TYPE_TEXT": "editTask.fieldType",
    "TYPE_STRING": "taskEntity.jsonParamType",
    "TYPE_NUMBER": "taskEntity.jsonParamType",
    "TYPE_BOOLEAN": "taskEntity.jsonParamType",
    "TYPE_ARRAY": "taskEntity.jsonParamType",
    "TYPE_OBJECT": "taskEntity.jsonParamType",
    "TYPE_NULL": "taskEntity.jsonParamType",
    "PARAM_TYPE_QUERY": "queryTask.parameterType",
    "PARAM_TYPE_TEMPLATE": "queryTask.parameterType",
    "AUTHENTICATION_MODE_NONE": "service.authenticationMode",
}

TS_GROUPS = {
    "sitmun-admin/src/environments/constants.ts": {
        "applicationType": "application.type",
        "queryTaskScope": "queryTask.scope",
        "editionTaskScope": "editTask.scope",
        "treeType": "tree.type",
        "cartographyPermissionType": "cartographyPermission.type",
        "serviceType": "service.type",
    },
    "sitmun-mobile/sitmun-touristic/src/environments/constants.ts": {
        "serviceType": "service.type",
        "applicationType": "application.type",
        "treeType": "tree.type",
        "treenodeFolderType": "treenode.node.type",
        "treenodeLeafType": "treenode.node.type",
        "taskViewMode": "treenode.viewmode",
    },
}

LITERALS = (
    (
        "sitmun-admin/src/app/components/tasks-document-export/task-form/task-document-export-form.component.ts",
        "documentExport.output",
        "pdf",
        "option.value === 'pdf'",
    ),
    (
        "sitmun-admin/src/app/components/service/service-form/service-form.component.ts",
        "service.authenticationMode",
        "API key",
        "m.value !== 'API key'",
    ),
    (
        "sitmun-admin/src/app/components/tasks-query/task-form/task-query-form.component.ts",
        "service.authenticationMode",
        "API key",
        "authMode !== 'API key'",
    ),
)


def rel(path: Path) -> str:
    return path.relative_to(REPO).as_posix()


def java_constants(body: str) -> list[tuple[str, str, int]]:
    found = []
    for match in JAVA_CONST.finditer(body):
        line = body[: match.start()].count("\n") + 1
        found.append((match.group(1), match.group(2), line))
    return found


def class_bodies(text: str) -> dict[str, tuple[str, int]]:
    bodies = {}
    for match in CLASS_BLOCK.finditer(text):
        line = text[: match.start()].count("\n") + 1
        bodies[match.group(1)] = (match.group(2), line)
    return bodies


def ts_keys(text: str, group: str) -> list[tuple[str, int]]:
    return [(key, line) for key, _value, line in ts_entries(text, group)]


def ts_group(text: str, group: str) -> list[tuple[str, int]]:
    return [(value, line) for _key, value, line in ts_entries(text, group)]


def ts_entries(text: str, group: str) -> list[tuple[str, str, int]]:
    marker = f"{group}:"
    start = text.find(marker)
    if start < 0:
        return []
    brace = text.find("{", start)
    depth = 0
    end = brace
    for index, char in enumerate(text[brace:], brace):
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                end = index
                break
    block = text[brace : end + 1]
    base = text[:brace].count("\n")
    values = []
    for match in TS_ENTRY.finditer(block):
        line = base + block[: match.start()].count("\n") + 1
        values.append((match.group(1), match.group(2), line))
    return values


def add(rows: dict[tuple[str, str], set[str]], list_name: str, value: str, cite: str) -> None:
    rows[(list_name, value)].add(cite)


def collect(root: Path = REPO) -> dict[tuple[str, str], set[str]]:
    rows: dict[tuple[str, str], set[str]] = defaultdict(set)
    domain_path = root / "sitmun-backend/src/main/java/org/sitmun/domain/DomainConstants.java"
    domain = domain_path.read_text(encoding="utf-8")
    classes = class_bodies(domain)
    whole_class = {
        "Applications": "application.type",
        "Trees": "tree.type",
        "Services": "service.type",
    }
    for class_name, list_name in whole_class.items():
        body, offset = classes[class_name]
        for _name, value, line in java_constants(body):
            add(rows, list_name, value, f"{rel(domain_path)}:{offset + line - 1}")
    tasks, tasks_offset = classes["Tasks"]
    for name, value, line in java_constants(tasks):
        list_name = TASK_LISTS.get(name)
        if list_name:
            add(rows, list_name, value, f"{rel(domain_path)}:{tasks_offset + line - 1}")
    proxy, proxy_offset = classes["Proxy"]
    proxy_lists = {"TYPE_SQL": "moreInfo.type", "TYPE_API": "moreInfo.type", "TYPE_WMS": "service.type"}
    for name, value, line in java_constants(proxy):
        list_name = proxy_lists.get(name)
        if list_name:
            add(rows, list_name, value, f"{rel(domain_path)}:{proxy_offset + line - 1}")

    permission = root / "sitmun-backend/src/main/java/org/sitmun/domain/cartography/permission/CartographyPermission.java"
    permission_text = permission.read_text(encoding="utf-8")
    for name, value, line in java_constants(permission_text):
        if name.startswith("TYPE_"):
            add(rows, "cartographyPermission.type", value, f"{rel(permission)}:{line}")

    for path_text, groups in TS_GROUPS.items():
        path = root / path_text
        text = path.read_text(encoding="utf-8")
        for group, list_name in groups.items():
            for value, line in ts_group(text, group):
                add(rows, list_name, value, f"{path_text}:{line}")

    touristic = root / "sitmun-mobile/sitmun-touristic/src/environments/constants.ts"
    touristic_text = touristic.read_text(encoding="utf-8")
    paths_at = touristic_text.find("paths:")
    task_at = touristic_text.find("task:", paths_at)
    if task_at > 0:
        for code, line in ts_keys(touristic_text[task_at - 1 :], "task"):
            absolute = touristic_text[: task_at - 1].count("\n") + line
            add(rows, "treenode.viewmode", code, f"{rel(touristic)}:{absolute}")

    scan_roots = [
        root / "sitmun-viewer/src",
        root / "sitmun-mobile/sitmun-edition/src",
        root / "sitmun-mobile/sitmun-touristic/src",
        root / "sitmun-backend/src/main/java",
    ]
    for scan_root in scan_roots:
        for path in scan_root.rglob("*"):
            if path.suffix not in {".ts", ".java"}:
                continue
            posix = path.as_posix()
            if any(part in posix for part in SKIP_PARTS):
                continue
            text = path.read_text(encoding="utf-8", errors="replace")
            for line_no, line in enumerate(text.splitlines(), 1):
                match = SERVICE_COMPARE.search(line)
                if not match:
                    continue
                value = match.group(1) or match.group(2)
                add(rows, "service.type", value, f"{rel(path)}:{line_no}")

    for path_text, list_name, value, needle in LITERALS:
        path = root / path_text
        for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if needle in line:
                add(rows, list_name, value, f"{path_text}:{line_no}")
    return rows


def render(rows: dict[tuple[str, str], set[str]]) -> str:
    lines = [
        "# Code-list values the product code reads.",
        "# Generated by tools/bin/inventory_codelist_consumers.py.",
        "# Each value cites the line that reads it.",
        "values:",
    ]
    for list_name, value in sorted(rows):
        lines.append(f"  - list: {yaml_quote(list_name)}")
        lines.append(f"    value: {yaml_quote(value)}")
        lines.append("    read_at:")
        for cite in sorted(rows[(list_name, value)]):
            lines.append(f"      - {cite}")
    lines.append("")
    return "\n".join(lines)


def yaml_quote(text: str) -> str:
    if text == "" or text.lower() in {"null", "true", "false", "yes", "no"} or any(
        ch in text for ch in ":#{}[]&*!|>'\"%@`"
    ):
        escaped = text.replace("'", "''")
        return f"'{escaped}'"
    return text


def parse_manifest(text: str) -> set[tuple[str, str]]:
    pairs = set()
    current_list = None
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("- "):
            stripped = stripped[2:].strip()
        if stripped.startswith("list:"):
            current_list = unquote(stripped.split(":", 1)[1].strip())
        elif stripped.startswith("value:") and current_list is not None:
            pairs.add((current_list, unquote(stripped.split(":", 1)[1].strip())))
            current_list = None
    return pairs


def unquote(text: str) -> str:
    if len(text) >= 2 and text[0] == text[-1] and text[0] in {"'", '"'}:
        return text[1:-1].replace("''", "'")
    return text


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    rows = collect()
    rendered = render(rows)
    if args.write:
        MANIFEST.write_text(rendered, encoding="utf-8")
        print(f"wrote {MANIFEST.relative_to(REPO)} ({len(rows)} values)")
        return 0
    if args.check:
        if not MANIFEST.is_file():
            print(f"missing {MANIFEST}", file=sys.stderr)
            return 1
        have = parse_manifest(MANIFEST.read_text(encoding="utf-8"))
        missing = sorted(set(rows) - have)
        if missing:
            print("manifest is missing values the code reads:", file=sys.stderr)
            for list_name, value in missing:
                print(f"  {list_name} = {value}", file=sys.stderr)
            return 1
        print(f"manifest covers {len(rows)} values the code reads")
        return 0
    sys.stdout.write(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
