#!/usr/bin/env python3
"""
Sync portfolio from Google Drive and build manifest with remote media URLs.

Google Drive folder: سابقة الأعمال
  التصميم/   → design projects
  التنفيذ/   → execution projects

Media is served from Google Drive (no large downloads into git).
Only project.json / project.txt metadata files are downloaded locally.

Usage:
  pip install gdown
  python scripts/sync-from-drive.py
  python scripts/sync-from-drive.py --folder-id 1mwN5fOhas66MznQOWGG1hlyoOVmkADyV
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PORTFOLIO_DIR = ROOT / "portfolio"
OUTPUT = ROOT / "data" / "manifest.json"
CONFIG = ROOT / "drive.config.json"

CATEGORIES = ["التصميم", "التنفيذ"]
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".svg"}
VIDEO_EXT = {".mp4", ".webm", ".mov", ".m4v"}
META_NAMES = {"project.json", "project.txt", "info.json", "info.txt"}


def normalize_name(text: str) -> str:
    """Strip invisible Unicode bidi marks from Google Drive folder names."""
    return re.sub(r"[\u200e\u200f\u202a-\u202e]", "", text).strip()


def load_config() -> dict:
    if CONFIG.exists():
        return json.loads(CONFIG.read_text(encoding="utf-8"))
    return {}


def drive_image_url(file_id: str, size: int = 1200) -> str:
    return f"https://drive.google.com/thumbnail?id={file_id}&sz=w{size}"


def drive_video_embed_url(file_id: str) -> str:
    return f"https://drive.google.com/file/d/{file_id}/preview"


def drive_video_view_url(file_id: str) -> str:
    return f"https://drive.google.com/file/d/{file_id}/view"


def drive_video_stream_url(file_id: str) -> str:
    return f"https://drive.google.com/uc?export=download&id={file_id}"


def parse_txt_metadata(text: str) -> dict:
    data = {}
    engineer = {}
    key_map = {
        "name": "name", "اسم": "name", "اسم المشروع": "name",
        "description": "description", "الوصف": "description",
        "locationlink": "locationLink", "location_link": "locationLink",
        "رابط الموقع": "locationLink", "رابط الخريطة": "locationLink",
        "siteengineer_name": "engineer_name", "مهندس الموقع": "engineer_name",
        "site_engineer": "engineer_name",
        "phone": "engineer_phone", "الهاتف": "engineer_phone",
    }
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, _, value = line.partition(":")
        mapped = key_map.get(key.strip().lower(), key.strip().lower())
        value = value.strip()
        if mapped == "engineer_name":
            engineer["name"] = value
        elif mapped == "engineer_phone":
            engineer["phone"] = value
        else:
            data[mapped] = value
    if engineer:
        data["siteEngineer"] = engineer
    return data


def load_local_metadata(project_dir: Path) -> dict:
    for name in ("project.json", "info.json"):
        path = project_dir / name
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    for name in ("project.txt", "info.txt"):
        path = project_dir / name
        if path.exists():
            return parse_txt_metadata(path.read_text(encoding="utf-8"))
    return {}


def slug_from_path(rel_path: str) -> str:
    return rel_path.replace("\\", "/")


def is_media(name: str) -> bool:
    ext = Path(name).suffix.lower()
    return ext in IMAGE_EXT or ext in VIDEO_EXT


def scan_drive_files(folder_id: str) -> list:
    import gdown

    url = f"https://drive.google.com/drive/folders/{folder_id}"
    print(f"Scanning Google Drive: {url}")
    files = gdown.download_folder(
        url,
        skip_download=True,
        remaining_ok=True,
        quiet=True,
        use_cookies=False,
    )
    if not files:
        raise RuntimeError("Could not read Drive folder — check sharing is 'Anyone with the link'")
    return files


def download_metadata_files(files, folder_id: str) -> None:
    import gdown

    if PORTFOLIO_DIR.exists():
        shutil.rmtree(PORTFOLIO_DIR)
    PORTFOLIO_DIR.mkdir(parents=True)

    meta_files = [f for f in files if Path(f.path).name.lower() in META_NAMES]
    print(f"Downloading {len(meta_files)} metadata file(s)...")

    for item in meta_files:
        dest = PORTFOLIO_DIR / item.path
        dest.parent.mkdir(parents=True, exist_ok=True)
        gdown.download(
            id=item.id,
            output=str(dest),
            quiet=True,
            use_cookies=False,
        )


def build_projects_from_files(files) -> dict:
    """Group Drive files into category → project → media."""
    tree: dict = {cat: {} for cat in CATEGORIES}

    for item in files:
        parts = [normalize_name(p) for p in Path(item.path).parts]
        if not parts:
            continue

        category = parts[0]
        if category not in CATEGORIES:
            continue

        if len(parts) < 2:
            continue

        filename = parts[-1]
        if filename.lower() in META_NAMES:
            rel = "/".join(parts[1:-1]) if len(parts) > 2 else parts[1]
            if rel.endswith("/"):
                rel = rel.rstrip("/")
            # metadata at project root
            project_key = rel if len(parts) > 2 else parts[1]
            if project_key not in tree[category]:
                tree[category][project_key] = {"photos": [], "videos": [], "meta_path": None}
            continue

        ext = Path(filename).suffix.lower()
        if ext not in IMAGE_EXT and ext not in VIDEO_EXT:
            continue

        if len(parts) == 2:
            # file directly in category — skip
            continue

        rel_parts = parts[1:-1]
        project_key = "/".join(rel_parts)
        if project_key not in tree[category]:
            tree[category][project_key] = {"photos": [], "videos": [], "meta_path": None}

        entry = {"name": filename, "id": item.id}
        if ext in IMAGE_EXT:
            entry["url"] = drive_image_url(item.id)
            tree[category][project_key]["photos"].append(entry)
        else:
            entry["url"] = drive_video_embed_url(item.id)
            entry["viewUrl"] = drive_video_view_url(item.id)
            entry["streamUrl"] = drive_video_stream_url(item.id)
            entry["embed"] = True
            tree[category][project_key]["videos"].append(entry)

    return tree


def merge_local_metadata(tree: dict) -> dict:
    manifest = {"categories": {}, "driveFolderId": load_config().get("folderId"), "generated": True}

    for category in CATEGORIES:
        projects = []
        for project_key, data in sorted(tree[category].items()):
            if not data["photos"] and not data["videos"]:
                continue

            slug = slug_from_path(project_key)
            local_dir = PORTFOLIO_DIR / category / Path(*project_key.split("/"))
            meta = load_local_metadata(local_dir) if local_dir.exists() else {}

            display_name = meta.get("name") or slug.split("/")[-1]
            photos = sorted(data["photos"], key=lambda x: x["name"].lower())
            videos = sorted(data["videos"], key=lambda x: x["name"].lower())

            project = {
                "slug": slug,
                "name": display_name,
                "photos": photos,
                "videos": videos,
                "thumbnail": photos[0] if photos else None,
            }
            if meta.get("description"):
                project["description"] = meta["description"]
            if meta.get("locationLink"):
                project["locationLink"] = meta["locationLink"]
            engineer = meta.get("siteEngineer") or {}
            if engineer.get("name") or engineer.get("phone"):
                project["siteEngineer"] = {
                    k: v for k, v in engineer.items() if v
                }

            projects.append(project)

        manifest["categories"][category] = projects

    return manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--folder-id",
        default=(
            os.environ.get("DRIVE_FOLDER_ID")
            or os.environ.get("GOOGLE_DRIVE_FOLDER_ID")
            or load_config().get("folderId")
            or "1mwN5fOhas66MznQOWGG1hlyoOVmkADyV"
        ),
    )
    parser.add_argument(
        "--skip-download",
        action="store_true",
        help="Only rebuild manifest from existing portfolio/ metadata",
    )
    args = parser.parse_args()

    if args.skip_download:
        # Fallback: scan local portfolio/ only
        from importlib.util import spec_from_loader, module_from_spec
        spec = spec_from_loader("build", loader=None)
        # use local build-manifest
        subprocess.run([sys.executable, str(ROOT / "scripts" / "build-manifest.py")], check=True)
        return

    files = scan_drive_files(args.folder_id)
    print(f"Found {len(files)} file(s) in Drive tree")
    download_metadata_files(files, args.folder_id)
    tree = build_projects_from_files(files)
    manifest = merge_local_metadata(tree)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    total = sum(len(v) for v in manifest["categories"].values())
    print(f"✓ Manifest written to {OUTPUT.relative_to(ROOT)}")
    for cat, projects in manifest["categories"].items():
        print(f"    {cat}: {len(projects)} project(s)")
    print(f"  Total projects: {total}")

    if total == 0:
        print("\nNote: Add project.json files to each project folder on Drive.")
        print("See README.md for the metadata format.")


if __name__ == "__main__":
    main()
