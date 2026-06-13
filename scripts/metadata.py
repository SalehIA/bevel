"""Parse project metadata files (JSON, RTF, plain text)."""

import json
import re
from pathlib import Path

META_NAMES = {"project.json", "project.txt", "info.json", "info.txt"}


def read_text_file(path: Path) -> str:
    raw = path.read_bytes()
    for encoding in ("utf-8", "utf-8-sig", "cp1256", "windows-1256", "latin-1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def rtf_to_plain(raw: str) -> str:
    text = raw
    text = re.sub(
        r"\\'([0-9a-fA-F]{2})",
        lambda m: bytes([int(m.group(1), 16)]).decode("cp1256", errors="replace"),
        text,
    )
    text = re.sub(r"\\uc0\\u(-?\d+)", lambda m: chr(int(m.group(1)) & 0xFFFF), text)
    text = re.sub(r"\\u(-?\d+)", lambda m: chr(int(m.group(1)) & 0xFFFF), text)
    text = re.sub(r"\\[a-z]+\d*", " ", text, flags=re.I)
    text = re.sub(r"\\[\\{}]", "", text)
    text = re.sub(r"[\u200e\u200f\u202a-\u202e\u8234-\u8238]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def extract_fields(text: str) -> dict:
    meta = {}
    compact = re.sub(r"\s+", "", text)

    for key in ("name", "description"):
        match = re.search(rf'"{key}"\s*:\s*"([^"]+)"', text)
        if match:
            meta[key] = match.group(1).strip()

    link = re.search(r'"locationLink"\s*:\s*"(https?:[^"]+)"', compact, re.I)
    if link:
        meta["locationLink"] = link.group(1)

    eng_name = re.search(r'"siteEngineer"[\s\S]*?"name"\s*:\s*"([^"]+)"', text)
    eng_phone = re.search(r'"phone"\s*:\s*"([^"]+)"', text)
    if eng_name or eng_phone:
        meta["siteEngineer"] = {}
        if eng_name:
            meta["siteEngineer"]["name"] = eng_name.group(1).strip()
        if eng_phone:
            meta["siteEngineer"]["phone"] = eng_phone.group(1).strip()
    return meta


def is_broken_text(value: str) -> bool:
    if not value:
        return True
    if any(token in value for token in ("\\rtf", "\\uc0", "\\f0", "\\f1")):
        return True
    if "Ã" in value or "Ø" in value or "Ù" in value:
        return True
    return False


def parse_metadata_text(text: str) -> dict:
    trimmed = text.strip()
    if trimmed.startswith("{\\rtf"):
        return extract_fields(rtf_to_plain(trimmed))
    try:
        data = json.loads(trimmed)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    return extract_fields(trimmed)


def parse_txt_metadata(text: str) -> dict:
    data = {}
    rep = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, _, value = line.partition(":")
        key = key.strip().lower()
        value = value.strip()
        key_map = {
            "name": "name",
            "اسم": "name",
            "اسم المشروع": "name",
            "description": "description",
            "الوصف": "description",
            "location": "locationLink",
            "الموقع": "locationLink",
            "phone": "phone",
            "الهاتف": "phone",
        }
        mapped = key_map.get(key, key)
        if mapped == "phone":
            rep["phone"] = value
        else:
            data[mapped] = value
    if rep:
        data.setdefault("siteEngineer", {}).update(rep)
    return data


def load_metadata(project_dir: Path) -> dict:
    for name in ("project.json", "info.json", "project.txt", "info.txt"):
        path = project_dir / name
        if not path.exists() or not path.is_file():
            continue
        text = read_text_file(path)
        if name.endswith(".txt"):
            return parse_txt_metadata(text)
        return parse_metadata_text(text)
    return {}


def clean_meta(meta: dict, slug: str) -> dict:
    cleaned = dict(meta or {})
    name = cleaned.get("name")
    if is_broken_text(name):
        cleaned["name"] = slug
    if is_broken_text(cleaned.get("description", "")):
        cleaned.pop("description", None)
    engineer = cleaned.get("siteEngineer") or {}
    if is_broken_text(engineer.get("name", "")):
        engineer.pop("name", None)
    if engineer:
        cleaned["siteEngineer"] = {k: v for k, v in engineer.items() if v}
    elif "siteEngineer" in cleaned:
        cleaned.pop("siteEngineer", None)
    return cleaned
