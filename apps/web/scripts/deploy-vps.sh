#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MONOREPO_ROOT="$(cd "$WEB_ROOT/../.." && pwd)"
HOST="${DEPLOY_HOST:-bevel-vps}"
DEST="${DEPLOY_DEST:-/var/www/bevel}"
BEVEL_LIB="${BEVEL_LIB:-/var/lib/bevel}"
RSYNC_SSH="ssh -i $HOME/.ssh/bevel_hosting_key -o IdentitiesOnly=yes"
SSH="ssh -i $HOME/.ssh/bevel_hosting_key -o IdentitiesOnly=yes"

echo "═══════════════════════════════════════════════════"
echo " Bevel deploy — code only, data is never touched"
echo " Persistent data: $BEVEL_LIB"
echo "═══════════════════════════════════════════════════"

echo "→ Step 1: backup persistent data"
$SSH "$HOST" "bash -s" <<REMOTE
set -euo pipefail
BEVEL_LIB='$BEVEL_LIB'
BACKUP_DIR='/var/backups/bevel'
TS=\$(date +%Y%m%d-%H%M%S)
mkdir -p "\$BACKUP_DIR"

if [ -d "\$BEVEL_LIB" ] && [ "\$(ls -A "\$BEVEL_LIB" 2>/dev/null)" ]; then
  tar czf "\$BACKUP_DIR/bevel-data-\${TS}.tar.gz" -C "\$(dirname "\$BEVEL_LIB")" "\$(basename "\$BEVEL_LIB")"
  echo "  backed up \$BEVEL_LIB → \$BACKUP_DIR/bevel-data-\${TS}.tar.gz"
else
  echo "  no existing data at \$BEVEL_LIB (first deploy or fresh server)"
fi
REMOTE

echo "→ Step 2: ensure persistent data dirs and migrate any legacy in-app data"
scp -i "$HOME/.ssh/bevel_hosting_key" -o IdentitiesOnly=yes \
  "$SCRIPT_DIR/setup-data-dirs.sh" "$HOST:/tmp/bevel-setup-data-dirs.sh"
$SSH "$HOST" "bash /tmp/bevel-setup-data-dirs.sh '$DEST' && rm -f /tmp/bevel-setup-data-dirs.sh"

echo "→ Step 3: build locally"
cd "$MONOREPO_ROOT"
npm ci
npm run build

echo "→ Step 4: sync application code (never syncs data or media)"
$SSH "$HOST" "mkdir -p '$DEST'"

rsync -avz --delete -e "$RSYNC_SSH" \
  --exclude node_modules \
  --exclude .git \
  --exclude apps/web/.next/cache \
  --exclude apps/web/data \
  --exclude 'apps/web/public/projects' \
  --exclude data \
  --exclude 'public/projects' \
  "$MONOREPO_ROOT/" "$HOST:$DEST/"

echo "→ Step 5: install deps and configure env"
$SSH "$HOST" "bash -s" <<REMOTE
set -euo pipefail
DEST='$DEST'
BEVEL_LIB='$BEVEL_LIB'
ENV_FILE="\$DEST/apps/web/.env.local"
EXAMPLE="\$DEST/apps/web/.env.example"

cd "\$DEST"
npm install --omit=dev

if [ ! -f "\$ENV_FILE" ]; then
  cp "\$EXAMPLE" "\$ENV_FILE"
fi

# Persistent data paths — app reads from here, never from deploy tree
grep -q '^BEVEL_DATA_DIR=' "\$ENV_FILE" || echo "BEVEL_DATA_DIR=\$BEVEL_LIB/data" >> "\$ENV_FILE"
grep -q '^BEVEL_PROJECTS_DIR=' "\$ENV_FILE" || echo "BEVEL_PROJECTS_DIR=\$BEVEL_LIB/projects" >> "\$ENV_FILE"
grep -q '^SESSION_SECRET=' "\$ENV_FILE" || echo "SESSION_SECRET=\$(openssl rand -hex 32)" >> "\$ENV_FILE"

if ! grep -q '^COOKIE_SECURE=' "\$ENV_FILE"; then
  if [ -f /etc/letsencrypt/live/bevel.sa/fullchain.pem ]; then
    echo 'COOKIE_SECURE=true' >> "\$ENV_FILE"
  else
    echo 'COOKIE_SECURE=false' >> "\$ENV_FILE"
  fi
fi

grep -q '^BEVEL_SYNC_ADMIN_PASSWORD=' "\$ENV_FILE" || echo 'BEVEL_SYNC_ADMIN_PASSWORD=true' >> "\$ENV_FILE"
grep -q '^WHATSAPP_MOCK=' "\$ENV_FILE" || echo 'WHATSAPP_MOCK=false' >> "\$ENV_FILE"

echo "  BEVEL_DATA_DIR=\$(grep BEVEL_DATA_DIR "\$ENV_FILE" | cut -d= -f2-)"
echo "  BEVEL_PROJECTS_DIR=\$(grep BEVEL_PROJECTS_DIR "\$ENV_FILE" | cut -d= -f2-)"
REMOTE

echo "→ Step 6: nginx + systemd"
NGINX_CONF="$WEB_ROOT/deploy/nginx/bevel.conf"
if ! $SSH "$HOST" "[ -f /etc/letsencrypt/live/bevel.sa/fullchain.pem ]"; then
  NGINX_CONF="$WEB_ROOT/deploy/nginx/bevel-http.conf"
fi

scp -i "$HOME/.ssh/bevel_hosting_key" -o IdentitiesOnly=yes \
  "$NGINX_CONF" "$HOST:/etc/nginx/sites-available/bevel"
scp -i "$HOME/.ssh/bevel_hosting_key" -o IdentitiesOnly=yes \
  "$WEB_ROOT/deploy/bevel.service" "$HOST:/etc/systemd/system/bevel.service"

$SSH "$HOST" "\
  ln -sf /etc/nginx/sites-available/bevel /etc/nginx/sites-enabled/bevel && \
  rm -f /etc/nginx/sites-enabled/default && \
  nginx -t && \
  systemctl daemon-reload && \
  systemctl enable bevel nginx && \
  systemctl restart bevel nginx"

echo ""
echo "✓ Deploy complete"
echo "  Site:     https://bevel.sa/"
echo "  Admin:    https://bevel.sa/bevel-admin"
echo "  Data:     $BEVEL_LIB/  (outside deploy tree — never deleted by deploys)"
echo "  Backups:  /var/backups/bevel/"
