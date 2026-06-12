#!/usr/bin/env python3
"""
Build portfolio manifest from local folder structure.

Expected structure:
  portfolio/
    تصميم/          (design)
      project-slug/
        project.json  (or project.txt)
        photo1.jpg
        video1.mp4
    بناء/             (build)
      ...

Run: python scripts/build-manifest.py
Output: data/manifest.json
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PORTFOLIO_DIR = ROOT / "portfolio"
OUTPUT = ROOT / "data" / "manifest.json"

CATEGORIES = ["التصميم", "التنفيذ"]
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".svg"}
VIDEO_EXT = {".mp4", ".webm", ".mov", ".m4v"}
META_FILES = {"project.json", "project.txt", "info.json", "info.txt"}


def parse_txt_metadata(path: Path) -> dict:
    """Parse key: value lines from a .txt metadata file."""
    data = {}
    rep = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip().lower()
        value = value.strip()

        key_map = {
            "name": "name",
            "اسم": "name",
            "اسم المشروع": "name",
            "nameen": "nameEn",
            "scope": "scope",
            "النطاق": "scope",
            "location": "location",
            "الموقع": "location",
            "representative": "representative_name",
            "الممثل": "representative_name",
            "representative_name": "representative_name",
            "phone": "phone",
            "الهاتف": "phone",
            "year": "year",
            "السنة": "year",
            "description": "description",
            "الوصف": "description",
        }

        mapped = key_map.get(key, key)
        if mapped == "representative_name":
            rep["name"] = value
        elif mapped == "phone":
            rep["phone"] = value
        elif mapped == "year":
            data["year"] = int(value) if value.isdigit() else value
        else:
            data[mapped] = value

    if rep:
        data["representative"] = rep
    return data


def load_metadata(project_dir: Path) -> dict:
    for name in ("project.json", "info.json"):
        path = project_dir / name
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))

    for name in ("project.txt", "info.txt"):
        path = project_dir / name
        if path.exists():
            return parse_txt_metadata(path)

    return {}


def slugify(name: str) -> str:
    slug = re.sub(r"[^\w\u0600-\u06FF\-]+", "-", name.strip())
    return slug.strip("-").lower() or "project"


def build_manifest() -> dict:
    manifest = {"categories": {}, "generated": True}

    for category in CATEGORIES:
        cat_dir = PORTFOLIO_DIR / category
        projects = []

        if not cat_dir.exists():
            manifest["categories"][category] = []
            continue

        for project_dir in sorted(cat_dir.iterdir()):
            if not project_dir.is_dir() or project_dir.name.startswith("."):
                continue

            meta = load_metadata(project_dir)
            slug = project_dir.name

            photos = sorted(
                f.name for f in project_dir.iterdir()
                if f.is_file() and f.suffix.lower() in IMAGE_EXT and f.stem.lower() != "thumbnail"
            )
            videos = sorted(
                f.name for f in project_dir.iterdir()
                if f.is_file() and f.suffix.lower() in VIDEO_EXT
            )
            thumb_file = next(
                (f.name for f in project_dir.iterdir()
                 if f.is_file() and f.suffix.lower() in IMAGE_EXT and f.stem.lower() == "thumbnail"),
                None
            )

            project = {
                "slug": slug,
                "name": meta.get("name") or slug.replace("-", " "),
                "photos": photos,
                "videos": videos,
                "thumbnail": thumb_file or (photos[0] if photos else None),
            }
            if meta.get("description"):
                project["description"] = meta["description"]
            if meta.get("locationLink"):
                project["locationLink"] = meta["locationLink"]
            engineer = meta.get("siteEngineer") or {}
            if engineer.get("name") or engineer.get("phone"):
                project["siteEngineer"] = {k: v for k, v in engineer.items() if v}
            projects.append(project)

        manifest["categories"][category] = projects

    return manifest


def main():
    manifest = build_manifest()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    total = sum(len(v) for v in manifest["categories"].values())
    print(f"✓ Manifest written to {OUTPUT.relative_to(ROOT)}")
    print(f"  Projects: {total}")
    for cat, projects in manifest["categories"].items():
        print(f"    {cat}: {len(projects)}")


if __name__ == "__main__":
    main()
