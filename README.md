# Bevel Portfolio

Mobile-first RTL portfolio for **Bevel** (تصميم · تنفيذ).

## Site structure

```
/                     Coming soon landing (logo + قريباً...)
/portfolio/           Portfolio web app
/portfolio/projects/  Project media (photos, videos, project.json)
/portfolio/data/      Generated manifest.json
```

## Admin panel

URL: `/admin/` (after deploy)

Default password is set on the server in `/var/www/bevel/.env` (`BEVEL_ADMIN_PASSWORD`). Change it after first login setup:

```bash
ssh bevel-vps
nano /var/www/bevel/.env
systemctl restart bevel-admin
```

From the admin panel you can:
- Create and edit projects (name, description, location, engineer)
- Upload photos and videos
- Delete files and projects
- Rebuild the portfolio manifest

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
