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

Optional: name a cover image `thumbnail.jpg` (or `thumbnail.png`, etc.) — it will be used as the project card image and excluded from the photo gallery.

## Google Drive (live loading)

Source folder: [سابقة الأعمال](https://drive.google.com/drive/folders/1mwN5fOhas66MznQOWGG1hlyoOVmkADyV)

The site loads project data **fresh from Google Drive on every visit** — no GitHub sync, no Google Cloud API key.

> **Why not read the public link directly?**  
> Sharing a folder as “Anyone with the link” lets people open individual files, but Google does **not** expose a public folder listing that a website can call from the browser (CORS and security). A tiny **Google Apps Script** web app (free, runs in your Google account) reads the folder and returns JSON each time someone opens the site.

Expected structure on Drive:

```
سابقة الأعمال/
  التصميم/
    project-folder/
      thumbnail.jpg     ← optional cover (any thumbnail.* image)
      project.json
      photos...
  التنفيذ/
    project-folder/
      project.json
      photos & videos...
```

Photos and videos are served from Google Drive URLs. The Drive folder must stay shared as **Anyone with the link**.

### One-time setup (Google Apps Script, ~2 minutes)

1. Open [script.google.com](https://script.google.com) → **New project**
2. Delete the default code and paste the contents of `scripts/google-apps-script.gs`
3. Confirm `ROOT_FOLDER_ID` at the top matches your folder (`1mwN5fOhas66MznQOWGG1hlyoOVmkADyV`)
4. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the deployment URL into `drive.config.json`:

```json
{
  "appsScriptUrl": "https://script.google.com/macros/s/....../exec"
}
```

6. Push to GitHub — every page load fetches the latest projects from Drive.

After you add photos or edit `project.json` on Drive, changes appear the next time someone opens the site (no git push needed).

### Optional fallbacks

- **`data/manifest.json`** — used only if `appsScriptUrl` is empty (static backup)
- **`scripts/sync-from-drive.py`** — rebuild the static manifest locally with `pip install gdown && python scripts/sync-from-drive.py`

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

- Static site — portfolio data is fetched live from Google Drive via Apps Script on each visit
- Subfolders inside a project folder are scanned (useful for projects with many files)
- Arabic folder names (`التصميم`, `التنفيذ`) are fully supported
