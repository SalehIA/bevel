#!/usr/bin/env python3
"""Bevel portfolio admin API."""

import json
import os
import secrets
import subprocess
import sys
from functools import wraps
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory, session

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
PROJECTS_DIR = ROOT / "portfolio" / "projects"
MANIFEST_PATH = ROOT / "portfolio" / "data" / "manifest.json"
ADMIN_DIR = ROOT / "admin"
ENV_FILE = Path(os.environ.get("BEVEL_ENV_FILE", "/var/www/bevel/.env"))

CATEGORIES = ["التصميم", "التنفيذ"]
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".svg"}
VIDEO_EXT = {".mp4", ".webm", ".mov", ".m4v"}


def load_env_file():
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


load_env_file()

app = Flask(__name__)
app.secret_key = os.environ.get("BEVEL_SECRET_KEY", secrets.token_hex(32))
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    MAX_CONTENT_LENGTH=200 * 1024 * 1024,
)


def admin_password() -> str:
    return os.environ.get("BEVEL_ADMIN_PASSWORD", "change-me-now")


def auth_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("admin"):
            return jsonify({"error": "Unauthorized"}), 401
        return fn(*args, **kwargs)

    return wrapper


def project_dir(category: str, slug: str) -> Path:
    if category not in CATEGORIES:
        raise ValueError("Invalid category")
    slug = slug.strip()
    if not slug or ".." in slug or "/" in slug or "\\" in slug:
        raise ValueError("Invalid slug")
    return PROJECTS_DIR / category / slug


def rebuild_manifest():
    subprocess.run([sys.executable, str(SCRIPTS / "build-manifest.py")], check=True)
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}
    if data.get("password") == admin_password():
        session["admin"] = True
        return jsonify({"ok": True})
    return jsonify({"error": "Invalid password"}), 401


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.get("/api/me")
def me():
    return jsonify({"authenticated": bool(session.get("admin"))})


@app.get("/api/categories")
@auth_required
def list_categories():
    return jsonify({"categories": CATEGORIES})


@app.get("/api/projects")
@auth_required
def list_projects():
    category = request.args.get("category")
    if category not in CATEGORIES:
        return jsonify({"error": "Invalid category"}), 400

    projects = []
    cat_dir = PROJECTS_DIR / category
    if cat_dir.exists():
        for path in sorted(cat_dir.iterdir()):
            if path.is_dir() and not path.name.startswith("."):
                projects.append({"slug": path.name, "path": str(path.relative_to(PROJECTS_DIR))})
    return jsonify({"projects": projects})


@app.post("/api/projects")
@auth_required
def create_project():
    data = request.get_json(silent=True) or {}
    category = data.get("category")
    slug = (data.get("slug") or "").strip()
    name = (data.get("name") or slug).strip()

    if category not in CATEGORIES:
        return jsonify({"error": "Invalid category"}), 400
    if not slug:
        return jsonify({"error": "Slug is required"}), 400

    path = project_dir(category, slug)
    if path.exists():
        return jsonify({"error": "Project already exists"}), 409

    path.mkdir(parents=True, exist_ok=False)
    meta = {"name": name}
    for key in ("description", "locationLink"):
        if data.get(key):
            meta[key] = data[key]
    engineer = data.get("siteEngineer") or {}
    if engineer.get("name") or engineer.get("phone"):
        meta["siteEngineer"] = {k: v for k, v in engineer.items() if v}

    (path / "project.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    manifest = rebuild_manifest()
    return jsonify({"ok": True, "manifest": manifest})


@app.put("/api/projects/<category>/<slug>")
@auth_required
def update_project(category, slug):
    path = project_dir(category, slug)
    if not path.exists():
        return jsonify({"error": "Project not found"}), 404

    data = request.get_json(silent=True) or {}
    meta_path = path / "project.json"
    meta = {}
    if meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))

    for key in ("name", "description", "locationLink"):
        if key in data:
            meta[key] = data[key]

    if "siteEngineer" in data:
        engineer = data["siteEngineer"] or {}
        if engineer.get("name") or engineer.get("phone"):
            meta["siteEngineer"] = {k: v for k, v in engineer.items() if v}
        else:
            meta.pop("siteEngineer", None)

    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest = rebuild_manifest()
    return jsonify({"ok": True, "manifest": manifest})


@app.delete("/api/projects/<category>/<slug>")
@auth_required
def delete_project(category, slug):
    path = project_dir(category, slug)
    if not path.exists():
        return jsonify({"error": "Project not found"}), 404

    import shutil

    shutil.rmtree(path)
    manifest = rebuild_manifest()
    return jsonify({"ok": True, "manifest": manifest})


@app.get("/api/projects/<category>/<slug>/files")
@auth_required
def list_files(category, slug):
    path = project_dir(category, slug)
    if not path.exists():
        return jsonify({"error": "Project not found"}), 404

    files = []
    for item in sorted(path.rglob("*")):
        if item.is_file():
            files.append(
                {
                    "name": item.relative_to(path).as_posix(),
                    "size": item.stat().st_size,
                    "kind": "video" if item.suffix.lower() in VIDEO_EXT else "image",
                }
            )
    return jsonify({"files": files})


@app.post("/api/projects/<category>/<slug>/upload")
@auth_required
def upload_files(category, slug):
    path = project_dir(category, slug)
    if not path.exists():
        return jsonify({"error": "Project not found"}), 404

    saved = []
    for storage in request.files.getlist("files"):
        if not storage or not storage.filename:
            continue
        filename = Path(storage.filename).name
        if not filename or filename.startswith("."):
            continue
        ext = Path(filename).suffix.lower()
        if ext not in IMAGE_EXT and ext not in VIDEO_EXT:
            continue
        dest = path / filename
        storage.save(dest)
        saved.append(filename)

    manifest = rebuild_manifest()
    return jsonify({"ok": True, "saved": saved, "manifest": manifest})


@app.delete("/api/projects/<category>/<slug>/files")
@auth_required
def delete_file(category, slug):
    path = project_dir(category, slug)
    if not path.exists():
        return jsonify({"error": "Project not found"}), 404

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name or ".." in name:
        return jsonify({"error": "Invalid file name"}), 400

    target = (path / name).resolve()
    if not str(target).startswith(str(path.resolve())) or not target.exists():
        return jsonify({"error": "File not found"}), 404

    target.unlink()
    manifest = rebuild_manifest()
    return jsonify({"ok": True, "manifest": manifest})


@app.post("/api/rebuild-manifest")
@auth_required
def rebuild():
    manifest = rebuild_manifest()
    return jsonify({"ok": True, "manifest": manifest})


@app.get("/admin/")
@app.get("/admin")
def admin_page():
    return send_from_directory(ADMIN_DIR, "index.html")


@app.get("/admin/<path:filename>")
def admin_assets(filename):
    return send_from_directory(ADMIN_DIR, filename)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8088, debug=True)
