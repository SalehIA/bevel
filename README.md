# Bevel Portfolio

Mobile-first RTL portfolio for **Bevel** (تصميم · تنفيذ).

## Site structure

```
/                     Coming soon landing (logo + قريباً...)
/portfolio/           Portfolio web app
/portfolio/projects/  Project media (photos, videos, project.json)
/portfolio/data/      Generated manifest.json
```

## Hosting (VPS)

Production server: `147.93.95.109` (domain pending)

Deploy:

```bash
chmod +x scripts/deploy-vps.sh
./scripts/deploy-vps.sh
```

SSH shortcut: `ssh bevel-vps`

## Local development

```bash
python3 scripts/build-manifest.py
python3 -m http.server 8080
# http://localhost:8080/           → coming soon
# http://localhost:8080/portfolio/ → portfolio app
```

## Update projects

1. Add files under `portfolio/projects/التصميم/` or `portfolio/projects/التنفيذ/`
2. Run `python3 scripts/build-manifest.py`
3. Deploy with `./scripts/deploy-vps.sh`

Optional one-time import from Google Drive:

```bash
pip install gdown
python3 scripts/sync-from-drive.py
```

## Git workflow

- `main` — stable production
- Feature branches for changes, e.g. `feature/vps-hosting-migration`
- Merge via pull request when ready

## Project metadata

See `project.json.example` — copy as `project.json` inside each project folder.

Optional cover image: name a file `thumbnail.jpg` (excluded from photo gallery).
