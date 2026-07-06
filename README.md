# Bevel Monorepo

npm workspaces monorepo for bevel.sa.

## Structure

```
bevel/
├── apps/web/          # Main Next.js app (landing, portfolio, dashboard, admin)
├── packages/shared/   # Shared branding, phone utils, types
└── package.json       # Workspace root
```

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy

```bash
./apps/web/scripts/deploy-vps.sh
```

Data is stored at `/var/lib/bevel/` on the VPS — never touched by deploys.

## Routes

| Route | Description |
|-------|-------------|
| `/` | Main landing page |
| `/portfolio` | Project gallery |
| `/dashboard` | Customer dashboard (after WhatsApp OTP registration) |
| `/bevel-admin` | Admin CMS |
