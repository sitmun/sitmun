#!/usr/bin/env python3
"""Published image names, labels, and the GHCR workflow."""

from __future__ import annotations

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

IMAGES = ("front", "backend", "proxy", "mbtiles")
LABELS = (
    "org.opencontainers.image.source=https://github.com/sitmun/sitmun",
    "org.opencontainers.image.licenses=EUPL-1.2",
    "org.opencontainers.image.description=",
)
DOCKERFILES = {
    "front": ROOT / "docker/front/Dockerfile",
    "backend": ROOT / "docker/backend/Dockerfile",
    "proxy": ROOT / "docker/proxy/Dockerfile",
    "mbtiles": ROOT / "docker/mbtiles/Dockerfile",
}


class PublishedImagesTest(unittest.TestCase):
    def test_compose_names_the_published_images_and_keeps_the_build(self) -> None:
        text = (ROOT / "compose.yaml").read_text(encoding="utf-8")
        for name in IMAGES:
            image = f"image: ghcr.io/sitmun/{name}:${{SITMUN_VERSION:-1.3.0}}"
            self.assertIn(image, text)
        self.assertIn("pull_policy: build", text)
        self.assertIn("dockerfile: docker/front/Dockerfile", text)
        self.assertIn("dockerfile: docker/backend/Dockerfile", text)
        self.assertIn("dockerfile: docker/proxy/Dockerfile", text)
        self.assertIn("dockerfile: docker/mbtiles/Dockerfile", text)

    def test_backend_forwards_the_upgrade_language(self) -> None:
        text = (ROOT / "compose.yaml").read_text(encoding="utf-8")
        backend = text.split("\n  backend:\n", 1)[1].split("\n  proxy:\n", 1)[0]
        self.assertIn(
            "SITMUN_UPGRADE_DEFAULT_LANGUAGE=${SITMUN_UPGRADE_DEFAULT_LANGUAGE:-}",
            backend,
        )

    def test_dockerfiles_carry_the_source_labels(self) -> None:
        for path in DOCKERFILES.values():
            text = path.read_text(encoding="utf-8")
            for label in LABELS:
                self.assertIn(label, text, path.name)

    def test_publish_workflow_pushes_1_3_0_and_makes_the_packages_public(self) -> None:
        text = (ROOT / ".github/workflows/publish-images.yml").read_text(encoding="utf-8")
        self.assertIn("workflow_dispatch:", text)
        self.assertIn('- "v*"', text)
        self.assertIn("packages: write", text)
        self.assertIn("version=1.3.0", text)
        self.assertIn("version=${GITHUB_REF_NAME#v}", text)
        self.assertIn("ENVIRONMENT: production", text)
        self.assertIn("PUBLIC_BASE_PATH: /", text)
        self.assertIn("--profile mbtiles push", text)
        self.assertNotIn("/visibility", text)
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn("set `front`, `backend`, `proxy`, and `mbtiles` to public in Package settings", readme)

    def test_front_waits_for_a_healthy_proxy(self) -> None:
        text = (ROOT / "compose.yaml").read_text(encoding="utf-8")
        front = text.split("\n  front:\n", 1)[1].split("\n  backend:\n", 1)[0]
        self.assertRegex(front, r"backend:\n\s+condition: service_started")
        self.assertRegex(front, r"proxy:\n\s+condition: service_healthy")

    def test_front_apps_fall_back_inside_the_base_path(self) -> None:
        text = (ROOT / "docker/front/config/default.conf.template").read_text(encoding="utf-8")
        for app in ("admin", "viewer"):
            block = text.split(f"location ${{LOCAL_BASE_PATH}}{app}/ {{", 1)[1].split("\n    }", 1)[0]
            self.assertIn(f"alias /usr/share/nginx/html/{app}/;", block, app)
            self.assertIn(f"try_files $uri $uri/ ${{LOCAL_BASE_PATH}}{app}/index.html;", block, app)


if __name__ == "__main__":
    unittest.main()
