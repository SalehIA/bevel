#!/usr/bin/env python3
"""Build portfolio manifest from local project folders."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from metadata import clean_meta, load_metadata  # noqa: E402

PROJECTS_DIR = ROOT / "portfolio" / "projects"
OUTPUT = ROOT / "portfolio" / "data" / "manifest.json"

CATEGORIES = ["التصميم", "التنفيذ"]
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".svg"}
VIDEO_EXT = {".mp4", ".webm", ".mov", ".m4v"}


def iter_media(project_dir: Path):
    photos, videos, thumbnail = [], [], None
    for item in sorted(project_dir.rglob("*")):
        if not item.is_file() or item.name.startswith("."):
            continue
        rel_name = item.relative_to(project_dir).as_posix()
        ext = item.suffix.lower()
        if item.name.lower().startswith("project.json"):
            continue
        if ext in IMAGE_EXT:
            if item.stem.lower() == "thumbnail":
                thumbnail = rel_name
            else:
                photos.append(rel_name)
        elif ext in VIDEO_EXT:
            videos.append(rel_name)
    return sorted(photos), sorted(videos), thumbnail


def build_manifest() -> dict:
    manifest = {"categories": {}, "generated": True, "source": "local"}

    for category in CATEGORIES:
        cat_dir = PROJECTS_DIR / category
        projects = []
        if not cat_dir.exists():
            manifest["categories"][category] = []
            continue

        for project_dir in sorted(cat_dir.iterdir()):
            if not project_dir.is_dir() or project_dir.name.startswith("."):
                continue

            slug = project_dir.name
            meta = clean_meta(load_metadata(project_dir), slug)
            photos, videos, thumbnail = iter_media(project_dir)

            project = {
                "slug": slug,
                "name": meta.get("name") or slug,
                "photos": photos,
                "videos": videos,
                "thumbnail": thumbnail or (photos[0] if photos else None),
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
    OUTPUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    total = sum(len(v) for v in manifest["categories"].values())
    print(f"✓ Manifest written to {OUTPUT.relative_to(ROOT)}")
    print(f"  Projects: {total}")
    for cat, projects in manifest["categories"].items():
        print(f"    {cat}: {len(projects)}")


if __name__ == "__main__":
    main()
