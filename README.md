# Bevel Portfolio

Mobile-first portfolio website for a design & build company, hosted on **GitHub Pages**.

Live site: `https://salehia.github.io/bevel/` (after enabling GitHub Pages)

## Structure

```
portfolio/
  التصميم/            ← Design projects
    project-slug/
      project.json    ← Metadata (or project.txt)
      photo.jpg
      video.mp4
  التنفيذ/            ← Build / execution projects
    project-slug/
      ...
```

## Project metadata

Each project folder needs a `project.json` or `project.txt` file:

### JSON (copy into each project folder as `project.json`)

```json
{
  "name": "اسم المشروع",
  "description": "وصف المشروع",
  "locationLink": "https://maps.google.com/?q=24.7136,46.6753",
  "siteEngineer": {
    "name": "اسم مهندس الموقع",
    "phone": "+966501234567"
  }
}
```

Only fields present in the file are shown on the project page.

Place photos (`.jpg`, `.png`, `.webp`) and videos (`.mp4`, `.webm`) directly in the project folder.

## Google Drive (connected)

Source folder: [سابقة الأعمال](https://drive.google.com/drive/folders/1mwN5fOhas66MznQOWGG1hlyoOVmkADyV)

Expected structure on Drive:

```
سابقة الأعمال/
  التصميم/
    project-folder/
      project.json
      photos...
  التنفيذ/
    project-folder/
      project.json
      photos & videos...
```

Photos and videos are loaded directly from Google Drive (keeps the GitHub repo small).  
Add a `project.json` in each project folder for name, scope, location, and contact info — see `portfolio/project.json.example`.

### Sync locally

```bash
pip install gdown
python scripts/sync-from-drive.py
```

### Automatic sync (GitHub Actions)

Runs daily and on manual trigger. Optionally set repo secret `DRIVE_FOLDER_ID` to override the default.

## GitHub Pages setup

1. Push this repo to `git@github.com:SalehIA/bevel.git`
2. Go to **Settings → Pages**
3. Under **Build and deployment**, set source to **GitHub Actions**
4. Push to `main` — the deploy workflow runs automatically

## Local preview

```bash
python scripts/build-manifest.py
python -m http.server 8080
# Open http://localhost:8080
```

## GitHub Pages notes

- Static site only — no server-side code at runtime
- Media is served from Google Drive — folder must stay shared as **Anyone with the link**
- Google Drive lists up to ~50 files per folder via sync; split very large projects into subfolders if needed
- Arabic folder names (`التصميم`, `التنفيذ`) are fully supported
