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
from typing import Optional

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


def rtf_to_plain(raw: str) -> str:
    """Decode macOS RTF content to searchable plain text."""
    text = raw

    def decode_hex(match: re.Match) -> str:
        return bytes([int(match.group(1), 16)]).decode("cp1256", errors="replace")

    text = re.sub(r"\\'([0-9a-fA-F]{2})", decode_hex, text)
    text = re.sub(r"\\uc0\\u(-?\d+)", lambda m: chr(int(m.group(1)) & 0xFFFF), text)
    text = re.sub(r"\\u(-?\d+)\?", lambda m: chr(int(m.group(1)) & 0xFFFF), text)
    text = re.sub(r"\\[a-z]+\d*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\\[\\{}]", "", text)
    text = re.sub(r"[\u200e\u200f\u202a-\u202e\u8234-\u8238]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text


def extract_fields_from_text(text: str) -> dict:
    """Extract known metadata fields even from messy RTF-derived text."""
    meta: dict = {}
    compact = re.sub(r"\s+", "", text)

    for key in ("name", "description"):
        match = re.search(rf'"{key}"\s*:\s*"([^"]+)"', text)
        if match:
            meta[key] = match.group(1).strip()

    link_match = re.search(r'"locationLink"\s*:\s*"(https?[^"]+)"', compact, re.I)
    if link_match:
        meta["locationLink"] = link_match.group(1)

    engineer: dict = {}
    eng_name = re.search(r'"siteEngineer"[\s\S]*?"name"\s*:\s*"([^"]+)"', text)
    eng_phone = re.search(r'"phone"\s*:\s*"([^"]+)"', text)
    if eng_name:
        engineer["name"] = eng_name.group(1).strip()
    if eng_phone:
        engineer["phone"] = eng_phone.group(1).strip()
    if engineer:
        meta["siteEngineer"] = engineer

    return meta


def parse_metadata_content(text: str, source: str) -> dict:
    text = text.strip()
    if text.startswith("{\\rtf"):
        plain = rtf_to_plain(text)
        meta = extract_fields_from_text(plain)
        if meta:
            print(f"  Parsed RTF metadata from {source}")
            return meta
        print(f"  Warning: could not parse RTF metadata in {source}")
        return {}

    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        meta = extract_fields_from_text(text)
        if meta:
            return meta
        print(f"  Warning: {source} has invalid JSON ({exc})")
        return {}


def load_local_metadata(project_dir: Path) -> dict:
    for name in ("project.json", "info.json"):
        path = project_dir / name
        if path.exists():
            return parse_metadata_content(path.read_text(encoding="utf-8"), str(path))
    for name in ("project.txt", "info.txt"):
        path = project_dir / name
        if path.exists():
            return parse_txt_metadata(path.read_text(encoding="utf-8"))
    return {}


def find_metadata_dir(category: str, project_key: str) -> Optional[Path]:
    expected = normalize_name(f"{category}/{project_key}")
    if not PORTFOLIO_DIR.exists():
        return None

    direct = PORTFOLIO_DIR / category / Path(*project_key.split("/"))
    if direct.exists():
        return direct

    for path in PORTFOLIO_DIR.rglob("project.json"):
        rel = normalize_name(str(path.parent.relative_to(PORTFOLIO_DIR)).replace("\\", "/"))
        if rel == expected:
            return path.parent
    for path in PORTFOLIO_DIR.rglob("project.txt"):
        rel = normalize_name(str(path.parent.relative_to(PORTFOLIO_DIR)).replace("\\", "/"))
        if rel == expected:
            return path.parent
    return None


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


def download_metadata_files(files) -> dict:
    import gdown

    if PORTFOLIO_DIR.exists():
        shutil.rmtree(PORTFOLIO_DIR)
    PORTFOLIO_DIR.mkdir(parents=True)

    meta_files = [f for f in files if Path(f.path).name.lower() in META_NAMES]
    print(f"Downloading {len(meta_files)} metadata file(s)...")
    meta_cache: dict[tuple[str, str], dict] = {}

    for item in meta_files:
        parts = [normalize_name(p) for p in Path(item.path).parts]
        if len(parts) < 2:
            continue
        category = parts[0]
        if category not in CATEGORIES:
            continue
        project_key = "/".join(parts[1:-1]) if len(parts) > 2 else parts[1]
        filename = parts[-1]

        dest = PORTFOLIO_DIR / category / Path(*project_key.split("/")) / filename
        dest.parent.mkdir(parents=True, exist_ok=True)
        gdown.download(
            id=item.id,
            output=str(dest),
            quiet=True,
            use_cookies=False,
        )
        meta = load_local_metadata(dest.parent)
        if meta:
            meta_cache[(category, project_key)] = meta
            print(f"  Loaded metadata: {category}/{project_key}")

    return meta_cache


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


def merge_local_metadata(tree: dict, meta_cache: Optional[dict] = None) -> dict:
    manifest = {"categories": {}, "driveFolderId": load_config().get("folderId"), "generated": True}
    meta_cache = meta_cache or {}

    for category in CATEGORIES:
        projects = []
        for project_key, data in sorted(tree[category].items()):
            if not data["photos"] and not data["videos"]:
                continue

            slug = slug_from_path(project_key)
            meta = meta_cache.get((category, project_key), {})
            if not meta:
                meta_dir = find_metadata_dir(category, project_key)
                if meta_dir:
                    meta = load_local_metadata(meta_dir)

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
    meta_cache = download_metadata_files(files)
    tree = build_projects_from_files(files)
    manifest = merge_local_metadata(tree, meta_cache)

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
