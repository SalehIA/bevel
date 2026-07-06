# Bevel Portfolio (Next.js)

Mobile-first RTL portfolio for Bevel with an integrated admin panel.

## Stack

- **Next.js 16** (App Router, React, TypeScript)
- **Tailwind CSS**
- **iron-session** + **bcryptjs** for admin auth
- JSON files for users, roles, sections, customers (configurable via `BEVEL_DATA_DIR`)
- Project media in configurable dir (`BEVEL_PROJECTS_DIR`)

## Local development

```bash
cp .env.example .env.local
# Edit SESSION_SECRET to a long random string (32+ chars)

npm install
npm run dev
```

Open:

- Home: http://localhost:3000/
- Portfolio: http://localhost:3000/portfolio
- Admin: http://localhost:3000/bevel-admin

Default login:

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `Bevel@2026` |

## Project structure

```
app/                  Next.js pages & API routes
components/admin/     Admin dashboard UI
lib/                  Auth, manifest, users, roles, sections
data/                 Local dev JSON (production: /var/lib/bevel/data)
public/projects/      Local dev media (production: /var/lib/bevel/projects)
```

## VPS deploy

Runtime data (photos, videos, JSON databases) lives **outside** the app at `/var/lib/bevel/` on the VPS. Deploys only replace application code — data is never synced or deleted.

```bash
./scripts/deploy-vps.sh
```

On first deploy after this change, existing in-app data is **merged** (not moved/deleted) into `/var/lib/bevel/`.

| Path | Contents |
|------|----------|
| `/var/lib/bevel/data/` | users.json, roles.json, sections.json, manifest.json, customers.json, … |
| `/var/lib/bevel/projects/` | Gallery photos & videos |
| `/var/www/bevel/` | Application code only (safe to `--delete` on deploy) |
| `/var/backups/bevel/` | Automatic pre-deploy backups |

Set `SESSION_SECRET` and admin credentials in `.env.local` on the server.

## Gallery workflow

1. Log in to **Bevel Admin**
2. Add **sections** (categories) and **subsections** (projects)
3. Upload photos/videos to a subsection
4. Click **تحديث المعرض** to rebuild the manifest

Public site reads from `/api/manifest` and serves media from `BEVEL_PROJECTS_DIR` (local dev: `public/projects/`).
