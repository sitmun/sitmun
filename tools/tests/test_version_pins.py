#!/usr/bin/env python3
"""Structural version-pin checks. Library numbers are not hard-coded here."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

WORKFLOW_LITERAL = re.compile(
    r"^\s*(java-version|node-version)\s*:\s*['\"]?\d",
    re.M,
)
ARG_DEFAULT = re.compile(r"^ARG\s+(JDK_VERSION|NODE_VERSION)=(\S+)", re.M)
PNPM_VERSION_ENV = re.compile(r"\bPNPM_VERSION=(\S+)")
COORDINATE = re.compile(r"['\"][a-zA-Z0-9_.-]+:[a-zA-Z0-9_.-]+:\d")
ENGINE_MAJOR = re.compile(r"(\d+)")


def _range_majors(spec: str) -> set[str]:
    return {
        match.group(1)
        for part in spec.split("||")
        if (match := ENGINE_MAJOR.search(part))
    }


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8") if path.is_file() else ""


def _nvmrc() -> str:
    return _read(ROOT / ".nvmrc").strip()


def _java_major() -> str:
    text = _read(ROOT / ".java-version").strip()
    return text.split(".")[0]


def _failures_sources(_root: Path) -> list[str]:
    failures = []
    if not (ROOT / ".nvmrc").is_file():
        failures.append("missing root .nvmrc")
    if not (ROOT / ".java-version").is_file():
        failures.append("missing root .java-version")
    return failures


def _failures_nvmrc_location(_root: Path) -> list[str]:
    extras = [
        str(path.relative_to(ROOT))
        for path in ROOT.rglob(".nvmrc")
        if path != ROOT / ".nvmrc" and "node_modules" not in path.parts
    ]
    return [f"extra .nvmrc: {', '.join(extras)}"] if extras else []


def _failures_workflows(_root: Path) -> list[str]:
    failures = []
    for path in (ROOT / ".github/workflows").glob("*.yml"):
        if WORKFLOW_LITERAL.search(_read(path)):
            failures.append(f"{path.relative_to(ROOT)} sets a literal java-version or node-version")
    return failures


def _package_manager_pnpm(rel: str) -> str:
    spec = json.loads(_read(ROOT / rel)).get("packageManager", "")
    return spec[len("pnpm@"):] if spec.startswith("pnpm@") else ""


def _failures_docker_args(_root: Path) -> list[str]:
    failures = []
    node = _nvmrc()
    java = _java_major()
    if not node or not java:
        return ["docker ARG checks need root .nvmrc and .java-version"]
    front = ROOT / "docker/front/Dockerfile"
    front_text = _read(front)
    node_args = dict(ARG_DEFAULT.findall(front_text))
    if node_args.get("NODE_VERSION") != node:
        failures.append(f"docker/front/Dockerfile NODE_VERSION is {node_args.get('NODE_VERSION')}, .nvmrc is {node}")
    for path in (ROOT / "docker").rglob("Dockerfile"):
        jdk = dict(ARG_DEFAULT.findall(_read(path))).get("JDK_VERSION")
        if jdk is not None and jdk != java:
            failures.append(f"{path.relative_to(ROOT)} JDK_VERSION is {jdk}, .java-version major is {java}")
    pnpm_in_docker = PNPM_VERSION_ENV.findall(front_text)
    docker_pnpm = pnpm_in_docker[0] if len(pnpm_in_docker) == 1 else ""
    pinned = _package_manager_pnpm("package.json")
    if not docker_pnpm or docker_pnpm != pinned:
        failures.append(
            f"docker/front/Dockerfile PNPM_VERSION is {docker_pnpm or 'missing'}, package.json packageManager is {pinned or 'missing'}"
        )
    return failures


def _pnpm_catalog(text: str) -> dict[str, str]:
    catalog: dict[str, str] = {}
    in_catalog = False
    for line in text.splitlines():
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


def _failures_engines(_root: Path) -> list[str]:
    node = _nvmrc()
    if not node:
        return ["engines check needs root .nvmrc"]
    major = node.split(".")[0]
    failures = []
    for rel in (
        "sitmun-admin/package.json",
        "sitmun-viewer/package.json",
        "sitmun-mobile/sitmun-edition/package.json",
        "sitmun-mobile/sitmun-touristic/package.json",
    ):
        spec = json.loads(_read(ROOT / rel)).get("engines", {}).get("node", "")
        if _range_majors(spec) != {major}:
            failures.append(f"{rel} engines.node is {spec!r}, expected major {major}")
    return failures


def _failures_types_node(_root: Path) -> list[str]:
    node = _nvmrc()
    if not node:
        return ["@types/node check needs root .nvmrc"]
    major = node.split(".")[0]
    failures = []
    for path in ROOT.rglob("package.json"):
        if "node_modules" in path.parts:
            continue
        data = json.loads(_read(path))
        spec = data.get("devDependencies", {}).get("@types/node") or data.get("dependencies", {}).get("@types/node")
        if not spec:
            continue
        if spec == "catalog:":
            spec = _pnpm_catalog(_read(ROOT / "pnpm-workspace.yaml")).get("@types/node", "")
        if _range_majors(spec) != {major}:
            failures.append(f"{path.relative_to(ROOT)} @types/node is {spec}")
    return failures


def _failures_stale_docker(_root: Path) -> list[str]:
    stale = []
    for rel in (
        "front/Dockerfile",
        "back/backend/Dockerfile",
        "back/proxy/Dockerfile",
        "back/mbtiles/Dockerfile",
        "sitmun-backend/docker/Dockerfile",
        "sitmun-proxy/docker/Dockerfile",
    ):
        if (ROOT / rel).is_file():
            stale.append(rel)
    return [f"stale Dockerfile: {', '.join(stale)}"] if stale else []


def _failures_one_catalog(_root: Path) -> list[str]:
    catalogs = [
        str(path.relative_to(ROOT))
        for path in ROOT.rglob("libs.versions.toml")
        if "build" not in path.parts
    ]
    if catalogs != ["gradle/libs.versions.toml"]:
        return [f"catalogs: {catalogs}"]
    return []


def _failures_gradle_literals(_root: Path) -> list[str]:
    failures = []
    for path in ROOT.rglob("build.gradle"):
        if "build" in path.parts or "node_modules" in path.parts or ".gradle" in path.parts:
            continue
        text = _read(path)
        if "project.version" in text or COORDINATE.search(text):
            failures.append(str(path.relative_to(ROOT)))
    return failures


def _platform_version() -> str:
    for line in _read(ROOT / "gradle.properties").splitlines():
        if line.startswith("version="):
            return line.split("=", 1)[1].strip()
    return ""


def _failures_platform_version(_root: Path) -> list[str]:
    version = _platform_version()
    failures = []
    if (ROOT / "VERSION").is_file():
        failures.append("VERSION file still exists")
    for rel in ("sitmun-admin/package.json", "sitmun-viewer/package.json"):
        pkg = json.loads(_read(ROOT / rel)).get("version")
        if pkg != version:
            failures.append(f"{rel} version is {pkg}, gradle.properties is {version}")
    return failures


def _versions_table(text: str) -> str:
    return text.split("[libraries]", 1)[0]


def _failures_catalog_shape(_root: Path) -> list[str]:
    versions = _versions_table(_read(ROOT / "gradle/libs.versions.toml"))
    if re.search(r"^h2\s*=", versions, re.M):
        return ["catalog pins h2"]
    return []


def _failures_root_build(_root: Path) -> list[str]:
    settings = _read(ROOT / "settings.gradle")
    if not settings:
        return ["missing root settings.gradle"]
    failures = []
    for name in (
        "sitmun-spring-upstream",
        "sitmun-proxy-contract",
        "sitmun-proxy",
        "sitmun-mbtiles",
        "sitmun-backend",
    ):
        if f"'{name}'" not in settings:
            failures.append(f"root settings does not include {name}")
    backend = _read(ROOT / "sitmun-backend/build.gradle")
    if "org.sitmun:sitmun-spring-upstream:" in backend or "org.sitmun:sitmun-proxy-contract:" in backend:
        failures.append("sitmun-backend still uses a Maven coordinate")
    if "project(':sitmun-spring-upstream')" not in backend or "project(':sitmun-proxy-contract')" not in backend:
        failures.append("sitmun-backend does not depend on the root library projects")
    proxy = _read(ROOT / "sitmun-proxy/build.gradle")
    if "org.sitmun:sitmun-proxy-contract:" in proxy:
        failures.append("sitmun-proxy still uses the Maven coordinate")
    if "project(':sitmun-proxy-contract')" not in proxy:
        failures.append("sitmun-proxy does not depend on :sitmun-proxy-contract")
    return failures


def _failures_capacitor(_root: Path) -> list[str]:
    failures = []
    for rel in (
        "sitmun-mobile/sitmun-edition/package.json",
        "sitmun-mobile/sitmun-touristic/package.json",
    ):
        data = json.loads(_read(ROOT / rel))
        spec = {**data.get("dependencies", {}), **data.get("devDependencies", {})}.get("@capacitor/android", "")
        major = ENGINE_MAJOR.search(spec)
        if not major or int(major.group(1)) < 8:
            failures.append(f"{rel} @capacitor/android is {spec}")
    return failures


def _property(name: str) -> str:
    prefix = name + "="
    for line in _read(ROOT / "gradle.properties").splitlines():
        if line.startswith(prefix):
            return line.split("=", 1)[1].strip()
    return ""


def _failures_postgres_floor(_root: Path) -> list[str]:
    postgres = _property("sitmun.db.postgres.min")
    oracle = _property("sitmun.db.oracle.min")
    failures = []
    if postgres != "12":
        failures.append(f"sitmun.db.postgres.min is {postgres or 'missing'}, expected 12")
    if oracle != "11.2":
        failures.append(f"sitmun.db.oracle.min is {oracle or 'missing'}, expected 11.2")
    if not postgres.isdigit():
        return failures
    floor = int(postgres)
    for path in list((ROOT / "tools/tests").glob("*.sh")) + list((ROOT / ".github/workflows").glob("*.yml")):
        for image in re.findall(r"postgres:(\d+)", _read(path)):
            if int(image) < floor:
                failures.append(f"{path.relative_to(ROOT)} uses postgres:{image}")
    return failures


def _failures_viewer_nvmrc(_root: Path) -> list[str]:
    text = _read(ROOT / "e2e/scripts/e2e-viewer.mjs")
    if "join(viewerRoot, '.nvmrc')" in text:
        return ["e2e/scripts/e2e-viewer.mjs still reads sitmun-viewer/.nvmrc"]
    if "join(stackRoot, '.nvmrc')" not in text:
        return ["e2e/scripts/e2e-viewer.mjs does not read the root .nvmrc"]
    return []


def _failures_bump_paths(_root: Path) -> list[str]:
    text = _read(ROOT / "tools/scripts/bump-version.sh")
    stale = [token for token in ("back/backend", "front/admin", "back/proxy", "front/viewer") if token in text]
    return [f"bump-version.sh still mentions {', '.join(stale)}"] if stale else []


def _failures_dependabot(_root: Path) -> list[str]:
    text = _read(ROOT / ".github/dependabot.yml")
    failures = []
    if "package-ecosystem: github-actions" not in text:
        failures.append("dependabot has no github-actions ecosystem")
    if "package-ecosystem: docker" not in text:
        failures.append("dependabot has no docker ecosystem")
    return failures


def _failures_pnpm_installer(_root: Path) -> list[str]:
    failures = []
    locks = [
        path.relative_to(ROOT).as_posix()
        for path in ROOT.rglob("package-lock.json")
        if "node_modules" not in path.parts
    ]
    if locks:
        failures.append("package-lock.json still present: " + ", ".join(locks))
    banned = (
        (re.compile(r"\bnpm ci\b"), "npm ci"),
        (re.compile(r"\bnpx\b"), "npx"),
        (re.compile(r"\bcorepack enable\b"), "corepack enable"),
    )
    paths = list((ROOT / ".github/workflows").glob("*.yml"))
    paths.append(ROOT / "docker/front/Dockerfile")
    for path in paths:
        text = _read(path)
        rel = path.relative_to(ROOT).as_posix()
        for pattern, label in banned:
            if pattern.search(text):
                failures.append(f"{rel} contains {label}")
    return failures


JS_APPS = (
    "sitmun-admin/package.json",
    "sitmun-viewer/package.json",
    "sitmun-mobile/sitmun-edition/package.json",
    "sitmun-mobile/sitmun-touristic/package.json",
)

# Every shared Jest package now has one catalog pin.
JS_CATALOG_EXCLUDED = ()


def _locked_api_sitna_ol(lock: str) -> str | None:
    in_block = False
    in_deps = False
    for line in lock.splitlines():
        if line.startswith("  api-sitna@4.10.0(") and line.endswith(":"):
            in_block = True
            in_deps = False
            continue
        if in_block and line.startswith("  ") and not line.startswith("    "):
            in_block = False
            in_deps = False
        if not in_block:
            continue
        if line.strip() == "dependencies:":
            in_deps = True
            continue
        if in_deps and line.startswith("      ol:"):
            return line.split(":", 1)[1].strip()
        if in_deps and not line.startswith("      "):
            in_deps = False
    return None


def _package_specs(data: dict) -> dict[str, str]:
    specs = {}
    for section in ("dependencies", "devDependencies"):
        specs.update(data.get(section, {}))
    return specs


def _failures_js_catalog(_root: Path) -> list[str]:
    failures = []
    workspaces = [
        path.relative_to(ROOT).as_posix()
        for path in ROOT.rglob("pnpm-workspace.yaml")
        if "node_modules" not in path.parts
    ]
    if workspaces != ["pnpm-workspace.yaml"]:
        failures.append(f"pnpm workspaces: {workspaces}")
    locks = [
        path.relative_to(ROOT).as_posix()
        for path in ROOT.rglob("pnpm-lock.yaml")
        if "node_modules" not in path.parts
    ]
    if locks != ["pnpm-lock.yaml"]:
        failures.append(f"pnpm lockfiles: {locks}")
    catalog = _pnpm_catalog(_read(ROOT / "pnpm-workspace.yaml"))
    if not catalog:
        failures.append("root pnpm-workspace.yaml has no catalog")
        return failures
    if catalog.get("webpack") != "5.112.2":
        failures.append(f"catalog webpack is {catalog.get('webpack') or 'missing'}, expected 5.112.2")
    if catalog.get("rxjs") != "7.8.2":
        failures.append(f"catalog rxjs is {catalog.get('rxjs') or 'missing'}, expected 7.8.2")
    if catalog.get("@ngx-translate/core") != "18.1.0":
        failures.append(
            f"catalog @ngx-translate/core is {catalog.get('@ngx-translate/core') or 'missing'}, expected 18.1.0"
        )
    if catalog.get("@ngx-translate/http-loader") != "18.1.0":
        failures.append(
            f"catalog @ngx-translate/http-loader is {catalog.get('@ngx-translate/http-loader') or 'missing'}, expected 18.1.0"
        )
    if catalog.get("@angular/core") != "22.2.5":
        failures.append(
            f"catalog @angular/core is {catalog.get('@angular/core') or 'missing'}, expected 22.2.5"
        )
    if catalog.get("typescript") != "6.0.3":
        failures.append(f"catalog typescript is {catalog.get('typescript') or 'missing'}, expected 6.0.3")
    if catalog.get("zone.js") != "0.15.1":
        failures.append(f"catalog zone.js is {catalog.get('zone.js') or 'missing'}, expected 0.15.1")
    if catalog.get("api-sitna") != "4.10.0":
        failures.append(f"catalog api-sitna is {catalog.get('api-sitna') or 'missing'}, expected 4.10.0")
    if catalog.get("ol") != "10.9.0":
        failures.append(f"catalog ol is {catalog.get('ol') or 'missing'}, expected 10.9.0")
    jest_pins = {
        "jest": "30.5.2",
        "@types/jest": "30.0.0",
        "babel-jest": "30.5.2",
        "jest-preset-angular": "17.0.3",
        "jest-environment-jsdom": "30.5.2",
        "@jest/globals": "30.5.2",
    }
    for name, expected in jest_pins.items():
        if catalog.get(name) != expected:
            failures.append(f"catalog {name} is {catalog.get(name) or 'missing'}, expected {expected}")
    touristic = json.loads(_read(ROOT / "sitmun-mobile/sitmun-touristic/package.json"))
    if not str(touristic.get("scripts", {}).get("test", "")).startswith("jest"):
        failures.append("sitmun-touristic test script is not jest")
    if "karma" in touristic.get("devDependencies", {}):
        failures.append("sitmun-touristic still depends on karma")
    locked_ol = _locked_api_sitna_ol(_read(ROOT / "pnpm-lock.yaml"))
    if locked_ol != "10.9.0":
        failures.append(f"locked api-sitna@4.10.0 depends on ol {locked_ol or 'missing'}, expected 10.9.0")
    if "api-sitna@4.10.0:" not in _read(ROOT / "pnpm-workspace.yaml"):
        failures.append("pnpm-workspace.yaml does not patch api-sitna@4.10.0")
    if "COPY patches/" not in _read(ROOT / "docker/front/Dockerfile"):
        failures.append("docker/front/Dockerfile does not copy patches/")
    if "patches" not in _read(ROOT / "e2e/scripts/e2e-mobile-android.mjs"):
        failures.append("e2e-mobile-android.mjs does not copy patches/")
    lock = _read(ROOT / "pnpm-lock.yaml")
    if "cesium@1.142.0>@cesium/engine: 26.0.0" not in lock:
        failures.append("cesium@1.142.0 must use @cesium/engine 26.0.0")
    if "cesium@1.142.0>@cesium/widgets: 16.0.0" not in lock:
        failures.append("cesium@1.142.0 must use @cesium/widgets 16.0.0")
    viewer_pkg = _read(ROOT / "sitmun-viewer/package.json")
    for script in (
        "patch-printmap-logo.js",
        "patch-wfs-110-parser.js",
        "patch-api-sitna-empty-dts.js",
        "patch-dataloader-legacy-controls.js",
    ):
        if script in viewer_pkg:
            failures.append(f"sitmun-viewer/package.json still runs {script}")
    for name in JS_CATALOG_EXCLUDED:
        if name in catalog:
            failures.append(f"catalog must not unify {name} while app versions differ")
    if "api-sitna@4.9.1" in _read(ROOT / "sitmun-viewer/tsconfig.app.json"):
        failures.append("sitmun-viewer/tsconfig.app.json hardcodes api-sitna@4.9.1")
    webpack_config = _read(ROOT / "sitmun-viewer/webpack.config.js")
    if "KeepApiSitnaDeclarationPathPlugin" not in webpack_config:
        failures.append("sitmun-viewer/webpack.config.js must keep the api-sitna declaration path")
    if "PUBLIC_BASE_PATH" not in webpack_config:
        failures.append("sitmun-viewer/webpack.config.js must read PUBLIC_BASE_PATH")
    dockerfile = _read(ROOT / "docker/front/Dockerfile")
    if "webpack.config.js.template" in dockerfile:
        failures.append("docker/front/Dockerfile overwrites sitmun-viewer/webpack.config.js")
    root_pkg = json.loads(_read(ROOT / "package.json"))
    if not str(root_pkg.get("packageManager", "")).startswith("pnpm@"):
        failures.append("root package.json is missing packageManager")
    for rel in JS_APPS:
        data = json.loads(_read(ROOT / rel))
        if "packageManager" in data:
            failures.append(f"{rel} still sets packageManager")
        for name, value in _package_specs(data).items():
            if name in catalog and value != "catalog:":
                failures.append(f"{rel} {name} is {value}, expected catalog:")
    for name, value in _package_specs(root_pkg).items():
        if name in catalog and value != "catalog:":
            failures.append(f"package.json {name} is {value}, expected catalog:")
    return failures


def _failures_mise(_root: Path) -> list[str]:
    text = _read(ROOT / "mise.toml")
    if not text:
        return ["missing root mise.toml"]
    if re.search(r"^(node|java|pnpm)\s*=", text, re.M):
        return ["mise.toml assigns a node, java, or pnpm version"]
    if "idiomatic_version_file_enable_tools" not in text:
        return ["mise.toml does not enable idiomatic version files"]
    return []


CHECKS = (
    ("sources", lambda _root: True, _failures_sources),
    ("nvmrc-location", lambda _root: True, _failures_nvmrc_location),
    ("workflows", lambda _root: True, _failures_workflows),
    ("docker-args", lambda _root: True, _failures_docker_args),
    ("engines", lambda _root: True, _failures_engines),
    ("types-node", lambda _root: True, _failures_types_node),
    ("js-catalog", lambda _root: True, _failures_js_catalog),
    ("stale-docker", lambda _root: True, _failures_stale_docker),
    ("viewer-nvmrc", lambda _root: True, _failures_viewer_nvmrc),
    ("bump-paths", lambda _root: True, _failures_bump_paths),
    ("dependabot", lambda _root: True, _failures_dependabot),
    ("pnpm-installer", lambda _root: True, _failures_pnpm_installer),
    ("mise", lambda _root: True, _failures_mise),
    (
        "one-catalog",
        lambda root: (root / "gradle/libs.versions.toml").is_file()
        and not (root / "sitmun-backend/settings.gradle").is_file(),
        _failures_one_catalog,
    ),
    (
        "gradle-literals",
        lambda root: "\nversion=" in f"\n{_read(root / 'gradle.properties')}",
        _failures_gradle_literals,
    ),
    ("root-build", lambda _root: True, _failures_root_build),
    ("platform-version", lambda root: "\nversion=" in f"\n{_read(root / 'gradle.properties')}", _failures_platform_version),
    ("catalog-shape", lambda root: (root / "gradle/libs.versions.toml").is_file(), _failures_catalog_shape),
    ("capacitor", lambda root: "e2e-android" in _read(root / "mise.toml"), _failures_capacitor),
    ("postgres-floor", lambda _root: True, _failures_postgres_floor),
)


def test_version_pins():
    failures = []
    for check_id, enabled, collect in CHECKS:
        if not enabled(ROOT):
            continue
        for failure in collect(ROOT):
            failures.append(f"{check_id}: {failure}")
    assert not failures, "\n".join(failures)


if __name__ == "__main__":
    try:
        import pytest as _pytest
    except ImportError:
        try:
            test_version_pins()
        except AssertionError as error:
            print(error)
            raise SystemExit(1) from error
        print("ok")
    else:
        raise SystemExit(_pytest.main([__file__]))
