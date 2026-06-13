#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-bevel-vps}"
DEST="${DEPLOY_DEST:-/var/www/bevel}"
RSYNC_SSH="ssh -i $HOME/.ssh/bevel_hosting_key -o IdentitiesOnly=yes"

echo "→ Building manifest from local projects (if possible)..."
python3 "$ROOT/scripts/build-manifest.py" || echo "  (manifest build skipped — using existing manifest.json)"

echo "→ Syncing site to $HOST:$DEST"
ssh -i "$HOME/.ssh/bevel_hosting_key" -o IdentitiesOnly=yes "$HOST" "mkdir -p '$DEST/portfolio'"

rsync -avz \
  -e "$RSYNC_SSH" \
  "$ROOT/index.html" \
  "$ROOT/css/" \
  "$ROOT/assets/" \
  "$HOST:$DEST/"

rsync -avz --delete \
  -e "$RSYNC_SSH" \
  "$ROOT/portfolio/" \
  "$HOST:$DEST/portfolio/"

echo "→ Installing nginx"
ssh -i "$HOME/.ssh/bevel_hosting_key" -o IdentitiesOnly=yes "$HOST" "\
  apt-get update -qq && \
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx"

echo "→ Installing nginx site config"
scp -i "$HOME/.ssh/bevel_hosting_key" -o IdentitiesOnly=yes \
  "$ROOT/deploy/nginx/bevel.conf" "$HOST:/etc/nginx/sites-available/bevel"

ssh -i "$HOME/.ssh/bevel_hosting_key" -o IdentitiesOnly=yes "$HOST" "\
  ln -sf /etc/nginx/sites-available/bevel /etc/nginx/sites-enabled/bevel && \
  rm -f /etc/nginx/sites-enabled/default && \
  nginx -t && \
  systemctl enable nginx && \
  systemctl reload nginx"

echo "✓ Deploy complete: http://147.93.95.109/"
echo "  Portfolio:       http://147.93.95.109/portfolio/"
