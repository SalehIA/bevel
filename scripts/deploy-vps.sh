#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-bevel-vps}"
DEST="${DEPLOY_DEST:-/var/www/bevel}"
RSYNC_SSH="ssh -i $HOME/.ssh/bevel_hosting_key -o IdentitiesOnly=yes"

echo "→ Building manifest from local projects..."
python3 "$ROOT/scripts/build-manifest.py"

echo "→ Syncing site to $HOST:$DEST"
ssh -i "$HOME/.ssh/bevel_hosting_key" -o IdentitiesOnly=yes "$HOST" "mkdir -p '$DEST/css' '$DEST/assets' '$DEST/portfolio' '$DEST/admin' '$DEST/server' '$DEST/scripts'"

rsync -avz -e "$RSYNC_SSH" "$ROOT/index.html" "$HOST:$DEST/"
rsync -avz -e "$RSYNC_SSH" "$ROOT/css/" "$HOST:$DEST/css/"
rsync -avz -e "$RSYNC_SSH" "$ROOT/assets/" "$HOST:$DEST/assets/"
rsync -avz --delete -e "$RSYNC_SSH" "$ROOT/portfolio/" "$HOST:$DEST/portfolio/"
rsync -avz -e "$RSYNC_SSH" "$ROOT/admin/" "$HOST:$DEST/admin/"
rsync -avz -e "$RSYNC_SSH" "$ROOT/server/" "$HOST:$DEST/server/"
rsync -avz -e "$RSYNC_SSH" "$ROOT/scripts/" "$HOST:$DEST/scripts/"

echo "→ Installing server dependencies"
ssh -i "$HOME/.ssh/bevel_hosting_key" -o IdentitiesOnly=yes "$HOST" "\
  apt-get update -qq && \
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx python3-venv python3-pip && \
  if [ ! -f '$DEST/.env' ]; then \
    cp '$DEST/server/config.example.env' '$DEST/.env'; \
    sed -i \"s/BEVEL_SECRET_KEY=.*/BEVEL_SECRET_KEY=$(openssl rand -hex 24)/\" '$DEST/.env'; \
  fi && \
  python3 -m venv '$DEST/server/venv' && \
  '$DEST/server/venv/bin/pip' install -q -r '$DEST/server/requirements.txt'"

scp -i "$HOME/.ssh/bevel_hosting_key" -o IdentitiesOnly=yes \
  "$ROOT/deploy/nginx/bevel.conf" "$HOST:/etc/nginx/sites-available/bevel"
scp -i "$HOME/.ssh/bevel_hosting_key" -o IdentitiesOnly=yes \
  "$ROOT/deploy/bevel-admin.service" "$HOST:/etc/systemd/system/bevel-admin.service"

ssh -i "$HOME/.ssh/bevel_hosting_key" -o IdentitiesOnly=yes "$HOST" "\
  ln -sf /etc/nginx/sites-available/bevel /etc/nginx/sites-enabled/bevel && \
  rm -f /etc/nginx/sites-enabled/default && \
  nginx -t && \
  systemctl daemon-reload && \
  systemctl enable bevel-admin nginx && \
  systemctl restart bevel-admin nginx"

echo "✓ Deploy complete"
echo "  Home:      http://147.93.95.109/"
echo "  Portfolio: http://147.93.95.109/portfolio/"
echo "  Admin:     http://147.93.95.109/admin/"
echo "  Default admin password is in $DEST/.env (BEVEL_ADMIN_PASSWORD)"
