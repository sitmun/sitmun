#!/usr/bin/env python3
"""Build the root pnpm catalog from dependency specifiers that already match.

A name used by more than one package.json with one specifier becomes catalog:.
Names whose specifiers differ stay in the app that declares them. webpack is the
one intentional pin: the Angular builder and schema-utils require 5.112.x, and
the viewer still declared 5.98.0.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
APPS = (
    "sitmun-admin/package.json",
    "sitmun-viewer/package.json",
    "sitmun-mobile/sitmun-edition/package.json",
    "sitmun-mobile/sitmun-touristic/package.json",
)
PACKAGES = (
    "sitmun-admin",
    "sitmun-viewer",
    "sitmun-mobile/sitmun-edition",
    "sitmun-mobile/sitmun-touristic",
)
PINS = {
    "webpack": "5.112.2",
}
OVERRIDES = {
    "webpack": "5.112.2",
}
ALLOW_BUILDS = (
    "@parcel/watcher",
    "esbuild",
    "lmdb",
    "msgpackr-extract",
    "nice-napi",
    "nx",
    "protobufjs",
    "sonar-scanner",
    "unrs-resolver",
)
TSCONFIG_APP = ROOT / "sitmun-viewer/tsconfig.app.json"
TSCONFIG_DTS = "node_modules/api-sitna/TC/tool/FeatureHistoryEvent.d.ts"


def _quote(name: str) -> str:
    if name.startswith("@") or any(char in name for char in ":#{}[]&*!|>%@`"):
        return f"'{name}'"
    return name


def _existing_catalog() -> dict[str, str]:
    path = ROOT / "pnpm-workspace.yaml"
    if not path.is_file():
        return {}
    catalog: dict[str, str] = {}
    in_catalog = False
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("catalog:"):
            in_catalog = True
            continue
        if not in_catalog:
            continue
        if line and not line[0].isspace():
            break
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        key, separator, value = stripped.partition(":")
        if separator:
            catalog[key.strip().strip("'\"")] = value.strip().strip("'\"")
    return catalog


def _specs(data: dict) -> dict[str, str]:
    found = {}
    for section in ("dependencies", "devDependencies"):
        for name, spec in data.get(section, {}).items():
            if spec != "catalog:":
                found[name] = spec
    return found


def main() -> None:
    docs = {rel: json.loads((ROOT / rel).read_text(encoding="utf-8")) for rel in ("package.json", *APPS)}
    found: dict[str, set[str]] = {}
    used_by: dict[str, int] = {}
    for data in docs.values():
        seen = set()
        for name, spec in _specs(data).items():
            found.setdefault(name, set()).add(PINS.get(name, spec))
            seen.add(name)
        for name in seen:
            used_by[name] = used_by.get(name, 0) + 1
    for name, spec in _existing_catalog().items():
        found.setdefault(name, set()).add(spec)
        used_by[name] = max(used_by.get(name, 0), 2)
    for name, spec in PINS.items():
        found.setdefault(name, set()).add(spec)
        used_by[name] = max(used_by.get(name, 0), 2)

    catalog: dict[str, str] = {}
    skipped: list[str] = []
    for name, specs in sorted(found.items()):
        if name in PINS:
            catalog[name] = PINS[name]
            continue
        if used_by.get(name, 0) > 1 and len(specs) == 1:
            catalog[name] = next(iter(specs))
            continue
        if used_by.get(name, 0) > 1 and len(specs) > 1:
            skipped.append(f"  {name}: {sorted(specs)}")

    print("left unchanged because the specifiers differ:")
    print("\n".join(skipped) if skipped else "  (none)")

    lines = [
        "packages:",
        *(f"  - {package}" for package in PACKAGES),
        "",
        "catalog:",
    ]
    for name, spec in catalog.items():
        lines.append(f"  {_quote(name)}: {spec}")
    lines += ["", "overrides:"]
    for name, spec in OVERRIDES.items():
        lines.append(f"  {_quote(name)}: {spec}")
    lines += ["", "allowBuilds:"]
    for name in ALLOW_BUILDS:
        lines.append(f"  {_quote(name)}: true")
    lines.append("")
    (ROOT / "pnpm-workspace.yaml").write_text("\n".join(lines), encoding="utf-8")

    node = (ROOT / ".nvmrc").read_text(encoding="utf-8").strip()
    for rel, data in docs.items():
        if rel != "package.json":
            data.pop("packageManager", None)
            data.pop("overrides", None)
            data.setdefault("engines", {})["node"] = f">={node}"
        for section in ("dependencies", "devDependencies"):
            block = data.get(section)
            if not isinstance(block, dict):
                continue
            for name in list(block):
                if name in catalog or name in PINS:
                    block[name] = "catalog:"
        text = json.dumps(data, indent=2) + "\n"
        (ROOT / rel).write_text(text, encoding="utf-8")

    for rel in (
        "sitmun-admin/pnpm-workspace.yaml",
        "sitmun-viewer/pnpm-workspace.yaml",
        "sitmun-mobile/sitmun-edition/pnpm-workspace.yaml",
        "sitmun-mobile/sitmun-touristic/pnpm-workspace.yaml",
        "sitmun-admin/pnpm-lock.yaml",
        "sitmun-viewer/pnpm-lock.yaml",
        "sitmun-mobile/sitmun-edition/pnpm-lock.yaml",
        "sitmun-mobile/sitmun-touristic/pnpm-lock.yaml",
    ):
        path = ROOT / rel
        if path.is_file():
            path.unlink()

    npmrc = ROOT / ".npmrc"
    if not npmrc.is_file():
        npmrc.write_text("strict-peer-dependencies=false\n", encoding="utf-8")
    admin_npmrc = ROOT / "sitmun-admin/.npmrc"
    if admin_npmrc.is_file() and admin_npmrc.read_text(encoding="utf-8").strip() == "strict-peer-dependencies=false":
        admin_npmrc.unlink()

    tsconfig = TSCONFIG_APP.read_text(encoding="utf-8")
    replaced = tsconfig
    for line in tsconfig.splitlines():
        if "api-sitna" in line and "FeatureHistoryEvent.d.ts" in line:
            indent = line[: len(line) - len(line.lstrip())]
            replaced = tsconfig.replace(line.strip().rstrip(","), f'"{TSCONFIG_DTS}"')
            break
    if "api-sitna@4.9.1" in replaced:
        raise SystemExit("tsconfig still hardcodes api-sitna@4.9.1")
    TSCONFIG_APP.write_text(replaced, encoding="utf-8")


if __name__ == "__main__":
    main()
